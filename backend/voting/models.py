import uuid

from django.db import models
from users.models import CustomUser


# class VotingRoom(models.Model):
#     id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
#     name = models.CharField(max_length=200)
#     description = models.TextField(blank=True)
#     created_at = models.DateTimeField(auto_now_add=True)
#     is_active = models.BooleanField(default=True)
#     participants = models.ManyToManyField(CustomUser, through="RoomParticipant")
#     # participants = models.ManyToManyField(CustomUser, related_name="rooms")

#     def __str__(self):
#         return self.name

class VotingRoom(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    participants = models.ManyToManyField(CustomUser, through="RoomParticipant")
    final_results = models.JSONField(blank=True, null=True)  # Add this field if missing

    def __str__(self):
        return self.name


class VotingObject(models.Model):
    room = models.ForeignKey(VotingRoom, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    content = models.TextField(help_text="HTML/Markdown content")
    image = models.ImageField(upload_to="objects/")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.room.name})"


# class RoomParticipant(models.Model):
#     user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
#     room = models.ForeignKey(VotingRoom, on_delete=models.CASCADE)
#     vote_confirmed = models.BooleanField(default=False)
#     vote_data = models.JSONField(blank=True, null=True)
#     updated_at = models.DateTimeField(auto_now=True)
#     comments = models.TextField(blank=True)

#     class Meta:
#         unique_together = ("user", "room")

#     def __str__(self):
#         return f"{self.user} in {self.room}"


class RoomParticipant(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    room = models.ForeignKey(VotingRoom, on_delete=models.CASCADE)
    vote_confirmed = models.BooleanField(default=False)
    vote_data = models.JSONField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    comments = models.TextField(blank=True)

    class Meta:
        unique_together = ("user", "room")

    def __str__(self):
        return f"{self.user} in {self.room}"
