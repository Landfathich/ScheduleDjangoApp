from django.contrib.admin.views.decorators import staff_member_required
from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404

from core.models import Client, PhoneNumber
from .models import Lead


@staff_member_required
def lead_list(request):
    status_filter = request.GET.get('status', '')
    leads = Lead.objects.all().order_by('-created_at')

    if status_filter:
        leads = leads.filter(status=status_filter)

    statuses = Lead.STATUS_CHOICES

    return render(request, 'leads/lead_list.html', {
        'leads': leads,
        'statuses': statuses,
        'current_status': status_filter
    })


@staff_member_required
def lead_to_client_form(request, lead_id):
    lead = get_object_or_404(Lead, pk=lead_id)
    return render(request, 'leads/convert_form.html', {'lead': lead})


@staff_member_required
def convert_lead(request, lead_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    lead = get_object_or_404(Lead, pk=lead_id)

    name = request.POST.get('name', lead.name)
    email = request.POST.get('email', lead.email)
    phone = request.POST.get('phone', lead.phone)
    note = request.POST.get('note', '')

    client = Client.objects.create(name=name, email=email)

    if phone:
        PhoneNumber.objects.create(
            client=client,
            number=phone,
            is_primary=True,
            note=note
        )

    lead.status = 'client'
    lead.save()

    return JsonResponse({'status': 'ok'})


@staff_member_required
def update_lead_status(request, lead_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    lead = get_object_or_404(Lead, pk=lead_id)
    new_status = request.POST.get('status')

    if new_status in dict(Lead.STATUS_CHOICES):
        lead.status = new_status
        lead.save()
        return JsonResponse({'status': 'ok'})

    return JsonResponse({'error': 'Invalid status'}, status=400)


@staff_member_required
def update_lead_notes(request, lead_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    lead = get_object_or_404(Lead, pk=lead_id)
    lead.notes = request.POST.get('notes', '')
    lead.save()

    return JsonResponse({'status': 'ok'})
