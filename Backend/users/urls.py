from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterView,
    LoginView,
    VerifyEmailView,
    ResendVerificationView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    MeView,
    AcknowledgeCvVisibilityView,
    GraduateProfileMeView,
    EmployerStudentsListView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("resend-verification/", ResendVerificationView.as_view(), name="resend-verification"),

    path(
        "password-reset/request/",
        PasswordResetRequestView.as_view(),
        name="password-reset-request",
    ),
    path(
        "password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),

    path("me/", MeView.as_view(), name="me"),
    path(
        "acknowledge-cv-visibility/",
        AcknowledgeCvVisibilityView.as_view(),
        name="acknowledge-cv-visibility",
    ),
    path("graduate-profile/me/", GraduateProfileMeView.as_view(), name="graduate-profile-me"),
    path("graduates/", EmployerStudentsListView.as_view(), name="graduate-list"),
]
