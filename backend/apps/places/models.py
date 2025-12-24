from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class Place(models.Model):
    """Model for place data from external APIs"""

    PLACE_TYPES = [
        ("attraction", "Tourist Attraction"),
        ("restaurant", "Restaurant"),
        ("accommodation", "Accommodation"),
        ("gas_station", "Gas Station"),
        ("park", "Park"),
        ("museum", "Museum"),
        ("shopping", "Shopping"),
        ("entertainment", "Entertainment"),
        ("other", "Other"),
    ]

    # External API identifiers
    place_id = models.CharField(
        max_length=200, unique=True, help_text="External API place ID"
    )
    google_place_id = models.CharField(max_length=200, blank=True)

    # Basic place information
    name = models.CharField(max_length=200)
    address = models.TextField()
    formatted_address = models.TextField(blank=True)

    # Location
    latitude = models.FloatField(
        validators=[MinValueValidator(-90), MaxValueValidator(90)]
    )
    longitude = models.FloatField(
        validators=[MinValueValidator(-180), MaxValueValidator(180)]
    )

    # Classification
    place_type = models.CharField(max_length=50, choices=PLACE_TYPES, default="other")
    types = models.JSONField(default=list, help_text="List of place types from API")

    # Ratings and reviews
    rating = models.FloatField(
        null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(5)]
    )
    user_ratings_total = models.IntegerField(null=True, blank=True)
    price_level = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(4)],
        help_text="Price level from 0 (free) to 4 (very expensive)",
    )

    # Contact information
    phone_number = models.CharField(max_length=20, blank=True)
    international_phone_number = models.CharField(max_length=30, blank=True)
    website = models.URLField(blank=True)

    # Rich data from APIs
    photos = models.JSONField(default=list, help_text="Photo references from API")
    opening_hours = models.JSONField(
        default=dict, help_text="Opening hours data from API"
    )
    reviews = models.JSONField(default=list, help_text="Sample reviews from API")

    # Additional details
    business_status = models.CharField(max_length=50, blank=True)
    permanently_closed = models.BooleanField(default=False)

    # Cache metadata
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    cache_expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["latitude", "longitude"]),
            models.Index(fields=["place_type", "rating"]),
            models.Index(fields=["last_updated"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.place_type})"

    @property
    def coordinates(self):
        """Return coordinates as a tuple."""
        return (self.latitude, self.longitude)

    @property
    def is_cache_valid(self):
        """Check if cached data is still valid"""
        if not self.cache_expires_at:
            return False
        return timezone.now() < self.cache_expires_at


class PlaceSearchQuery(models.Model):
    """Model for caching search queries and results."""

    query = models.CharField(max_length=500)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    radius = models.IntegerField(default=50000, help_text="Search radius in meters")
    place_type = models.CharField(max_length=50, blank=True)

    # Results
    results = models.JSONField(default=list, help_text="List of place IDs from search")
    total_results = models.IntegerField(default=0)

    # Cache metadata
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        indexes = [
            models.Index(fields=["query", "latitude", "longitude"]),
            models.Index(fields=["expires_at"]),
        ]

    def __str__(self):
        location = (
            f" near ({self.latitude}, {self.longitude})"
            if self.latitude and self.longitude
            else ""
        )
        return f"Search: {self.query}{location}"

    @property
    def is_valid(self):
        """Check if search cache is still valid."""
        return timezone.now() < self.expires_at
