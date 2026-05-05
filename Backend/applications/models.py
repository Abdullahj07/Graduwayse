from django.db import models
from django.conf import settings
from internal_jobs.models import InternalJob


class JobApplication(models.Model):
    class Status(models.TextChoices):
        APPLIED = "APPLIED", "Applied"
        REVIEWED = "REVIEWED", "Reviewed"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"

    job = models.ForeignKey(
        InternalJob,
        on_delete=models.CASCADE,
        related_name="applications",
    )
    applicant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="applications",
    )

    full_name = models.CharField(max_length=255, blank=True, default="")
    age = models.PositiveIntegerField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True, default="")
    cv = models.FileField(upload_to="cvs/", null=True, blank=True)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.APPLIED,
    )
    feedback = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("job", "applicant")

    def __str__(self):
        return f"{self.applicant.email} → {self.job.title}"