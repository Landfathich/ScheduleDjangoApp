import json
import logging

from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User, Group
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Exists, OuterRef
from django.db.models import Prefetch
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.shortcuts import render, redirect
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.utils.timezone import now
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.http import require_http_methods
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated

from .constants import get_excluded_teacher_ids
from .forms import LoginForm
from .forms import ProfileForm
from .models import Client, Teacher, Lesson, TeacherPayment
from .models import OpenSlots, UserSettings
from .models import Student
from .serializers import LessonSerializer, TeacherSerializer
from .services.payment_service import calculate_weekly_payments

logger = logging.getLogger(__name__)


def user_login(request):
    if request.method == 'POST':
        form = LoginForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                return redirect('home')  # Перенаправляем на главную страницу
    else:
        form = LoginForm()
    return render(request, 'registration/login.html', {'form': form})


def user_logout(request):
    logout(request)
    return redirect('home')  # Перенаправляем на главную страницу


@login_required
def home(request):
    context = {
        "user_id": request.user.id,
        "teacher_id": None
    }

    try:
        teacher = Teacher.objects.get(user=request.user)
        context["teacher_id"] = teacher.id
    except Teacher.DoesNotExist:
        pass  # Оставляем teacher_id=None если пользователь не преподаватель

    return render(request, 'core/home.html', context=context)


@login_required
def profile(request):
    if request.method == 'POST':
        form = ProfileForm(request.POST, instance=request.user)
        if form.is_valid():
            user = form.save()

            # Обновляем ссылки преподавателя
            if hasattr(user, 'teacher'):
                user.teacher.zoom_link = request.POST.get('zoom_link', '').strip() or None
                user.teacher.google_meet_link = request.POST.get('google_meet_link', '').strip() or None
                user.teacher.save()

            return redirect('profile')
    else:
        form = ProfileForm(instance=request.user)

    return render(request, 'core/profile.html', {'form': form})


@staff_member_required
def user_management(request):
    """Страница управления пользователями"""
    users = User.objects.all()
    return render(request, 'admin/user_management.html', {'users': users})


