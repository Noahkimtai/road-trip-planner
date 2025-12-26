from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import logging

logger = logging.getLogger(__name__)

# Try to import the Google Places service, but provide fallback if it fails
try:
    from services.google_places import google_places_service

    GOOGLE_PLACES_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Google Places service not available: {e}")
    GOOGLE_PLACES_AVAILABLE = False
    google_places_service = None


class RecommendationsView(generics.GenericAPIView):
    """Get general recommendations for a location"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        lat = request.GET.get("lat")
        lng = request.GET.get("lng")

        if not lat or not lng:
            return Response(
                {"error": "Latitude and longitude parameters are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Get nearby places of different types
            attractions = google_places_service.get_nearby_places(
                latitude=float(lat),
                longitude=float(lng),
                radius=10000,
                place_type="tourist_attraction",
            )

            restaurants = google_places_service.get_nearby_places(
                latitude=float(lat),
                longitude=float(lng),
                radius=5000,
                place_type="restaurant",
            )

            accommodations = google_places_service.get_nearby_places(
                latitude=float(lat),
                longitude=float(lng),
                radius=15000,
                place_type="lodging",
            )

            # Combine and limit results
            recommendations = {
                "attractions": attractions[:5],
                "restaurants": restaurants[:5],
                "accommodations": accommodations[:3],
            }

            return Response(recommendations)

        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class NearbyRecommendationsView(generics.GenericAPIView):
    """Get nearby recommendations by type."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        lat = request.GET.get("lat")
        lng = request.GET.get("lng")
        place_type = request.GET.get("type", "tourist_attraction")

        if not lat or not lng:
            return Response(
                {"error": "Lattitude and longitude parameters are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            results = google_places_service.get_nearby_places(
                latitude=float(lat),
                longitude=float(lng),
                radius=10000,
                place_type=place_type,
            )

            return Response({"results": results})
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
