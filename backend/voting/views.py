from django.shortcuts import render
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from users.authentication import UUIDTokenAuthentication

from .models import RoomParticipant, VotingObject, VotingRoom
from .serializers import VotingObjectSerializer, VotingRoomSerializer


def room_detail_view(request, room_id):
    """View to render the room detail page"""
    return render(request, "voting/room_detail.html")


class VotingRoomViewSet(viewsets.ReadOnlyModelViewSet):
    authentication_classes = [UUIDTokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VotingRoomSerializer

    def get_queryset(self):
        return VotingRoom.objects.filter(
            roomparticipant__user=self.request.user, is_active=True
        ).distinct()

    @action(detail=True, methods=["get"])
    def objects(self, request, pk=None):
        """Get all voting objects for a specific room"""
        try:
            room = self.get_object()
            objects = VotingObject.objects.filter(room=room)
            serializer = VotingObjectSerializer(
                objects, many=True, context={"request": request}
            )
            return Response(serializer.data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
def participant_status(request, room_id):
    """Get the current status for a participant in a room"""
    try:
        room = VotingRoom.objects.get(id=room_id)
        participant, created = RoomParticipant.objects.get_or_create(
            user=request.user,
            room=room,
            defaults={"vote_data": {}, "vote_confirmed": False, "comments": ""},
        )

        return Response(
            {
                "vote_data": participant.vote_data,
                "vote_confirmed": participant.vote_confirmed,
                "comments": participant.comments,
            }
        )
    except VotingRoom.DoesNotExist:
        return Response({"error": "Room not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)


@api_view(["POST"])
def update_ranking(request, room_id):
    """Update the ranking for a participant in a room"""
    try:
        room = VotingRoom.objects.get(id=room_id)

        # Get or create participant
        participant, created = RoomParticipant.objects.get_or_create(
            user=request.user,
            room=room,
            defaults={"vote_data": {}, "vote_confirmed": False, "comments": ""},
        )

        # Don't allow updates if already confirmed
        if participant.vote_confirmed and not request.data.get("vote_confirmed", False):
            return Response(
                {"error": "Ranking already confirmed and cannot be modified"},
                status=400,
            )

        # Update participant data
        if "vote_data" in request.data:
            participant.vote_data = request.data["vote_data"]

        if "comments" in request.data:
            participant.comments = request.data["comments"]

        # Only update confirmation status if being set to True
        if request.data.get("vote_confirmed", False):
            # Validate that all objects have been ranked
            all_objects = VotingObject.objects.filter(room=room)
            if len(participant.vote_data) != all_objects.count():
                return Response(
                    {"error": "All objects must be ranked before confirming"},
                    status=400,
                )

            participant.vote_confirmed = True

        participant.save()

        # If confirmed, recalculate room rankings
        if participant.vote_confirmed:
            from voting.service import calculate_room_ranking

            calculate_room_ranking(room)

        return Response({"success": True, "vote_confirmed": participant.vote_confirmed})
    except VotingRoom.DoesNotExist:
        return Response({"error": "Room not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)
