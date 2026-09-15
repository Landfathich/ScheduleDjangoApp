import logging

from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth.models import User
from django.shortcuts import render, redirect
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views.generic import CreateView
from django.views.generic import TemplateView

from clients.models import ClientStatusHistory
from core.constants import get_excluded_teacher_ids
from core.models import OpenSlots, Lesson, Client
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
        from django.db.models import Q, Sum
        from core.models import TeacherPayment

        # Определяем выбранный месяц
        month_param = self.request.GET.get('month')
        if month_param:
            try:
                year, month = map(int, month_param.split('-'))
                selected_date = datetime(year, month, 1).date()
            except (ValueError, TypeError):
                selected_date = datetime.now().date().replace(day=1)
        else:
            selected_date = datetime.now().date().replace(day=1)

        # Начало и конец выбранного месяца
        if selected_date.month == 12:
            next_month = selected_date.replace(year=selected_date.year + 1, month=1)
        else:
            next_month = selected_date.replace(month=selected_date.month + 1)

        month_start = selected_date
        month_end = next_month - timedelta(days=1)

        # Доходы за выбранный месяц
        month_income = FinanceEvent.objects.filter(
            event_type=FinanceEvent.EVENT_INCOME,
            created_at__date__gte=month_start,
            created_at__date__lte=month_end
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Расходы за выбранный месяц (SchoolExpense)
        month_expenses = SchoolExpense.objects.filter(
            expense_date__gte=month_start,
            expense_date__lte=month_end
        )

        expenses_by_category = {}
        total_expenses = 0
        for expense in month_expenses:
            category = expense.get_category_display()
            expenses_by_category[category] = expenses_by_category.get(category, 0) + float(expense.amount)
            total_expenses += float(expense.amount)

        # Зарплаты преподавателям за выбранный месяц (оплаченные)
        teacher_payments = TeacherPayment.objects.filter(
            is_paid=True,
            payment_date__gte=month_start,
            payment_date__lte=month_end
        )

        teacher_payments_total = teacher_payments.aggregate(total=Sum('amount'))['total'] or 0
        teacher_payments_total = float(teacher_payments_total)

        if teacher_payments_total > 0:
            expenses_by_category['Зарплата преподавателям'] = teacher_payments_total
            total_expenses += teacher_payments_total

        # Чистый кэш флоу
        net_cash_flow = float(month_income) - total_expenses

        # Название месяца на русском
        months_ru = {
            1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель',
            5: 'Май', 6: 'Июнь', 7: 'Июль', 8: 'Август',
            9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь'
        }
        month_name = months_ru[selected_date.month]

        # Ссылки на предыдущий и следующий месяц
        prev_month = selected_date - timedelta(days=1)
        prev_month = prev_month.replace(day=1)
        next_month_start = next_month

        # Проценты по категориям
        expenses_by_category_with_percent = {}
        if total_expenses > 0:
            for category, amount in expenses_by_category.items():
                percent = round((amount / total_expenses) * 100, 1)
                expenses_by_category_with_percent[category] = {
                    'amount': amount,
                    'percent': percent
                }
        else:
            for category, amount in expenses_by_category.items():
                expenses_by_category_with_percent[category] = {
                    'amount': amount,
                    'percent': 0
                }

        context['monthly_report'] = {
            'month': f'{month_name} {selected_date.year}',
            'income': float(month_income),
            'total_expenses': total_expenses,
            'expenses_by_category': expenses_by_category_with_percent,
            'net_cash_flow': net_cash_flow,
            'prev_month': f'{prev_month.year}-{prev_month.month:02d}',
            'next_month': f'{next_month_start.year}-{next_month_start.month:02d}',
        }

        # =========================
        # Аналитика клиентов
        # =========================

        # Новые клиенты за выбранный месяц
        new_clients = Client.objects.filter(
            created_at__date__gte=month_start,
            created_at__date__lte=month_end
        ).count()

        # Изменения статусов за выбранный месяц
        status_changes = ClientStatusHistory.objects.filter(
            changed_at__date__gte=month_start,
            changed_at__date__lte=month_end
        )

        # Лиды, которые стали активными
        converted_to_active = status_changes.filter(
            new_status='active',
            old_status='lead'
        ).count()

        # Отказы
        rejected_clients = status_changes.filter(
            new_status='rejected'
        ).count()

        # Ушедшие
        inactive_clients = status_changes.filter(
            new_status='inactive'
        ).count()

        # Текущее состояние базы
        current_leads = Client.objects.filter(
            lifecycle_status='lead'
        ).count()

        current_active = Client.objects.filter(
            lifecycle_status='active'
        ).count()

        current_inactive = Client.objects.filter(
            lifecycle_status='inactive'
        ).count()

        current_rejected = Client.objects.filter(
            lifecycle_status='rejected'
        ).count()

        # Конверсия лид → активный за выбранный месяц
        conversion_rate = (
            round(converted_to_active / new_clients * 100, 1)
            if new_clients > 0 else 0
        )

        # Чистый прирост активной базы за месяц
        active_base_growth = converted_to_active - inactive_clients

        context['clients_stats'] = {
            'new_clients': new_clients,
            'converted_to_active': converted_to_active,
            'rejected_clients': rejected_clients,
            'inactive_clients': inactive_clients,
            'current_leads': current_leads,
            'current_active': current_active,
            'current_inactive': current_inactive,
            'current_rejected': current_rejected,
            'conversion_rate': conversion_rate,
            'active_base_growth': active_base_growth,
        }

        # =========================
        # Аналитика источников
        # =========================

        source_labels = dict(
            Client._meta.get_field('source').choices
        )

        sources_stats = []

        for source_code, source_name in source_labels.items():
            # Лиды, созданные в выбранном месяце
            new_leads = Client.objects.filter(
                source=source_code,
                created_at__date__gte=month_start,
                created_at__date__lte=month_end
            ).count()

            # Лиды этого источника, ставшие активными в выбранном месяце
            converted = ClientStatusHistory.objects.filter(
                client__source=source_code,
                old_status='lead',
                new_status='active',
                changed_at__date__gte=month_start,
                changed_at__date__lte=month_end
            ).count()

            # Текущее количество активных клиентов этого источника
            active_clients = Client.objects.filter(
                source=source_code,
                lifecycle_status='active'
            ).count()

            conversion_rate = (
                round(converted / new_leads * 100, 1)
                if new_leads > 0 else 0
            )

            # Не показываем полностью пустые источники
            if new_leads == 0 and converted == 0 and active_clients == 0:
                continue

            sources_stats.append({
                'name': source_name,
                'new_leads': new_leads,
                'converted': converted,
                'conversion_rate': conversion_rate,
                'active_clients': active_clients,
            })

        # Сначала источники с наибольшим количеством новых лидов
        sources_stats.sort(
            key=lambda source: source['new_leads'],
            reverse=True
        )

        context['sources_stats'] = sources_stats

        # =========================
        # Аналитика преподавателей
        # =========================

        # Определяем даты прошлой недели (понедельник - воскресенье)
        today = datetime.now().date()
        start_of_week = today - timedelta(days=today.weekday() + 7)
        end_of_week = start_of_week + timedelta(days=6)

        # Получаем ID исключаемых преподавателей
        excluded_teacher_ids = get_excluded_teacher_ids()

        # Получаем ID неактивных преподавателей
        inactive_teacher_ids = User.objects.filter(
            is_active=False
        ).values_list('id', flat=True)

        # Объединяем оба списка
        all_excluded_ids = list(
            set(list(excluded_teacher_ids) + list(inactive_teacher_ids))
        )

        # Получаем открытые слоты преподавателей
        open_slots_list = OpenSlots.objects.select_related('teacher').filter(
            ~Q(teacher__user__id__in=all_excluded_ids)
        )

        total_slots = 0
        teachers_details = []

        for open_slot in open_slots_list:
            teacher = open_slot.teacher

            # Общее количество слотов преподавателя
            total_teacher_slots = 0

            for day, times in open_slot.weekly_open_slots.items():
                total_teacher_slots += len(times)

            # Занятые слоты преподавателя за прошлую неделю
            busy_teacher_slots = Lesson.objects.filter(
                teacher=teacher,
                date__range=[start_of_week, end_of_week]
            ).count()

            # Общее количество слотов школы
            total_slots += total_teacher_slots

            # Загрузка преподавателя
            if total_teacher_slots > 0:
                load_percentage = round(
                    busy_teacher_slots / total_teacher_slots * 100
                )
            else:
                load_percentage = 0

            teachers_details.append({
                'name': teacher.name,
                'load_percentage': load_percentage,
                'busy_hours': busy_teacher_slots,
                'total_hours': total_teacher_slots,
            })

        # Сначала самые свободные
        teachers_details.sort(
            key=lambda teacher: teacher['load_percentage']
        )

        # Общее количество занятых слотов
        busy_slots = Lesson.objects.filter(
            date__range=[start_of_week, end_of_week]
        ).exclude(
            teacher__user__id__in=all_excluded_ids
        ).count()

        free_slots = total_slots - busy_slots

        context['teachers_stats'] = {
            'free_hours': free_slots,
            'total_hours': total_slots,
            'load_percentage': round(
                busy_slots / total_slots * 100
            ) if total_slots > 0 else 0,
        }

        context['teachers_details'] = teachers_details

        return context


from django.http import JsonResponse


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
