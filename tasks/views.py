from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth.models import User
from django.http import JsonResponse  # ← ДОБАВИТЬ
from django.shortcuts import render, get_object_or_404, redirect
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .forms import TaskForm, ProjectForm
from .models import Task, Project, ProjectColumn


@staff_member_required
def kanban_board(request):
    # Получаем проект из GET параметра или берем первый
    project_id = request.GET.get('project')

    if project_id:
        current_project = get_object_or_404(Project, id=project_id)
    else:
        # Берем первый проект админа или None
        current_project = Project.objects.filter(creator=request.user).first()

    # Получаем колонки для текущего проекта
    tasks_by_status = {}

    if current_project:
        # Берем активные колонки проекта, сортируем по order
        columns = current_project.columns.all().order_by('order')

        for column in columns:
            # Получаем задачи для этой колонки
            tasks = Task.objects.filter(
                project=current_project,
                column=column  # Используем новое поле column
            ).select_related('assignee', 'creator').order_by('-created_at')

            tasks_by_status[column.id] = {  # Ключ - ID колонки
                'name': column.name,
                'color': column.color,
                'column_id': column.id,
                'tasks': tasks
            }

    # Все проекты пользователя для селектора
    user_projects = Project.objects.filter(creator=request.user) if request.user.is_staff else []

    context = {
        'tasks_by_status': tasks_by_status,
        'users': User.objects.filter(is_active=True),
        'current_project': current_project,
        'user_projects': user_projects,
    }
    return render(request, 'tasks/kanban.html', context)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def update_task_status(request):
    """Обновление статуса задачи (перемещение между колонками)"""
    try:
        task_id = request.POST.get('task_id')
        new_column_id = request.POST.get('new_column_id')  # Теперь получаем ID колонки

        task = get_object_or_404(Task, id=task_id)

        # Проверяем, что колонка существует и принадлежит тому же проекту
        new_column = get_object_or_404(ProjectColumn, id=new_column_id, project=task.project)

        task.column = new_column
        task.save()

        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@staff_member_required
@csrf_exempt
def create_task(request):
    """Создание задачи через AJAX"""
    if request.method == 'POST':
        form = TaskForm(request.POST, request.FILES)
        if form.is_valid():
            task = form.save(commit=False)
            task.creator = request.user

            # Привязываем к проекту
            project_id = request.POST.get('project')
            if project_id:
                task.project = get_object_or_404(Project, id=project_id)

            task.save()
            return JsonResponse({'success': True})
        return JsonResponse({'success': False, 'errors': form.errors})
    return JsonResponse({'success': False, 'error': 'Invalid method'})


@staff_member_required
@csrf_exempt
def edit_task(request, task_id):
    """Редактирование задачи через AJAX"""
    task = get_object_or_404(Task, id=task_id)

    if task.creator != request.user and not request.user.is_superuser:
        return JsonResponse({'success': False, 'error': 'No permission'})

    if request.method == 'POST':
        form = TaskForm(request.POST, request.FILES, instance=task)
        if form.is_valid():
            form.save()
            return JsonResponse({'success': True})
        return JsonResponse({'success': False, 'errors': form.errors})
    return JsonResponse({'success': False, 'error': 'Invalid method'})


@staff_member_required
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


@staff_member_required
def get_task_data(request, task_id):
    """Получение данных задачи для модального окна"""
    task = get_object_or_404(Task, id=task_id)

    return JsonResponse({
        'title': task.title,
        'description': task.description,
        'assignee': task.assignee.id if task.assignee else None,
        'image_url': task.image.url if task.image else None
    })


@staff_member_required
def project_list(request):
    """Список проектов"""
    projects = Project.objects.filter(creator=request.user)
    return render(request, 'tasks/project_list.html', {'projects': projects})


@staff_member_required
def create_project(request):
    """Создание проекта"""
    if request.method == 'POST':
        form = ProjectForm(request.POST)
        if form.is_valid():
            project = form.save(commit=False)
            project.creator = request.user
            project.save()
            return redirect('tasks:project_list')
    else:
        form = ProjectForm()
    return render(request, 'tasks/project_form.html', {'form': form})


@staff_member_required
def edit_project(request, project_id):
    """Редактирование проекта"""
    project = get_object_or_404(Project, id=project_id, creator=request.user)

    if request.method == 'POST':
        form = ProjectForm(request.POST, instance=project)
        if form.is_valid():
            form.save()
            messages.success(request, 'Проект обновлен')
            return redirect('tasks:project_list')
    else:
        form = ProjectForm(instance=project)

    return render(request, 'tasks/project_form.html', {
        'form': form,
        'project': project
    })


@staff_member_required
def delete_project(request, project_id):
    """Удаление проекта"""
    project = get_object_or_404(Project, id=project_id, creator=request.user)

    # Проверяем есть ли задачи в проекте
    if project.tasks.exists():
        messages.error(request, 'Нельзя удалить проект с задачами')
        return redirect('tasks:project_list')

    project.delete()
    messages.success(request, 'Проект удален')
    return redirect('tasks:project_list')


@staff_member_required
@require_http_methods(["POST"])
def update_column(request):
    """Обновление колонки (название, цвет)"""
    try:
        import json
        data = json.loads(request.body)

        column_id = data.get('column_id')
        name = data.get('name')
        color = data.get('color')

        column = get_object_or_404(ProjectColumn, id=column_id, project__creator=request.user)
        column.name = name
        column.color = color
        column.save()

        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})