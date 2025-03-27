from __future__ import annotations

import math
from typing import Any, Dict, List, Tuple, Union, cast


def calculate_room_ranking(room) -> Dict[str, Dict[str, object]]:
    """
    Calculate the final rankings for a room based on participants' votes using the Skating system.

    This provides a more sophisticated approach to ranking that handles:
    - Incomplete votes
    - Tie breaking with proper competition-style ranking
    - Majority consensus rather than simple averages

    Returns a dictionary mapping object IDs to their ranking details.
    """
    from voting.models import RoomParticipant, VotingObject

    confirmed_rankings = RoomParticipant.objects.filter(room=room, vote_confirmed=True)

    if not confirmed_rankings.exists():
        # No confirmed rankings yet
        if hasattr(room, "final_results"):
            room.final_results = {}
            room.save()
        return {}

    # Get all objects in this room
    objects = VotingObject.objects.filter(room=room)
    object_id_to_title = {str(obj.id): obj.title for obj in objects}

    # Convert participant vote data into ballots for the skating system
    # Each ballot is a list of object IDs ranked from best to worst
    ballots: List[List[str]] = []

    for ranking in confirmed_rankings:
        if not ranking.vote_data:
            continue

        # Convert the vote data format from {obj_id: position} to an ordered list
        # First create a list of (object_id, position) tuples
        positions = [
            (obj_id, int(position)) for obj_id, position in ranking.vote_data.items()
        ]
        # Sort by position (ascending order - lower position is better)
        positions.sort(key=lambda x: x[1])
        # Extract just the object IDs in their ranked order
        ballot = [obj_id for obj_id, _ in positions]
        ballots.append(ballot)

    # Use the skating system to determine the final rankings
    if not ballots:
        # No valid ballots found
        if hasattr(room, "final_results"):
            room.final_results = {}
            room.save()
        return {}

    skating_results = skating_system(ballots)

    # Convert skating results to the required output format
    results: Dict[str, Dict[str, Any]] = {}

    # Create a mapping of object_id -> details about votes
    vote_details: Dict[str, Dict[str, int]] = {str(obj.id): {} for obj in objects}
    for ballot in ballots:
        for rank, obj_id in enumerate(ballot, start=1):
            vote_details[obj_id][rank] = vote_details[obj_id].get(rank, 0) + 1

    # Process each object's skating result
    for obj_id, final_rank in skating_results:
        # Calculate the average position from the raw vote data
        positions = []
        for rank, count in vote_details[obj_id].items():
            positions.extend([rank] * count)

        avg_position = sum(positions) / len(positions) if positions else 0
        vote_count = len(positions)

        results[obj_id] = {
            "final_rank": final_rank,
            "average_position": round(
                avg_position, 2
            ),  # Round to 2 decimal places for readability
            "vote_count": vote_count,
            "title": object_id_to_title.get(obj_id, "Unknown"),
            "vote_distribution": vote_details[
                obj_id
            ],  # Include detailed vote breakdown
        }

    # Include objects with no votes
    for obj in objects:
        obj_id = str(obj.id)
        if obj_id not in results:
            results[obj_id] = {
                "final_rank": len(skating_results)
                + 1,  # Place after all ranked objects
                "average_position": 0,
                "vote_count": 0,
                "title": obj.title,
                "vote_distribution": {},
            }

    # Sort by final rank for consistency
    sorted_results: Dict[str, Dict[str, Any]] = {
        k: v for k, v in sorted(results.items(), key=lambda item: item[1]["final_rank"])
    }

    # Store results in room
    if hasattr(room, "final_results"):
        room.final_results = sorted_results
        room.save()

    return sorted_results


