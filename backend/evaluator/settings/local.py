import os

from .development import *

SECRET_KEY = "django-insecure-$ec3d77kha8!frt!$yq5#3chqiwyfi5+(hkskto)1=t)(g9#lp"

ALLOWED_HOSTS = [
    "*",
]

# Add this for Docker internal networking
if os.environ.get("DOCKERIZED"):
    ALLOWED_HOSTS += ["host.docker.internal"]


REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",  # Default to requiring authentication
        # "rest_framework.permissions.AllowAny",  # Temporarily for debugging
    ],
    # Add this setting to allow non-authenticated requests to pass through
    "UNAUTHENTICATED_USER": None,
}
