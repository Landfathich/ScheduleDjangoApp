from django.contrib import admin

from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'assignee', 'creator', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['title', 'description']