def skating_system(ballots: List[List[str]]) -> List[Tuple[str, int]]:
    """
    Compute final placements using a version of the Skating system.

    Each ballot is a list of couple IDs ranked from best (index 0) to worst.
    Judges may submit incomplete ballots. For each couple, only ballots in which
    that couple appears are considered. The majority threshold for a couple is
    defined as (number of ballots that include that couple) // 2 + 1.

    The algorithm finds, for each couple, the smallest ranking level L such that
    the cumulative votes (i.e. the sum of votes at ranks 1,2,...,L) reaches the majority.
    Couples are then sorted first by this "minimal majority rank" (lower is better).
    In case of ties, the tie-breaker compares the vote counts at each rank (with higher counts
    at earlier ranks favored). Finally, final placements are assigned using competition-style ranking
    (if two couples tie for first, both get rank 1 and the next couple is ranked 3).

    :param ballots: List of ballots (each ballot is a list of couple IDs in ranked order)
    :return: A list of tuples (couple, placement)
    """

    # 1. Identify all couples that appear in any ballot.
    couples = set()
    for ballot in ballots:
        for couple in ballot:
            couples.add(couple)
    couples = list(couples)

    # 2. Build the frequency of placements for each couple.
    # placements[couple] will map rank (1-indexed) to the count of ballots giving that rank.
    placements: Dict[str, Dict[int, int]] = {couple: {} for couple in couples}
    # Also count how many ballots included each couple.
    ballots_count: Dict[str, int] = {couple: 0 for couple in couples}

    for ballot in ballots:
        for rank, couple in enumerate(ballot, start=1):
            placements[couple][rank] = placements[couple].get(rank, 0) + 1
            ballots_count[couple] += 1

    # 3. Determine the majority threshold for each couple.
    # This threshold is based only on ballots in which the couple appears.
    majority_threshold: Dict[str, int] = {}
    for couple in couples:
        total = ballots_count[couple]
        # For even totals, a strict majority is (total // 2) + 1.
        majority_threshold[couple] = (total // 2) + 1 if total > 0 else 1

    # 4. For each couple, determine the minimal rank at which the cumulative vote count
    # reaches the majority threshold.
    # If a couple never reaches the threshold (which can happen with very incomplete votes),
    # we assign a very high value (infinity) so that they rank last.
    max_rank = max((len(ballot) for ballot in ballots), default=0)
    min_majority: Dict[str, float] = {}
    for couple in couples:
        cumulative = 0
        achieved = math.inf
        threshold = majority_threshold[couple]
        for rank in range(1, max_rank + 1):
            cumulative += placements[couple].get(rank, 0)
            if cumulative >= threshold:
                achieved = rank
                break
        min_majority[couple] = achieved

    # 5. Define a tie-breaker key function.
    # This key is a tuple: first the minimal rank at which majority is achieved,
    # and then a tuple of negative vote counts (so that higher counts come first)
    # for ranks 1 up to max_rank.
    def tie_break_key(couple: str) -> Tuple[float, Tuple[int, ...]]:
        counts = tuple(
            -placements[couple].get(rank, 0) for rank in range(1, max_rank + 1)
        )
        return (min_majority[couple], counts)

    # 6. Sort the couples using the tie-break key.
    sorted_couples = sorted(couples, key=tie_break_key)

    # 7. Assign final placements.
    # Couples with identical tie-break keys receive the same placement.
    ranking: List[Tuple[str, int]] = []
    current_place = 1
    prev_key = None
    for i, couple in enumerate(sorted_couples):
        key = tie_break_key(couple)
        if i == 0:
            ranking.append((couple, current_place))
            prev_key = key
        else:
            # If this couple's key is the same as the previous, they tie.
            if key == prev_key:
                ranking.append((couple, current_place))
            else:
                # Use standard competition ranking: the next placement is i+1.
                current_place = i + 1
                ranking.append((couple, current_place))
                prev_key = key

    return ranking


# # ---------------------------
# # Example usage and test
if __name__ == "__main__":
    # Example ballots:
    # Four judges rank three couples ("A", "B", "C").
    # Notice that ballots can be incomplete.
    ballots_example = [
        ["A", "B", "C"],
        ["B", "A", "C"],
        ["A", "C"],  # Incomplete ballot (no ranking for "B")
        ["B", "C", "A"],
    ]

    results = skating_system(ballots_example)
    print("Final Placements:")
    for couple, place in results:
        print(f"Couple {couple}: Place {place}")
