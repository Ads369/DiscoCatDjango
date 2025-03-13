import os

from .base import *

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY", "django-insecure-development-key-change-me"
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

# CORS settings
CORS_ALLOW_ALL_ORIGINS = (
    os.environ.get("CORS_ORIGIN_ALLOW_ALL", "True").lower() == "true"
)

# Static files for development
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, "static"),
]
