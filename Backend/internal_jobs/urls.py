from django.urls import path

from .views import (
    EmployerRemoveInternalJobView,
    GraduateActiveInternalJobsView,
    InternalJobDetailView,
    InternalJobListCreateView,
    MyInternalJobsView,
    SyncAdzunaView,
    SyncReedView,
)

urlpatterns = [
    path("", InternalJobListCreateView.as_view()),
    path("mine/", MyInternalJobsView.as_view()),
    path("sync/", SyncAdzunaView.as_view()),
    path("sync-reed/", SyncReedView.as_view()),
    path(
        "graduate/active/",
        GraduateActiveInternalJobsView.as_view(),
        name="graduate-active-internal-jobs",
    ),
    path(
        "employer/jobs/<int:pk>/remove/",
        EmployerRemoveInternalJobView.as_view(),
        name="employer-remove-internal-job",
    ),
    path("<int:pk>/", InternalJobDetailView.as_view()),
]
