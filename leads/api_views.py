import os

from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Lead

CRM_API_KEY = os.getenv("CRM_API_KEY")


class LeadCreateAPIView(APIView):
    def post(self, request):
        api_key = request.headers.get("X-API-Key")
        if api_key != CRM_API_KEY:
            return Response({"detail": "Forbidden"}, status=403)

        Lead.objects.create(
            name=request.data.get("name"),
            phone=request.data.get("phone"),
            email=request.data.get("email", ""),
            course=request.data.get("course", ""),
            source=request.data.get("source", "landing"),
            source_url=request.data.get("source_url", "")
        )
        return Response({"status": "ok"}, status=201)
