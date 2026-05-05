from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Q

from rest_framework import generics, permissions, parsers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import AuthenticationFailed

from .models import User, GraduateProfile
from .serializers import (
    RegisterSerializer,
    VerifyEmailSerializer,
    ResendVerificationSerializer,
    MeSerializer,
    GraduateProfileSerializer,
)


def send_verification_email(user: User):
    code = user.generate_email_verification_code()

    subject = "Verify your Graduwayse email"
    message = (
        f"Hi {user.full_name or 'there'},\n\n"
        f"Your Graduwayse verification code is: {code}\n\n"
        f"This code expires in 15 minutes.\n\n"
        f"If you did not create this account, you can ignore this email."
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@graduwayse.com"),
        recipient_list=[user.email],
        fail_silently=False,
    )


class VerifiedEmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        if not self.user.email_verified:
            raise AuthenticationFailed("Please verify your email before signing in.")

        return data


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = VerifiedEmailTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        send_verification_email(user)

        return Response(
            {
                "detail": "Account created. Please verify your email before signing in.",
                "email": user.email,
                "email_verified": user.email_verified,
            },
            status=status.HTTP_201_CREATED,
        )


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        code = serializer.validated_data["code"]

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "Invalid or expired verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.email_verified:
            return Response(
                {"detail": "Email already verified."},
                status=status.HTTP_200_OK,
            )

        if not user.is_email_verification_code_valid(code):
            return Response(
                {"detail": "Invalid or expired verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.email_verified = True
        user.email_verification_code = ""
        user.email_verification_expires_at = None
        user.save(
            update_fields=[
                "email_verified",
                "email_verification_code",
                "email_verification_expires_at",
            ]
        )

        return Response(
            {"detail": "Email verified successfully."},
            status=status.HTTP_200_OK,
        )


class ResendVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        user = User.objects.filter(email__iexact=email).first()

        if user and not user.email_verified:
            send_verification_email(user)

        return Response(
            {
                "detail": "If an unverified account exists for that email, a new verification code has been sent."
            },
            status=status.HTTP_200_OK,
        )


class MeView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)


class AcknowledgeCvVisibilityView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != User.Role.GRADUATE:
            raise PermissionDenied("Only graduates can acknowledge this notice.")

        if not request.user.has_seen_cv_visibility_notice:
            request.user.has_seen_cv_visibility_notice = True
            request.user.save(update_fields=["has_seen_cv_visibility_notice"])

        return Response(
            {
                "detail": "CV visibility notice acknowledged.",
                "has_seen_cv_visibility_notice": True,
            },
            status=status.HTTP_200_OK,
        )


class GraduateProfileMeView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def ensure_graduate(self, user):
        if user.role != User.Role.GRADUATE:
            raise PermissionDenied("Only graduates can manage graduate profiles.")

    def get(self, request):
        self.ensure_graduate(request.user)

        profile = (
            GraduateProfile.objects.select_related("user")
            .filter(user=request.user)
            .first()
        )

        if not profile:
            return Response(
                {
                    "id": None,
                    "full_name": request.user.full_name,
                    "email": request.user.email,
                    "education_level": "",
                    "university": "",
                    "degree": "",
                    "grade": "",
                    "years_of_experience": None,
                    "age": None,
                    "location": "",
                    "skills": "",
                    "bio": "",
                    "cv": None,
                    "cv_url": None,
                    "updated_at": None,
                }
            )

        serializer = GraduateProfileSerializer(profile, context={"request": request})
        return Response(serializer.data)

    def patch(self, request):
        return self.save_profile(request, partial=True)

    def put(self, request):
        return self.save_profile(request, partial=False)

    def save_profile(self, request, partial):
        self.ensure_graduate(request.user)

        profile, _ = GraduateProfile.objects.get_or_create(user=request.user)

        serializer = GraduateProfileSerializer(
            profile,
            data=request.data,
            partial=partial,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)


class EmployerStudentsListView(generics.ListAPIView):
    serializer_class = GraduateProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role != User.Role.EMPLOYER:
            raise PermissionDenied("Only employers can view students.")

        qs = GraduateProfile.objects.select_related("user").filter(
            user__role=User.Role.GRADUATE
        )

        search = self.request.query_params.get("search", "").strip()
        education_level = self.request.query_params.get("education_level", "").strip()
        grade = self.request.query_params.get("grade", "").strip()
        location = self.request.query_params.get("location", "").strip()
        university = self.request.query_params.get("university", "").strip()
        degree = self.request.query_params.get("degree", "").strip()

        min_years = self.parse_int(self.request.query_params.get("min_years_of_experience"))
        min_age = self.parse_int(self.request.query_params.get("min_age"))
        max_age = self.parse_int(self.request.query_params.get("max_age"))

        if search:
            qs = qs.filter(
                Q(user__full_name__icontains=search)
                | Q(user__email__icontains=search)
                | Q(university__icontains=search)
                | Q(degree__icontains=search)
                | Q(skills__icontains=search)
                | Q(location__icontains=search)
            )

        if education_level:
            qs = qs.filter(education_level=education_level)

        if grade:
            qs = qs.filter(grade__icontains=grade)

        if location:
            qs = qs.filter(location__icontains=location)

        if university:
            qs = qs.filter(university__icontains=university)

        if degree:
            qs = qs.filter(degree__icontains=degree)

        if min_years is not None:
            qs = qs.filter(years_of_experience__gte=min_years)

        if min_age is not None:
            qs = qs.filter(age__gte=min_age)

        if max_age is not None:
            qs = qs.filter(age__lte=max_age)

        return qs.order_by("-updated_at", "-id")

    def parse_int(self, value):
        if value in [None, ""]:
            return None

        try:
            return int(value)
        except (TypeError, ValueError):
            return None