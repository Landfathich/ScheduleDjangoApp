from django.contrib import admin

from .models import Lead


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'email', 'course', 'source', 'created_at']
    list_filter = ['source', 'course', 'created_at']
    search_fields = ['name', 'phone', 'email']
    ordering = ['-created_at']
    readonly_fields = ['created_at']
