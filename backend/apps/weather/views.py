from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import random


class CurrentWeatherView(generics.GenericAPIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        lat = request.GET.get("lat")
        lng = request.GET.get("lng")

        if not lat or not lng:
            return Response(
                {"error": "Latitude and longitude parameters are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        conditions = ["Sunny", "Partly Cloudy", "Light Raing", "Overcast"]

        weather_data = {
            "location": f"Location ({lat}, {lng})",
            "current": {
                "temp_f": 65 + random.random() * 25,
                "condition": {"text": random.choice(conditions), "icon": "sunny"},
                "humidity": 40 + random.random() * 40,
                "wind_mph": random.random() * 15,
            },
        }

        return Response(weather_data)


class WeatherForecastView(generics.GenericAPIView):
    """Get weather forecast for multiple stops."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        stops = request.GET.getlist("stops")  # List of "lat, lng" strings

        if not stops:
            return Response(
                {"error": "Stops parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        forecasts = []
        conditions = ["Sunny", "Partly Cloudy", "Light Rain", "Clear", "Overcast"]

        for i, stop in enumerate(stops):

            try:
                lat, lng = stop.split(",")
                forecast = {
                    "location": f"Stop {i+1}",
                    "temperature": 65 + random.random() * 25,
                    "condition": random.choice(conditions),
                    "icon": "sunny",
                    "humidity": 40 + random.random() * 40,
                    "wind_speed": random.random() * 15,
                    "date": f"2024-07-{20+i:02d}",
                }
                forecasts.append(forecast)
            except ValueError:
                continue

        return Response({"forecasts": forecasts})
