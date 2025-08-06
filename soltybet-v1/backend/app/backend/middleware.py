import logging
import socket
from django.http import HttpResponse
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)

class ServiceExceptionMiddleware(MiddlewareMixin):
    async def __call__(self, request):
        try:
            response = await self.get_response(request)
            return response
        except socket.gaierror as e:
            logger.error(f"Hostname resolution error: {e}")
            return HttpResponse("Internal Server Error", status=500)
        except Exception as e:
            logger.error(f"Service exception: {e}")
            return HttpResponse("Internal Server Error", status=500)