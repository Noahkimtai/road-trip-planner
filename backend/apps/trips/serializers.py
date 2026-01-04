from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Trip, Stop, TripShare

User = get_user_model()


class StopSerializer(serializers.ModelSerializer):
    """Serializer for Stop model."""

    coordinates = serializers.ReadOnlyField()

    class Meta:
        model = Stop
        fields = [
            "id",
            "name",
            "address",
            "latitude",
            "longitude",
            "coordinates",
            "place_id",
            "stop_type",
            "order",
            "arrival_time",
            "departure_time",
            "duration_minutes",
            "travel_time_to_next",
            "travel_distance_to_next",
            "notes",
            "estimated_cost",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "travel_time_to_next",
            "travel_distance_to_next",
            "created_at",
            "updated_at",
        ]

    def validate_order(self, value):
        """Validate that order is positive."""
        if value < 1:
            raise serializers.ValidationError("Order must be a positive integer.")
        return value

    def validate(self, attrs):
        """Validate stop data."""
        # Ensure latitude and longitude are within valid ranges
        lat = attrs.get("latitude")
        lng = attrs.get("longitude")

        if lat is not None and not (-90 <= lat <= 90):
            raise serializers.ValidationError("Latitude must be between -90 and 90.")

        if lng is not None and not (-180 <= lng <= 180):
            raise serializers.ValidationError("Longitude must be between -180 and 180.")

        return attrs


class StopCreateSerializer(StopSerializer):
    """Serializer for creating stops."""

    class Meta(StopSerializer.Meta):
        fields = StopSerializer.Meta.fields
        read_only_fields = [
            "id",
            "travel_time_to_next",
            "travel_distance_to_next",
            "created_at",
            "updated_at",
        ]


class TripListSerializer(serializers.ModelSerializer):
    """Serializer for listing trips with stops data."""

    user_name = serializers.CharField(source="user.full_name", read_only=True)
    stops = StopSerializer(many=True, read_only=True)
    stops_count = serializers.ReadOnlyField()
    duration_days = serializers.ReadOnlyField()

    class Meta:
        model = Trip
        fields = [
            "id",
            "name",
            "description",
            "route_type",
            "user_name",
            "total_distance",
            "total_time",
            "estimated_fuel_cost",
            "start_date",
            "end_date",
            "duration_days",
            "stops",
            "stops_count",
            "is_public",
            "fuel_efficiency",
            "fuel_price_per_gallon",
            "vehicle_make",
            "vehicle_model",
            "vehicle_year",
            "created_at",
            "updated_at",
        ]


class TripDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed trip information."""

    user_name = serializers.CharField(source="user.full_name", read_only=True)
    stops = StopSerializer(many=True, read_only=True)
    stops_count = serializers.ReadOnlyField()
    duration_days = serializers.ReadOnlyField()

    class Meta:
        model = Trip
        fields = [
            "id",
            "name",
            "description",
            "route_type",
            "user",
            "user_name",
            "total_distance",
            "total_time",
            "estimated_fuel_cost",
            "start_date",
            "end_date",
            "duration_days",
            "stops",
            "stops_count",
            "is_public",
            "fuel_efficiency",
            "fuel_price_per_gallon",
            "vehicle_make",
            "vehicle_model",
            "vehicle_year",
            "route_geometry",
            "route_bounds",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]


class TripCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating trips with nested stops."""

    stops = StopCreateSerializer(many=True, required=False)

    class Meta:
        model = Trip
        fields = [
            "name",
            "description",
            "route_type",
            "start_date",
            "end_date",
            "is_public",
            "fuel_efficiency",
            "fuel_price_per_gallon",
            "vehicle_make",
            "vehicle_model",
            "vehicle_year",
            "route_geometry",
            "route_bounds",
            "total_distance",
            "total_time",
            "estimated_fuel_cost",
            "stops",
        ]

    def create(self, validated_data):
        """Create trip with current user as owner and nested stops."""
        from django.db import transaction

        stops_data = validated_data.pop("stops", [])
        validated_data["user"] = self.context["request"].user

        with transaction.atomic():
            # Create the trip
            trip = Trip.objects.create(**validated_data)

            # Create all stops
            for stop_data in stops_data:
                Stop.objects.create(trip=trip, **stop_data)

            # Recalculate statistics if not provided
            if not validated_data.get("total_distance"):
                trip.calculate_statistics()

            return trip


class TripUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating trips."""

    class Meta:
        model = Trip
        fields = [
            "name",
            "description",
            "route_type",
            "start_date",
            "end_date",
            "is_public",
            "fuel_efficiency",
            "fuel_price_per_gallon",
            "vehicle_make",
            "vehicle_model",
            "vehicle_year",
            "route_geometry",
            "route_bounds",
        ]


class TripShareSerializer(serializers.ModelSerializer):
    """Serializer for trip sharing."""

    shared_with_email = serializers.EmailField(write_only=True)
    shared_with_name = serializers.CharField(
        source="shared_with.full_name", read_only=True
    )
    shared_by_name = serializers.CharField(source="shared_by.full_name", read_only=True)
    trip_name = serializers.CharField(source="trip.name", read_only=True)

    class Meta:
        model = TripShare
        fields = [
            "id",
            "trip",
            "trip_name",
            "shared_with",
            "shared_with_email",
            "shared_with_name",
            "shared_by",
            "shared_by_name",
            "permission_level",
            "message",
            "shared_at",
            "is_active",
        ]
        read_only_fields = ["id", "shared_by", "shared_at"]

    def validate_shared_with_email(self, value):
        """Validate that the user exists."""
        try:
            user = User.objects.get(email=value)
            return user
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this email does not exist.")

    def create(self, validated_data):
        """Create trip share."""
        shared_with_email = validated_data.pop("shared_with_email")
        shared_with_user = User.objects.get(email=shared_with_email)

        validated_data["shared_with"] = shared_with_user
        validated_data["shared_by"] = self.context["request"].user

        return super().create(validated_data)


class StopReorderSerializer(serializers.Serializer):
    """Serializer for reordering stops."""

    stop_orders = serializers.ListField(
        child=serializers.DictField(child=serializers.IntegerField()),
        help_text="List of {'id': stop_id, 'order': new_order} objects",
    )

    def validate_stop_orders(self, value):
        """Validate stop reordering data."""
        if not value:
            raise serializers.ValidationError("Stop orders list cannot be empty.")

        # Check that all required fields are present
        for item in value:
            if "id" not in item or "order" not in item:
                raise serializers.ValidationError(
                    "Each item must have 'id' and 'order' fields."
                )

            if item["order"] < 1:
                raise serializers.ValidationError("Order must be a positive integer.")

        # Check for duplicate orders
        orders = [item["order"] for item in value]
        if len(orders) != len(set(orders)):
            raise serializers.ValidationError("Duplicate orders are not allowed.")

        return value
