import os
import sys

# Default to development settings
settings_module = os.environ.get("DJANGO_SETTINGS_MODULE")

if not settings_module or settings_module == "evaluator.settings":
    try:
        from .local import *
    except ImportError:
        from .development import *
