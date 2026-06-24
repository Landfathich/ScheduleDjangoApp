from django.urls import path

from .api_views import LeadCreateAPIView
from .views import lead_list, convert_lead, lead_to_client_form

urlpatterns = [
    path('api/leads/', LeadCreateAPIView.as_view(), name='api-lead-create'),
    path('leads/', lead_list, name='lead-list'),
    path('leads/convert/<int:lead_id>/', lead_to_client_form, name='convert-lead-form'),
    path('leads/convert/<int:lead_id>/submit/', convert_lead, name='convert-lead-submit'),
]
