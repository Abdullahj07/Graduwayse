from rest_framework import serializers
from .models import User, GraduateProfile


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    phone_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ("email", "password", "full_name", "role", "phone_number")

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class VerifyEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6, min_length=6)


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()


class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "full_name",
            "role",
            "email_verified",
            "phone_number",
            "phone_verified",
            "has_seen_cv_visibility_notice",
        )


class GraduateProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", required=False, allow_blank=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    cv_url = serializers.SerializerMethodField()

    class Meta:
        model = GraduateProfile
        fields = [
            "id",
            "full_name",
            "email",
            "education_level",
            "university",
            "degree",
            "grade",
            "years_of_experience",
            "age",
            "location",
            "skills",
            "bio",
            "cv",
            "cv_url",
            "updated_at",
        ]
        read_only_fields = ["id", "email", "cv_url", "updated_at"]

    def to_internal_value(self, data):
        mutable = data.copy()

        for field in ["age", "years_of_experience"]:
            if mutable.get(field) == "":
                mutable[field] = None

        return super().to_internal_value(mutable)

    def validate_age(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Age must be greater than 0.")
        return value

    def validate_years_of_experience(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Years of experience cannot be negative.")
        return value

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        full_name = user_data.get("full_name")

        if full_name is not None:
            instance.user.full_name = full_name
            instance.user.save(update_fields=["full_name"])

        return super().update(instance, validated_data)

    def get_cv_url(self, obj):
        if not obj.cv:
            return None

        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.cv.url)
        return obj.cv.url