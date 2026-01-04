from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction, models
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Trip, Stop, TripShare
from .serializers import (
    TripListSerializer,
    TripDetailSerializer,
    TripCreateSerializer,
    TripUpdateSerializer,
    StopSerializer,
    StopCreateSerializer,
    TripShareSerializer,
    StopReorderSerializer,
)
from .permissions import TripPermission, StopPermission


class TripListCreateView(generics.ListCreateAPIView):
    """List user's trips or create a new trip."""

    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["route_type", "is_public"]
    search_fields = ["name", "description"]
    ordering_fields = ["created_at", "updated_at", "start_date", "name"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        """Return trips owned by or shared with the current user."""
        user = self.request.user
        return Trip.objects.filter(
            models.Q(user=user)
            | models.Q(shares__shared_with=user, shares__is_active=True)
        ).distinct()

    def get_serializer_class(self):
        if self.request.method == "POST":
            return TripCreateSerializer
        return TripListSerializer


class TripDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a specific trip."""

    permission_classes = [permissions.IsAuthenticated, TripPermission]

    def get_queryset(self):
        user = self.request.user
        return Trip.objects.filter(
            models.Q(user=user)
            | models.Q(shares__shared_with=user, shares__is_active=True)
        ).distinct()

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return TripUpdateSerializer
        return TripDetailSerializer


class StopListCreateView(generics.ListCreateAPIView):
    """List stops for a trip or create a new stop."""

    permission_classes = [permissions.IsAuthenticated, StopPermission]

    def get_queryset(self):
        trip_id = self.kwargs["trip_id"]
        trip = get_object_or_404(Trip, id=trip_id)

        # Check if user has access to this trip
        user = self.request.user
        if not (
            trip.user == user
            or trip.shares.filter(shared_with=user, is_active=True).exists()
        ):
            return Stop.objects.none()

        return Stop.objects.filter(trip=trip)

    def get_serializer_class(self):
        if self.request.method == "POST":
            return StopCreateSerializer
        return StopSerializer

    def perform_create(self, serializer):
        trip_id = self.kwargs["trip_id"]
        trip = get_object_or_404(Trip, id=trip_id)

        # Auto-assign order if not provided
        if "order" not in serializer.validated_data:
            last_stop = trip.stops.order_by("-order").first()
            next_order = (last_stop.order + 1) if last_stop else 1
            serializer.validated_data["order"] = next_order

        serializer.save(trip=trip)


class StopDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a specific stop."""

    serializer_class = StopSerializer
    permission_classes = [permissions.IsAuthenticated, StopPermission]

    def get_queryset(self):
        trip_id = self.kwargs["trip_id"]
        trip = get_object_or_404(Trip, id=trip_id)

        # Check if user has access to this trip
        user = self.request.user
        if not (
            trip.user == user
            or trip.shares.filter(shared_with=user, is_active=True).exists()
        ):
            return Stop.objects.none()

        return Stop.objects.filter(trip=trip)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def reorder_stops(request, trip_id):
    """Reorder stops in a trip."""
    trip = get_object_or_404(Trip, id=trip_id)

    # Check permissions
    user = request.user
    if not (
        trip.user == user
        or trip.shares.filter(
            shared_with=user, is_active=True, permission_level__in=["edit", "admin"]
        ).exists()
    ):
        return Response(
            {"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN
        )

    serializer = StopReorderSerializer(data=request.data)
    if serializer.is_valid():
        stop_orders = serializer.validated_data["stop_orders"]

        try:
            with transaction.atomic():
                for item in stop_orders:
                    stop = get_object_or_404(Stop, id=item["id"], trip=trip)
                    stop.order = item["order"]
                    stop.save()

                # Recalculate trip statistics
                trip.calculate_statistics()

            return Response({"message": "Stops reordered successfully."})

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def calculate_trip_statistics(request, trip_id):
    """Manually trigger trip statistics calculation."""
    trip = get_object_or_404(Trip, id=trip_id)

    # Check permissions
    user = request.user
    if not (
        trip.user == user
        or trip.shares.filter(shared_with=user, is_active=True).exists()
    ):
        return Response(
            {"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN
        )

    try:
        trip.calculate_statistics()
        serializer = TripDetailSerializer(trip)
        return Response(serializer.data)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class TripShareListCreateView(generics.ListCreateAPIView):
    """List trip shares or create a new share."""

    serializer_class = TripShareSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        trip_id = self.kwargs["trip_id"]
        trip = get_object_or_404(Trip, id=trip_id)

        # Only trip owner can see shares
        if trip.user != self.request.user:
            return TripShare.objects.none()

        return TripShare.objects.filter(trip=trip, is_active=True)

    def perform_create(self, serializer):
        trip_id = self.kwargs["trip_id"]
        trip = get_object_or_404(Trip, id=trip_id)

        # Only trip owner can create shares
        if trip.user != self.request.user:
            raise permissions.PermissionDenied("Only trip owner can share trips.")

        serializer.save(trip=trip)


class TripShareDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a trip share."""

    serializer_class = TripShareSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        trip_id = self.kwargs["trip_id"]
        trip = get_object_or_404(Trip, id=trip_id)

        # Only trip owner can manage shares
        if trip.user != self.request.user:
            return TripShare.objects.none()

        return TripShare.objects.filter(trip=trip)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def shared_trips(request):
    """Get trips shared with the current user."""
    user = request.user
    shared_trips = Trip.objects.filter(
        shares__shared_with=user, shares__is_active=True
    ).distinct()

    serializer = TripListSerializer(shared_trips, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def public_trips(request):
    """Get public trips."""
    public_trips = Trip.objects.filter(is_public=True).order_by("-updated_at")

    # Add pagination
    from django.core.paginator import Paginator

    paginator = Paginator(public_trips, 20)
    page_number = request.GET.get("page", 1)
    page_obj = paginator.get_page(page_number)

    serializer = TripListSerializer(page_obj, many=True)
    return Response(
        {
            "results": serializer.data,
            "count": paginator.count,
            "num_pages": paginator.num_pages,
            "current_page": page_obj.number,
            "has_next": page_obj.has_next(),
            "has_previous": page_obj.has_previous(),
        }
    )
