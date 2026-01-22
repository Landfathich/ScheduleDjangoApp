import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from core.constants import get_excluded_teacher_ids
from .models import FinanceEvent
from .services.finance_service import FinanceService

logger = logging.getLogger(__name__)


@receiver(post_save, sender=FinanceEvent)
def on_finance_event_created(sender, instance, created, **kwargs):
    """
    После создания нового события — применяем его к последнему снапшоту.
    """
    if created:
        FinanceService.apply_event(instance)


from django.db.models.signals import post_save
from django.dispatch import receiver
from core.models import BalanceOperation

TEACHER_RATE_PER_LESSON = 500  # ставка преподавателя за урок
PRICE_PER_LESSON = 1000  # цена одного урока для клиента


@receiver(post_save, sender=BalanceOperation)
def balance_operation_created(sender, instance: BalanceOperation, created, **kwargs):
    if not created:
        return

    if instance.operation_type != 'add':
        return  # нас интересует только пополнение

    # Логируем информацию о том, что пополнение баланса началось
    logger.info(f"Начинаем обработку пополнения баланса для операции {instance.pk}")

    # Получаем клиента
    client = instance.client
    logger.info(f"Найден клиент: {client.name} (ID: {client.pk})")

    # Получаем всех студентов, связанных с клиентом
    students = client.students.all()
    logger.info(f"Найдено {students.count()} студентов для клиента {client.name}")

    logger.info(f"Список исключенных преподавателей: {get_excluded_teacher_ids()}")

    # 🔴 ИЗМЕНЕНИЕ №1: Сначала проверяем доход школы
    # Добавляем проверку на исключение преподавателей для дохода школы
    if not any(student.teacher and student.teacher.user.id in get_excluded_teacher_ids() for student in students):
        # 🔴 ИЗМЕНЕНИЕ №2: ДОХОД ШКОЛЫ ПЕРВЫМ!
        income_amount = Decimal(instance.amount * PRICE_PER_LESSON)
        logger.info(f"Создание финансового события для дохода школы: {income_amount} (операция {instance.pk})")

        FinanceEvent.create_idempotent(
            external_id=f'balanceop_{instance.pk}_income',
            event_type=FinanceEvent.EVENT_INCOME,
            amount=income_amount,
            metadata={
                'client_id': instance.client_id,
                'student_id': instance.student_id,
                'balance_operation_id': instance.pk
            }
        )
    else:
        logger.info(f"Доход школы пропущен, так как хотя бы один студент имеет преподавателя из списка исключений.")

    # 🔴 ИЗМЕНЕНИЕ №3: РЕЗЕРВЫ ПОСЛЕ ДОХОДА
    # Для каждого студента проверяем, есть ли у него преподаватель и входит ли он в список исключений
    for student in students:
        logger.info(f"Проверка преподавателя для студента: {student.name} (ID: {student.pk})")

        if student.teacher:
            teacher = student.teacher
            logger.info(f"Студент {student.name} связан с преподавателем: {teacher.name} (ID: {teacher.pk})")

            # Проверка, входит ли преподаватель в список исключений
            if teacher.user.id in get_excluded_teacher_ids():
                logger.info(f"Преподаватель {teacher.name} входит в список исключений. Пропускаем.")
                continue  # Пропускаем создание события для этого преподавателя

            # Резерв на преподавателя (теперь после дохода)
            reserve_amount = Decimal(instance.amount * TEACHER_RATE_PER_LESSON)
            logger.info(
                f"Создание финансового события для резерва преподавателя: {reserve_amount} (операция {instance.pk})")

            FinanceEvent.create_idempotent(
                external_id=f'balanceop_{instance.pk}_reserve',
                event_type=FinanceEvent.EVENT_RESERVE,
                amount=reserve_amount,
                metadata={
                    'client_id': client.pk,
                    'student_id': student.pk,
                    'balance_operation_id': instance.pk,
                    'teacher_rate': TEACHER_RATE_PER_LESSON
                }
            )
        else:
            logger.info(f"У студента {student.name} нет преподавателя. Пропускаем.")


from django.db.models.signals import post_save
from django.dispatch import receiver
from core.models import TeacherPayment


