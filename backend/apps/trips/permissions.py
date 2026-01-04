from rest_framework import permissions
from .models import Trip, TripShare


class TripPermission(permissions.BasePermission):
    """Custom permission for Trip objects."""

    def has_object_permission(self, request, view, obj):
        """Check if user has permission to access this trip."""
        user = request.user

        # Trip owner has full access
        if obj.user == user:
            return True

        # Check if trip is shared with user
        try:
            share = TripShare.objects.get(trip=obj, shared_with=user, is_active=True)

            # Read permissions for all shared users
            if request.method in permissions.SAFE_METHODS:
                return True

            # Write permissions only for edit/admin users
            if share.permission_level in ["edit", "admin"]:
                return True

            return False

        except TripShare.DoesNotExist:
            # Check if trip is public (read-only access)
            if obj.is_public and request.method in permissions.SAFE_METHODS:
                return True

            return False


class StopPermission(permissions.BasePermission):
    """Custom permission for Stop objects."""

    def has_permission(self, request, view):
        """Check if user has permission to access stops for this trip."""
        trip_id = view.kwargs.get("trip_id")
        if not trip_id:
            return False

        try:
            trip = Trip.objects.get(id=trip_id)
            user = request.user

            # Trip owner has full access
            if trip.user == user:
                return True

            # Check if trip is shared with user
            try:
                share = TripShare.objects.get(
                    trip=trip, shared_with=user, is_active=True
                )

                # Read permissions for all shared users
                if request.method in permissions.SAFE_METHODS:
                    return True

                # Write permissions only for edit/admin users
                if share.permission_level in ["edit", "admin"]:
                    return True

                return False

            except TripShare.DoesNotExist:
                # Check if trip is public (read-only access)
                if trip.is_public and request.method in permissions.SAFE_METHODS:
                    return True

                return False

        except Trip.DoesNotExist:
            return False

    def has_object_permission(self, request, view, obj):
        """Check if user has permission to access this specific stop."""
        return self.has_permission(request, view)


class TripSharePermission(permissions.BasePermission):
    """Custom permission for TripShare objects."""

    def has_permission(self, request, view):
        """Only trip owners can manage shares."""
        trip_id = view.kwargs.get("trip_id")
        if not trip_id:
            return False

        try:
            trip = Trip.objects.get(id=trip_id)
            return trip.user == request.user
        except Trip.DoesNotExist:
            return False

    def has_object_permission(self, request, view, obj):
        """Only trip owners can manage shares."""
        return obj.trip.user == request.user
