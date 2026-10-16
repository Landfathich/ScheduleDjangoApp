import logging

import requests
from django.conf import settings

from .models import TelegramAccount

logger = logging.getLogger(__name__)


def send_telegram_message(chat_id: int, text: str) -> bool:
    if not chat_id:
        return False

    url = f'https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage'

    try:
        response = requests.post(
            url,
            json={
                'chat_id': chat_id,
                'text': text,
            },
            timeout=5
        )
        response.raise_for_status()
        return response.json().get('ok', False)
    except (requests.RequestException, ValueError):
        logger.exception('Не удалось отправить сообщение в Telegram')
        return False


def send_telegram_to_user(user, text: str) -> bool:
    try:
        account = TelegramAccount.objects.get(
            user=user,
            is_active=True
        )
    except TelegramAccount.DoesNotExist:
        return False

    if not account.chat_id:
        logger.warning(
            'Telegram не отправлен: у пользователя %s не указан chat_id',
            user.pk
        )
        return False

    return send_telegram_message(account.chat_id, text)


def link_telegram_account(token: str, chat_id: int, username: str = '') -> bool:
    try:
        account = TelegramAccount.objects.get(link_token=token)
    except TelegramAccount.DoesNotExist:
        return False

    account.chat_id = chat_id
    account.username = username or ''
    account.is_active = True
    account.save(update_fields=['chat_id', 'username', 'is_active'])

    return True