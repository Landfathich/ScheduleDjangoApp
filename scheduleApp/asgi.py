import os
from django.core.asgi import get_asgi_application

# Сначала загружаем Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'scheduleApp.settings')
django_asgi_app = get_asgi_application()

# Потом импортируем всё остальное
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
import chat.routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            chat.routing.websocket_urlpatterns
        )
    ),
})