from django.urls import reverse
from django.utils import timezone

from notifications.services import create_notification


def notify_task_assignee(task, request, title, exclude_user=None):
    if not task.assignee:
        return

    if exclude_user and task.assignee == exclude_user:
        return

    task_url = request.build_absolute_uri(
        reverse('tasks:task_list')
    ) + f'?task={task.id}'

    creator = (
            task.creator.get_full_name()
            or task.creator.username
    )

    body_parts = [
        f'📌 {task.title}',
        '',
        f'📝 {task.description}' if task.description else None,
        f'👤 Автор: {creator}',
    ]

    if task.project:
        body_parts.append(f'📂 Проект: {task.project.name}')

    due_date = (
        timezone.localtime(task.due_date).strftime('%d.%m.%Y %H:%M')
        if task.due_date
        else None
    )

    if due_date:
        body_parts.append(f'🕒 Срок: {due_date}')

    body_parts.append(f'⚡ Приоритет: {task.get_priority_display()}')

    if task.image:
        body_parts.append('🖼️ Прикреплено изображение')

    body = '\n'.join(
        part for part in body_parts if part is not None
    )

    body += f'\n\n🔗 Открыть задачу:\n{task_url}'

    create_notification(
        user=task.assignee,
        title=title,
        body=body
    )


def notify_task_column_changed(task, request, old_column, new_column):
    if old_column == new_column:
        return

    task_url = request.build_absolute_uri(
        reverse('tasks:task_list')
    ) + f'?task={task.id}'

    old_column_name = old_column.name if old_column else 'Без колонки'
    new_column_name = new_column.name if new_column else 'Без колонки'

    body = (
        f'📌 {task.title}\n\n'
        f'🔄 {old_column_name} → {new_column_name}\n\n'
        f'🔗 Открыть задачу:\n{task_url}'
    )

    recipients = {task.creator, task.assignee}
    recipients.discard(None)
    recipients.discard(request.user)

    for user in recipients:
        create_notification(
            user=user,
            title='Задача перемещена',
            body=body
        )
