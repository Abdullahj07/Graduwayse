from django.urls import re_path
from .consumers import ApplicationChatConsumer, DirectConversationConsumer

websocket_urlpatterns = [
    re_path(
        r"ws/applications/(?P<application_id>\d+)/$",
        ApplicationChatConsumer.as_asgi(),
    ),
    re_path(
        r"ws/direct-conversations/(?P<conversation_id>\d+)/$",
        DirectConversationConsumer.as_asgi(),
    ),
]