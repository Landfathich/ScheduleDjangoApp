import logging
from datetime import datetime, timedelta, time

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone
from phonenumber_field.modelfields import PhoneNumberField
from safedelete import SOFT_DELETE, DELETED_VISIBLE_BY_PK
from safedelete.models import SafeDeleteModel

from materials.models import Course

logger = logging.getLogger(__name__)


class UserSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='settings')
    working_hours_start = models.IntegerField(default=9)  # Начало рабочего дня
    working_hours_end = models.IntegerField(default=18)  # Конец рабочего дня
    theme = models.CharField(max_length=10, default='light')  # Тема (light/dark)
    accent_color = models.CharField(
        max_length=20,
        default='green',
        verbose_name='Акцентный цвет'
    )

    def __str__(self):
        return f"Настройки пользователя {self.user.username}"

    class Meta:
        verbose_name = 'Настройки пользователя'
        verbose_name_plural = 'Настройки пользователей'


class Teacher(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    zoom_link = models.URLField(max_length=255, blank=True, null=True, verbose_name="Zoom ссылка")
    google_meet_link = models.URLField(max_length=255, blank=True, null=True, verbose_name="Google Meet ссылка")
    courses = models.ManyToManyField(
        Course,
        blank=True,
        verbose_name="Курсы",
        related_name="teachers"
    )

    @property
    def name(self):
        return f"{self.user.first_name} {self.user.last_name}".strip()

    def get_full_name(self):
        return self.user.get_full_name() or self.user.username

    def get_courses_display(self):
        return ", ".join([course.title for course in self.courses.all()])

    def __str__(self):
        return self.user.get_full_name() or self.user.username

    class Meta:
        verbose_name = 'Преподаватель'
        verbose_name_plural = 'Преподаватели'


class OpenSlots(models.Model):
    teacher = models.OneToOneField(Teacher, on_delete=models.CASCADE,
                                   related_name='open_slots', null=True, blank=True)
    weekly_open_slots = models.JSONField(default=dict)

    class Meta:
        verbose_name = 'Открытые часы'
        verbose_name_plural = 'Открытые часы'

    def __str__(self):
        return f"Open slots for {self.teacher.name}"


class Client(SafeDeleteModel):
    _safedelete_policy = SOFT_DELETE
    _safedelete_visibility = DELETED_VISIBLE_BY_PK

    name = models.CharField(max_length=100, verbose_name='Имя родителя')
    email = models.EmailField(blank=True, verbose_name='Email')

    balance = models.IntegerField(
        default=0,
        verbose_name='Баланс уроков'
    )

    allow_negative_once = models.BooleanField(
        default=False,
        verbose_name='Разрешить одно списание в минус'
    )

    @property
    def primary_phone(self):
        try:
            return self.phone_numbers.filter(is_primary=True).first() or self.phone_numbers.first()
        except Exception:
            return None

    primary_phone.fget.short_description = "Основной телефон"

    def add_lessons(self, amount, student, note=''):
        """Пополнение баланса с логированием"""
        if amount <= 0:
            raise ValueError("Количество уроков должно быть положительным")

        self.balance += amount
        self.save()

        BalanceOperation.objects.create(
            client=self,
            student=student,
            operation_type='add',
            amount=amount,
            notes=note or f"Пополнение баланса на {amount} уроков"
        )

    @transaction.atomic
    def spend_lesson(self, student, note=''):
        """Атомарное списание урока с баланса"""
        try:
            BalanceOperation.objects.create(
                client=self,
                student=student,
                operation_type='spend',
                amount=1,
                notes=note or f"Занятие с {student.name}"
            )
            return True
        except ValueError:
            return False

    def __str__(self):
        return f"{self.name} (Баланс: {self.balance})"

    class Meta:
        verbose_name = 'Клиент'
        verbose_name_plural = 'Клиенты'
        indexes = [
            models.Index(fields=['balance']),
        ]


class DeletedClient(Client):
    class Meta:
        proxy = True
        verbose_name = "Удалённый клиент"
        verbose_name_plural = "Корзина клиентов"


class PhoneNumber(models.Model):
    client = models.ForeignKey(
        'Client',
        on_delete=models.CASCADE,
        related_name='phone_numbers',
        verbose_name='Клиент'
    )
    number = PhoneNumberField(
        verbose_name='Номер телефона',
        help_text='В международном формате (+79161234567)',
        region=None,
        blank=False
    )
    note = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Заметка (например, "Бабушка Алла")'
    )
    is_primary = models.BooleanField(
        default=False,
        verbose_name='Основной номер'
    )

    class Meta:
        verbose_name = 'Номер телефона'
        verbose_name_plural = 'Номера телефонов'
        ordering = ['-is_primary', 'id']

    def __str__(self):
        return f"{self.number} ({self.note})" if self.note else str(self.number)


