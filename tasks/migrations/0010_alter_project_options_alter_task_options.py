# tasks/migrations/0010_add_column_and_link_tasks.py (номер может отличаться)

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('tasks', '0009_create_default_columns'),  # Зависит от вашей последней миграции
    ]

    operations = [
        # Шаг 1: Добавляем поле column
        migrations.AddField(
            model_name='task',
            name='column',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                                    related_name='tasks', to='tasks.projectcolumn', verbose_name='Колонка'),
        ),

        # Шаг 2: Заполняем данными через RunPython
        migrations.RunPython(
            code=lambda apps, schema_editor: link_tasks_to_columns(apps, schema_editor),
            reverse_code=lambda apps, schema_editor: reverse_link(apps, schema_editor),
        ),
    ]


# Функция для заполнения данных
def link_tasks_to_columns(apps, schema_editor):
    Task = apps.get_model('tasks', 'Task')
    ProjectColumn = apps.get_model('tasks', 'ProjectColumn')

    # Словарь соответствия старых статусов названиям колонок
    status_to_column = {
        'backlog': 'Бэклог',
        'todo': 'К выполнению',
        'in_progress': 'В работе',
        'review': 'На проверке',
        'done': 'Завершено',
    }

    print("\n" + "=" * 50)
    print("Начинаем связывание задач с колонками...")
    print("=" * 50)

    tasks = Task.objects.all()
    total = tasks.count()
    updated = 0
    errors = 0

    print(f"Всего задач: {total}")

    for task in tasks:
        if not task.project:
            print(f"⚠ Задача ID {task.id} ('{task.title}') - нет проекта")
            errors += 1
            continue

        # Определяем название колонки по статусу
        column_name = status_to_column.get(task.status, 'Бэклог')

        try:
            # Ищем колонку в проекте
            column = ProjectColumn.objects.get(
                project=task.project,
                name=column_name
            )

            task.column = column
            task.save()
            updated += 1

            if updated % 10 == 0:
                print(f"✅ Обработано {updated}/{total} задач...")

        except ProjectColumn.DoesNotExist:
            print(f"❌ Ошибка: в проекте '{task.project.name}' нет колонки '{column_name}'")
            errors += 1
        except Exception as e:
            print(f"❌ Ошибка с задачей '{task.title}': {e}")
            errors += 1

    print("=" * 50)
    print(f"✅ Готово! Обновлено задач: {updated}")
    if errors > 0:
        print(f"⚠ Ошибок: {errors}")
    print("=" * 50)


def reverse_link(apps, schema_editor):
    """При откате просто очищаем поле column"""
    Task = apps.get_model('tasks', 'Task')
    Task.objects.all().update(column=None)
    print("✅ Поле column очищено")