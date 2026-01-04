from django.contrib import admin
from .models import Trip, Stop, TripShare


class StopInline(admin.TabularInline):
    """Inline admin for stops within trip admin."""

    model = Stop
    extra = 0
    fields = (
        "name",
        "address",
        "latitude",
        "longitude",
        "stop_type",
        "order",
        "arrival_time",
        "departure_time",
    )
    ordering = ["order"]


class TripShareInline(admin.TabularInline):
    """Inline admin for trip shares within trip admin."""

    model = TripShare
    extra = 0
    fields = ("shared_with", "permission_level", "is_active", "shared_at")
    readonly_fields = ("shared_at",)


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    """Admin interface for Trip model."""

    list_display = (
        "name",
        "user",
        "route_type",
        "stops_count",
        "total_distance",
        "total_time",
        "is_public",
        "created_at",
    )
    list_filter = ("route_type", "is_public", "created_at", "updated_at")
    search_fields = (
        "name",
        "description",
        "user__email",
        "user__first_name",
        "user__last_name",
    )
    readonly_fields = (
        "total_distance",
        "total_time",
        "estimated_fuel_cost",
        "created_at",
        "updated_at",
    )

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("user", "name", "description", "route_type")},
        ),
        ("Trip Dates", {"fields": ("start_date", "end_date")}),
        (
            "Statistics",
            {
                "fields": ("total_distance", "total_time", "estimated_fuel_cost"),
                "classes": ("collapse",),
            },
        ),
        (
            "Vehicle Settings",
            {
                "fields": ("fuel_efficiency", "fuel_price_per_gallon"),
                "classes": ("collapse",),
            },
        ),
        ("Sharing & Visibility", {"fields": ("is_public",)}),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    inlines = [StopInline, TripShareInline]

    def stops_count(self, obj):
        return obj.stops.count()

    stops_count.short_description = "Stops"

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("user")
            .prefetch_related("stops")
        )


@admin.register(Stop)
class StopAdmin(admin.ModelAdmin):
    """Admin interface for Stop model."""

    list_display = (
        "name",
        "trip",
        "stop_type",
        "order",
        "latitude",
        "longitude",
        "created_at",
    )
    list_filter = ("stop_type", "created_at", "trip__route_type")
    search_fields = ("name", "address", "trip__name", "trip__user__email")

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("trip", "name", "address", "stop_type", "order")},
        ),
        ("Location", {"fields": ("latitude", "longitude", "place_id")}),
        (
            "Timing",
            {
                "fields": ("arrival_time", "departure_time", "duration_minutes"),
                "classes": ("collapse",),
            },
        ),
        (
            "Travel Information",
            {
                "fields": ("travel_time_to_next", "travel_distance_to_next"),
                "classes": ("collapse",),
            },
        ),
        (
            "Additional Information",
            {"fields": ("notes", "estimated_cost"), "classes": ("collapse",)},
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    readonly_fields = (
        "travel_time_to_next",
        "travel_distance_to_next",
        "created_at",
        "updated_at",
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("trip", "trip__user")


@admin.register(TripShare)
class TripShareAdmin(admin.ModelAdmin):
    """Admin interface for TripShare model."""

    list_display = (
        "trip",
        "shared_with",
        "shared_by",
        "permission_level",
        "is_active",
        "shared_at",
    )
    list_filter = ("permission_level", "is_active", "shared_at")
    search_fields = ("trip__name", "shared_with__email", "shared_by__email")

    fieldsets = (
        (
            "Sharing Information",
            {"fields": ("trip", "shared_with", "shared_by", "permission_level")},
        ),
        ("Settings", {"fields": ("is_active", "message")}),
        ("Timestamps", {"fields": ("shared_at",), "classes": ("collapse",)}),
    )

    readonly_fields = ("shared_at",)

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("trip", "shared_with", "shared_by")
        )