class Student(models.Model):
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='students',
        verbose_name='Клиент (родитель)',
        null=True,
        blank=True
    )
    name = models.CharField(max_length=100, verbose_name='Имя ученика')
    notes = models.TextField(blank=True, verbose_name='Примечания')

    @property
    def lesson_balance(self):
        """Свойство для совместимости с фронтендом (возвращает баланс клиента)"""
        if not hasattr(self, 'client') or not self.client:
            return 0
        return self.client.balance

    def spend_lesson(self, note=''):
        """Списание урока через клиента (для совместимости)"""
        if not hasattr(self, 'client') or not self.client:
            return False
        return self.client.spend_lesson(self, note)

    teacher = models.ForeignKey(
        'Teacher',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Преподаватель'
    )

    @property
    def family_balance(self):
        return self.client.balance

    family_balance.fget.short_description = "Баланс"

    def __str__(self):
        return f"{self.name} (Клиент: {self.client.name})"

    class Meta:
        verbose_name = 'Ученик'
        verbose_name_plural = 'Ученики'


class BalanceOperation(models.Model):
    OPERATION_TYPES = [
        ('add', 'Пополнение'),
        ('spend', 'Списание'),
        ('correction', 'Корректировка')
    ]

    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='operations'
    )
    student = models.ForeignKey(
        Student,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Ученик'
    )
    operation_type = models.CharField(
        max_length=10,
        choices=OPERATION_TYPES,
        verbose_name='Тип операции'
    )
    amount = models.IntegerField(verbose_name='Количество уроков')
    balance_before = models.IntegerField(verbose_name='Баланс до операции')
    balance_after = models.IntegerField(verbose_name='Баланс после операции')
    date = models.DateTimeField(default=timezone.now, verbose_name='Дата операции')
    notes = models.CharField(max_length=100, blank=True, verbose_name='Комментарий')

    def clean(self):
        super().clean()
        if self.operation_type in ('add', 'spend') and self.amount <= 0:
            raise ValidationError(
                {'amount': 'Количество уроков должно быть положительным для операций пополнения/списания'})

        if self.operation_type == 'correction' and not isinstance(self.amount, int):
            raise ValidationError({'amount': 'Количество уроков должно быть целым числом'})

    def save(self, *args, **kwargs):
        self.clean()
        with transaction.atomic():
            # Блокируем клиента для изменения
            client = Client.objects.select_for_update().get(pk=self.client.pk)

            if not self.pk:  # Только для новых операций
                self.balance_before = client.balance

                if self.operation_type == 'spend':
                    if client.balance < self.amount:
                        if not client.allow_negative_once:
                            raise ValueError("Недостаточно средств на балансе")
                        # Если разрешено однократное списание в минус
                        client.allow_negative_once = False

                # Обновляем баланс
                if self.operation_type == 'add':
                    client.balance += self.amount
                elif self.operation_type == 'spend':
                    client.balance -= self.amount
                elif self.operation_type == 'correction':
                    if self.amount < 0 and not client.allow_negative_once:
                        raise ValueError("Корректировка в минус запрещена")
                    client.balance = self.amount
                    if client.balance < 0:
                        client.allow_negative_once = False

                self.balance_after = client.balance
                client.save()

            super().save(*args, **kwargs)

    class Meta:
        verbose_name = 'Операция с балансом'
        verbose_name_plural = 'Операции с балансом'
        ordering = ['-date']

    def __str__(self):
        return (f"{self.get_operation_type_display()} {self.amount} уроков | "
                f"Баланс: {self.balance_before}→{self.balance_after} ({self.client.name})")