@receiver(post_save, sender=TeacherPayment)
def teacher_payment_created(sender, instance: TeacherPayment, created, **kwargs):
    print(f"[SIGNAL FIRED] TeacherPayment #{instance.pk}, is_paid={instance.is_paid}")
    if not instance.is_paid:
        return

    external_id_expense = f'teacherpayment_{instance.pk}_expense'
    external_id_release = f'teacherpayment_{instance.pk}_release'

    # Проверка, не обрабатывали ли уже это событие
    if FinanceEvent.objects.filter(external_id=external_id_expense).exists():
        return

    amount_to_pay = Decimal(instance.amount)

    # Получаем последний снапшот для понимания, сколько денег в резерве
    snapshot = FinanceSnapshot.objects.order_by('-created_at').first()
    reserved = snapshot.reserved_amount if snapshot else Decimal('0.00')

    from_reserved = min(reserved, amount_to_pay)
    from_free = max(amount_to_pay - reserved, Decimal('0.00'))

    # Логируем вычисленные суммы
    logger.info(f"Reserved amount: {reserved}, From reserved: {from_reserved}, From free: {from_free}")

    # 1️⃣ Сначала освобождаем резерв, если есть
    if from_reserved > 0:
        FinanceEvent.create_idempotent(
            external_id=external_id_release,
            event_type=FinanceEvent.EVENT_RELEASE,
            amount=from_reserved,
            metadata={
                'teacher_payment_id': instance.pk,
                'teacher_id': instance.teacher_id,
                'lessons_count': instance.lessons_count,
                'week_start_date': str(instance.week_start_date),
                'week_end_date': str(instance.week_end_date),
            }
        )

    # 2️⃣ Потом создаём расход на всю сумму выплаты
    FinanceEvent.create_idempotent(
        external_id=external_id_expense,
        event_type=FinanceEvent.EVENT_EXPENSE,
        amount=amount_to_pay,
        metadata={
            'teacher_payment_id': instance.pk,
            'teacher_id': instance.teacher_id,
            'lessons_count': instance.lessons_count,
            'week_start_date': str(instance.week_start_date),
            'week_end_date': str(instance.week_end_date),
            'spent_from_reserved': str(from_reserved),
            'spent_from_free': str(from_free),
        }
    )


from decimal import Decimal
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import SchoolExpense, FinanceEvent, FinanceSnapshot


@receiver(post_save, sender=SchoolExpense)
def school_expense_created(sender, instance: SchoolExpense, created, **kwargs):
    """
    Сигнал: при создании школьного расхода — создаём финансовое событие EXPENSE.
    Сначала тратим из свободных денег, если не хватает — из резервов.
    """
    if not created:
        return

    external_id = f'schoolexpense_{instance.pk}_expense'

    # Проверяем, не создавали ли мы уже это событие
    if FinanceEvent.objects.filter(external_id=external_id).exists():
        logger.info(f"[SchoolExpense] Расход {instance.pk} уже был обработан, пропускаем.")
        return

    amount_to_spend = Decimal(instance.amount)

    # Получаем последний снапшот для понимания, сколько свободных и резервов
    snapshot = FinanceSnapshot.objects.order_by('-created_at').first()
    free = snapshot.free_amount if snapshot else Decimal('0.00')
    reserved = snapshot.reserved_amount if snapshot else Decimal('0.00')

    # Сначала тратим из свободных
    from_free = min(free, amount_to_spend)
    from_reserved = max(amount_to_spend - from_free, Decimal('0.00'))

    logger.info(
        f"[SchoolExpense] Новый расход {instance.pk}: "
        f"amount={amount_to_spend}, free={free}, reserved={reserved}, "
        f"spent_from_free={from_free}, spent_from_reserved={from_reserved}"
    )

    # Создаём финансовое событие
    FinanceEvent.create_idempotent(
        external_id=external_id,
        event_type=FinanceEvent.EVENT_EXPENSE,
        amount=amount_to_spend,
        metadata={
            'school_expense_id': instance.pk,
            'category': instance.category,
            'description': instance.description,
            'expense_date': str(instance.expense_date),
            'spent_from_free': str(from_free),
            'spent_from_reserved': str(from_reserved),
        }
    )