@staff_member_required
def create_user(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        password = request.POST.get('password')
        role = request.POST.get('role')

        # Валидация
        errors = {}

        if not username:
            errors['username'] = 'Логин обязателен'
        elif User.objects.filter(username=username).exists():
            errors['username'] = 'Логин уже существует'

        if not first_name:
            errors['first_name'] = 'Имя обязательно'

        if not last_name:
            errors['last_name'] = 'Фамилия обязательна'

        if not password:
            errors['password'] = 'Пароль обязателен'
        elif len(password) < 6:
            errors['password'] = 'Пароль должен быть не менее 6 символов'

        if not role:
            errors['role'] = 'Роль обязательна'

        if errors:
            return render(request, 'admin/create_user.html', {
                'errors': errors,
                'form_data': request.POST
            })

        try:
            # Создаем пользователя
            user = User.objects.create_user(
                username=username,
                password=password,
                first_name=first_name,
                last_name=last_name
            )

            # Назначаем группу
            group_name = ''
            if role == 'teacher':
                group_name = 'Преподаватели'
                # Создаем Teacher и OpenSlots
                teacher = Teacher.objects.create(user=user)
                OpenSlots.objects.create(
                    teacher=teacher,
                    weekly_open_slots={
                        "monday": [], "tuesday": [], "wednesday": [],
                        "thursday": [], "friday": [], "saturday": [], "sunday": []
                    }
                )
            elif role == 'manager':
                group_name = 'Менеджеры'
            elif role == 'student':
                group_name = 'Студенты'

            if group_name:
                group = Group.objects.get(name=group_name)
                user.groups.add(group)

            # Сохраняем данные в сессии для страницы успеха
            request.session['new_user_data'] = {
                'username': username,
                'password': password,
                'first_name': first_name,
                'last_name': last_name,
                'role': group_name
            }

            return redirect('create_user_success')

        except Exception as e:
            # УДАЛЯЕМ пользователя если создание не завершилось успешно
            if User.objects.filter(username=username).exists():
                User.objects.filter(username=username).delete()

            messages.error(request, f'Ошибка при создании пользователя: {str(e)}')
            return render(request, 'admin/create_user.html', {
                'errors': {'general': 'Ошибка при создании пользователя'},
                'form_data': request.POST
            })

    return render(request, 'admin/create_user.html')


@staff_member_required
def create_user_success(request):
    user_data = request.session.get('new_user_data')
    if not user_data:
        return redirect('create_user')

    # Очищаем сессию после использования
    if 'new_user_data' in request.session:
        del request.session['new_user_data']

    # Формируем текст для копирования
    site_url = request.build_absolute_uri('/')[:-1]
    copy_text = f"""Данные для входа в систему Kodama:

Логин: {user_data['username']}
Пароль: {user_data['password']}
Ссылка для входа: {site_url}

После первого входа рекомендуется сменить пароль."""

    return render(request, 'admin/create_user_success.html', {
        'user_data': user_data,
        'copy_text': copy_text,
        'site_url': site_url
    })


@require_POST
@login_required
@transaction.atomic
def complete_lesson(request, lesson_id):
    try:
        # Основной запрос без select_related для nullable полей
        lesson = Lesson.objects.select_for_update().get(id=lesson_id)

        # Отдельно подгружаем связанные объекты
        lesson.student = Student.objects.get(id=lesson.student_id)
        lesson.teacher = Teacher.objects.get(id=lesson.teacher_id)

        data = json.loads(request.body)

        if not request.user.is_authenticated:
            return JsonResponse({'status': 'error', 'message': 'Требуется авторизация'}, status=401)

        if request.user != lesson.teacher.user and not request.user.is_staff:
            return JsonResponse({'status': 'error', 'message': 'Можно отмечать только свои уроки'}, status=403)

        if lesson.status == 'completed':
            return JsonResponse({'status': 'error', 'message': 'Урок уже проведен'}, status=400)

        if lesson.lesson_type != 'demo':
            try:
                if not lesson.student.spend_lesson():
                    logger.warning(f"Недостаточно средств у студента {lesson.student.id}")
                    return JsonResponse({
                        'status': 'error',
                        'message': f'У клиента {lesson.student.client.name} текущий баланс уроков: {lesson.student.client.balance}',
                        'current_balance': lesson.student.client.balance
                    }, status=402)
            except ValueError as e:
                logger.error(f"Ошибка списания урока: {str(e)}")
                return JsonResponse({
                    'status': 'error',
                    'message': str(e)
                }, status=400)

        lesson.lesson_topic = data.get('lesson_topic') or None
        lesson.lesson_notes = data.get('lesson_notes') or None
        lesson.homework = data.get('homework') or None

        lesson.status = 'completed'
        lesson.completed_at = now()
        lesson.save()

        client = lesson.student.client
        client.refresh_from_db()

        response_data = {
            'status': 'success',
            'message': 'Урок успешно проведен',
            'remaining_balance': client.balance,
            'lesson': {
                'id': lesson.id,
                'date': lesson.date.strftime('%Y-%m-%d'),
                'time': lesson.time.strftime('%H:%M'),
                'topic': lesson.lesson_topic,
                'notes': lesson.lesson_notes,
                'homework': lesson.homework
            }
        }

        # Создаем следующий урок для повторяющихся занятий
        if lesson.lesson_type == 'recurring':
            try:
                next_lesson = lesson.create_next_lesson()
                if next_lesson:
                    response_data['next_lesson'] = {
                        'id': next_lesson.id,
                        'date': next_lesson.date.strftime('%Y-%m-%d'),
                        'time': next_lesson.time.strftime('%H:%M')
                    }
            except Exception as e:
                logger.error(f'Ошибка создания следующего урока: {str(e)}', exc_info=True)

        return JsonResponse(response_data)

    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Неверный JSON'}, status=400)
    except Lesson.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Урок не найден'}, status=404)
    except Exception as e:
        logger.error(f'Ошибка проведения урока: {str(e)}', exc_info=True)
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@require_POST
@transaction.atomic
@login_required
def cancel_lesson(request, lesson_id):
    try:
        lesson = Lesson.objects.select_related('student', 'teacher__user').select_for_update().get(id=lesson_id)
        data = json.loads(request.body)

        if not request.user.is_authenticated:
            return JsonResponse({'status': 'error', 'message': 'Требуется авторизация'}, status=401)

        if request.user != lesson.teacher.user and not request.user.is_staff:
            return JsonResponse({'status': 'error', 'message': 'Можно отменять только свои уроки'}, status=403)

        if lesson.status != 'scheduled':
            return JsonResponse({'status': 'error', 'message': 'Этот урок нельзя отменить'}, status=400)

        lesson.cancelled_by = data.get('cancelled_by')
        lesson.is_custom_reason = data.get('is_custom_reason', False)
        lesson.cancel_reason = data.get('cancel_reason')

        lesson.status = 'canceled'
        lesson.canceled_at = now()

        lesson.save()

        response_data = {
            'status': 'success',
            'message': 'Урок успешно отменен',
            'remaining_balance': lesson.student.lesson_balance,
            'lesson': {
                'id': lesson.id,
                'date': lesson.date.strftime('%Y-%m-%d'),
                'time': lesson.time.strftime('%H:%M'),
                'reason': lesson.cancel_reason
            }
        }

        # Создаем следующий урок для повторяющихся занятий
        if lesson.lesson_type == 'recurring':
            next_lesson = lesson.create_next_lesson()
            if next_lesson:
                response_data['next_lesson'] = {
                    'id': next_lesson.id,
                    'date': next_lesson.date.strftime('%Y-%m-%d'),
                    'time': next_lesson.time.strftime('%H:%M')
                }

        return JsonResponse(response_data)

    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Неверный JSON'}, status=400)
    except Lesson.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Урок не найден'}, status=404)
    except Exception as e:
        logger.error(f'Ошибка проведения урока: {str(e)}', exc_info=True)
        return JsonResponse({'status': 'error', 'message': 'Внутренняя ошибка сервера'}, status=500)


@method_decorator(login_required, name='dispatch')
class LessonListCreate(generics.ListCreateAPIView):
    # TODO временно отключена пагинация, доработать
    # pagination_class = LessonPagination
    pagination_class = None

    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['date', 'student', 'status', 'lesson_type']
    search_fields = ['teacher__user__username']

    def get_queryset(self):
        queryset = Lesson.objects.select_related(
            'student', 'student__client',
            'teacher', 'teacher__user'
        )
        # Если teacher_id есть, присылаем его уроки
        teacher_id = self.request.query_params.get('teacher_id')
        if teacher_id:
            try:
                teacher_id = int(teacher_id)
                queryset = queryset.filter(teacher_id=teacher_id)
            except (ValueError, TypeError):
                raise ValidationError("Invalid teacher_id format")

        # Если teacher_id не указан, фильтруем по текущему пользователю
        if not teacher_id:
            queryset = queryset.filter(teacher__user=self.request.user)
        """
        # Фильтрация по датам
        date_after = self.request.query_params.get('date_after')
        date_before = self.request.query_params.get('date_before')
        
        if date_after:
            queryset = queryset.filter(date__gte=date_after)
        if date_before:
            queryset = queryset.filter(date__lte=date_before)"""

        # Фильтрация регулярных уроков
        if self.request.query_params.get('recurring') == 'true':
            today = timezone.now().date()
            queryset = queryset.filter(
                Q(lesson_type='recurring') &
                Q(date__lte=today)
            )

        return queryset.order_by('date', 'time')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        # Добавляем информацию о пользователе в контекст
        context['is_admin'] = self.request.user.is_staff
        return context


@method_decorator(staff_member_required, name='dispatch')
class TeacherListCreate(generics.ListCreateAPIView):
    serializer_class = TeacherSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]

    def get_queryset(self):
        return Teacher.objects.select_related('user').prefetch_related('courses').filter(
            user__is_active=True
        )


