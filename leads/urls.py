from django.urls import path

from .api_views import LeadCreateAPIView
from .views import lead_list

urlpatterns = [
    path('api/leads/', LeadCreateAPIView.as_view(), name='api-lead-create'),
    path('leads/', lead_list, name='lead-list'),
]
