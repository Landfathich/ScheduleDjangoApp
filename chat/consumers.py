import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model

from .models import Conversation, Message

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'

        if await self.is_participant():
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()
        else:
            await self.close()

    @database_sync_to_async
    def is_participant(self):
        try:
            conversation = Conversation.objects.get(id=self.conversation_id)
            user = self.scope["user"]
            return user.is_authenticated and user in conversation.participants.all()
        except Conversation.DoesNotExist:
            return False

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']
        sender = self.scope["user"]

        # Сохраняем сообщение
        message_obj = await self.save_message(message)

        # Получаем всех участников чата
        participants = await self.get_participants()

        # Отправляем сообщение в комнату чата
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'username': sender.username,
                'sender_id': sender.id,
                'conversation_id': self.conversation_id,
            }
        )

        # Отправляем уведомление о новом сообщении каждому участнику в их личную комнату
        for participant_id in participants:
            if participant_id != sender.id:
                await self.channel_layer.group_send(
                    f'user_{participant_id}',
                    {
                        'type': 'new_message_notification',
                        'conversation_id': self.conversation_id,
                        'sender_name': f"{sender.first_name} {sender.last_name}".strip() or sender.username,
                        'message_preview': message[:50],
                        'unread_count': await self.get_unread_count(participant_id),
                    }
                )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat',
            'message': event['message'],
            'username': event['username'],
            'sender_id': event['sender_id'],
            'conversation_id': event['conversation_id'],
        }))

    async def new_message_notification(self, event):
        """Отправка уведомления о новом сообщении в личную комнату пользователя"""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'conversation_id': event['conversation_id'],
            'sender_name': event['sender_name'],
            'message_preview': event['message_preview'],
            'unread_count': event['unread_count'],
        }))

    @database_sync_to_async
    def save_message(self, content):
        conversation = Conversation.objects.get(id=self.conversation_id)
        message = Message.objects.create(
            conversation=conversation,
            sender=self.scope["user"],
            content=content
        )
        return message

    @database_sync_to_async
    def get_participants(self):
        conversation = Conversation.objects.get(id=self.conversation_id)
        return list(conversation.participants.values_list('id', flat=True))

    @database_sync_to_async
    def get_unread_count(self, user_id):
        conversation = Conversation.objects.get(id=self.conversation_id)
        return Message.objects.filter(
            conversation=conversation,
            is_read=False
        ).exclude(
            sender_id=user_id
        ).count()


# chat/consumers.py (добавить новый класс)

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if not self.user.is_authenticated:
            await self.close()
            return

        self.user_group = f'user_{self.user.id}'

        await self.channel_layer.group_add(
            self.user_group,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(
                self.user_group,
                self.channel_name
            )

    async def new_message_notification(self, event):
        """Получение уведомления о новом сообщении"""
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'conversation_id': event['conversation_id'],
            'sender_name': event['sender_name'],
            'message_preview': event['message_preview'],
            'unread_count': event['unread_count'],
        }))

        # Отправляем push-уведомление
        await self.send_push_notification(
            user_id=self.user.id,
            title=f"Новое сообщение от {event['sender_name']}",
            body=event['message_preview'],
            url=f"/chat/{event['conversation_id']}/"
        )

    # Удалите импорт сверху
    # from webpush.utils import send_user_notification

    # В методе send_push_notification импортируйте внутри:
    @database_sync_to_async
    def send_push_notification(self, user_id, title, body, url):
        from webpush.utils import send_notification_to_user
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(id=user_id)
        try:
            send_notification_to_user(
                user=user,
                payload={
                    'title': title,
                    'body': body,
                    'url': url,
                },
                ttl=86400
            )
        except Exception as e:
            print(f"Push error: {e}")
