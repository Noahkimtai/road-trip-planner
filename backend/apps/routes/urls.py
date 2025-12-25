from django.urls import path
from . import views


app_name = "routes"

urlpatterns = [
    path("calculate/", views.CalculateRouteView.as_view(), name="calculate_route"),
    path("<int:route_id>/", views.RouteDetailView.as_view(), name="route_detail"),
]
