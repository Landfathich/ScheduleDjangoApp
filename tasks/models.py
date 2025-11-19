from django.contrib.auth.models import User
from django.db import models


class Task(models.Model):
    STATUS_CHOICES = [
        ('backlog', 'Бэклог'),
        ('todo', 'К выполнению'),
        ('in_progress', 'В работе'),
        ('review', 'На проверке'),
        ('done', 'Завершено'),
    ]

    title = models.CharField(max_length=200, verbose_name="Название")
    description = models.TextField(blank=True, verbose_name="Описание")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='backlog')

    assignee = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                 related_name='assigned_tasks', verbose_name="Исполнитель")
    creator = models.ForeignKey(User, on_delete=models.CASCADE,
                                related_name='created_tasks', verbose_name="Создатель")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    order = models.IntegerField(default=0)  # Для будущей сортировки

    image = models.ImageField(
        upload_to='tasks/images/',
        blank=True,
        null=True,
        verbose_name="Изображение"
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
