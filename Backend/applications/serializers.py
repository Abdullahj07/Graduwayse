from rest_framework import serializers
from .models import JobApplication
from users.models import User


class ApplicantSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "full_name", "role"]


class JobApplicationSerializer(serializers.ModelSerializer):
    applicant_name = serializers.SerializerMethodField()
    applicant_email = serializers.EmailField(source="applicant.email", read_only=True)
    job_title = serializers.CharField(source="job.title", read_only=True)
    unread_messages = serializers.SerializerMethodField()
    cv_url = serializers.SerializerMethodField()

    class Meta:
        model = JobApplication
        fields = [
            "id",
            "job",
            "job_title",
            "applicant",
            "applicant_name",
            "applicant_email",
            "full_name",
            "age",
            "location",
            "cv",
            "cv_url",
            "status",
            "feedback",
            "unread_messages",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "applicant",
            "applicant_name",
            "applicant_email",
            "job_title",
            "cv_url",
            "unread_messages",
            "created_at",
        ]

    def validate(self, attrs):
        if self.instance is None:
            full_name = attrs.get("full_name")
            age = attrs.get("age")
            location = attrs.get("location")
            cv = attrs.get("cv")

            errors = {}

            if not str(full_name or "").strip():
                errors["full_name"] = "Full name is required."

            if age in [None, ""]:
                errors["age"] = "Age is required."
            elif int(age) <= 0:
                errors["age"] = "Age must be greater than 0."

            if not str(location or "").strip():
                errors["location"] = "Location is required."

            if not cv:
                errors["cv"] = "CV file is required."

            if errors:
                raise serializers.ValidationError(errors)

        return attrs

    def get_applicant_name(self, obj):
        return getattr(obj.applicant, "full_name", obj.applicant.email)

    def get_cv_url(self, obj):
        if not obj.cv:
            return None

        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.cv.url)
        return obj.cv.url

    def get_unread_messages(self, obj):
        request = self.context.get("request")
        if not request or not request.user or request.user.is_anonymous:
            return 0

        from chat.models import ChatMessage

        user = request.user

        if user.role == "GRADUATE":
            return ChatMessage.objects.filter(
                application=obj,
                read_by_applicant=False,
                is_deleted=False,
            ).exclude(sender=user).count()

        if user.role == "EMPLOYER":
            return ChatMessage.objects.filter(
                application=obj,
                read_by_employer=False,
                is_deleted=False,
            ).exclude(sender=user).count()

        return 0


class EmployerJobApplicationSerializer(serializers.ModelSerializer):
    applicant = ApplicantSerializer(read_only=True)
    unread_messages = serializers.SerializerMethodField()
    cv_url = serializers.SerializerMethodField()

    class Meta:
        model = JobApplication
        fields = [
            "id",
            "job",
            "applicant",
            "full_name",
            "age",
            "location",
            "cv",
            "cv_url",
            "status",
            "feedback",
            "unread_messages",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "applicant",
            "cv_url",
            "unread_messages",
            "created_at",
        ]

    def get_cv_url(self, obj):
        if not obj.cv:
            return None

        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.cv.url)
        return obj.cv.url

    def get_unread_messages(self, obj):
        request = self.context.get("request")
        if not request or not request.user or request.user.is_anonymous:
            return 0

        from chat.models import ChatMessage

        user = request.user

        if user.role == "EMPLOYER":
            return ChatMessage.objects.filter(
                application=obj,
                read_by_employer=False,
                is_deleted=False,
            ).exclude(sender=user).count()

        if user.role == "GRADUATE":
            return ChatMessage.objects.filter(
                application=obj,
                read_by_applicant=False,
                is_deleted=False,
            ).exclude(sender=user).count()

        return 0


class ApplicationStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobApplication
        fields = ["status", "feedback"]

    def validate(self, attrs):
        status_value = attrs.get("status", getattr(self.instance, "status", None))
        feedback_value = attrs.get("feedback", getattr(self.instance, "feedback", ""))

        allowed_statuses = [
            JobApplication.Status.REVIEWED,
            JobApplication.Status.ACCEPTED,
            JobApplication.Status.REJECTED,
        ]

        if status_value not in allowed_statuses:
            raise serializers.ValidationError({"status": "Invalid status update."})

        if status_value == JobApplication.Status.REJECTED and not str(feedback_value).strip():
            raise serializers.ValidationError(
                {"feedback": "Feedback is required when rejecting an application."}
            )

        return attrs