from django.urls import path
from . import views

app_name = "trips"

urlpatterns = [
    # Trip endpoints
    path("", views.TripListCreateView.as_view(), name="trip_list_create"),
    path("<int:pk>/", views.TripDetailView.as_view(), name="trip_detail"),
    path(
        "<int:trip_id>/calculate/",
        views.calculate_trip_statistics,
        name="calculate_trip_statistics",
    ),
    # Stop endpoints
    path(
        "<int:trip_id>/stops/",
        views.StopListCreateView.as_view(),
        name="stop_list_create",
    ),
    path(
        "<int:trip_id>/stops/<int:pk>/",
        views.StopDetailView.as_view(),
        name="stop_detail",
    ),
    path("<int:trip_id>/stops/reorder/", views.reorder_stops, name="reorder_stops"),
    # Trip sharing endpoints
    path(
        "<int:trip_id>/shares/",
        views.TripShareListCreateView.as_view(),
        name="trip_share_list_create",
    ),
    path(
        "<int:trip_id>/shares/<int:pk>/",
        views.TripShareDetailView.as_view(),
        name="trip_share_detail",
    ),
    # Special endpoints
    path("shared/", views.shared_trips, name="shared_trips"),
    path("public/", views.public_trips, name="public_trips"),
]
