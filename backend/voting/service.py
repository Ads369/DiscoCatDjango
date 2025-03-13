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
