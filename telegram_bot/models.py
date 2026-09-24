import uuid

from django.conf import settings
from django.db import models


class TelegramAccount(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='telegram_account'
    )
    chat_id = models.BigIntegerField(
        unique=True,
        null=True,
        blank=True
    )
    username = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    link_token = models.UUIDField(
        default=uuid.uuid4,
        editable=False
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Telegram-аккаунт'
        verbose_name_plural = 'Telegram-аккаунты'

    def __str__(self):
        return f'{self.user} — Telegram'
