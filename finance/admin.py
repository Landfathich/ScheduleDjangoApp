from django.contrib import admin

from finance.models import SchoolExpense


@admin.register(SchoolExpense)
class SchoolExpenseAdmin(admin.ModelAdmin):
    list_display = ['category_display', 'amount', 'description', 'expense_date', 'created_at']
    list_filter = ['category', 'expense_date', 'created_at']
    search_fields = ['description', 'amount']
    date_hierarchy = 'expense_date'
    ordering = ['-expense_date']
    list_per_page = 20

    fieldsets = (
        ('Основная информация', {
            'fields': ('category', 'amount', 'description', 'recipient', 'initiator', 'expense_date')
        }),
        ('Системная информация', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ['created_at', 'initiator', 'expense_date']

    def category_display(self, obj):
        return obj.get_category_display()

    category_display.short_description = 'Категория'

    # Действия
    actions = ['mark_as_advertising', 'mark_as_software']

    def mark_as_advertising(self, request, queryset):
        updated = queryset.update(category='advertising')
        self.message_user(request, f'{updated} расходов помечено как "Реклама"')

    mark_as_advertising.short_description = 'Пометить как Реклама'

    def mark_as_software(self, request, queryset):
        updated = queryset.update(category='software')
        self.message_user(request, f'{updated} расходов помечено как "Софт/Подписки"')

    mark_as_software.short_description = 'Пометить как Софт/Подписки'


from django.contrib import admin
from .models import FinanceEvent, FinanceSnapshot


@admin.register(FinanceEvent)
class FinanceEventAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'event_type', 'amount', 'currency',
        'created_at', 'created_by', 'external_id'
    )
    list_filter = (
        'event_type', 'currency', 'created_at',
    )
    search_fields = (
        'external_id', 'metadata', 'created_by__username'
    )
    readonly_fields = (
        'id', 'created_at', 'created_by'
    )
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Основное', {
            'fields': (
                'id', 'event_type', 'amount', 'currency', 'created_by'
            )
        }),
        ('Дополнительно', {
            'fields': (
                'external_id', 'metadata', 'created_at'
            ),
            'classes': ('collapse',),
        }),
    )

    def has_change_permission(self, request, obj=None):
        # FinanceEvent immutable — нельзя редактировать после создания
        if obj:
            return False
        return super().has_change_permission(request, obj)


@admin.register(FinanceSnapshot)
class FinanceSnapshotAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'created_at',
        'total_balance', 'reserved_amount', 'free_amount',
        'last_event_link'
    )
    list_filter = ('created_at',)
    readonly_fields = (
        'id', 'created_at', 'total_balance',
        'reserved_amount', 'free_amount', 'last_event_link'
    )
    search_fields = ('total_balance',)
    ordering = ('-created_at',)

    def has_add_permission(self, request):
        # Снапшоты создаются системой, а не вручную
        return False

    def has_change_permission(self, request, obj=None):
        # Снапшоты нельзя изменять вручную
        return False
