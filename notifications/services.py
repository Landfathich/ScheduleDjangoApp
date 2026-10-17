import logging

from notifications.models import Notification
from telegram_bot.models import TelegramAccount, TelegramOutboundMessage

logger = logging.getLogger(__name__)


def create_notification(user, title, body):
    notification = Notification.objects.create(
        user=user,
        title=title,
        body=body,
    )

    try:
        account = TelegramAccount.objects.get(
            user=user,
            is_active=True,
        )

        if account.chat_id:
            TelegramOutboundMessage.objects.create(
                chat_id=account.chat_id,
                text=f'{title}\n\n{body}',
            )
    except TelegramAccount.DoesNotExist:
        pass
    except Exception:
        logger.exception(
            'Не удалось поставить уведомление в очередь Telegram'
        )

    return notification
