from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse
from phase.views import WSTokenView
from rest_framework import routers
from datalog import views
from datalog.views import FighterViewSet, MatchViewSet, UserViewSet, BetViewSet
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

router = routers.DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'fighters', views.FighterViewSet)
router.register(r'matches', views.MatchViewSet)
router.register(r'bets', views.BetViewSet)
router.register(r'stats', views.GlobalViewSet)

def health_check(request):
    return HttpResponse("OK")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('api/ws_token/', WSTokenView.as_view(), name='ws_token'),
		path('api/health-check/', health_check, name='health_check'),
]
