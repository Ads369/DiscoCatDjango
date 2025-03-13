from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"rooms", views.VotingRoomViewSet, basename="votingroom")

urlpatterns = [
    path("api/voting/", include(router.urls)),
    path("room/<uuid:room_id>/", views.room_detail_view, name="room_detail"),
    path(
        "api/voting/rooms/<uuid:room_id>/participant-status/",
        views.participant_status,
        name="participant_status",
    ),
    path(
        "api/voting/rooms/<uuid:room_id>/update-ranking/",
        views.update_ranking,
        name="update_ranking",
    ),
]
