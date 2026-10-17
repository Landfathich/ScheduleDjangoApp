import json
import secrets

from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET
from django.views.decorators.http import require_POST

from .models import TelegramOutboundMessage
from .services import link_telegram_account


@csrf_exempt
@require_POST
def telegram_link_api(request):
    expected_secret = settings.TELEGRAM_INTERNAL_API_SECRET
    provided_secret = request.headers.get('X-Internal-Secret', '')

    if not expected_secret:
        return JsonResponse(
            {'error': 'API secret is not configured'},
            status=503,
        )

    if not secrets.compare_digest(provided_secret, expected_secret):
        return JsonResponse(
            {'error': 'Unauthorized'},
            status=401,
        )

    try:
        data = json.loads(request.body)
        token = data.get('token')
        chat_id = data.get('chat_id')
        username = data.get('username', '')
    except (json.JSONDecodeError, AttributeError):
        return JsonResponse(
            {'error': 'Invalid JSON'},
            status=400,
        )

    if not isinstance(token, str) or not token:
        return JsonResponse(
            {'error': 'token is required'},
            status=400,
        )

    if isinstance(chat_id, bool) or not isinstance(chat_id, int):
        return JsonResponse(
            {'error': 'chat_id must be an integer'},
            status=400,
        )

    if not isinstance(username, str):
        return JsonResponse(
            {'error': 'username must be a string'},
            status=400,
        )

    success = link_telegram_account(
        token=token,
        chat_id=chat_id,
        username=username,
    )

    if not success:
        return JsonResponse(
            {'error': 'Invalid link token'},
            status=404,
        )

    return JsonResponse({'status': 'ok'})


@csrf_exempt
@require_GET
def telegram_outbox_api(request):
    expected_secret = settings.TELEGRAM_INTERNAL_API_SECRET
    provided_secret = request.headers.get('X-Internal-Secret', '')

    if not expected_secret or not secrets.compare_digest(
            provided_secret, expected_secret
    ):
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    messages = TelegramOutboundMessage.objects.filter(
        sent_at__isnull=True
    ).order_by('created_at')[:50]

    return JsonResponse({
        'messages': [
            {
                'id': message.id,
                'chat_id': message.chat_id,
                'text': message.text,
            }
            for message in messages
        ]
    })


@csrf_exempt
@require_POST
def telegram_outbox_result_api(request, pk):
    expected_secret = settings.TELEGRAM_INTERNAL_API_SECRET
    provided_secret = request.headers.get('X-Internal-Secret', '')

    if not expected_secret or not secrets.compare_digest(
            provided_secret, expected_secret
    ):
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    try:
        message = TelegramOutboundMessage.objects.get(pk=pk)
    except TelegramOutboundMessage.DoesNotExist:
        return JsonResponse({'error': 'Message not found'}, status=404)

    message.attempts += 1

    if data.get('success') is True:
        message.sent_at = timezone.now()
        message.last_error = ''
    else:
        error = data.get('error', 'Unknown delivery error')
        message.last_error = str(error)[:2000]

    message.save(update_fields=['attempts', 'sent_at', 'last_error'])

    return JsonResponse({'status': 'ok'})
