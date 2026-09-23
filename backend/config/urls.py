from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def saude(_request):
    return JsonResponse({'status': 'ok'})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('clima.urls')),
    # Health check do Render (e útil pra "acordar" o serviço free).
    path('', saude),
]
