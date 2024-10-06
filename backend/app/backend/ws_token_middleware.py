import logging
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from urllib.parse import parse_qs
from django.core.cache import cache
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)

class WSTokenMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        if 'token_processed' not in scope:
            query_string = parse_qs(scope['query_string'].decode())
            token = query_string.get('token', [None])[0]
            
            if token:
                cached_value = cache.get(token)
                if cached_value == 'valid':
                    cache.delete(token)
                    scope['token_valid'] = True
                    scope['client_id'] = token.split('_')[0]
                else:
                    scope['token_valid'] = False
            else:
                scope['token_valid'] = False
            
            scope['token_processed'] = True
        
        return await super().__call__(scope, receive, send)
