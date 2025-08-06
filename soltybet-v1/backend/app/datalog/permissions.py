from rest_framework import permissions
    
class ReadOnlyForGrafanaPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.user.username == 'grafana':
            return request.method in permissions.SAFE_METHODS
        return True
