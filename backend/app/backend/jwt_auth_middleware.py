import logging
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth.models import AnonymousUser
from urllib.parse import parse_qs

logger = logging.getLogger(__name__)

@database_sync_to_async
def get_user_from_token(token):
    User = get_user_model()
    try:
        access_token = AccessToken(token)
        user_id = access_token['user_id']
        username = access_token.get('username')
        user = User.objects.get(id=user_id)
        logger.info(f"Successfully authenticated user: {user}, username from token: {username}")
        return user
    except Exception as e:
        logger.error(f"Error authenticating user: {str(e)}")
        return AnonymousUser()

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = parse_qs(scope['query_string'].decode())
        token = query_string.get('token', [None])[0]
        
        if not token:
            headers = dict(scope['headers'])
            auth_header = headers.get(b'authorization', b'').decode()
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if token:
            logger.info(f"Authenticating with token: {token[:10]}...")
            scope['user'] = await get_user_from_token(token)
            logger.info(f"Authenticated user: {scope['user']}")
        else:
            scope['user'] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)