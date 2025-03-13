from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import CustomUser  # Add this import


def login_view(request):
    return render(request, "voting/login.html")


def rooms_view(request):
    return render(request, "voting/rooms.html")


class UUIDLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        user_id = request.data.get("user_id", "").upper()
        if not user_id:
            return Response(
                {"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = CustomUser.objects.get(user_id=user_id)
            token, created = Token.objects.get_or_create(user=user)
            return Response(
                {
                    "token": token.key,
                    "user_id": user.user_id,
                    "name": user.get_full_name() or user.username,
                }
            )
        except CustomUser.DoesNotExist:
            return Response(
                {"error": "Invalid user ID"}, status=status.HTTP_401_UNAUTHORIZED
            )
