from django.urls import path

from . import views

app_name = 'chat'

urlpatterns = [
    path('', views.chat_list, name='chat_list'),
    path('<int:conversation_id>/', views.chat_list, name='chat_detail'),
    path('search/', views.search_users_json, name='search_users'),
    path('start/<int:user_id>/', views.start_chat, name='start_chat'),

    # API для AJAX
    path('api/messages/<int:conversation_id>/', views.get_messages, name='api_messages'),
    path('api/start/<int:user_id>/', views.start_chat_api, name='api_start_chat'),
    path('api/conversation/<int:conversation_id>/', views.get_conversation_info, name='api_conversation'),
]
