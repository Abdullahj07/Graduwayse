from django.db import models
from django.conf import settings
from applications.models import JobApplication


class ChatConversationState(models.Model):
    application = models.ForeignKey(
        JobApplication,
        on_delete=models.CASCADE,
        related_name="chat_states",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_conversation_states",
    )
    is_hidden = models.BooleanField(default=False)
    hidden_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("application", "user")

    def __str__(self):
        return f"{self.user.email} - application {self.application_id}"


class ChatMessage(models.Model):
    application = models.ForeignKey(
        JobApplication,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_messages",
    )
    message = models.TextField()
    read_by_applicant = models.BooleanField(default=False)
    read_by_employer = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Application {self.application_id} - {self.sender.email}"


class DirectConversation(models.Model):
    employer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="employer_direct_conversations",
    )
    graduate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="graduate_direct_conversations",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_direct_conversations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("employer", "graduate")
        ordering = ["-updated_at", "-id"]

    def __str__(self):
        return f"DM {self.employer.email} ↔ {self.graduate.email}"


class DirectConversationState(models.Model):
    conversation = models.ForeignKey(
        DirectConversation,
        on_delete=models.CASCADE,
        related_name="states",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="direct_conversation_states",
    )
    is_hidden = models.BooleanField(default=False)
    hidden_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("conversation", "user")

    def __str__(self):
        return f"{self.user.email} - direct conversation {self.conversation_id}"


class DirectMessage(models.Model):
    conversation = models.ForeignKey(
        DirectConversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="direct_messages",
    )
    message = models.TextField()
    read_by_employer = models.BooleanField(default=False)
    read_by_graduate = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Direct conversation {self.conversation_id} - {self.sender.email}"


class UserNotification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    application = models.ForeignKey(
        JobApplication,
        on_delete=models.CASCADE,
        related_name="notifications",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} - {self.title}"
    
# Create your models here.