@staff_member_required
@csrf_exempt
def create_lesson(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            # Базовые обязательные поля для всех уроков
            required_fields = ['date', 'time', 'teacher_id', 'student_id', 'subject']
            for field in required_fields:
                if field not in data:
                    return JsonResponse({'error': f'Missing field: {field}'}, status=400)

            lesson_data = {
                'date': data['date'],
                'time': data['time'],
                'teacher_id': data['teacher_id'],
                'student_id': data['student_id'],
                'subject': data['subject'],
                'lesson_type': data.get('lesson_type', 'single'),
                'course': data.get('course', 'Не выбран'),
                'status': 'scheduled'
            }

            # Для регулярных уроков проверяем наличие расписания
            if lesson_data['lesson_type'] == 'recurring':
                if 'schedule' not in data:
                    return JsonResponse(
                        {'error': 'Schedule is required for recurring lessons'},
                        status=400
                    )
                lesson_data['schedule'] = data['schedule']
            else:
                # Для разовых уроков гарантируем отсутствие schedule
                lesson_data['schedule'] = []

            lesson = Lesson.objects.create(**lesson_data)

            return JsonResponse({
                'status': 'success',
                'id': lesson.id,
                'lesson_type': lesson.lesson_type
            })

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'Invalid method'}, status=405)