class Lesson(models.Model):
    LESSON_TYPE_CHOICES = [
        ('single', 'Разовый'),
        ('recurring', 'Регулярный'),
        ('demo', 'Вводный')
    ]

    STATUS_CHOICES = [
        ('scheduled', 'Запланирован'),
        ('completed', 'Проведён'),
        ('canceled', 'Отменён'),
    ]

    PLATFORMS_CHOICES = [
        ('google-meet', 'Google Meet'),
        ('zoom', 'Zoom'),
    ]

    student_name = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Имя ученика'
    )

    # Основные связи
    student = models.ForeignKey(Student, on_delete=models.CASCADE, verbose_name='Студент')
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, verbose_name='Преподаватель')
    course = models.CharField(max_length=100, default='Не выбран', verbose_name='Курс')

    # Тип и статус урока
    lesson_type = models.CharField(
        max_length=10,
        choices=LESSON_TYPE_CHOICES,
        verbose_name='Тип урока'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='scheduled',
        verbose_name='Статус'
    )
    platform = models.CharField(
        max_length=15,
        choices=PLATFORMS_CHOICES,
        default='google-meet',
        verbose_name='Платформа'
    )

    # Для разовых уроков
    date = models.DateField(null=True, verbose_name='Дата урока')
    time = models.TimeField(null=True, blank=True, verbose_name='Время урока')

    # Для регулярных уроков
    schedule = models.JSONField(
        default=list,
        verbose_name='Регулярное расписание',
        help_text='Поле для постоянного расписания'
    )

    @property
    def is_reliable(self):
        if self.status == 'cancelled':
            return False

        if not hasattr(self.student, 'client'):
            return False

        return self.student.client.balance > 0

    # Информация об уроке
    lesson_topic = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Тема урока'
    )
    lesson_notes = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Комментарий преподавателя'
    )
    homework = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Домашнее задание'
    )
    cancelled_by = models.CharField(
        max_length=25,
        blank=True,
        null=True,
        choices=[('teacher', 'Преподаватель'), ('student', 'Ученик')],
        verbose_name='Кто отменил урок'
    )
    is_custom_reason = models.BooleanField(
        default=False,
        verbose_name='Кастомная причина'
    )
    cancel_reason = models.TextField(
        blank=True,
        null=True,
        verbose_name='Текст причины отмены'
    )
    previous_topic = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Тема предыдущего урока'
    )
    previous_homework = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='ДЗ предыдущего урока'
    )
    previous_comment = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Комментарий к предыдущему уроку'
    )

    # Системные поля
    completed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Фактическое время проведения'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')

    def create_next_lesson(self):
        if self.lesson_type != 'recurring' or not self.schedule:
            return None

        next_date, next_time = self.calculate_next_date_and_time()
        if not next_date or not next_time:
            return None

        return Lesson.objects.create(
            student=self.student,
            student_name=self.student.name,
            teacher=self.teacher,
            course=self.course,
            lesson_type='recurring',
            status='scheduled',
            date=next_date,
            time=next_time,
            schedule=self.schedule,
            previous_topic=self.lesson_topic,
            previous_homework=self.homework,
            previous_comment=self.lesson_notes,
            platform=self.platform,
        )

    def calculate_next_date_and_time(self):
        try:
            if not self.schedule:
                logger.debug(f'Урок {self.id}: нет расписания для создания следующего урока')
                return None, None

            weekday_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

            # Обработка даты и времени текущего урока
            if isinstance(self.date, datetime):
                lesson_date = self.date.date()
                lesson_time = self.date.time()
            else:
                lesson_date = self.date
                lesson_time = self.time

            lesson_datetime = datetime.combine(lesson_date, lesson_time)
            logger.debug(f'Урок {self.id}: поиск следующего урока от {lesson_date} {lesson_time}')

            # Поиск следующего урока в ближайшие 7 дней
            for days_ahead in range(0, 8):
                next_date = lesson_date + timedelta(days=days_ahead)
                next_day_name = weekday_names[next_date.weekday()]

                for schedule_item in self.schedule:
                    if schedule_item['day'].lower() == next_day_name:
                        time_str = schedule_item['time']
                        hours, minutes = map(int, time_str.split(':'))
                        next_time = time(hours, minutes)

                        # Пропускаем уроки в тот же день, которые уже прошли
                        if days_ahead == 0 and next_time <= lesson_datetime.time():
                            logger.debug(f'Урок {self.id}: пропуск {next_date} {next_time} - время уже прошло')
                            continue

                        logger.debug(f'Урок {self.id}: найден следующий урок на {next_date} {next_time}')
                        return next_date, next_time

            logger.debug(f'Урок {self.id}: не найдено подходящей даты в ближайшие 7 дней')
            return None, None

        except Exception as e:
            logger.error(f'Ошибка расчета даты для урока {self.id}: {str(e)}')
            return None, None

    def save(self, *args, **kwargs):
        if self.lesson_type == 'single' or self.lesson_type == 'demo':
            self.schedule = []  # Очищаем расписание для разовых и вводных уроков
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = 'Урок'
        verbose_name_plural = 'Уроки'


class TeacherPayment(models.Model):
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='payments')
    week_start_date = models.DateField()  # Понедельник расчетной недели
    week_end_date = models.DateField()  # Воскресенье расчетной недели
    lessons_count = models.PositiveIntegerField(default=0)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_paid = models.BooleanField(default=False)
    payment_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, verbose_name='Дата создания')
    due_date = models.DateField(default=timezone.now, verbose_name='Дата оплаты до')

    @property
    def local_created_at(self):
        return timezone.localtime(self.created_at)

    class Meta:
        unique_together = ['teacher', 'week_start_date']
        verbose_name = 'Выплата преподавателю'
        verbose_name_plural = 'Выплаты преподавателям'
        ordering = ['-created_at']  # Сортировка по дате создания (новые сначала)

    def __str__(self):
        return f"{self.teacher} - {self.week_start_date} ({self.amount} руб.)"
