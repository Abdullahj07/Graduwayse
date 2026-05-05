from django.contrib import admin
from .models import InternalJob


@admin.register(InternalJob)
class InternalJobAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "company_name", "source", "is_active")
    list_filter = ("source", "is_active")
    search_fields = ("title", "company_name")

# Register your models here.