@login_required
@require_http_methods(["GET"])
def get_open_slots(request, teacher_id):
    try:
        teacher = get_object_or_404(Teacher, id=teacher_id)
        open_slots = get_object_or_404(OpenSlots, teacher=teacher)
        return JsonResponse({
            "teacher": teacher_id,
            "weekly_open_slots": open_slots.weekly_open_slots
        })
    except Teacher.DoesNotExist as e:
        return JsonResponse({'error': str(e), 'message': 'Преподаватель не найден'}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@login_required
@require_http_methods(["PUT"])
def update_open_slots(request, teacher_id):
    try:
        teacher = get_object_or_404(Teacher, id=teacher_id)
        open_slots = get_object_or_404(OpenSlots, teacher=teacher)
        data = json.loads(request.body)
        open_slots.weekly_open_slots = data.get("weekly_open_slots", {})
        open_slots.full_clean()  # Валидация данных
        open_slots.save()
        return JsonResponse({
            "teacher": teacher_id,
            "weekly_open_slots": open_slots.weekly_open_slots
        })
    except ValidationError as e:
        return JsonResponse({"error": str(e)}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@login_required
def get_user_settings(request):
    settings, created = UserSettings.objects.get_or_create(user=request.user)
    data = {
        'theme': settings.theme,
        'accentColor': settings.accent_color,
    }
    if hasattr(request.user, 'teacher'):
        data['workingHours'] = {
            'start': settings.working_hours_start,
            'end': settings.working_hours_end,
        }
    return JsonResponse(data)


@login_required
def update_user_settings(request):
    if request.method == 'POST':
        settings, created = UserSettings.objects.get_or_create(user=request.user)
        if 'theme' in request.POST:
            settings.theme = request.POST['theme']
        if 'accent_color' in request.POST:
            settings.accent_color = request.POST['accent_color']
        if 'working_hours_start' in request.POST:
            settings.working_hours_start = int(request.POST['working_hours_start'])
        if 'working_hours_end' in request.POST:
            settings.working_hours_end = int(request.POST['working_hours_end'])
        settings.save()
        return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'error', 'message': 'Недопустимый метод запроса'}, status=400)


