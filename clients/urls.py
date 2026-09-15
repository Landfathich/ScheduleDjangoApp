from django.urls import path

from . import views
from .api_views import LeadCreateAPIView

urlpatterns = [
    path('', views.client_list, name='client-list'),
    path('api/leads/', LeadCreateAPIView.as_view(), name='api-lead-create'),
    path('<int:client_id>/status/', views.update_client_status, name='update-client-status'),
    path('<int:client_id>/', views.client_detail, name='client-detail'),
]
