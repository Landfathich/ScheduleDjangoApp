from django.contrib import admin

from .models import TelegramAccount


@admin.register(TelegramAccount)
class TelegramAccountAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'username',
        'chat_id',
        'is_active',
        'created_at',
    )
    list_filter = ('is_active',)
    search_fields = (
        'user__username',
        'username',
        'chat_id',
    )
