from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator

User = get_user_model()


class Trip(models.Model):
    """Model representing a road trip."""

    ROUTE_TYPES = [
        ("fastest", "Fastest Route"),
        ("scenic", "Scenic Route"),
        ("custom", "Custom Route"),
    ]

    # Basic trip information
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="trips")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    route_type = models.CharField(max_length=20, choices=ROUTE_TYPES, default="fastest")

    # Trip statistics (calculated automatically)
    total_distance = models.FloatField(default=0, help_text="Total distance in miles")
    total_time = models.FloatField(default=0, help_text="Total time in hours")
    estimated_fuel_cost = models.FloatField(
        default=0, help_text="Estimated fuel cost in USD"
    )

    # Trip dates
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    # Sharing and visibility
    is_public = models.BooleanField(
        default=False, help_text="Whether this trip is publicly visible"
    )
    shared_with = models.ManyToManyField(User, blank=True, related_name="shared_trips")

    # Additional settings
    fuel_efficiency = models.FloatField(
        default=25.0,
        validators=[MinValueValidator(5.0), MaxValueValidator(100.0)],
        help_text="Vehicle fuel efficiency in MPG",
    )
    fuel_price_per_gallon = models.FloatField(
        default=3.50,
        validators=[MinValueValidator(1.0), MaxValueValidator(10.0)],
        help_text="Fuel price per gallon in USD",
    )

    # Vehicle information
    vehicle_make = models.CharField(
        max_length=100, blank=True, help_text="Vehicle make (e.g., Toyota)"
    )
    vehicle_model = models.CharField(
        max_length=100, blank=True, help_text="Vehicle model (e.g., Camry)"
    )
    vehicle_year = models.CharField(max_length=4, blank=True, help_text="Vehicle year")

    # Route visualization data
    route_geometry = models.TextField(
        blank=True, help_text="Encoded polyline route geometry from Mapbox"
    )
    route_bounds = models.JSONField(
        null=True, blank=True, help_text="Route bounding box for map fitting"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["user", "-updated_at"]),
            models.Index(fields=["is_public", "-updated_at"]),
        ]

    def __str__(self):
        return f"{self.name} by {self.user.full_name}"

    @property
    def duration_days(self):
        """Calculate trip duration in days."""
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).days + 1
        return None

    @property
    def stops_count(self):
        """Get the number of stops in this trip."""
        return self.stops.count()

    def calculate_statistics(self):
        """Calculate and update trip statistics based on stops and routes."""
        # This will be implemented with route calculation
        # For now, we'll use basic calculations
        stops = self.stops.all().order_by("order")
        if stops.count() < 2:
            self.total_distance = 0
            self.total_time = 0
            self.estimated_fuel_cost = 0
        else:
            # Sum up distances between consecutive stops
            total_distance = sum(
                stop.travel_distance_to_next or 0
                for stop in stops
                if stop.travel_distance_to_next
            )
            total_time = sum(
                stop.travel_time_to_next or 0
                for stop in stops
                if stop.travel_time_to_next
            )

            self.total_distance = total_distance
            self.total_time = total_time
            self.estimated_fuel_cost = (
                total_distance / self.fuel_efficiency
            ) * self.fuel_price_per_gallon

        self.save(
            update_fields=[
                "total_distance",
                "total_time",
                "estimated_fuel_cost",
                "updated_at",
            ]
        )


class Stop(models.Model):
    """Model representing a stop/waypoint in a trip."""

    STOP_TYPES = [
        ("start", "Starting Point"),
        ("destination", "Destination"),
        ("waypoint", "Waypoint"),
    ]

    # Basic stop information
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="stops")
    name = models.CharField(max_length=200)
    address = models.TextField()

    # Location data
    latitude = models.FloatField()
    longitude = models.FloatField()
    place_id = models.CharField(
        max_length=200, blank=True, help_text="External API place ID"
    )

    # Stop details
    stop_type = models.CharField(max_length=20, choices=STOP_TYPES, default="waypoint")
    order = models.PositiveIntegerField(help_text="Order of this stop in the trip")

    # Timing information
    arrival_time = models.TimeField(null=True, blank=True)
    departure_time = models.TimeField(null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(
        null=True, blank=True, help_text="How long to spend at this stop"
    )

    # Travel information to next stop (calculated)
    travel_time_to_next = models.FloatField(
        null=True, blank=True, help_text="Travel time to next stop in hours"
    )
    travel_distance_to_next = models.FloatField(
        null=True, blank=True, help_text="Travel distance to next stop in miles"
    )

    # Additional information
    notes = models.TextField(blank=True)
    estimated_cost = models.FloatField(
        null=True, blank=True, help_text="Estimated cost for activities at this stop"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order"]
        unique_together = ["trip", "order"]
        indexes = [
            models.Index(fields=["trip", "order"]),
            models.Index(fields=["latitude", "longitude"]),
        ]

    def __str__(self):
        return f"{self.name} (Stop #{self.order} in {self.trip.name})"

    @property
    def coordinates(self):
        """Return coordinates as a tuple."""
        return (self.latitude, self.longitude)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Recalculate trip statistics when a stop is saved
        self.trip.calculate_statistics()


class TripShare(models.Model):
    """Model for sharing trips with other users."""

    PERMISSION_LEVELS = [
        ("view", "View Only"),
        ("edit", "Can Edit"),
        ("admin", "Admin Access"),
    ]

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="shares")
    shared_with = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="received_trip_shares"
    )
    shared_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="sent_trip_shares"
    )
    permission_level = models.CharField(
        max_length=10, choices=PERMISSION_LEVELS, default="view"
    )

    # Sharing metadata
    shared_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    message = models.TextField(blank=True, help_text="Optional message when sharing")

    class Meta:
        unique_together = ["trip", "shared_with"]
        indexes = [
            models.Index(fields=["shared_with", "is_active"]),
        ]

    def __str__(self):
        return f"{self.trip.name} shared with {self.shared_with.full_name}"
