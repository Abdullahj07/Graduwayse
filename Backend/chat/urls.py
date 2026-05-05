from django.urls import path
from .views import (
    NotificationListView,
    MarkNotificationsReadView,
    UnreadSummaryView,
    HideConversationView,
    DirectConversationListView,
    DirectContactListView,
    StartDirectConversationView,
    HideDirectConversationView,
)

urlpatterns = [
    path("notifications/", NotificationListView.as_view(), name="chat-notifications"),
    path("notifications/read/", MarkNotificationsReadView.as_view(), name="chat-notifications-read"),
    path("unread-summary/", UnreadSummaryView.as_view(), name="chat-unread-summary"),
    path("conversations/<int:application_id>/hide/", HideConversationView.as_view(), name="chat-hide-conversation"),
    path("direct-conversations/", DirectConversationListView.as_view(), name="direct-conversation-list"),
    path("direct-conversations/start/", StartDirectConversationView.as_view(), name="direct-conversation-start"),
    path("direct-conversations/<int:conversation_id>/hide/", HideDirectConversationView.as_view(), name="direct-conversation-hide"),
    path("direct-contacts/", DirectContactListView.as_view(), name="direct-contact-list"),
]