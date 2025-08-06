from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.utils.crypto import get_random_string
from django.core.cache import cache
import uuid

class WSTokenView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        client_id = str(uuid.uuid4())
        token = f"{client_id}_{get_random_string(32)}"
        cache.set(token, 'valid', timeout=60)
        return Response({'token': token, 'client_id': client_id})