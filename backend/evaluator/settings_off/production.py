from .base import *

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    raise Exception("DJANGO_SECRET_KEY environment variable is required for production")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost").split(",")

# CORS settings - completely rewrite this section
# By default, just allow CORS from localhost
DEFAULT_CORS_ORIGINS = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

# Use CORS_ALLOW_ALL_ORIGINS instead of individual origins if specified
if os.environ.get("CORS_ALLOW_ALL_ORIGINS", "").lower() in ("true", "1", "yes"):
    CORS_ALLOW_ALL_ORIGINS = True
    # Don't set CORS_ALLOWED_ORIGINS when allowing all origins
else:
    CORS_ALLOW_ALL_ORIGINS = False
    # Get origins from environment or use defaults
    cors_origins_env = os.environ.get("CORS_ALLOWED_ORIGINS", "")

    # Only use environment variable if it contains something
    if cors_origins_env and cors_origins_env.strip():
        # Filter out any empty strings
        CORS_ALLOWED_ORIGINS = [
            origin.strip() for origin in cors_origins_env.split(",") if origin.strip()
        ]
    else:
        # Use default origins if environment variable is empty
        CORS_ALLOWED_ORIGINS = DEFAULT_CORS_ORIGINS

# Security settings
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"

# Static files configuration
STATIC_ROOT = os.path.join(BASE_DIR, "static")
STATICFILES_STORAGE = "django.contrib.staticfiles.storage.ManifestStaticFilesStorage"
