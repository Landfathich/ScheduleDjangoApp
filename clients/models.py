from django.contrib.auth.models import User
from django.db import models

from core.models import Client


class ClientStatusHistory(models.Model):
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='status_history',
        verbose_name='Клиент'
    )
    old_status = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Старый статус'
    )
    new_status = models.CharField(
        max_length=20,
        verbose_name='Новый статус'
    )
    reason = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Причина'
    )
    changed_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата изменения'
    )
    changed_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name='Кто изменил'
    )

    class Meta:
        verbose_name = 'История статуса клиента'
        verbose_name_plural = 'История статусов клиентов'
        ordering = ['-changed_at']
