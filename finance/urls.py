from django.urls import path

from . import views
from .views import StatsDashboardView, SchoolExpenseCreateView

urlpatterns = [
    path('stats/', StatsDashboardView.as_view(), name='stats_dashboard'),
    path('stats/add-expense/', SchoolExpenseCreateView.as_view(), name='add_school_expense'),
    path('finance/events/create/', views.finance_event_create, name='finance_event_create'),
]
