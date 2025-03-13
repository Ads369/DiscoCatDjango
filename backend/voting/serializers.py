from rest_framework import serializers

from .models import VotingObject, VotingRoom


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
