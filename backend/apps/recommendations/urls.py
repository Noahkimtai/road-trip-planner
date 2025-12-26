from django.urls import path
from . import views

app_name = "recommendations"

urlpatterns = [
    path("", views.RecommendationsView.as_view(), name="recommendations"),
    path(
        "nearby/",
        views.NearbyRecommendationsView.as_view(),
        name="nearby_recommendations",
    ),
]
