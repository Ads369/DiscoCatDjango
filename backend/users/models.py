from __future__ import annotations

import random
import string
import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

USER_ID_LENGTH = 6


class CustomUser(AbstractUser):
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    vote_rooms = models.ManyToManyField("voting.VotingRoom", blank=True)
    user_id = models.CharField(
        max_length=USER_ID_LENGTH, unique=True, blank=True, null=True
    )

    def generate_user_id(self):
        """Generate a unique user ID consisting of only letters and numbers."""
        characters = string.ascii_uppercase + string.digits  # A-Z and 0-9
        while True:
            uid = "".join(random.choices(characters, k=USER_ID_LENGTH))
            if not CustomUser.objects.filter(user_id=uid).exists():
                return uid

    def save(self, *args, **kwargs):
        if not self.user_id:
            self.user_id = self.generate_user_id()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.user_id})"
