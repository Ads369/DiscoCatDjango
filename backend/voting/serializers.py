from rest_framework import serializers

from .models import NickName, VotingObject, VotingRoom


class VotingRoomSerializer(serializers.ModelSerializer):
    participants_count = serializers.SerializerMethodField()

    class Meta:
        model = VotingRoom
        fields = ["id", "name", "description", "is_active", "participants_count"]

    def get_participants_count(self, obj):
        return obj.participants.count()


class VotingObjectSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="title")  # Map title to name for frontend
    description = serializers.CharField(source="content")  # Map content to description
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = VotingObject
        fields = ["id", "name", "description", "image_url", "room"]

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


# DiscoCatDjango/backend/voting/serializers.py
class NickNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = NickName
        fields = ["name", "fingerprint"]
        extra_kwargs = {
            "fingerprint": {
                "required": True,
                "error_messages": {
                    "unique": "Это устройство уже участвовало в выборе кличек"
                },
            }
        }
