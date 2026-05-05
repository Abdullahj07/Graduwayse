from rest_framework import serializers
from .models import InternalJob


class InternalJobSerializer(serializers.ModelSerializer):
    employer_id = serializers.IntegerField(source="employer.id", read_only=True)
    can_apply_in_app = serializers.SerializerMethodField()

    class Meta:
        model = InternalJob
        fields = [
            "id",
            "title",
            "company_name",
            "location",
            "description",
            "level",
            "category",
            "is_active",
            "employer_id",
            "source",
            "external_url",
            "external_created_at",
            "can_apply_in_app",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "employer_id",
            "source",
            "external_url",
            "external_created_at",
            "can_apply_in_app",
            "created_at",
        ]

    def get_can_apply_in_app(self, obj):
        return obj.can_apply_in_app