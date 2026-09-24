from django.contrib.auth import get_user_model

from telegram_bot.services import send_telegram_to_user
from .models import Notification

User = get_user_model()


def create_notification(user, title: str, body: str) -> Notification:
    if isinstance(user, int):
        user = User.objects.get(pk=user)

    notification = Notification.objects.create(
        user=user,
        title=title,
        body=body
    )

    send_telegram_to_user(
        user,
        f'{title}\n\n{body}'
    )

    return notification
