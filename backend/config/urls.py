"""
Backend URL configuration.

"""

from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    
    # API Endpoints
    path("api/auth/", include("apps.authentication.urls")),
    path("api/places/", include("apps.places.urls")),
    path("api/weather/", include("apps.weather.urls")),
    path("api/routes/", include("apps.routes.urls")),
    path("api/trips/", include("apps.trips.urls")),
    path("api/recommendations/", include("apps.recommendations.urls")),
    
    # Documentation endpoints
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]
