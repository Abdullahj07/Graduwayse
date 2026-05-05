from rest_framework import serializers

from users.models import User, GraduateProfile
from .models import UserNotification, DirectConversation, DirectMessage


class UserNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserNotification
        fields = [
            "id",
            "application",
            "title",
            "message",
            "is_read",
            "created_at",
        ]


class DirectContactSerializer(serializers.ModelSerializer):
    university = serializers.SerializerMethodField()
    degree = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "email",
            "role",
            "university",
            "degree",
            "location",
        ]

    def get_profile(self, obj):
        try:
            return obj.graduate_profile
        except GraduateProfile.DoesNotExist:
            return None

    def get_university(self, obj):
        profile = self.get_profile(obj)
        return profile.university if profile else ""

    def get_degree(self, obj):
        profile = self.get_profile(obj)
        return profile.degree if profile else ""

    def get_location(self, obj):
        profile = self.get_profile(obj)
        return profile.location if profile else ""


class DirectConversationSerializer(serializers.ModelSerializer):
    contact = serializers.SerializerMethodField()
    unread_messages = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    last_message_at = serializers.SerializerMethodField()
    last_message_sender = serializers.SerializerMethodField()

    class Meta:
        model = DirectConversation
        fields = [
            "id",
            "contact",
            "unread_messages",
            "last_message",
            "last_message_at",
            "last_message_sender",
            "updated_at",
            "created_at",
        ]

    def get_contact(self, obj):
        request = self.context.get("request")
        if not request or not request.user or request.user.is_anonymous:
            return None

        user = request.user
        contact = obj.graduate if user.id == obj.employer_id else obj.employer
        return DirectContactSerializer(contact).data

    def get_unread_messages(self, obj):
        request = self.context.get("request")
        if not request or not request.user or request.user.is_anonymous:
            return 0

        user = request.user

        if user.id == obj.employer_id:
            return DirectMessage.objects.filter(
                conversation=obj,
                read_by_employer=False,
                is_deleted=False,
            ).exclude(sender=user).count()

        return DirectMessage.objects.filter(
            conversation=obj,
            read_by_graduate=False,
            is_deleted=False,
        ).exclude(sender=user).count()

    def get_last_visible_message(self, obj):
        return (
            DirectMessage.objects.filter(
                conversation=obj,
                is_deleted=False,
            )
            .select_related("sender")
            .order_by("-created_at")
            .first()
        )

    def get_last_message(self, obj):
        message = self.get_last_visible_message(obj)
        return message.message if message else None

    def get_last_message_at(self, obj):
        message = self.get_last_visible_message(obj)
        return message.created_at.isoformat() if message else None

    def get_last_message_sender(self, obj):
        message = self.get_last_visible_message(obj)
        return message.sender.email if message else None