from django.contrib import admin
from .models import ChatMessage, UserNotification


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "application",
        "sender",
        "short_message",
        "read_by_applicant",
        "read_by_employer",
        "created_at",
    )
    list_filter = ("created_at", "read_by_applicant", "read_by_employer")
    search_fields = (
        "sender__email",
        "application__id",
        "message",
    )
    ordering = ("-created_at",)

    def short_message(self, obj):
        return obj.message[:50]

    short_message.short_description = "Message"


@admin.register(UserNotification)
class UserNotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "title", "is_read", "created_at")
    list_filter = ("is_read", "created_at")
    search_fields = ("user__email", "title", "message")
    ordering = ("-created_at",)

# Register your models here.
