from rest_framework import generics, status, parsers
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import JobApplication
from .serializers import (
    JobApplicationSerializer,
    EmployerJobApplicationSerializer,
    ApplicationStatusUpdateSerializer,
)
from .permissions import IsGraduate
from internal_jobs.models import InternalJob


def is_chat_request(request):
    return request.query_params.get("for_chat", "").lower() in {"1", "true", "yes"}


class ApplyForJobView(generics.CreateAPIView):
    serializer_class = JobApplicationSerializer
    permission_classes = [IsAuthenticated, IsGraduate]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def perform_create(self, serializer):
        job_id = self.request.data.get("job")

        if not job_id:
            raise PermissionDenied("Job is required.")

        try:
            job = InternalJob.objects.get(id=job_id, is_active=True)
        except InternalJob.DoesNotExist:
            raise PermissionDenied("Job does not exist or is not active.")

        if JobApplication.objects.filter(job=job, applicant=self.request.user).exists():
            raise PermissionDenied("You have already applied for this job.")

        serializer.save(applicant=self.request.user, job=job)


class MyApplicationsView(generics.ListAPIView):
    serializer_class = JobApplicationSerializer
    permission_classes = [IsAuthenticated, IsGraduate]

    def get_queryset(self):
        qs = JobApplication.objects.filter(
            applicant=self.request.user
        ).select_related("job", "applicant")

        if is_chat_request(self.request):
            qs = qs.exclude(
                chat_states__user=self.request.user,
                chat_states__is_hidden=True,
            )

        return qs.order_by("-created_at").distinct()


class EmployerJobApplicationsView(generics.ListAPIView):
    serializer_class = EmployerJobApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role != "EMPLOYER":
            raise PermissionDenied("Only employers can view applicants.")

        job_id = self.kwargs["job_id"]

        try:
            job = InternalJob.objects.get(id=job_id, employer=user)
        except InternalJob.DoesNotExist:
            raise PermissionDenied("You do not have access to this job.")

        qs = JobApplication.objects.filter(job=job).select_related(
            "job", "applicant"
        )

        if is_chat_request(self.request):
            qs = qs.exclude(
                chat_states__user=user,
                chat_states__is_hidden=True,
            )

        return qs.order_by("-created_at").distinct()


class UpdateApplicationStatusView(generics.UpdateAPIView):
    serializer_class = ApplicationStatusUpdateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role != "EMPLOYER":
            raise PermissionDenied("Only employers can update application status.")

        return JobApplication.objects.filter(job__employer=user)

    def update(self, request, *args, **kwargs):
        application = self.get_object()
        serializer = self.get_serializer(application, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        self.create_status_notification(application)

        response_serializer = EmployerJobApplicationSerializer(
            application,
            context={"request": request},
        )
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    def create_status_notification(self, application):
        from chat.models import UserNotification

        status_map = {
            "REVIEWED": "Your application was reviewed",
            "ACCEPTED": "Your application was accepted",
            "REJECTED": "Your application was rejected",
        }

        title = status_map.get(application.status, "Application updated")
        message = f"{application.job.title} — status changed to {application.status}."

        if application.feedback:
            message += f" Feedback: {application.feedback}"

        UserNotification.objects.create(
            user=application.applicant,
            application=application,
            title=title,
            message=message,
        )