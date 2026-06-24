from django.shortcuts import render

from .models import Lead


def lead_list(request):
    leads = Lead.objects.all().order_by('-created_at')
    return render(request, 'leads/lead_list.html', {'leads': leads})


from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from core.models import Client, PhoneNumber
from .models import Lead


def lead_to_client_form(request, lead_id):
    lead = get_object_or_404(Lead, pk=lead_id)
    return render(request, 'leads/convert_form.html', {'lead': lead})


@csrf_exempt
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

    lead.delete()
    return JsonResponse({'status': 'ok'})