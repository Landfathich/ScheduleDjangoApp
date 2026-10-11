from datetime import timedelta

from django import forms
from django.contrib import admin
from django.utils import timezone
from django_admin_inline_paginator.admin import TabularInlinePaginated
from safedelete.admin import SafeDeleteAdmin

from core.forms import LessonAdminForm
from core.models import Teacher, Student, Lesson, OpenSlots, BalanceOperation, Client, PhoneNumber, TeacherPayment, \
    DeletedClient, UserSettings


class TeacherPaymentInline(admin.TabularInline):  # или admin.StackedInline
    model = TeacherPayment
    extra = 0  # Не показывать пустые формы для добавления
    readonly_fields = ('week_start_date', 'lessons_count', 'amount', 'is_paid', 'payment_date')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False  # Запрещаем добавлять выплаты через inline


class OpenSlotsInline(admin.StackedInline):  # Или TabularInline для компактного вида
    model = OpenSlots
    extra = 0  # Не показывать пустые формы для новых слотов
    max_num = 1  # Максимум 1 объект на преподавателя
    fields = ('weekly_open_slots',)
    can_delete = True  # Разрешить удаление слотов

    def has_add_permission(self, request, obj=None):
        # Запретить создание новых слотов (только через редактирование)
        return False


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    inlines = [TeacherPaymentInline, OpenSlotsInline]  # Добавили OpenSlotsInline
    list_display = ('id', 'get_full_name', 'user', 'zoom_link', 'open_slots__weekly_open_slots')
    filter_horizontal = ['courses']
    search_fields = ('user__first_name__icontains', 'user__last_name__icontains')


@admin.register(TeacherPayment)
class TeacherPaymentAdmin(admin.ModelAdmin):
    list_display = ('teacher', 'local_created_at', 'due_date', 'week_start_date', 'week_end_date', 'lessons_count',
                    'amount', 'is_paid', 'payment_date')
    list_filter = ('is_paid', 'teacher', 'week_start_date')
    search_fields = ('teacher__user__first_name', 'teacher__user__last_name')
    readonly_fields = ('due_date', 'local_created_at',)
    date_hierarchy = 'due_date'
    actions = ['mark_as_paid']

    def week_end_date(self, obj):
        return obj.week_start_date + timedelta(days=6)

    week_end_date.short_description = 'Воскресенье'

    def mark_as_paid(self, request, queryset):
        updated = queryset.update(is_paid=True, payment_date=timezone.now())
        self.message_user(request, f"Отмечено выплат: {updated}")

    mark_as_paid.short_description = "Отметить как выплаченные"


class PhoneNumberInline(admin.TabularInline):
    model = PhoneNumber
    extra = 0
    fields = ('number', 'note', 'is_primary')
    search_fields = ['number', 'note']
    list_filter = ['is_primary']
    verbose_name = 'Номер телефона'
    verbose_name_plural = 'Номера телефонов'


class StudentInline(admin.TabularInline):
    model = Student
    extra = 0
    fields = ('name', 'age', 'teacher', 'notes')
    autocomplete_fields = ['teacher']


class BalanceOperationInline(TabularInlinePaginated):
    model = BalanceOperation
    extra = 0
    per_page = 3
    readonly_fields = ('balance_before', 'balance_after')
    fields = ('operation_type', 'amount', 'date', 'notes', 'balance_before', 'balance_after')


class ClientAdminMixin:
    list_display = ('name', 'students', 'teachers', 'balance', 'email', 'notes', 'primary_phone')
    readonly_fields = ('balance',)
    search_fields = ('name__icontains', 'email__icontains', 'phone_numbers__number')
    inlines = [PhoneNumberInline, StudentInline, BalanceOperationInline]

    def get_queryset(self, request):
        return Client.objects.prefetch_related('students__teacher').all()

    def students(self, obj):
        students = obj.students.all()
        return ", ".join(str(student.name) for student in students)

    students.short_description = 'Ученики'

    def teachers(self, obj):
        students = obj.students.all()
        teachers = {str(student.teacher) for student in students if student.teacher}
        return ", ".join(teachers)

    teachers.short_description = 'Учителя'


