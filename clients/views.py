from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.contrib.admin.views.decorators import staff_member_required
from core.models import Client


@staff_member_required
def client_list(request):
    clients = Client.objects.all().order_by('-id')
    status_choices = Client._meta.get_field('lifecycle_status').choices

    return render(request, 'clients/client_list.html', {
        'clients': clients,
        'status_choices': status_choices,
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