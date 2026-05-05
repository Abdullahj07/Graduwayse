from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from users.models import GraduateProfile

User = get_user_model()

AUTH_BASE_URL = "/api/auth"
GRADUATES_LIST_URL = f"{AUTH_BASE_URL}/graduates/"


class UserApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.verified_graduate = User.objects.create_user(
            email="graduate@test.com",
            password="TestPass123!",
            full_name="Verified Graduate",
            role=User.Role.GRADUATE,
            email_verified=True,
        )
        self.verified_employer = User.objects.create_user(
            email="employer@test.com",
            password="TestPass123!",
            full_name="Verified Employer",
            role=User.Role.EMPLOYER,
            email_verified=True,
        )
        self.unverified_user = User.objects.create_user(
            email="unverified@test.com",
            password="TestPass123!",
            full_name="Unverified User",
            role=User.Role.GRADUATE,
            email_verified=False,
        )

    def get_response_items(self, response):
        """
        Supports both paginated and non-paginated DRF responses.
        """
        if isinstance(response.data, dict) and "results" in response.data:
            return response.data["results"]
        return response.data

    def test_register_creates_user_and_hashes_password(self):
        payload = {
            "email": "newuser@test.com",
            "password": "SecurePass123!",
            "full_name": "New User",
            "role": "GRADUATE",
            "phone_number": "07123456789",
        }

        response = self.client.post(
            f"{AUTH_BASE_URL}/register/",
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="newuser@test.com").exists())
        user = User.objects.get(email="newuser@test.com")
        self.assertNotEqual(user.password, payload["password"])
        self.assertTrue(user.check_password(payload["password"]))

    def test_verified_user_can_login(self):
        payload = {
            "email": "graduate@test.com",
            "password": "TestPass123!",
        }

        response = self.client.post(
            f"{AUTH_BASE_URL}/login/",
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_unverified_user_cannot_login(self):
        payload = {
            "email": "unverified@test.com",
            "password": "TestPass123!",
        }

        response = self.client.post(
            f"{AUTH_BASE_URL}/login/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("detail", str(response.data))

    def test_me_requires_authentication(self):
        response = self.client.get(f"{AUTH_BASE_URL}/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_authenticated_user(self):
        self.client.force_authenticate(user=self.verified_graduate)
        response = self.client.get(f"{AUTH_BASE_URL}/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "graduate@test.com")
        self.assertEqual(response.data["role"], "GRADUATE")

    def test_graduate_can_acknowledge_cv_visibility_notice(self):
        self.client.force_authenticate(user=self.verified_graduate)
        response = self.client.post(f"{AUTH_BASE_URL}/acknowledge-cv-visibility/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.verified_graduate.refresh_from_db()
        self.assertTrue(self.verified_graduate.has_seen_cv_visibility_notice)

    def test_employer_cannot_acknowledge_cv_visibility_notice(self):
        self.client.force_authenticate(user=self.verified_employer)
        response = self.client.post(f"{AUTH_BASE_URL}/acknowledge-cv-visibility/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_graduate_can_create_or_update_own_profile(self):
        self.client.force_authenticate(user=self.verified_graduate)

        payload = {
            "full_name": "Updated Graduate",
            "education_level": "BACHELORS",
            "university": "Queen Mary University of London",
            "degree": "Computer Science",
            "grade": "First",
            "years_of_experience": 1,
            "age": 22,
            "location": "London",
            "skills": "Python, Django, React",
            "bio": "Graduate developer profile",
        }

        response = self.client.patch(
            f"{AUTH_BASE_URL}/graduate-profile/me/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["full_name"], "Updated Graduate")
        self.assertEqual(response.data["university"], "Queen Mary University of London")
        profile = GraduateProfile.objects.get(user=self.verified_graduate)
        self.assertEqual(profile.degree, "Computer Science")
        self.assertEqual(profile.age, 22)

    def test_employer_cannot_access_graduate_profile_me(self):
        self.client.force_authenticate(user=self.verified_employer)
        response = self.client.get(f"{AUTH_BASE_URL}/graduate-profile/me/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_only_employers_can_view_graduates_list(self):
        self.client.force_authenticate(user=self.verified_employer)

        GraduateProfile.objects.update_or_create(
            user=self.verified_graduate,
            defaults={
                "education_level": "BACHELORS",
                "university": "QMUL",
                "degree": "Computer Science",
                "location": "London",
            },
        )

        response = self.client.get(GRADUATES_LIST_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        graduates = self.get_response_items(response)
        self.assertGreaterEqual(len(graduates), 1)

    def test_graduate_cannot_view_graduates_list(self):
        self.client.force_authenticate(user=self.verified_graduate)
        response = self.client.get(GRADUATES_LIST_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)