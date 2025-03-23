from django.urls import path
from django.views.decorators.csrf import csrf_exempt

from .views import UUIDLoginView, login_view, rooms_view,

urlpatterns = [
    path("login/", login_view, name="login"),
    path("rooms/", rooms_view, name="rooms"),
    path("api/auth/login/", UUIDLoginView.as_view(), name="uuid-login"),
]
