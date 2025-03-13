from __future__ import annotations

import math
from typing import Dict, List, Tuple


def calculate_room_ranking(room):
    """Calculate the final rankings for a room based on participants' votes"""
    from voting.models import RoomParticipant, VotingObject

    confirmed_rankings = RoomParticipant.objects.filter(room=room, vote_confirmed=True)

    if not confirmed_rankings.exists():
        # No confirmed rankings yet
        if hasattr(room, "final_results"):
            room.final_results = {}
            room.save()
        return

    # Get all objects in this room
    objects = VotingObject.objects.filter(room=room)

    # Calculate scores for each object
    results = {}
    for obj in objects:
        obj_id = str(obj.id)

        # Get all rankings for this object
        positions = []
        for ranking in confirmed_rankings:
            if ranking.vote_data and obj_id in ranking.vote_data:
                positions.append(ranking.vote_data[obj_id])

        if positions:
            # Calculate average position (lower is better)
            avg_position = sum(positions) / len(positions)
            results[obj_id] = {
                "average_position": avg_position,
                "vote_count": len(positions),
                "title": obj.title,
            }

    # Sort by average position (ascending)
    sorted_results = {
        k: v
        for k, v in sorted(
            results.items(), key=lambda item: item[1]["average_position"]
        )
    }

    # Add final rank to each object
    for i, (obj_id, data) in enumerate(sorted_results.items()):
        sorted_results[obj_id]["final_rank"] = i + 1

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
# if __name__ == '__main__':
#     # Example ballots:
#     # Four judges rank three couples ("A", "B", "C").
#     # Notice that ballots can be incomplete.
#     ballots_example = [
#         ['A', 'B', 'C'],
#         ['B', 'A', 'C'],
#         ['A', 'C'],      # Incomplete ballot (no ranking for "B")
#         ['B', 'C', 'A']
#     ]

#     results = skating_system(ballots_example)
#     print("Final Placements:")
#     for couple, place in results:
#         print(f"Couple {couple}: Place {place}")
