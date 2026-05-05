import json
from datetime import timedelta

from django.utils import timezone

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from applications.models import JobApplication
from .models import (
    ChatMessage,
    UserNotification,
    ChatConversationState,
    DirectConversation,
    DirectConversationState,
    DirectMessage,
)


UNSEND_TIME_LIMIT_MINUTES = 10


class ApplicationChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")

        if not user or user.is_anonymous:
            await self.close()
            return

        self.application_id = int(self.scope["url_route"]["kwargs"]["application_id"])
        self.room_group_name = f"application_chat_{self.application_id}"

        self.application = await self.get_application()

        if not self.application:
            await self.close()
            return

        allowed = await self.user_can_access_application(user, self.application)

        if not allowed:
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )

        await self.accept()
        await self.mark_messages_read(user, self.application)

        previous_messages = await self.get_previous_messages()

        await self.send(
            text_data=json.dumps(
                {
                    "type": "chat_history",
                    "messages": previous_messages,
                }
            )
        )

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name,
            )

    async def receive(self, text_data):
        user = self.scope.get("user")

        if not user or user.is_anonymous:
            return

        data = json.loads(text_data)
        action = data.get("action")

        application = await self.get_application()
        if not application:
            return

        allowed = await self.user_can_access_application(user, application)
        if not allowed:
            return

        if action == "unsend":
            message_id = data.get("message_id")
            if not message_id:
                return

            result = await self.unsend_message(application, user, message_id)

            if not result["ok"]:
                await self.send(
                    text_data=json.dumps(
                        {
                            "type": "chat_error",
                            "message": result["error"],
                        }
                    )
                )
                return

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_message_deleted",
                    "message_id": result["message_id"],
                },
            )
            return

        message = str(data.get("message", "")).strip()
        if not message:
            return

        saved_message = await self.save_message(application, user, message)
        await self.create_message_notification(application, user, message)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "id": saved_message.id,
                "message": saved_message.message,
                "sender": saved_message.sender.email,
                "created_at": saved_message.created_at.isoformat(),
            },
        )

    async def chat_message(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "chat_message",
                    "id": event["id"],
                    "message": event["message"],
                    "sender": event["sender"],
                    "created_at": event["created_at"],
                }
            )
        )

    async def chat_message_deleted(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "chat_message_deleted",
                    "message_id": event["message_id"],
                }
            )
        )

    @database_sync_to_async
    def get_application(self):
        try:
            return JobApplication.objects.select_related(
                "applicant",
                "job",
                "job__employer",
            ).get(id=self.application_id)
        except JobApplication.DoesNotExist:
            return None

    @database_sync_to_async
    def user_can_access_application(self, user, application):
        return user.id in [application.applicant_id, application.job.employer_id]

    @database_sync_to_async
    def save_message(self, application, user, message):
        is_applicant = user.id == application.applicant_id

        chat_message = ChatMessage.objects.create(
            application=application,
            sender=user,
            message=message,
            read_by_applicant=is_applicant,
            read_by_employer=not is_applicant,
        )

        ChatConversationState.objects.filter(
            application=application,
            is_hidden=True,
        ).update(
            is_hidden=False,
            hidden_at=None,
        )

        return chat_message

    @database_sync_to_async
    def unsend_message(self, application, user, message_id):
        message = ChatMessage.objects.filter(
            id=message_id,
            application=application,
            sender=user,
            is_deleted=False,
        ).first()

        if not message:
            return {"ok": False, "error": "Message not found."}

        cutoff = timezone.now() - timedelta(minutes=UNSEND_TIME_LIMIT_MINUTES)

        if message.created_at < cutoff:
            return {
                "ok": False,
                "error": f"You can only unsend messages within {UNSEND_TIME_LIMIT_MINUTES} minutes.",
            }

        message.is_deleted = True
        message.deleted_at = timezone.now()
        message.save(update_fields=["is_deleted", "deleted_at"])

        return {"ok": True, "message_id": message.id}

    @database_sync_to_async
    def mark_messages_read(self, user, application):
        if user.id == application.applicant_id:
            ChatMessage.objects.filter(
                application=application,
                read_by_applicant=False,
                is_deleted=False,
            ).exclude(sender=user).update(read_by_applicant=True)

        elif user.id == application.job.employer_id:
            ChatMessage.objects.filter(
                application=application,
                read_by_employer=False,
                is_deleted=False,
            ).exclude(sender=user).update(read_by_employer=True)

    @database_sync_to_async
    def create_message_notification(self, application, sender, message):
        if sender.id == application.applicant_id:
            recipient = application.job.employer
            title = "New message from applicant"
        else:
            recipient = application.applicant
            title = "New message from employer"

        UserNotification.objects.create(
            user=recipient,
            application=application,
            title=title,
            message=message[:200],
        )

    @database_sync_to_async
    def get_previous_messages(self):
        messages = (
            ChatMessage.objects.filter(
                application_id=self.application_id,
                is_deleted=False,
            )
            .select_related("sender")
            .order_by("created_at")
        )

        return [
            {
                "id": msg.id,
                "sender": msg.sender.email,
                "message": msg.message,
                "created_at": msg.created_at.isoformat(),
            }
            for msg in messages
        ]


class DirectConversationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")

        if not user or user.is_anonymous:
            await self.close()
            return

        self.conversation_id = int(self.scope["url_route"]["kwargs"]["conversation_id"])
        self.room_group_name = f"direct_conversation_{self.conversation_id}"

        self.conversation = await self.get_conversation()
        if not self.conversation:
            await self.close()
            return

        allowed = await self.user_can_access_conversation(user, self.conversation)
        if not allowed:
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )

        await self.accept()
        await self.mark_messages_read(user, self.conversation)

        previous_messages = await self.get_previous_messages()

        await self.send(
            text_data=json.dumps(
                {
                    "type": "chat_history",
                    "messages": previous_messages,
                }
            )
        )

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name,
            )

    async def receive(self, text_data):
        user = self.scope.get("user")

        if not user or user.is_anonymous:
            return

        data = json.loads(text_data)
        action = data.get("action")

        conversation = await self.get_conversation()
        if not conversation:
            return

        allowed = await self.user_can_access_conversation(user, conversation)
        if not allowed:
            return

        if action == "unsend":
            message_id = data.get("message_id")
            if not message_id:
                return

            result = await self.unsend_message(conversation, user, message_id)

            if not result["ok"]:
                await self.send(
                    text_data=json.dumps(
                        {
                            "type": "chat_error",
                            "message": result["error"],
                        }
                    )
                )
                return

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_message_deleted",
                    "message_id": result["message_id"],
                },
            )
            return

        message = str(data.get("message", "")).strip()
        if not message:
            return

        saved_message = await self.save_message(conversation, user, message)
        await self.create_message_notification(conversation, user, message)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "id": saved_message.id,
                "message": saved_message.message,
                "sender": saved_message.sender.email,
                "created_at": saved_message.created_at.isoformat(),
            },
        )

    async def chat_message(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "chat_message",
                    "id": event["id"],
                    "message": event["message"],
                    "sender": event["sender"],
                    "created_at": event["created_at"],
                }
            )
        )

    async def chat_message_deleted(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "chat_message_deleted",
                    "message_id": event["message_id"],
                }
            )
        )

    @database_sync_to_async
    def get_conversation(self):
        try:
            return DirectConversation.objects.select_related(
                "employer",
                "graduate",
            ).get(id=self.conversation_id)
        except DirectConversation.DoesNotExist:
            return None

    @database_sync_to_async
    def user_can_access_conversation(self, user, conversation):
        return user.id in [conversation.employer_id, conversation.graduate_id]

    @database_sync_to_async
    def save_message(self, conversation, user, message):
        is_employer = user.id == conversation.employer_id

        direct_message = DirectMessage.objects.create(
            conversation=conversation,
            sender=user,
            message=message,
            read_by_employer=is_employer,
            read_by_graduate=not is_employer,
        )

        DirectConversation.objects.filter(id=conversation.id).update(updated_at=timezone.now())

        DirectConversationState.objects.filter(
            conversation=conversation,
            is_hidden=True,
        ).update(
            is_hidden=False,
            hidden_at=None,
        )

        return direct_message

    @database_sync_to_async
    def unsend_message(self, conversation, user, message_id):
        message = DirectMessage.objects.filter(
            id=message_id,
            conversation=conversation,
            sender=user,
            is_deleted=False,
        ).first()

        if not message:
            return {"ok": False, "error": "Message not found."}

        cutoff = timezone.now() - timedelta(minutes=UNSEND_TIME_LIMIT_MINUTES)

        if message.created_at < cutoff:
            return {
                "ok": False,
                "error": f"You can only unsend messages within {UNSEND_TIME_LIMIT_MINUTES} minutes.",
            }

        message.is_deleted = True
        message.deleted_at = timezone.now()
        message.save(update_fields=["is_deleted", "deleted_at"])

        return {"ok": True, "message_id": message.id}

    @database_sync_to_async
    def mark_messages_read(self, user, conversation):
        if user.id == conversation.employer_id:
            DirectMessage.objects.filter(
                conversation=conversation,
                read_by_employer=False,
                is_deleted=False,
            ).exclude(sender=user).update(read_by_employer=True)
        elif user.id == conversation.graduate_id:
            DirectMessage.objects.filter(
                conversation=conversation,
                read_by_graduate=False,
                is_deleted=False,
            ).exclude(sender=user).update(read_by_graduate=True)

    @database_sync_to_async
    def create_message_notification(self, conversation, sender, message):
        if sender.id == conversation.employer_id:
            recipient = conversation.graduate
            title = "New direct message from employer"
        else:
            recipient = conversation.employer
            title = "New direct message from graduate"

        UserNotification.objects.create(
            user=recipient,
            application=None,
            title=title,
            message=message[:200],
        )

    @database_sync_to_async
    def get_previous_messages(self):
        messages = (
            DirectMessage.objects.filter(
                conversation_id=self.conversation_id,
                is_deleted=False,
            )
            .select_related("sender")
            .order_by("created_at")
        )

        return [
            {
                "id": msg.id,
                "sender": msg.sender.email,
                "message": msg.message,
                "created_at": msg.created_at.isoformat(),
            }
            for msg in messages
        ]