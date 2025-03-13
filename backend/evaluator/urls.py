from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from users.views import UUIDLoginView, login_view, rooms_view

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", login_view, name="login"),
    path("rooms/", rooms_view, name="rooms"),
    path("api/auth/login/", UUIDLoginView.as_view(), name="api_login"),
    # Include voting.urls without the api prefix since it's already defined there
    path("", include("voting.urls")),  # This includes all of voting/urls.py at root
]

# Serve static and media files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
