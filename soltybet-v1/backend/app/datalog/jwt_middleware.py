from django.utils.deprecation import MiddlewareMixin

class JWTMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        return response