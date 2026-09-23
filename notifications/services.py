from django.contrib.auth import get_user_model

from .models import Notification

User = get_user_model()


def create_notification(user, title: str, body: str) -> Notification:
    if isinstance(user, int):
        user = User.objects.get(pk=user)

    return Notification.objects.create(
        user=user,
        title=title,
        body=body
    )
