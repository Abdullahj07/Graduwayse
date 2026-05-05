from django.urls import path
from .views import (
    InternalJobListCreateView,
    MyInternalJobsView,
    InternalJobDetailView,
    SyncAdzunaView,
    SyncReedView,
)

urlpatterns = [
    path("", InternalJobListCreateView.as_view()),
    path("mine/", MyInternalJobsView.as_view()),
    path("sync/", SyncAdzunaView.as_view()),
    path("sync-reed/", SyncReedView.as_view()),
    path("<int:pk>/", InternalJobDetailView.as_view()),
]
