from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import random


try:
    from services.google_places import google_places_service

    GOOGLE_PLACES_AVAILABLE = True
except ImportError as e:
    print(e)
    GOOGLE_PLACES_AVAILABLE = False
    google_places_service = None


class PlaceSearchView(generics.GenericAPIView):
    """Search for places using Google Places APII>"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.GET.get("q", "")

        if not query:
            return Response(
                {"error": "Query parameter 'q' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Optional parameters
        lat = request.GET.get("lat")
        lng = request.GET.get("lng")
        radius = int(request.GET.get("radius", 50000))
        place_type = request.GET.get("type")

        location = (float(lat), float(lng) if lat and lng else None)

        # Try Google Places API first, fallback to mock data
        if GOOGLE_PLACES_AVAILABLE and google_places_service:
            try:
                results = google_places_service.search_places(
                    query=query, location=location, radius=radius, place_type=place_type
                )
                if results:
                    return Response({"results": results})
            except Exception as e:
                print(f"Google Places API failed: {e}")

        # fallback to mocke data
        mock_results = self._get_mock_search_results(query=query, location=location)
        return Response({"results": mock_results})

    def _get_mock_search_results(self, query, location=None):
        """Generate mock search results for testing."""
        import random

        base_lat = location[0] if location else 40.7128
        base_lng = location[1] if location else -74.006

        mock_places = [
            {
                "place_id": f'mock_{query.replace(" ", "_")}_{i}',
                "name": f"{query.title()} Location {i+1}",
                "address": f"{100 + i*10} Main St, City, State",
                "latitude": base_lat + (random.random() - 0.5) * 0.1,
                "longitude": base_lng + (random.random() - 0.5) * 0.1,
                "rating": round(3.5 + random.random() * 1.5, 1),
                "user_ratings_total": random.randint(10, 500),
                "types": ["establishment", "point_of_interest"],
                "business_status": "OPERATIONAL",
            }
            for i in range(3)
        ]

        return mock_places


class PlaceDetailView(generics.GenericAPIView):
    """Get detailed information about a specific place."""

    permission_classes = [IsAuthenticated]

    def get(self, request, place_id):
        if GOOGLE_PLACES_AVAILABLE and google_places_service:
            try:
                place_data = google_places_service.get_place_details(place_id)
                if place_data:
                    return Response(place_data)
            except Exception as e:
                print(f"Google palces API failed: {e}")
        # Fallback to mock data
        mock_place = self._get_mock_place_details(place_id)
        return Response(mock_place)

    def _get_mock_place_details(self, place_id):
        """Generat mock place details for testing"""

        return {
            "place_id": place_id,
            "name": f"Mock Place {place_id[-3:]}",
            "address": "123 Mock Street, Test City, State 12345",
            "latitude": 40.7128 + (random.random() - 0.5) * 0.1,
            "longitude": -74.006 + (random.random() - 0.5) * 0.1,
            "rating": round(3.5 + random.random() * 1.5, 1),
            "user_ratings_total": random.randint(50, 1000),
            "price_level": random.randint(1, 4),
            "types": ["establishment", "point_of_interest"],
            "business_status": "OPERATIONAL",
            "phone_number": "(555) 123-4567",
            "website": "https://example.com",
            "opening_hours": {
                "open_now": True,
                "weekday_text": [
                    "Monday: 9:00 AM – 5:00 PM",
                    "Tuesday: 9:00 AM – 5:00 PM",
                    "Wednesday: 9:00 AM – 5:00 PM",
                    "Thursday: 9:00 AM – 5:00 PM",
                    "Friday: 9:00 AM – 5:00 PM",
                    "Saturday: 10:00 AM – 4:00 PM",
                    "Sunday: Closed",
                ],
            },
        }


class NearbyPlacesView(generics.GenericAPIView):
    """Get places near a specific location"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        lat = request.GET.get("lat")
        lng = request.GET.get("lng")

        if not lat or not lng:
            return Response(
                {"error": "Latitud and longitude parameters are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        radius = int(request.GET.get("radius", 5000))
        place_type = request.GET.get("type")

        # Try Google Places API first, fallback to mock data
        if GOOGLE_PLACES_AVAILABLE and google_places_service:
            try:
                results = google_places_service.get_nearby_places(
                    latitude=float(lat),
                    longitude=float(lng),
                    radius=radius,
                    place_type=place_type,
                )
                if results:
                    return Response({"results": results})
            except Exception as e:
                print(f"Google Places API failed: {e}")

        # Fallback to mock data
        mock_results = self._get_mock_nearby_results(float(lat), float(lng), place_type)
        return Response({"results": mock_results})

    def _get_mock_nearby_results(self, lat, lng, place_type=None):
        """Generate mock nearby places for testing."""
        import random

        # Generate different types of places based on place_type
        place_names = {
            "restaurant": [
                "Local Bistro",
                "Pizza Palace",
                "Sushi Bar",
                "Coffee Shop",
                "Burger Joint",
            ],
            "tourist_attraction": [
                "Historic Site",
                "Art Gallery",
                "Scenic Overlook",
                "Museum",
                "Park",
            ],
            "lodging": [
                "Downtown Hotel",
                "Cozy Inn",
                "Budget Motel",
                "Luxury Resort",
                "B&B",
            ],
            "gas_station": [
                "Shell Station",
                "Chevron",
                "BP Gas",
                "Exxon",
                "Local Fuel",
            ],
            None: [
                "Local Business",
                "Popular Spot",
                "Community Center",
                "Shopping Plaza",
                "Service Center",
            ],
        }

        names = place_names.get(place_type, place_names[None])

        mock_places = []
        for i in range(4):
            mock_places.append(
                {
                    "place_id": f'mock_nearby_{place_type or "general"}_{i}',
                    "name": f"{random.choice(names)} {i+1}",
                    "address": f'{200 + i*25} {random.choice(["Oak", "Pine", "Main", "First", "Second"])} St, Nearby City',
                    "latitude": lat + (random.random() - 0.5) * 0.02,  # Within ~1 mile
                    "longitude": lng + (random.random() - 0.5) * 0.02,
                    "rating": round(3.0 + random.random() * 2.0, 1),
                    "user_ratings_total": random.randint(5, 200),
                    "price_level": (
                        random.randint(1, 4) if place_type == "restaurant" else None
                    ),
                    "types": [place_type or "establishment", "point_of_interest"],
                    "business_status": "OPERATIONAL",
                }
            )

        return mock_places
