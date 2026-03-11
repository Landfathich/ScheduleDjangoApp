from django.contrib import admin

from .models import Project, Task, ProjectColumn


class ProjectColumnInline(admin.TabularInline):
    model = ProjectColumn
    extra = 0
    fields = ['name', 'color', 'order']
    verbose_name = "Колонка"
    verbose_name_plural = "Колонки"


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'creator', 'created_at']
    list_filter = ['creator']
    search_fields = ['name']
    inlines = [ProjectColumnInline]


@admin.register(ProjectColumn)
class ProjectColumnAdmin(admin.ModelAdmin):
    list_display = ['name', 'project', 'color', 'order']
    list_editable = ['color', 'order']
    list_filter = ['project']
    search_fields = ['name']


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'project', 'assignee', 'creator', 'created_at']
    list_filter = ['status', 'project']
    search_fields = ['title', 'description']
