from django.shortcuts import render

from .models import Lead


def lead_list(request):
    leads = Lead.objects.all().order_by('-created_at')
    return render(request, 'leads/lead_list.html', {'leads': leads})
