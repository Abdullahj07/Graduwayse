import requests

from datetime import datetime, timedelta

from django.conf import settings
from django.db import close_old_connections
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from rest_framework import generics, permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import InternalJob
from .serializers import InternalJobSerializer
from .permissions import IsEmployer


INCLUDE = [
    "graduate",
    "entry",
    "junior",
    "intern",
    "internship",
    "trainee",
    "apprentice",
]

EXCLUDE = [
    "senior",
    "lead",
    "manager",
    "director",
    "principal",
]

MAX_ADZUNA_JOBS = 150
MAX_REED_JOBS = 150


class JobPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


def is_graduate_job(title, description):
    text = f"{title} {description}".lower()

    if any(x in text for x in EXCLUDE):
        return False

    return any(x in text for x in INCLUDE)


def infer_level(title, description):
    text = f"{title} {description}".lower()

    if "intern" in text or "internship" in text:
        return InternalJob.Level.INTERNSHIP

    if "entry" in text or "junior" in text:
        return InternalJob.Level.ENTRY

    return InternalJob.Level.GRADUATE


def infer_category(title, description):
    text = f"{title} {description}".lower()

    if any(x in text for x in [
        "machine learning",
        " ml ",
        " ai ",
        "artificial intelligence",
        "deep learning",
        "nlp",
        "computer vision",
        "llm",
        "data science",
    ]):
        return InternalJob.Category.AI_ML

    if any(x in text for x in [
        "data analyst",
        "data engineer",
        "data scientist",
        "analytics",
        "business intelligence",
        "bi analyst",
        "sql",
        "power bi",
        "tableau",
        "database",
    ]):
        return InternalJob.Category.DATA

    if any(x in text for x in [
        "cyber",
        "cybersecurity",
        "security analyst",
        "soc analyst",
        "information security",
        "penetration tester",
        "infosec",
        "network security",
    ]):
        return InternalJob.Category.CYBER

    if any(x in text for x in [
        "devops",
        "cloud engineer",
        "cloud",
        "aws",
        "azure",
        "gcp",
        "platform engineer",
        "site reliability",
        "sre",
        "infrastructure",
    ]):
        return InternalJob.Category.CLOUD_DEVOPS

    if any(x in text for x in [
        "it support",
        "service desk",
        "helpdesk",
        "desktop support",
        "technical support",
        "support analyst",
    ]):
        return InternalJob.Category.IT_SUPPORT

    if any(x in text for x in [
        "product manager",
        "product analyst",
        "product owner",
        "associate product",
    ]):
        return InternalJob.Category.PRODUCT

    if any(x in text for x in [
        "marketing",
        "marketing assistant",
        "digital marketing",
        "social media",
        "communications",
        "public relations",
        "sales",
        "commercial",
        "business analyst",
        "operations analyst",
        "operations assistant",
        "consulting",
        "consultant",
        "project coordinator",
        "project analyst",
        "finance",
        "accounting",
        "human resources",
        "hr assistant",
        "recruitment",
        "admin",
        "administrator",
    ]):
        return InternalJob.Category.BUSINESS

    if any(x in text for x in [
        "software",
        "developer",
        "engineer",
        "frontend",
        "front-end",
        "backend",
        "back-end",
        "full stack",
        "full-stack",
        "web developer",
        "mobile developer",
        "python",
        "java",
        "javascript",
        "react",
        "django",
        "node",
        "typescript",
        "c++",
        "c#",
        ".net",
    ]):
        return InternalJob.Category.SOFTWARE

    return InternalJob.Category.OTHER

def parse_external_created(value):
    if not value:
        return None

    parsed = parse_datetime(value)
    if parsed:
        return parsed

    possible_formats = [
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S",
    ]

    for fmt in possible_formats:
        try:
            return datetime.strptime(value, fmt)
        except Exception:
            continue

    return None


