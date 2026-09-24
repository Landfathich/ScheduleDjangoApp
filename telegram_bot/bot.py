from asgiref.sync import sync_to_async
from django.conf import settings
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

from .services import link_telegram_account


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message:
        return

    if not context.args:
        await update.message.reply_text(
            'Чтобы привязать Telegram, откройте персональную ссылку из CRM.'
        )
        return

    token = context.args[0]

    success = await sync_to_async(link_telegram_account)(
        token=token,
        chat_id=update.effective_chat.id,
        username=update.effective_user.username or ''
    )

    if success:
        await update.message.reply_text(
            'Telegram успешно привязан к вашему аккаунту Kodama.'
        )
    else:
        await update.message.reply_text(
            'Не удалось привязать Telegram. Ссылка недействительна.'
        )


def run_bot():
    application = Application.builder().token(
        settings.TELEGRAM_BOT_TOKEN
    ).build()

    application.add_handler(
        CommandHandler('start', start)
    )

    application.run_polling()
