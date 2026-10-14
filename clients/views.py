from django.contrib.admin.views.decorators import staff_member_required
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404

from clients.models import ClientStatusHistory
from core.constants import get_excluded_teacher_ids
from core.models import BalanceOperation, Client


@staff_member_required
def client_list(request):
    excluded_teacher_ids = get_excluded_teacher_ids()

    clients = Client.objects.exclude(
        students__teacher__user__id__in=excluded_teacher_ids
    ).distinct().order_by('-id')

    search = request.GET.get('search', '').strip()
    status = request.GET.get('status', '').strip()

    if search:
        clients = clients.filter(name__icontains=search)

    if status:
        clients = clients.filter(lifecycle_status=status)

    status_choices = Client._meta.get_field('lifecycle_status').choices

    return render(request, 'clients/client_list.html', {
        'clients': clients,
        'status_choices': status_choices,
        'search': search,
        'selected_status': status,
    })


@staff_member_required
def client_detail(request, client_id):
    client = get_object_or_404(Client, pk=client_id)
    status_choices = Client._meta.get_field('lifecycle_status').choices
    status_labels = dict(status_choices)

    reason_labels = {
        'too_expensive': 'Дорого',
        'other_school': 'Выбрали другую школу',
        'format_not_suitable': 'Не подошёл формат',
        'changed_mind': 'Передумали',
        'could_not_contact': 'Не удалось связаться',
        'stopped_lessons': 'Перестали заниматься',
        'lost_interest': 'Потеряли интерес к занятиям',
        'did_not_want_to_continue': 'Не захотели продолжать обучение',
        'life_circumstances': 'Жизненные обстоятельства',
        'long_break': 'Длительный перерыв без планов вернуться',
        'vacation': 'Отпуск / каникулы',
        'temporary_circumstances': 'Временные обстоятельства',
        'lesson_not_liked': 'Не понравился вводный урок',
        'financial_difficulties': 'Финансовые трудности',
        'temporary_loss_of_interest': 'Временная потеря интереса',
        'other': 'Другое',
    }

    status_history = client.status_history.all()

    for history in status_history:
        history.old_status_label = status_labels.get(history.old_status, history.old_status)
        history.new_status_label = status_labels.get(history.new_status, history.new_status)
        history.reason_label = reason_labels.get(history.reason, history.reason)

    return render(request, 'clients/client_detail.html', {
        'client': client,
        'status_choices': status_choices,
        'status_history': status_history,
    })


@staff_member_required
def update_client_status(request, client_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    client = get_object_or_404(Client, pk=client_id)
    new_status = request.POST.get('status')

    valid_statuses = dict(Client._meta.get_field('lifecycle_status').choices)
    if new_status not in valid_statuses:
        return JsonResponse({'error': 'Invalid status'}, status=400)

    old_status = client.lifecycle_status

    if old_status == new_status:
        return JsonResponse({'status': 'ok'})

    reason = request.POST.get('reason', '').strip()

    if new_status in ('rejected', 'inactive') and not reason:
        return JsonResponse({'error': 'Reason required'}, status=400)

    ClientStatusHistory.objects.create(
        client=client,
        old_status=old_status,
        new_status=new_status,
        reason=reason,
        changed_by=request.user
    )

    client.lifecycle_status = new_status
    client.save(update_fields=['lifecycle_status'])

    return JsonResponse({'status': 'ok'})


@staff_member_required
def create_balance_operation(request, client_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    client = get_object_or_404(Client, pk=client_id)
    operation_type = request.POST.get('operation_type', '').strip()
    amount_raw = request.POST.get('amount', '').strip()

    valid_types = dict(BalanceOperation.OPERATION_TYPES)
    if operation_type not in valid_types:
        return JsonResponse({'error': 'Некорректный тип операции'}, status=400)

    try:
        amount = int(amount_raw)
    except (TypeError, ValueError):
        return JsonResponse({'error': 'Введите целое количество уроков'}, status=400)

    try:
        operation = BalanceOperation.objects.create(
            client=client,
            operation_type=operation_type,
            amount=amount,
        )
    except (ValueError, ValidationError) as error:
        return JsonResponse({'error': str(error)}, status=400)

    return JsonResponse({
        'status': 'ok',
        'balance': operation.balance_after,
        'operation': operation.get_operation_type_display(),
    })
