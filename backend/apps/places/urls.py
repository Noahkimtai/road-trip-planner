from django.urls import path
from . import views


app_name = "places"

urlpatterns = [
    path("search/", views.PlaceSearchView.as_view(), name="place_search"),
    path("<str:place_id>/", views.PlaceDetailView.as_view(), name="place_detail"),
    path("nearby/", views.NearbyPlacesView.as_view(), name="nearby_places"),
]
