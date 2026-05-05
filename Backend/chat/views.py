from django.db.models import Q
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied, ValidationError

from applications.models import JobApplication
from users.models import User

from .models import (
    ChatMessage,
    UserNotification,
    ChatConversationState,
    DirectConversation,
    DirectConversationState,
    DirectMessage,
)
from .serializers import (
    UserNotificationSerializer,
    DirectConversationSerializer,
    DirectContactSerializer,
)


def is_chat_request(request):
    return request.query_params.get("for_chat", "").lower() in {"1", "true", "yes"}


class NotificationListView(generics.ListAPIView):
    serializer_class = UserNotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserNotification.objects.filter(user=self.request.user)[:20]


class MarkNotificationsReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        UserNotification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"detail": "Notifications marked as read."})


class UnreadSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == "GRADUATE":
            application_unread_messages = ChatMessage.objects.filter(
                application__applicant=user,
                read_by_applicant=False,
                is_deleted=False,
            ).exclude(sender=user).count()

            direct_unread_messages = DirectMessage.objects.filter(
                conversation__graduate=user,
                read_by_graduate=False,
                is_deleted=False,
            ).exclude(sender=user).count()

        elif user.role == "EMPLOYER":
            application_unread_messages = ChatMessage.objects.filter(
                application__job__employer=user,
                read_by_employer=False,
                is_deleted=False,
            ).exclude(sender=user).count()

            direct_unread_messages = DirectMessage.objects.filter(
                conversation__employer=user,
                read_by_employer=False,
                is_deleted=False,
            ).exclude(sender=user).count()
        else:
            application_unread_messages = 0
            direct_unread_messages = 0

        unread_notifications = UserNotification.objects.filter(
            user=user,
            is_read=False,
        ).count()

        unread_messages = application_unread_messages + direct_unread_messages

        return Response(
            {
                "unread_messages": unread_messages,
                "application_unread_messages": application_unread_messages,
                "direct_unread_messages": direct_unread_messages,
                "unread_notifications": unread_notifications,
                "total": unread_messages + unread_notifications,
            }
        )


class HideConversationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, application_id):
        application = self.get_application(application_id)
        self.check_access(request.user, application)

        state, _ = ChatConversationState.objects.get_or_create(
            application=application,
            user=request.user,
        )
        state.is_hidden = True
        state.hidden_at = timezone.now()
        state.save(update_fields=["is_hidden", "hidden_at", "updated_at"])

        return Response({"detail": "Chat hidden."})

    def get_application(self, application_id):
        try:
            return JobApplication.objects.select_related(
                "applicant",
                "job",
                "job__employer",
            ).get(id=application_id)
        except JobApplication.DoesNotExist:
            raise PermissionDenied("Application not found.")

    def check_access(self, user, application):
        allowed = (
            user.id == application.applicant.id
            or user.id == application.job.employer.id
        )
        if not allowed:
            raise PermissionDenied("You do not have access to this chat.")


class DirectConversationListView(generics.ListAPIView):
    serializer_class = DirectConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role == User.Role.EMPLOYER:
            qs = DirectConversation.objects.filter(employer=user)
        elif user.role == User.Role.GRADUATE:
            qs = DirectConversation.objects.filter(graduate=user)
        else:
            return DirectConversation.objects.none()

        qs = qs.exclude(
            states__user=user,
            states__is_hidden=True,
        )

        return qs.select_related("employer", "graduate").distinct().order_by("-updated_at", "-id")


class DirectContactListView(generics.ListAPIView):
    serializer_class = DirectContactSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        search = self.request.query_params.get("search", "").strip()

        if user.role == User.Role.EMPLOYER:
            qs = User.objects.filter(role=User.Role.GRADUATE).select_related("graduate_profile")
        elif user.role == User.Role.GRADUATE:
            qs = User.objects.filter(role=User.Role.EMPLOYER)
        else:
            return User.objects.none()

        if search:
            filters = Q(full_name__icontains=search) | Q(email__icontains=search)

            if user.role == User.Role.EMPLOYER:
                filters = filters | Q(graduate_profile__university__icontains=search)
                filters = filters | Q(graduate_profile__degree__icontains=search)
                filters = filters | Q(graduate_profile__location__icontains=search)
                filters = filters | Q(graduate_profile__skills__icontains=search)

            qs = qs.filter(filters)

        return qs.order_by("full_name", "email")[:30]


class StartDirectConversationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        target_user_id = request.data.get("target_user_id")

        if not target_user_id:
            raise ValidationError({"target_user_id": "This field is required."})

        try:
            target_user = User.objects.get(id=target_user_id)
        except User.DoesNotExist:
            raise ValidationError({"target_user_id": "User not found."})

        if target_user.id == user.id:
            raise ValidationError({"target_user_id": "You cannot message yourself."})

        if user.role == User.Role.EMPLOYER and target_user.role != User.Role.GRADUATE:
            raise ValidationError({"target_user_id": "Employers can only message graduates."})

        if user.role == User.Role.GRADUATE and target_user.role != User.Role.EMPLOYER:
            raise ValidationError({"target_user_id": "Graduates can only message employers."})

        if user.role not in [User.Role.EMPLOYER, User.Role.GRADUATE]:
            raise PermissionDenied("You cannot create direct messages.")

        employer = user if user.role == User.Role.EMPLOYER else target_user
        graduate = user if user.role == User.Role.GRADUATE else target_user

        conversation, created = DirectConversation.objects.get_or_create(
            employer=employer,
            graduate=graduate,
            defaults={"created_by": user},
        )

        state, _ = DirectConversationState.objects.get_or_create(
            conversation=conversation,
            user=user,
        )
        if state.is_hidden:
            state.is_hidden = False
            state.hidden_at = None
            state.save(update_fields=["is_hidden", "hidden_at", "updated_at"])

        serializer = DirectConversationSerializer(
            conversation,
            context={"request": request},
        )
        return Response(serializer.data, status=201 if created else 200)


class HideDirectConversationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        conversation = self.get_conversation(conversation_id)
        self.check_access(request.user, conversation)

        state, _ = DirectConversationState.objects.get_or_create(
            conversation=conversation,
            user=request.user,
        )
        state.is_hidden = True
        state.hidden_at = timezone.now()
        state.save(update_fields=["is_hidden", "hidden_at", "updated_at"])

        return Response({"detail": "Conversation hidden."})

    def get_conversation(self, conversation_id):
        try:
            return DirectConversation.objects.select_related(
                "employer",
                "graduate",
            ).get(id=conversation_id)
        except DirectConversation.DoesNotExist:
            raise PermissionDenied("Conversation not found.")

    def check_access(self, user, conversation):
        allowed = user.id in [conversation.employer_id, conversation.graduate_id]
        if not allowed:
            raise PermissionDenied("You do not have access to this conversation.")
        
# Create your views here.
