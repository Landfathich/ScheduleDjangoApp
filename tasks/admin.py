from django.contrib import admin

from .models import Task, Project


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'creator', 'created_at']
    list_filter = ['creator']
    search_fields = ['name']


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'assignee', 'creator', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['title', 'description']
