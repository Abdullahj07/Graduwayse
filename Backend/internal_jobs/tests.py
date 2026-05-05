from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from internal_jobs.models import InternalJob

User = get_user_model()

INTERNAL_JOBS_BASE_URL = "/api/internal-jobs"


class InternalJobApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()

        self.employer = User.objects.create_user(
            email="employer@test.com",
            password="TestPass123!",
            full_name="Employer User",
            role=User.Role.EMPLOYER,
            email_verified=True,
        )

        self.second_employer = User.objects.create_user(
            email="employer2@test.com",
            password="TestPass123!",
            full_name="Second Employer",
            role=User.Role.EMPLOYER,
            email_verified=True,
        )

        self.graduate = User.objects.create_user(
            email="graduate@test.com",
            password="TestPass123!",
            full_name="Graduate User",
            role=User.Role.GRADUATE,
            email_verified=True,
        )

        self.manual_job = InternalJob.objects.create(
            title="Graduate Software Engineer",
            company_name="Tech Co",
            location="London",
            description="Graduate software role",
            level=InternalJob.Level.GRADUATE,
            category=InternalJob.Category.SOFTWARE,
            source=InternalJob.Source.MANUAL,
            employer=self.employer,
            is_active=True,
        )

        self.reed_job = InternalJob.objects.create(
            title="Graduate Data Analyst",
            company_name="Data Co",
            location="Remote",
            description="Graduate data role",
            level=InternalJob.Level.GRADUATE,
            category=InternalJob.Category.DATA,
            source=InternalJob.Source.REED,
            external_id="reed-1",
            external_url="https://example.com/reed-job",
            is_active=True,
        )

        self.inactive_job = InternalJob.objects.create(
            title="Inactive Job",
            company_name="Hidden Co",
            location="Manchester",
            description="Should not appear",
            level=InternalJob.Level.ENTRY,
            category=InternalJob.Category.OTHER,
            source=InternalJob.Source.MANUAL,
            employer=self.employer,
            is_active=False,
        )

    def get_response_items(self, response):
        if isinstance(response.data, dict) and "results" in response.data:
            return response.data["results"]
        return response.data

    def test_authenticated_user_can_list_active_jobs(self):
        self.client.force_authenticate(user=self.graduate)

        response = self.client.get(f"{INTERNAL_JOBS_BASE_URL}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        jobs = self.get_response_items(response)
        self.assertEqual(len(jobs), 2)

        returned_job_ids = [job["id"] for job in jobs]
        self.assertIn(self.manual_job.id, returned_job_ids)
        self.assertIn(self.reed_job.id, returned_job_ids)
        self.assertNotIn(self.inactive_job.id, returned_job_ids)

    def test_unauthenticated_user_cannot_list_jobs(self):
        response = self.client.get(f"{INTERNAL_JOBS_BASE_URL}/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_employer_can_create_manual_job(self):
        self.client.force_authenticate(user=self.employer)

        payload = {
            "title": "New Graduate Developer",
            "company_name": "Build Co",
            "location": "Birmingham",
            "description": "New graduate role",
            "level": "GRADUATE",
            "category": "SOFTWARE",
        }

        response = self.client.post(
            f"{INTERNAL_JOBS_BASE_URL}/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "New Graduate Developer")
        job = InternalJob.objects.get(title="New Graduate Developer")
        self.assertEqual(job.source, InternalJob.Source.MANUAL)
        self.assertEqual(job.employer, self.employer)

    def test_graduate_cannot_create_manual_job(self):
        self.client.force_authenticate(user=self.graduate)

        payload = {
            "title": "Unauthorized Job",
            "company_name": "No Access Ltd",
            "location": "London",
            "description": "This should fail",
            "level": "GRADUATE",
            "category": "SOFTWARE",
        }

        response = self.client.post(
            f"{INTERNAL_JOBS_BASE_URL}/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_my_internal_jobs_returns_only_current_employers_jobs(self):
        second_employer_job = InternalJob.objects.create(
            title="Second Employer Job",
            company_name="Another Co",
            location="Leeds",
            description="Another job",
            level=InternalJob.Level.ENTRY,
            category=InternalJob.Category.OTHER,
            source=InternalJob.Source.MANUAL,
            employer=self.second_employer,
            is_active=True,
        )

        self.client.force_authenticate(user=self.employer)
        response = self.client.get(f"{INTERNAL_JOBS_BASE_URL}/mine/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        jobs = self.get_response_items(response)
        returned_job_ids = [job["id"] for job in jobs]

        self.assertIn(self.manual_job.id, returned_job_ids)
        self.assertIn(self.inactive_job.id, returned_job_ids)
        self.assertNotIn(second_employer_job.id, returned_job_ids)

    def test_job_detail_returns_only_active_job(self):
        self.client.force_authenticate(user=self.graduate)

        active_response = self.client.get(
            f"{INTERNAL_JOBS_BASE_URL}/{self.manual_job.id}/"
        )
        inactive_response = self.client.get(
            f"{INTERNAL_JOBS_BASE_URL}/{self.inactive_job.id}/"
        )
        self.assertEqual(active_response.status_code, status.HTTP_200_OK)
        self.assertEqual(inactive_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_source_filter_returns_only_reed_jobs(self):
        self.client.force_authenticate(user=self.graduate)
        response = self.client.get(f"{INTERNAL_JOBS_BASE_URL}/?source=REED")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        jobs = self.get_response_items(response)
        self.assertEqual(len(jobs), 1)
        self.assertEqual(jobs[0]["source"], "REED")
        self.assertEqual(jobs[0]["id"], self.reed_job.id)

    def test_can_apply_in_app_true_for_manual_jobs(self):
        self.client.force_authenticate(user=self.graduate)
        response = self.client.get(f"{INTERNAL_JOBS_BASE_URL}/{self.manual_job.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["can_apply_in_app"])

    def test_can_apply_in_app_false_for_external_jobs(self):
        self.client.force_authenticate(user=self.graduate)
        response = self.client.get(f"{INTERNAL_JOBS_BASE_URL}/{self.reed_job.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["can_apply_in_app"])