def fetch_adzuna_jobs():
    close_old_connections()

    app_id = settings.ADZUNA_APP_ID
    app_key = settings.ADZUNA_APP_KEY

    if not app_id or not app_key:
        raise Exception("Adzuna credentials are missing in settings.")

    created_count = 0
    updated_count = 0
    skipped_count = 0

    search_terms = [
        "graduate software engineer",
        "junior developer",
        "entry level software",
        "graduate data analyst",
        "internship technology",
        "trainee developer",
    ]

    seen_external_ids = set()

    for search_term in search_terms:
        for page in range(1, 4):
            url = f"https://api.adzuna.com/v1/api/jobs/gb/search/{page}"

            params = {
                "app_id": app_id,
                "app_key": app_key,
                "results_per_page": 25,
                "what": search_term,
                "sort_by": "date",
            }

            try:
                res = requests.get(url, params=params, timeout=20)

                if res.status_code in [429, 500, 502, 503, 504]:
                    skipped_count += 1
                    continue

                res.raise_for_status()
                data = res.json()

            except (requests.exceptions.RequestException, ValueError):
                skipped_count += 1
                continue

            results = data.get("results", [])

            if not results:
                continue

            for job in results:
                title = str(job.get("title", ""))
                description = str(job.get("description", ""))
                external_id = str(job.get("id", "")).strip()

                if not external_id:
                    skipped_count += 1
                    continue

                if external_id in seen_external_ids:
                    continue

                seen_external_ids.add(external_id)

                if not is_graduate_job(title, description):
                    skipped_count += 1
                    continue

                company_name = job.get("company", {}).get("display_name", "") or "Unknown company"
                location = job.get("location", {}).get("display_name", "") or ""
                external_url = job.get("redirect_url", "") or ""
                external_created_at = parse_external_created(job.get("created"))

                _, created = InternalJob.objects.update_or_create(
                    source=InternalJob.Source.ADZUNA,
                    external_id=external_id,
                    defaults={
                        "title": title[:200],
                        "company_name": company_name[:200],
                        "location": location[:200],
                        "description": description,
                        "level": infer_level(title, description),
                        "category": infer_category(title, description),
                        "external_url": external_url,
                        "external_created_at": external_created_at,
                        "employer": None,
                        "is_active": True,
                    },
                )

                if created:
                    created_count += 1
                else:
                    updated_count += 1

    latest_ids = list(
        InternalJob.objects.filter(source=InternalJob.Source.ADZUNA)
        .order_by("-external_created_at", "-created_at")
        .values_list("id", flat=True)[:MAX_ADZUNA_JOBS]
    )

    InternalJob.objects.filter(source=InternalJob.Source.ADZUNA).exclude(
        id__in=latest_ids
    ).update(is_active=False)

    InternalJob.objects.filter(id__in=latest_ids).update(is_active=True)

    close_old_connections()

    return {
        "created": created_count,
        "updated": updated_count,
        "skipped": skipped_count,
        "kept_active": len(latest_ids),
    }


def fetch_reed_jobs():
    close_old_connections()

    api_key = getattr(settings, "REED_API_KEY", "")
    if not api_key:
        raise Exception("Reed API key is missing in settings.")

    created_count = 0
    updated_count = 0
    skipped_count = 0

    search_terms = [
        "graduate software engineer",
        "junior developer",
        "entry level software",
        "graduate data analyst",
        "internship technology",
        "trainee developer",
    ]

    seen_external_ids = set()

    for search_term in search_terms:
        for offset in [0, 25, 50]:
            url = "https://www.reed.co.uk/api/1.0/search"

            params = {
                "keywords": search_term,
                "resultsToTake": 25,
                "resultsToSkip": offset,
                "graduate": True,
            }

            try:
                res = requests.get(
                    url,
                    params=params,
                    auth=(api_key, ""),
                    timeout=20,
                )

                if res.status_code in [429, 500, 502, 503, 504]:
                    skipped_count += 1
                    continue

                res.raise_for_status()
                data = res.json()

            except (requests.exceptions.RequestException, ValueError):
                skipped_count += 1
                continue

            results = data.get("results", [])

            if not results:
                continue

            for job in results:
                title = str(job.get("jobTitle", ""))
                description = str(job.get("jobDescription", ""))
                external_id = str(job.get("jobId", "")).strip()

                if not external_id:
                    skipped_count += 1
                    continue

                if external_id in seen_external_ids:
                    continue

                seen_external_ids.add(external_id)

                if not is_graduate_job(title, description):
                    skipped_count += 1
                    continue

                company_name = job.get("employerName", "") or "Unknown company"
                location = job.get("locationName", "") or ""
                external_url = job.get("jobUrl", "") or ""
                external_created_at = parse_external_created(job.get("date"))

                _, created = InternalJob.objects.update_or_create(
                    source=InternalJob.Source.REED,
                    external_id=external_id,
                    defaults={
                        "title": title[:200],
                        "company_name": company_name[:200],
                        "location": location[:200],
                        "description": description,
                        "level": infer_level(title, description),
                        "category": infer_category(title, description),
                        "external_url": external_url,
                        "external_created_at": external_created_at,
                        "employer": None,
                        "is_active": True,
                    },
                )

                if created:
                    created_count += 1
                else:
                    updated_count += 1

    latest_ids = list(
        InternalJob.objects.filter(source=InternalJob.Source.REED)
        .order_by("-external_created_at", "-created_at")
        .values_list("id", flat=True)[:MAX_REED_JOBS]
    )

    InternalJob.objects.filter(source=InternalJob.Source.REED).exclude(
        id__in=latest_ids
    ).update(is_active=False)

    InternalJob.objects.filter(id__in=latest_ids).update(is_active=True)

    close_old_connections()

    return {
        "created": created_count,
        "updated": updated_count,
        "skipped": skipped_count,
        "kept_active": len(latest_ids),
    }


