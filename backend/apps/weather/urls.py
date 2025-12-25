from django.urls import path
from . import views

app_name = "weather"

urlpatterns = [
    path("current/", views.CurrentWeatherView.as_view(), name="current_weather"),
    path("forecast/", views.WeatherForecastView.as_view(), name="weather_forecast"),
]
