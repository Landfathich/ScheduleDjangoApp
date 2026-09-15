from django.contrib.admin.views.decorators import staff_member_required
from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404

from core.models import Client, Lesson


@staff_member_required
def client_list(request):
    clients = Client.objects.all().order_by('-id')

    search = request.GET.get('search', '').strip()
    status = request.GET.get('status', '').strip()

    if search:
        clients = clients.filter(name__icontains=search)

    if status:
        clients = clients.filter(lifecycle_status=status)

    status_choices = Client._meta.get_field('lifecycle_status').choices

    return render(request, 'clients/client_list.html', {
        'clients': clients,
        'status_choices': status_choices,
        'search': search,
        'selected_status': status,
    })


@staff_member_required
def client_detail(request, client_id):
    client = get_object_or_404(Client, pk=client_id)

    lessons = Lesson.objects.filter(
        student__client=client
    ).order_by('-date', '-time')

    last_lesson = lessons.filter(
        status='completed'
    ).first()

    next_lesson = lessons.filter(
        status='scheduled'
    ).order_by('date', 'time').first()

    lesson_history = lessons[:20]

    return render(request, 'clients/client_detail.html', {
        'client': client,
        'last_lesson': last_lesson,
        'next_lesson': next_lesson,
        'lesson_history': lesson_history,
    })


@staff_member_required
def update_client_status(request, client_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    client = get_object_or_404(Client, pk=client_id)
    new_status = request.POST.get('status')

    valid_statuses = dict(Client._meta.get_field('lifecycle_status').choices)

    if new_status in valid_statuses:
        client.lifecycle_status = new_status
        client.save(update_fields=['lifecycle_status'])
        return JsonResponse({'status': 'ok'})

    return JsonResponse({'error': 'Invalid status'}, status=400)
