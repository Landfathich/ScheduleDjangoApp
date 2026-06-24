from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('notifications.urls')),
    path('notifications/', include('notifications.page_urls')),
    path('', include('core.urls')),
    path('', include('finance.urls')),
    path("materials/", include("materials.urls")),
    path('tasks/', include('tasks.urls')),
    # TODO СДЕЛАТЬ ЧТОБЫ ЗДЕСЬ ПОДКЛЮЧАЛОСЬ ПРИЛОЖЕНИЕ CORE, А В КОРЕ УЖЕ КОРОВЫКЕ ССЫЛКИ ТОЛЬКО, И НОРМАЛЬНОЕ ИМЕНОВАНИЕ В ОДНОМ СТИЛЕ
    path('', include('pwa.urls')),
    # path('chat/', include('chat.urls')),
    # path('webpush/', include('webpush.urls')),
    path('', include('leads.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
