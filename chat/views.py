from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect

from .models import Conversation

User = get_user_model()

from django.db.models import Q


@login_required
def search_users_json(request):
    """Поиск пользователей и возврат JSON для фронтенда"""
    query = request.GET.get('q', '').strip()

    # Базовый запрос: все пользователи кроме текущего
    users = User.objects.exclude(id=request.user.id)

    if query:
        users = users.filter(
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(username__icontains=query)
        )

    users = users[:20]  # максимум 20 результатов

    data = []
    for user in users:
        data.append({
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': f"{user.first_name} {user.last_name}".strip(),
            'username': user.username,
        })

    return JsonResponse({'users': data})


# chat/views.py (добавить эти три функции)

from django.http import JsonResponse
from django.views.decorators.http import require_POST, require_GET
from django.shortcuts import get_object_or_404


@require_GET
def get_messages(request, conversation_id):
    """Получить сообщения диалога (API)"""
    conversation = get_object_or_404(Conversation, id=conversation_id)

    if request.user not in conversation.participants.all():
        return JsonResponse({'error': 'Access denied'}, status=403)

    messages = conversation.messages.select_related('sender').all()
    data = {
        'messages': [
            {
                'id': msg.id,
                'content': msg.content,
                'sender_id': msg.sender.id,
                'sender_name': f"{msg.sender.first_name} {msg.sender.last_name}".strip() or msg.sender.username,
                'timestamp': msg.timestamp.strftime('%H:%M, %d.%m.%y'),
            }
            for msg in messages
        ]
    }
    return JsonResponse(data)


@require_POST
def start_chat_api(request, user_id):
    """Начать чат (API)"""
    other_user = get_object_or_404(User, id=user_id)

    conversation = Conversation.objects.filter(
        participants=request.user
    ).filter(
        participants=other_user
    ).filter(
        is_group=False
    ).first()

    if not conversation:
        conversation = Conversation.objects.create(is_group=False)
        conversation.participants.add(request.user, other_user)

    return JsonResponse({
        'conversation_id': conversation.id,
        'other_user_name': f"{other_user.first_name} {other_user.last_name}".strip() or other_user.username,
    })


@require_GET
def get_conversation_info(request, conversation_id):
    """Получить информацию о диалоге (API)"""
    conversation = get_object_or_404(Conversation, id=conversation_id)

    if request.user not in conversation.participants.all():
        return JsonResponse({'error': 'Access denied'}, status=403)

    other_user = conversation.get_other_participant(request.user)

    return JsonResponse({
        'conversation_id': conversation.id,
        'other_user_name': f"{other_user.first_name} {other_user.last_name}".strip() or other_user.username if other_user else None,
        'is_group': conversation.is_group,
    })


# chat/views.py

@login_required
def chat_list(request, conversation_id=None):
    """Главная страница чатов"""
    conversations = Conversation.objects.filter(
        participants=request.user
    ).select_related().prefetch_related('participants', 'messages')

    context = {
        'conversations': conversations,
        'user_id': request.user.id,
        'user_full_name': f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username,
    }

    # Если передан ID диалога, загружаем его данные
    if conversation_id:
        try:
            conversation = Conversation.objects.get(id=conversation_id, participants=request.user)
            context.update({
                'initial_conversation': conversation,
                'initial_messages': conversation.messages.select_related('sender').all(),
                'other_user': conversation.get_other_participant(request.user),
            })
        except Conversation.DoesNotExist:
            pass

    return render(request, 'chat/chat.html', context)


@login_required
def search_users(request):
    """Поиск пользователей для начала чата"""
    query = request.GET.get('q', '').strip()
    users = []

    if query:
        users = User.objects.filter(
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(username__icontains=query)
        ).exclude(id=request.user.id)[:20]  # исключаем себя, максимум 20 результатов

    return render(request, 'chat/search_results.html', {
        'users': users,
        'query': query,
    })


@login_required
def start_chat(request, user_id):
    """Начать или открыть диалог с пользователем"""
    other_user = get_object_or_404(User, id=user_id)

    # Проверяем, есть ли уже существующий личный диалог
    conversation = Conversation.objects.filter(
        participants=request.user
    ).filter(
        participants=other_user
    ).filter(
        is_group=False
    ).first()

    if not conversation:
        # Создаём новый диалог
        conversation = Conversation.objects.create(is_group=False)
        conversation.participants.add(request.user, other_user)

    return redirect('chat:conversation_detail', conversation_id=conversation.id)


# chat/views.py (обновите функцию conversation_detail)

@login_required
def conversation_detail(request, conversation_id):
    """Детальная страница чата"""
    conversation = get_object_or_404(Conversation, id=conversation_id)

    if request.user not in conversation.participants.all():
        messages.error(request, 'У вас нет доступа к этому чату')
        return redirect('chat:chat_list')

    messages_list = conversation.messages.select_related('sender').all()
    conversations = Conversation.objects.filter(
        participants=request.user
    ).select_related().prefetch_related('participants', 'messages')

    return render(request, 'chat/conversation.html', {
        'conversation': conversation,
        'other_user': conversation.get_other_participant(request.user),
        'messages': messages_list,
        'conversations': conversations,
        'user_id': request.user.id,
        'user_full_name': f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username,
    })
