from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db import transaction
from django.utils import timezone


class SchoolExpense(models.Model):
    EXPENSE_CATEGORIES = [
        ('advertising', 'Реклама'),
        ('software', 'Софт/Подписки'),
        ('taxes', 'Налоги'),
        ('salary', 'Зарплата'),
        ('other', 'Другое'),
    ]

    category = models.CharField(
        max_length=20,
        choices=EXPENSE_CATEGORIES,
        verbose_name='Категория расхода'
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Сумма'
    )
    description = models.CharField(
        max_length=200,
        verbose_name='Описание'
    )
    expense_date = models.DateField(
        default=timezone.now,
        verbose_name='Дата расхода'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Расход школы'
        verbose_name_plural = 'Расходы школы'
        ordering = ['-expense_date']

    def __str__(self):
        return f"{self.get_category_display()} - {self.amount} ₽ ({self.expense_date})"


class FinanceEvent(models.Model):
    EVENT_INCOME = 'INCOME'
    EVENT_EXPENSE = 'EXPENSE'
    EVENT_RESERVE = 'RESERVE'
    EVENT_RELEASE = 'RELEASE'

    EVENT_TYPES = [
        (EVENT_INCOME, 'Доход'),
        (EVENT_EXPENSE, 'Расход'),
        (EVENT_RESERVE, 'Резервирование'),
        (EVENT_RELEASE, 'Снятие резерва'),
    ]

    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    amount = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    currency = models.CharField(max_length=3, default='RUB')
    metadata = models.JSONField(default=dict, blank=True)
    external_id = models.CharField(max_length=128, null=True, blank=True, unique=True,
                                   help_text="Опциональный уникальный ключ от внешней системы для идемпотентности")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                   on_delete=models.SET_NULL, related_name='finance_events')
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:

        verbose_name = 'Финансовое событие'
        verbose_name_plural = 'Финансовые события'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['created_at']),
            models.Index(fields=['event_type']),
        ]

    def __str__(self):
        return f"{self.get_event_type_display()} {self.amount} {self.currency} at {self.created_at.isoformat()}"

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("FinanceEvent is immutable and cannot be updated once created.")
        super().save(*args, **kwargs)

    @classmethod
    def create_idempotent(cls, *, external_id=None, **kwargs):
        if external_id:
            with transaction.atomic():
                obj, created = cls.objects.get_or_create(external_id=external_id, defaults=kwargs)
                return obj, created
        else:
            obj = cls(**kwargs)
            obj.save()
            return obj, True


class FinanceSnapshot(models.Model):
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    total_balance = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    reserved_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))
    free_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0.00'))

    last_event_link = models.ForeignKey(
        'FinanceEvent',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='snapshots',
        verbose_name='Последнее событие',
    )

    class Meta:
        verbose_name = 'Снапшот баланса'
        verbose_name_plural = 'Снапшоты баланса'
        ordering = ['-created_at']

    def __str__(self):
        return f"Snapshot @ {self.created_at.isoformat()} total={self.total_balance} reserved={self.reserved_amount}"
