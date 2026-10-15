from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from core.models import Lesson
from notifications.services import create_notification


@receiver(pre_save, sender=Lesson)
def remember_lesson_state(sender, instance, **kwargs):
    """Запоминаем состояние урока до сохранения."""
    instance._old_state = None

    if instance.pk:
        old_lesson = Lesson.objects.filter(pk=instance.pk).first()
        if old_lesson:
            instance._old_state = {
                'date': old_lesson.date,
                'time': old_lesson.time,
                'teacher_id': old_lesson.teacher_id,
            }


@receiver(post_save, sender=Lesson)
def notify_teacher_about_lesson(sender, instance, created, **kwargs):
    teacher = instance.teacher.user
    student_name = instance.student_name or instance.student.name

    date = (
        instance.date.strftime('%d.%m.%Y')
        if instance.date else 'Не указана'
    )
    time = (
        instance.time.strftime('%H:%M')
        if instance.time else 'Не указано'
    )

    # Новое занятие
    if created:
        if getattr(instance, '_skip_new_lesson_notification', False):
            return

        body_parts = [
            f'👨‍🎓 Ученик: {student_name}',
            f'📚 Курс: {instance.course}',
            f'📌 Тип занятия: {instance.get_lesson_type_display()}',
        ]

        if instance.lesson_type == 'recurring' and instance.schedule:
            schedule_lines = [
                f'  • {item["day"].capitalize()} — {item["time"]}'
                for item in instance.schedule
            ]
            body_parts.extend([
                '',
                '🗓️ Регулярное расписание:',
                *schedule_lines,
            ])
        else:
            body_parts.extend([
                f'📅 Дата: {date}',
                f'🕒 Время: {time}',
            ])

        body_parts.append(
            f'💻 Платформа: {instance.get_platform_display()}'
        )

        create_notification(
            user=teacher,
            title='📚 Новый урок назначен',
            body='\n'.join(body_parts),
        )
        return

    # Проверяем изменения существующего урока
    old_state = getattr(instance, '_old_state', None)
    if old_state is None:
        return

    # Назначили другого преподавателя
    if old_state['teacher_id'] != instance.teacher_id:
        body_parts = [
            f'👨‍🎓 Ученик: {student_name}',
            f'📚 Курс: {instance.course}',
            f'📌 Тип занятия: {instance.get_lesson_type_display()}',
            f'📅 Дата: {date}',
            f'🕒 Время: {time}',
            f'💻 Платформа: {instance.get_platform_display()}',
        ]

        create_notification(
            user=teacher,
            title='📚 Вам назначен урок',
            body='\n'.join(body_parts),
        )
        return

    # Изменение даты или времени
    old_date = old_state['date']
    old_time = old_state['time']

    if old_date == instance.date and old_time == instance.time:
        return

    old_date_str = (
        old_date.strftime('%d.%m.%Y') if old_date else 'Не указана'
    )
    old_time_str = (
        old_time.strftime('%H:%M') if old_time else 'Не указано'
    )

    body = '\n'.join([
        f'👨‍🎓 Ученик: {student_name}',
        f'📚 Курс: {instance.course}',
        '',
        '📅 Было:',
        f'  • Дата: {old_date_str}',
        f'  • Время: {old_time_str}',
        '',
        '📅 Стало:',
        f'  • Дата: {date}',
        f'  • Время: {time}',
    ])

    create_notification(
        user=teacher,
        title='🔄 Урок перенесён',
        body=body,
    )
