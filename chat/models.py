from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL


class Conversation(models.Model):
    """Модель диалога (личный или групповой чат)"""
    participants = models.ManyToManyField(User, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_group = models.BooleanField(default=False)
    name = models.CharField(max_length=255, blank=True, null=True, verbose_name='Название группы')

    class Meta:
        verbose_name = 'Диалог'
        verbose_name_plural = 'Диалоги'
        ordering = ['-updated_at']

    def __str__(self):
        if self.is_group and self.name:
            return self.name
        users = self.participants.all()
        return ', '.join([str(u) for u in users])

    def get_other_participant(self, user):
        """Для личного чата возвращает собеседника"""
        if self.is_group:
            return None
        return self.participants.exclude(id=user.id).first()


class Message(models.Model):
    """Модель сообщения"""
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField(verbose_name='Текст сообщения')
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Сообщение'
        verbose_name_plural = 'Сообщения'
        ordering = ['timestamp']

    def __str__(self):
        return f'{self.sender}: {self.content[:50]}'