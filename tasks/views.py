from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.http import JsonResponse  # ← ДОБАВИТЬ
from django.shortcuts import render, get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .forms import TaskForm
from .models import Task


@login_required
def kanban_board(request):
    statuses = dict(Task.STATUS_CHOICES)
    tasks_by_status = {}

    for status_key, status_name in statuses.items():
        tasks = Task.objects.filter(status=status_key).select_related('assignee', 'creator')
        tasks_by_status[status_key] = {
            'name': status_name,
            'tasks': tasks
        }

    context = {
        'tasks_by_status': tasks_by_status,
        'users': User.objects.filter(is_active=True),
    }
    return render(request, 'tasks/kanban.html', context)


@login_required
@require_http_methods(["POST"])
@csrf_exempt
def update_task_status(request):
    """Обновление статуса задачи"""
    try:
        task_id = request.POST.get('task_id')
        new_status = request.POST.get('new_status')

        task = get_object_or_404(Task, id=task_id)
        task.status = new_status
        task.save()

        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@login_required
@csrf_exempt
def create_task(request):
    """Создание задачи через AJAX"""
    if request.method == 'POST':
        form = TaskForm(request.POST)
        if form.is_valid():
            task = form.save(commit=False)
            task.creator = request.user
            task.save()
            return JsonResponse({'success': True})
        return JsonResponse({'success': False, 'errors': form.errors})
    return JsonResponse({'success': False, 'error': 'Invalid method'})


@login_required
@csrf_exempt
def edit_task(request, task_id):
    """Редактирование задачи через AJAX"""
    task = get_object_or_404(Task, id=task_id)

    if task.creator != request.user and not request.user.is_staff:
        return JsonResponse({'success': False, 'error': 'No permission'})

    if request.method == 'POST':
        form = TaskForm(request.POST, instance=task)
        if form.is_valid():
            form.save()
            return JsonResponse({'success': True})
        return JsonResponse({'success': False, 'errors': form.errors})
    return JsonResponse({'success': False, 'error': 'Invalid method'})


@login_required
@csrf_exempt
def delete_task(request, task_id):
    """Удаление задачи через AJAX"""
    task = get_object_or_404(Task, id=task_id)

    if task.creator != request.user and not request.user.is_staff:
        return JsonResponse({'success': False, 'error': 'No permission'})

    if request.method == 'POST':
        task.delete()
        return JsonResponse({'success': True})
    return JsonResponse({'success': False, 'error': 'Invalid method'})


@login_required
def get_task_data(request, task_id):
    """Получение данных задачи для модального окна"""
    task = get_object_or_404(Task, id=task_id)
    return JsonResponse({
        'title': task.title,
        'description': task.description,
        'assignee': task.assignee.id if task.assignee else None,
    })
