# applications/urls.py
from django.urls import path
from .views import (
    ApplyForJobView,
    MyApplicationsView,
    EmployerJobApplicationsView,
    UpdateApplicationStatusView,
)

urlpatterns = [
    path("apply/", ApplyForJobView.as_view(), name="apply-job"),
    path("mine/", MyApplicationsView.as_view(), name="my-applications"),
    path("job/<int:job_id>/", EmployerJobApplicationsView.as_view(), name="job-applications"),
    path("<int:pk>/status/", UpdateApplicationStatusView.as_view(), name="update-application-status"),
]
