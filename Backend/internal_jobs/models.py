from django.db import models
from django.conf import settings


class InternalJob(models.Model):
    class Level(models.TextChoices):
        GRADUATE = "GRADUATE", "Graduate"
        ENTRY = "ENTRY", "Entry-level"
        INTERNSHIP = "INTERNSHIP", "Internship"

    class Source(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        ADZUNA = "ADZUNA", "Adzuna"
        REED = "REED", "Reed"

    class Category(models.TextChoices):
        SOFTWARE = "SOFTWARE", "Software"
        DATA = "DATA", "Data"
        AI_ML = "AI_ML", "AI / ML"
        CYBER = "CYBER", "Cybersecurity"
        CLOUD_DEVOPS = "CLOUD_DEVOPS", "Cloud / DevOps"
        IT_SUPPORT = "IT_SUPPORT", "IT Support"
        PRODUCT = "PRODUCT", "Product"
        BUSINESS = "BUSINESS", "Business"
        OTHER = "OTHER", "Other"

    title = models.CharField(max_length=200)
    company_name = models.CharField(max_length=200)
    location = models.CharField(max_length=200, blank=True)
    description = models.TextField()

    level = models.CharField(
        max_length=20,
        choices=Level.choices,
        default=Level.GRADUATE
    )

    category = models.CharField(
        max_length=30,
        choices=Category.choices,
        default=Category.OTHER,
    )

    is_active = models.BooleanField(default=True)

    employer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="internal_jobs",
        null=True,
        blank=True,
    )

    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.MANUAL,
    )
    external_id = models.CharField(max_length=255, blank=True, default="")
    external_url = models.URLField(blank=True, default="")
    external_created_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} @ {self.company_name}"

    @property
    def can_apply_in_app(self):
        return self.source == self.Source.MANUAL