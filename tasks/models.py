from django.contrib.auth.models import User
from django.db import models


class Project(models.Model):
    name = models.CharField(max_length=200, verbose_name="Название проекта")
    description = models.TextField(blank=True, verbose_name="Описание")
    color = models.CharField(max_length=7, default="#336699")
    creator = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Проект"
        verbose_name_plural = "Проекты"

    def __str__(self):
        return self.name


class ProjectColumn(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='columns')
    name = models.CharField(max_length=100, verbose_name="Название колонки")
    color = models.CharField(max_length=7, default="#336699", verbose_name="Цвет колонки")
    order = models.IntegerField(default=0, verbose_name="Порядок сортировки")

    class Meta:
        ordering = ['order']
        verbose_name = "Колонка проекта"
        verbose_name_plural = "Колонки проектов"

    def __str__(self):
        return f"{self.project.name} - {self.name}"


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

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    column = models.ForeignKey(
        'ProjectColumn',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks',
        verbose_name="Колонка"
    )

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
        verbose_name = "Задача"
        verbose_name_plural = "Задачи"

    def __str__(self):
        return self.title
