"""
Backend URL configuration.

"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    # API Endpoints
    path("api/auth/", include("apps.authentication.urls")),
    path("api/places/", include("apps.places.urls")),
    path("api/weather/", include("apps.weather.urls")),
    path("api/routes/", include("apps.routes.urls")),
]
