import logging

from django.contrib.auth import get_user_model

from telegram_bot.services import send_telegram_to_user
from .models import Notification

User = get_user_model()
logger = logging.getLogger(__name__)


def create_notification(user, title: str, body: str) -> Notification:
    if isinstance(user, int):
        user = User.objects.get(pk=user)

    notification = Notification.objects.create(
        user=user,
        title=title,
        body=body
    )

    try:
        send_telegram_to_user(
            user,
            f'{title}\n\n{body}'
        )
    except Exception:
        logger.exception(
            'Не удалось отправить уведомление в Telegram для пользователя %s',
            user.pk
        )

    return notification
