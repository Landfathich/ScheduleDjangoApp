from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .forms import TaskForm
from .models import Task


@login_required
def kanban_board(request):
    """Упрощенная канбан-доска"""
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
def task_form(request, task_id=None):
    """Единая форма для создания и редактирования задачи"""
    task = None
    if task_id:
        task = get_object_or_404(Task, id=task_id)

    if request.method == 'POST':
        form = TaskForm(request.POST, instance=task)
        if form.is_valid():
            task_obj = form.save(commit=False)
            if not task_id:  # Если создаем новую задачу
                task_obj.creator = request.user
            task_obj.save()
            return redirect('tasks:kanban_board')
    else:
        form = TaskForm(instance=task)

    context = {
        'form': form,
        'task': task,
    }
    return render(request, 'tasks/task_form.html', context)


@login_required
def delete_task(request, task_id):
    """Удаление задачи"""
    task = get_object_or_404(Task, id=task_id)
    task.delete()
    return redirect('tasks:kanban_board')
