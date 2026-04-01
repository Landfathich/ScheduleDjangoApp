import logging

from django.contrib.admin.views.decorators import staff_member_required
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views.generic import CreateView
from django.views.generic import TemplateView

from core.constants import get_excluded_teacher_ids
from core.models import OpenSlots, Lesson
from .forms import FinanceEventForm
from .models import FinanceSnapshot, FinanceEvent
from .models import SchoolExpense

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class SchoolExpenseCreateView(CreateView):
    model = SchoolExpense
    fields = ['category', 'amount', 'description', 'expense_date']

    def form_valid(self, form):
        expense = form.save()
        if self.request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': 'Расход успешно добавлен'
            })
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'error': 'Пожалуйста, проверьте введенные данные'
            })
        return super().form_invalid(form)


@method_decorator(staff_member_required, name='dispatch')
class StatsDashboardView(TemplateView):
    template_name = 'finance/stats.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # Берём последний снапшот — это актуальное состояние школы
        snapshot = FinanceSnapshot.objects.order_by('-created_at').first()

        if not snapshot:
            finance_stats = {
                'current_balance': 0,
                'free_money': 0,
                'reserved_money': 0,
            }
        else:
            finance_stats = {
                'current_balance': float(snapshot.total_balance),
                'free_money': float(snapshot.free_amount),
                'reserved_money': float(snapshot.reserved_amount),
            }

        context['finance_stats'] = finance_stats

        from datetime import datetime, timedelta
        from django.db.models import Q

        # В методе get_context_data добавить:

        # Определяем даты прошлой недели (понедельник - воскресенье)
        today = datetime.now().date()
        start_of_week = today - timedelta(days=today.weekday() + 7)
        end_of_week = start_of_week + timedelta(days=6)

        # Получаем ID исключаемых преподавателей
        excluded_teacher_ids = get_excluded_teacher_ids()

        # Считаем все открытые слоты за прошлую неделю (исключая некоторых преподавателей)
        total_slots = 0
        open_slots_list = OpenSlots.objects.select_related('teacher').filter(
            ~Q(teacher__user__id__in=excluded_teacher_ids)
        ).all()

        for open_slot in open_slots_list:
            for day, times in open_slot.weekly_open_slots.items():
                total_slots += len(times)

        # Считаем занятые слоты (уроки за прошлую неделю, исключая некоторых преподавателей)
        busy_slots = Lesson.objects.filter(
            date__range=[start_of_week, end_of_week]
        ).exclude(
            teacher__user__id__in=excluded_teacher_ids
        ).count()

        free_slots = total_slots - busy_slots

        # Добавляем в контекст
        context['teachers_stats'] = {
            'free_hours': free_slots,
            'total_hours': total_slots,
            'load_percentage': round((busy_slots / total_slots * 100)) if total_slots > 0 else 0,
        }
        return context


@staff_member_required
def finance_event_create(request):
    """Простая отладочная страница для создания финансовых событий."""
    if request.method == 'POST':
        form = FinanceEventForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('finance_event_create')
    else:
        form = FinanceEventForm()

    # Берём последние 3 снапшота
    snapshots = list(FinanceSnapshot.objects.order_by('-created_at')[:3])

    snapshot_pairs = []
    for snap in snapshots:
        event = None
        if snap.last_event_link:
            event = FinanceEvent.objects.filter(id=snap.last_event_link.id).first()
        snapshot_pairs.append({
            'snapshot': snap,
            'event': event
        })

    return render(request, 'finance/finance_event_form.html', {
        'form': form,
        'snapshot_pairs': snapshot_pairs,
    })
