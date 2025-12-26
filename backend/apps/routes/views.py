from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


class CalculateRouteView(APIView):
    """Calculate route between waypoints"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        waypoints = request.data.get("waypoints", [])

        if len(waypoints) < 2:
            return Response(
                {"error": "At least 2 waypoints are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        total_distance = len(waypoints) * 150
        total_time = total_distance / 60

        route_data = {
            "total_distance": total_distance,
            "total_time": total_time,
            "waypoints": waypoints,
            "legs": [
                {
                    "distance": {"text": "150 km", "value": 150},
                    "duration": {"text": "2.5 hours", "value": 2.5},
                }
                for _ in range(len(waypoints) - 1)
            ],
        }

        return Response(route_data)


class RouteDetailView(APIView):
    """Get details of a route"""

    permission_classes = [IsAuthenticated]

    def get(self, request, route_id):
        # Mock route details for now
        return Response(
            {
                "id": route_id,
                "total_distance": 450,
                "total_time": 7.5,
                "status": "calculated",
            }
        )
