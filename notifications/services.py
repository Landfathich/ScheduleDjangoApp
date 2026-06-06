from django.contrib.auth.models import User

from .models import Notification


def create_notification(user, title: str, body: str) -> Notification:
    """
    Создать веб-уведомление (колокольчик) для пользователя.
    user — объект User или ID.
    Возвращает созданное уведомление.
    """
    if isinstance(user, int):
        user = User.objects.get(pk=user)

    notification = Notification.objects.create(
        user=user,
        title=title,
        body=body
    )
    return notification


def create_notification_for_many(users, title: str, body: str) -> list[Notification]:
    """
    Массовая рассылка: создать уведомления списку пользователей.
    users — QuerySet или список объектов/ID пользователей.
    """
    notifications = []
    for user in users:
        notifications.append(create_notification(user, title, body))
    return notifications

def notify(user, title: str, body: str) -> Notification:
    """Краткий alias для create_notification."""
    return create_notification(user, title, body)