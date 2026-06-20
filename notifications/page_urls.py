from django.urls import path

from .views import notifications_page

urlpatterns = [
    path('', notifications_page, name='notifications_page'),
]
