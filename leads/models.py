import urllib

from django.db import models


class Lead(models.Model):
    STATUS_CHOICES = [
        ('new', 'Новый'),
        ('contacted', 'Связались'),
        ('thinking', 'Думают'),
        ('follow_up', 'Жду ответа'),
        ('trial', 'Записан на пробный'),
        ('client', 'Стал клиентом'),
        ('rejected', 'Отказ'),
    ]

    name = models.CharField(max_length=100)
    source_url = models.CharField(max_length=500, blank=True, verbose_name='URL источник')
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    course = models.CharField(max_length=200, blank=True)
    source = models.CharField(max_length=50, default="landing")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    notes = models.TextField(blank=True, verbose_name='Заметки')
    last_contact = models.DateTimeField(null=True, blank=True, verbose_name='Последний контакт')
    next_contact = models.DateTimeField(null=True, blank=True, verbose_name='Следующий контакт')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.phone}"

    @property
    def utm_params(self):
        if not self.source_url or '?' not in self.source_url:
            return {}

        query = self.source_url.split('?', 1)[1]
        params = urllib.parse.parse_qs(query)

        # Оставляем только utm-метки и ad_id
        utm = {}
        for key, values in params.items():
            if key.startswith('utm_') or key == 'ad_id':
                utm[key] = values[0]

        return utm