@admin.register(Client)
class ClientAdmin(ClientAdminMixin, SafeDeleteAdmin):
    pass


@admin.register(DeletedClient)
class DeletedClientAdmin(ClientAdminMixin, SafeDeleteAdmin):
    list_display = ('name', 'students', 'teachers', 'balance', 'email', 'primary_phone', 'deleted')
    readonly_fields = ('balance', 'deleted')
    actions = ['undelete_selected']

    def get_queryset(self, request):
        # Только удалённые объекты
        return Client.deleted_objects.prefetch_related('students__teacher').all()

    def undelete_selected(self, request, queryset):
        for obj in queryset:
            obj.undelete()
        self.message_user(request, "Выбранные клиенты восстановены.")

    undelete_selected.short_description = "Восстановить выбранных"


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('name', 'age', 'client', 'teacher', 'family_balance')
    list_select_related = ('client', 'teacher')
    search_fields = ('name__icontains', 'client__name__icontains')


@admin.register(UserSettings)
class UserSettingsAdmin(admin.ModelAdmin):
    list_display = ('user', 'user_full_name', 'working_hours_display', 'theme_display')
    list_filter = ('theme',)
    search_fields = ('user__username', 'user__email')
    ordering = ('user__first_name', 'user__last_name')

    def user_full_name(self, obj):
        full_name = f"{obj.user.first_name} {obj.user.last_name}"
        return full_name.strip() if full_name.strip() else "Не указано"

    user_full_name.short_description = 'Имя и фамилия'

    def working_hours_display(self, obj):
        return f"{obj.working_hours_start}:00 - {obj.working_hours_end}:00"

    working_hours_display.short_description = 'Рабочие часы'

    def theme_display(self, obj):
        theme_names = {
            'light': 'Светлая',
            'dark': 'Темная'
        }
        return theme_names.get(obj.theme, obj.theme)

    theme_display.short_description = 'Тема'


@admin.register(OpenSlots)
class OpenSlotsAdmin(admin.ModelAdmin):
    list_display = ('teacher', 'teacher_name', 'weekly_open_slots')

    def teacher_name(self, obj):
        return obj.teacher.get_full_name()

    teacher_name.short_description = 'ФИО'

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        if db_field.name == 'weekly_open_slots':
            kwargs[
                'help_text'] = 'Пустой вариант: {"monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [], "saturday": [], "sunday": []}'

        return super().formfield_for_dbfield(db_field, request, **kwargs)


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    form = LessonAdminForm
    list_display = ('id', 'date', 'status', 'lesson_type', 'platform', 'teacher', 'time', 'student', 'course')
    list_filter = ('lesson_type', 'status', 'date', 'platform', 'teacher', 'course')
    search_fields = ['student__name']
    autocomplete_fields = ['student', 'teacher']

    def get_fields(self, request, obj=None):
        if obj is None:
            return [
                'student', 'teacher', 'course', 'platform',
                'lesson_type', 'date', 'time', 'schedule',
            ]
        return super().get_fields(request, obj)

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        if db_field.name == 'time':
            # Создаем список вариантов времени (только целые часы)
            time_choices = [(f"{hour:02d}:00:00", f"{hour:02d}:00") for hour in range(0, 24)]

            # Используем Select-виджет с ограниченными вариантами
            kwargs['widget'] = forms.Select(choices=time_choices)
            kwargs['help_text'] = 'Выберите час (минуты будут установлены в 00 автоматически)'

        if db_field.name == 'course':
            courses = ["Не выбран", "Roblox", "Scratch", "Создание сайтов", "Python", "Unity", "Figma", "Комп с нуля",
                       "Blender", "Android", "C++"]
            kwargs['widget'] = forms.Select(choices=[(c, c) for c in courses])

        return super().formfield_for_dbfield(db_field, request, **kwargs)

    @admin.display(boolean=True, description='Регулярный?')
    def lesson_type_display(self, obj):
        return obj.lesson_type == 'recurring'
