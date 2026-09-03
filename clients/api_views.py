import logging
import os

from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Client, PhoneNumber

logger = logging.getLogger(__name__)

CRM_API_KEY = os.getenv("CRM_API_KEY")


class LeadCreateAPIView(APIView):
    def post(self, request):
        api_key = request.headers.get("X-API-Key")
        if api_key != CRM_API_KEY:
            return Response({"detail": "Forbidden"}, status=403)

        name = request.data.get("name")
        phone = request.data.get("phone")
        email = request.data.get("email", "")
        source = request.data.get("source", "landing")

        # TODO: сохранять эти данные в модель или отдельное хранилище
        logger.info(f"Доп. данные лида: "
                    f"child_age={request.data.get('child_age')}, "
                    f"source_url={request.data.get('source_url')}, "
                    f"utm_source={request.data.get('utm_source')}, "
                    f"utm_medium={request.data.get('utm_medium')}, "
                    f"utm_campaign={request.data.get('utm_campaign')}, "
                    f"utm_content={request.data.get('utm_content')}, "
                    f"utm_term={request.data.get('utm_term')}, "
                    f"ip_address={request.data.get('ip_address')}, "
                    f"user_agent={request.data.get('user_agent')}, "
                    f"page_url={request.data.get('page_url')}, "
                    f"accept_language={request.data.get('accept_language')}, "
                    f"created_at={request.data.get('created_at')}")

        client = Client.objects.create(
            name=name,
            email=email,
            lifecycle_status='lead',
            source=source,
        )

        if phone:
            PhoneNumber.objects.create(
                client=client,
                number=phone,
                is_primary=True
            )

        return Response({"status": "ok"}, status=201)
