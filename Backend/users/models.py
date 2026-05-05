import random
from datetime import timedelta

from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("email_verified", True)
        extra_fields.setdefault("phone_verified", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        GRADUATE = "GRADUATE", "Graduate"
        EMPLOYER = "EMPLOYER", "Employer"

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.GRADUATE)

    email_verified = models.BooleanField(default=False)
    email_verification_code = models.CharField(max_length=6, blank=True, default="")
    email_verification_expires_at = models.DateTimeField(null=True, blank=True)

    phone_number = models.CharField(max_length=30, blank=True, default="")
    phone_verified = models.BooleanField(default=False)

    has_seen_cv_visibility_notice = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email

    def generate_email_verification_code(self):
        code = f"{random.randint(0, 999999):06d}"
        self.email_verification_code = code
        self.email_verification_expires_at = timezone.now() + timedelta(minutes=15)
        self.save(update_fields=["email_verification_code", "email_verification_expires_at"])
        return code

    def clear_email_verification_code(self):
        self.email_verification_code = ""
        self.email_verification_expires_at = None
        self.save(update_fields=["email_verification_code", "email_verification_expires_at"])

    def is_email_verification_code_valid(self, code: str) -> bool:
        if not self.email_verification_code:
            return False

        if self.email_verification_code != code:
            return False

        if not self.email_verification_expires_at:
            return False

        return timezone.now() <= self.email_verification_expires_at


class GraduateProfile(models.Model):
    class EducationLevel(models.TextChoices):
        BACHELORS = "BACHELORS", "Bachelor's"
        MASTERS = "MASTERS", "Master's"
        PHD = "PHD", "PhD"
        OTHER = "OTHER", "Other"

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="graduate_profile",
    )
    education_level = models.CharField(
        max_length=30,
        choices=EducationLevel.choices,
        blank=True,
        default="",
    )
    university = models.CharField(max_length=255, blank=True, default="")
    degree = models.CharField(max_length=255, blank=True, default="")
    grade = models.CharField(max_length=100, blank=True, default="")
    years_of_experience = models.PositiveIntegerField(null=True, blank=True)
    age = models.PositiveIntegerField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True, default="")
    skills = models.TextField(blank=True, default="")
    bio = models.TextField(blank=True, default="")
    cv = models.FileField(upload_to="graduate_profiles/cvs/", null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]

    def __str__(self):
        return f"{self.user.email} profile"