@staff_member_required
@require_POST
def generate_weekly_payments(request):
    try:
        calculate_weekly_payments()
        return JsonResponse({'status': 'success', 'message': 'Выплаты сгенерированы'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@staff_member_required
@require_GET
def weekly_payments(request):
    try:
        # calculate_weekly_payments()
        payments = TeacherPayment.objects.filter(is_paid=False).select_related('teacher')
        # payments = TeacherPayment.objects.select_related('teacher')
        data = [{
            'id': p.id,
            'created_at': p.local_created_at,
            'due_date': p.due_date,
            'teacher_id': p.teacher.id,
            'user_id': p.teacher.user.id,
            'teacher': p.teacher.user.get_full_name(),
            'week_start': p.week_start_date,
            'week_end': p.week_end_date,
            'lessons': p.lessons_count,
            'amount': float(p.amount),
            'is_paid': p.is_paid,
            'currency': 'RUB'
        } for p in payments]

        return JsonResponse({'status': 'success', 'payments': data})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@staff_member_required
def payments_count(request):
    count = TeacherPayment.objects.filter(is_paid=False).count()
    return JsonResponse({'count': count})


@staff_member_required
@require_POST
def mark_payment_as_paid(request, payment_id):
    try:
        payment = TeacherPayment.objects.get(id=payment_id)
        if payment.is_paid:
            return JsonResponse({
                'success': False,
                'message': 'Этот платёж уже был проведён ранее'
            })

        # Помечаем как оплаченный
        payment.is_paid = True
        payment.payment_date = timezone.now()
        payment.save()

        return JsonResponse({
            'success': True,
            'message': 'Платёж успешно подтверждён'
        })

    except TeacherPayment.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Платёж не найден'
        }, status=404)


def get_filtered_low_balance_clients_queryset():
    """Возвращает клиентов с балансом <= 2, у которых есть дети у преподавателей школы."""
    return Client.objects.filter(balance__lte=2).annotate(
        has_valid_student=Exists(
            Student.objects.filter(
                client_id=OuterRef('id'),
                teacher__user__isnull=False
            ).exclude(teacher__user__id__in=get_excluded_teacher_ids())
        )
    ).filter(has_valid_student=True)


@staff_member_required
def low_balance_clients(request):
    try:
        clients = get_filtered_low_balance_clients_queryset().prefetch_related(
            'phone_numbers',
            Prefetch(
                'students',
                queryset=Student.objects.select_related('teacher__user').order_by('id')
            )
        )

        clients_data = []
        for client in clients:
            primary_phone = client.primary_phone
            children_data = []

            for student in client.students.all():
                teacher = student.teacher
                teacher_name = (
                    f"{teacher.user.first_name} {teacher.user.last_name}"
                    if teacher and teacher.user else None
                )

                children_data.append({
                    'id': student.id,
                    'name': student.name,
                    'teacher': teacher_name,
                    'is_excluded_teacher': teacher and teacher.user.id in get_excluded_teacher_ids(),
                    'notes': student.notes
                })

            clients_data.append({
                'id': client.id,
                'name': client.name,
                'balance': client.balance,
                'phone': str(primary_phone.number) if primary_phone else None,
                'phone_note': primary_phone.note if primary_phone else None,
                'children': children_data
            })

        return JsonResponse({'status': 'success', 'clients': clients_data})

    except Exception as e:
        logger.error(f"Error in low_balance_clients: {str(e)}", exc_info=True)
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@staff_member_required
def low_balance_clients_count(request):
    try:
        count = get_filtered_low_balance_clients_queryset().count()
        return JsonResponse({'count': count})
    except Exception as e:
        logger.error(f"Error in low_balance_clients_count: {str(e)}", exc_info=True)
        return JsonResponse({'count': 0, 'error': str(e)}, status=500)
