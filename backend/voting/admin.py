from django.contrib import admin

from backend.voting.service import calculate_room_ranking

from .models import *


class VotingObjectInline(admin.TabularInline):
    model = VotingObject
    extra = 1


class RoomParticipantInline(admin.TabularInline):
    model = RoomParticipant
    extra = 1
    show_change_link = True
    raw_id_fields = ("user",)
    exclude = ("comments",)


@admin.register(VotingRoom)
class VotingRoomAdmin(admin.ModelAdmin):
    inlines = [VotingObjectInline, RoomParticipantInline]
    # inlines = [VotingObjectInline]
    list_display = ("name", "created_at", "is_active")
    list_filter = ("is_active", "created_at")
    actions = ["calculate_grades"]
    # Remove filter_horizontal for participants since we're using through model
    # filter_horizontal = ('participants',)  # Remove this line
    #

    def calculate_grades(self, request, queryset):
        for room in queryset:
            calculate_room_ranking(room)
        self.message_user(request, "Grades calculation initiated")


@admin.register(VotingObject)
class VotingObjectAdmin(admin.ModelAdmin):
    list_display = ("title", "room", "created_at")
    list_filter = ("room",)


@admin.register(RoomParticipant)
class RoomParticipantAdmin(admin.ModelAdmin):
    # list_display = ("user", "room", "has_voted", "vote_confirmed")
    list_display = ("user", "room", "vote_confirmed")
    list_filter = ("room", "vote_confirmed")
    readonly_fields = ("vote_data",)
    search_fields = ("user__username", "room__name")


@admin.register(NickName)
class NickNameAdmin(admin.ModelAdmin):
    list_display = ("name", "fingerprint", "created_at")
    list_filter = ("created_at",)
