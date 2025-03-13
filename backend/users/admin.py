from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomUser


class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ["username", "user_id", "is_staff"]
    fieldsets = UserAdmin.fieldsets + (
        ("User_id", {"fields": ("user_id",)}),
        ("UUID", {"fields": ("uuid",)}),
    )
    readonly_fields = ["uuid", "user_id"]


admin.site.register(CustomUser, CustomUserAdmin)
