from .models import Notification


def unread_notifications_count(request):
    if request.user.is_authenticated:
        count = Notification.objects.filter(user=request.user, is_read=False).count()
    else:
        count = 0
    return {'unread_notifications_count': count}


from django.conf import settings


def telegram_bot_username(request):
    return {
        'TELEGRAM_BOT_USERNAME': settings.TELEGRAM_BOT_USERNAME
    }
