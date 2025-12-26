from django.urls import path
from . import views

urlpatterns = [path("", views.TripListCreateView.as_view(), name="trip_list_create")]