class InternalJobListCreateView(generics.ListCreateAPIView):
    serializer_class = InternalJobSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = JobPagination

    def get_queryset(self):
        queryset = InternalJob.objects.filter(is_active=True)

        source = self.request.query_params.get("source")
        level = self.request.query_params.get("level")
        category = self.request.query_params.get("category")
        ordering = self.request.query_params.get("ordering")

        source = source.upper() if source else None

        if source == "MANUAL":
            cutoff_date = timezone.now() - timedelta(days=14)
            queryset = queryset.filter(
                source=InternalJob.Source.MANUAL,
                created_at__gte=cutoff_date,
            ).order_by("-created_at")

        elif source == "ADZUNA":
            queryset = queryset.filter(source=InternalJob.Source.ADZUNA)
            queryset = queryset.order_by("-external_created_at", "-created_at")

        elif source == "REED":
            queryset = queryset.filter(source=InternalJob.Source.REED)
            queryset = queryset.order_by("-external_created_at", "-created_at")

        else:
            queryset = queryset.order_by("-created_at")

        if level and level != "ALL":
            queryset = queryset.filter(level=level)

        if category and category != "ALL":
            queryset = queryset.filter(category=category)

        if ordering == "latest_adzuna" and source == "ADZUNA":
            queryset = queryset.order_by("-external_created_at", "-created_at")

        if ordering == "latest_reed" and source == "REED":
            queryset = queryset.order_by("-external_created_at", "-created_at")

        return queryset

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsEmployer()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(
            employer=self.request.user,
            source=InternalJob.Source.MANUAL,
            category=InternalJob.Category.OTHER,
            is_active=True,
        )


class MyInternalJobsView(generics.ListAPIView):
    serializer_class = InternalJobSerializer
    permission_classes = [permissions.IsAuthenticated, IsEmployer]

    def get_queryset(self):
        return InternalJob.objects.filter(
            employer=self.request.user,
            source=InternalJob.Source.MANUAL,
            is_active=True,
        ).order_by("-created_at")


class InternalJobDetailView(generics.RetrieveAPIView):
    serializer_class = InternalJobSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return InternalJob.objects.filter(is_active=True)


class EmployerRemoveInternalJobView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        user_role = str(getattr(request.user, "role", "")).upper()

        if user_role != "EMPLOYER":
            return Response(
                {"detail": "Only employers can remove job listings."},
                status=status.HTTP_403_FORBIDDEN,
            )

        job = InternalJob.objects.filter(
            id=pk,
            employer=request.user,
            source=InternalJob.Source.MANUAL,
        ).first()

        if not job:
            return Response(
                {"detail": "Job listing not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        job.is_active = False
        job.save(update_fields=["is_active"])

        return Response(
            {"detail": "Job listing removed successfully."},
            status=status.HTTP_200_OK,
        )


class GraduateActiveInternalJobsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cutoff_date = timezone.now() - timedelta(days=14)

        jobs = (
            InternalJob.objects.filter(
                is_active=True,
                source=InternalJob.Source.MANUAL,
                created_at__gte=cutoff_date,
            )
            .select_related("employer")
            .order_by("-created_at")
        )

        serializer = InternalJobSerializer(
            jobs,
            many=True,
            context={"request": request},
        )

        return Response(serializer.data, status=status.HTTP_200_OK)


class SyncAdzunaView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            result = fetch_adzuna_jobs()
            return Response(
                {
                    "status": "synced",
                    "detail": "Adzuna jobs synced successfully. Some unavailable results may have been skipped.",
                    **result,
                },
                status=status.HTTP_200_OK,
            )
        except Exception:
            return Response(
                {
                    "detail": "Adzuna is temporarily unavailable. Please try again later."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    def post(self, request):
        try:
            result = fetch_adzuna_jobs()
            return Response(
                {
                    "status": "synced",
                    "detail": "Adzuna jobs synced successfully. Some unavailable results may have been skipped.",
                    **result,
                },
                status=status.HTTP_200_OK,
            )
        except Exception:
            return Response(
                {
                    "detail": "Adzuna is temporarily unavailable. Please try again later."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class SyncReedView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            result = fetch_reed_jobs()
            return Response(
                {
                    "status": "synced",
                    "detail": "Reed jobs synced successfully. Some unavailable results may have been skipped.",
                    **result,
                },
                status=status.HTTP_200_OK,
            )
        except Exception:
            return Response(
                {
                    "detail": "Reed is temporarily unavailable. Please try again later."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    def post(self, request):
        try:
            result = fetch_reed_jobs()
            return Response(
                {
                    "status": "synced",
                    "detail": "Reed jobs synced successfully. Some unavailable results may have been skipped.",
                    **result,
                },
                status=status.HTTP_200_OK,
            )
        except Exception:
            return Response(
                {
                    "detail": "Reed is temporarily unavailable. Please try again later."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )