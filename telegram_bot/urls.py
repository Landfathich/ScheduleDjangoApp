from django.urls import path

from .views import (
    telegram_link_api,
    telegram_outbox_api,
    telegram_outbox_result_api,
)

urlpatterns = [
    path('link/', telegram_link_api, name='telegram_link_api'),
    path('outbox/', telegram_outbox_api, name='telegram_outbox_api'),
    path(
        'outbox/<int:pk>/result/',
        telegram_outbox_result_api,
        name='telegram_outbox_result_api',
    ),
]
