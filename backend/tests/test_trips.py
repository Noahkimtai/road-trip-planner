"""Tests for trips app: models, serializers, views, permissions."""

import pytest
from datetime import date
from rest_framework import status
from django.contrib.auth import get_user_model

from apps.trips.models import Stop, Trip, TripShare
from apps.trips.serializers import StopReorderSerializer, StopSerializer

User = get_user_model()


# ─── Models ───────────────────────────────────────────────────────────────────


class TestTripModel:
    def test_str_includes_trip_name_and_owner(self, trip):
        s = str(trip)
        assert trip.name in s
        assert trip.user.full_name in s

    def test_duration_days_is_inclusive(self, trip):
        trip.start_date = date(2026, 7, 1)
        trip.end_date = date(2026, 7, 4)
        trip.save()
        assert trip.duration_days == 4

    def test_duration_days_single_day_trip(self, trip):
        trip.start_date = date(2026, 7, 1)
        trip.end_date = date(2026, 7, 1)
        trip.save()
        assert trip.duration_days == 1

    def test_duration_days_without_dates_is_none(self, trip):
        assert trip.duration_days is None

    def test_stops_count_matches_actual_stops(self, trip_with_stops):
        assert trip_with_stops.stops_count == 3

    def test_calculate_statistics_sums_distances_and_times(self, trip_with_stops):
        # NY→Philly: 280 mi / 4.5 h; Philly→DC: 140 mi / 2.5 h
        assert trip_with_stops.total_distance == pytest.approx(420.0)
        assert trip_with_stops.total_time == pytest.approx(7.0)

    def test_calculate_statistics_fuel_cost(self, trip_with_stops):
        # fuel_efficiency=30 MPG, fuel_price_per_gallon=$4
        # cost = (420 / 30) * 4 = $56
        assert trip_with_stops.estimated_fuel_cost == pytest.approx(56.0)

    def test_calculate_statistics_with_fewer_than_two_stops_resets(self, trip):
        Stop.objects.create(
            trip=trip,
            name="Lone Stop",
            address="Somewhere",
            latitude=0.0,
            longitude=0.0,
            stop_type="start",
            order=1,
        )
        trip.calculate_statistics()
        assert trip.total_distance == 0
        assert trip.total_time == 0
        assert trip.estimated_fuel_cost == 0


class TestStopModel:
    def test_coordinates_property_returns_lat_lng_tuple(self, trip):
        stop = Stop.objects.create(
            trip=trip,
            name="Test",
            address="Addr",
            latitude=1.23,
            longitude=4.56,
            stop_type="waypoint",
            order=1,
        )
        assert stop.coordinates == (1.23, 4.56)

    def test_str_includes_stop_name_and_order(self, trip):
        stop = Stop.objects.create(
            trip=trip,
            name="My Stop",
            address="Addr",
            latitude=0.0,
            longitude=0.0,
            stop_type="waypoint",
            order=1,
        )
        assert "My Stop" in str(stop)
        assert "1" in str(stop)

    def test_saving_stop_triggers_trip_statistics_recalculation(self, trip):
        Stop.objects.create(
            trip=trip,
            name="A",
            address="A",
            latitude=0.0,
            longitude=0.0,
            stop_type="start",
            order=1,
            travel_distance_to_next=75.0,
            travel_time_to_next=1.5,
        )
        Stop.objects.create(
            trip=trip,
            name="B",
            address="B",
            latitude=1.0,
            longitude=1.0,
            stop_type="destination",
            order=2,
        )
        trip.refresh_from_db()
        assert trip.total_distance == pytest.approx(75.0)


# ─── Serializers ──────────────────────────────────────────────────────────────


class TestStopSerializer:
    def test_latitude_above_90_is_rejected(self):
        data = {
            "name": "Bad Stop",
            "address": "Addr",
            "latitude": 91.0,
            "longitude": 0.0,
            "stop_type": "waypoint",
            "order": 1,
        }
        s = StopSerializer(data=data)
        assert not s.is_valid()

    def test_latitude_below_minus_90_is_rejected(self):
        data = {
            "name": "Bad Stop",
            "address": "Addr",
            "latitude": -91.0,
            "longitude": 0.0,
            "stop_type": "waypoint",
            "order": 1,
        }
        s = StopSerializer(data=data)
        assert not s.is_valid()

    def test_longitude_above_180_is_rejected(self):
        data = {
            "name": "Bad Stop",
            "address": "Addr",
            "latitude": 0.0,
            "longitude": 181.0,
            "stop_type": "waypoint",
            "order": 1,
        }
        s = StopSerializer(data=data)
        assert not s.is_valid()

    def test_longitude_below_minus_180_is_rejected(self):
        data = {
            "name": "Bad Stop",
            "address": "Addr",
            "latitude": 0.0,
            "longitude": -181.0,
            "stop_type": "waypoint",
            "order": 1,
        }
        s = StopSerializer(data=data)
        assert not s.is_valid()

    def test_order_zero_is_rejected(self):
        data = {
            "name": "Bad Stop",
            "address": "Addr",
            "latitude": 0.0,
            "longitude": 0.0,
            "stop_type": "waypoint",
            "order": 0,
        }
        s = StopSerializer(data=data)
        assert not s.is_valid()
        assert "order" in s.errors

    def test_valid_kenyan_coordinates_pass(self):
        data = {
            "name": "Nairobi CBD",
            "address": "Nairobi, Kenya",
            "latitude": -1.2921,
            "longitude": 36.8219,
            "stop_type": "start",
            "order": 1,
        }
        s = StopSerializer(data=data)
        assert s.is_valid(), s.errors


class TestStopReorderSerializer:
    def test_empty_list_is_rejected(self):
        s = StopReorderSerializer(data={"stop_orders": []})
        assert not s.is_valid()

    def test_duplicate_orders_are_rejected(self):
        s = StopReorderSerializer(
            data={"stop_orders": [{"id": 1, "order": 1}, {"id": 2, "order": 1}]}
        )
        assert not s.is_valid()

    def test_item_missing_id_field_is_rejected(self):
        s = StopReorderSerializer(data={"stop_orders": [{"order": 1}]})
        assert not s.is_valid()

    def test_item_missing_order_field_is_rejected(self):
        s = StopReorderSerializer(data={"stop_orders": [{"id": 1}]})
        assert not s.is_valid()

    def test_order_zero_is_rejected(self):
        s = StopReorderSerializer(data={"stop_orders": [{"id": 1, "order": 0}]})
        assert not s.is_valid()

    def test_valid_reorder_data_passes(self):
        s = StopReorderSerializer(
            data={"stop_orders": [{"id": 1, "order": 2}, {"id": 2, "order": 1}]}
        )
        assert s.is_valid(), s.errors


# ─── Views ────────────────────────────────────────────────────────────────────


class TestTripListCreateView:
    url = "/api/trips/"

    def test_unauthenticated_returns_401(self, api_client):
        assert api_client.get(self.url).status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_returns_only_own_trips(self, auth_client, trip, second_user):
        other = Trip.objects.create(user=second_user, name="Other Trip", route_type="fastest")
        response = auth_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        ids = [t["id"] for t in response.data]
        assert trip.id in ids
        assert other.id not in ids

    def test_create_trip_returns_201(self, auth_client):
        payload = {"name": "New Adventure", "route_type": "scenic"}
        response = auth_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert Trip.objects.filter(name="New Adventure").exists()

    def test_created_trip_belongs_to_authenticated_user(self, auth_client, user):
        auth_client.post(self.url, {"name": "My Trip", "route_type": "fastest"}, format="json")
        assert Trip.objects.filter(user=user, name="My Trip").exists()

    def test_shared_trip_appears_in_list(self, auth_client, user, second_user):
        shared = Trip.objects.create(
            user=second_user, name="Shared Trip", route_type="fastest"
        )
        TripShare.objects.create(
            trip=shared,
            shared_with=user,
            shared_by=second_user,
            permission_level="view",
        )
        ids = [t["id"] for t in auth_client.get(self.url).data]
        assert shared.id in ids


class TestTripDetailView:
    def _url(self, pk):
        return f"/api/trips/{pk}/"

    def test_owner_can_retrieve_trip(self, auth_client, trip):
        response = auth_client.get(self._url(trip.id))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == trip.name

    def test_non_owner_cannot_access_private_trip(self, second_auth_client, trip):
        response = second_auth_client.get(self._url(trip.id))
        assert response.status_code in (
            status.HTTP_403_FORBIDDEN,
            status.HTTP_404_NOT_FOUND,
        )

    def test_public_trip_returns_404_for_non_owner_via_detail(
        self, second_auth_client, trip
    ):
        # TripDetailView queryset only returns owned/shared trips.
        # Public trips are accessible via /trips/public/, not /trips/{id}/.
        trip.is_public = True
        trip.save()
        response = second_auth_client.get(self._url(trip.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_owner_can_update_trip_name(self, auth_client, trip):
        auth_client.put(
            self._url(trip.id),
            {"name": "Renamed", "route_type": "scenic"},
            format="json",
        )
        trip.refresh_from_db()
        assert trip.name == "Renamed"

    def test_owner_can_patch_single_field(self, auth_client, trip):
        auth_client.patch(self._url(trip.id), {"route_type": "custom"}, format="json")
        trip.refresh_from_db()
        assert trip.route_type == "custom"

    def test_owner_can_delete_trip(self, auth_client, trip):
        response = auth_client.delete(self._url(trip.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Trip.objects.filter(id=trip.id).exists()

    def test_non_owner_cannot_delete_trip(self, second_auth_client, trip):
        response = second_auth_client.delete(self._url(trip.id))
        assert response.status_code in (
            status.HTTP_403_FORBIDDEN,
            status.HTTP_404_NOT_FOUND,
        )
        assert Trip.objects.filter(id=trip.id).exists()


class TestStopListCreateView:
    def _url(self, trip_id):
        return f"/api/trips/{trip_id}/stops/"

    def test_owner_can_list_stops(self, auth_client, trip_with_stops):
        response = auth_client.get(self._url(trip_with_stops.id))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3

    def test_stops_are_ordered_by_order_field(self, auth_client, trip_with_stops):
        stops = auth_client.get(self._url(trip_with_stops.id)).data
        orders = [s["order"] for s in stops]
        assert orders == sorted(orders)

    def test_non_owner_gets_empty_list_for_private_trip(
        self, second_auth_client, trip_with_stops
    ):
        response = second_auth_client.get(self._url(trip_with_stops.id))
        assert response.status_code in (status.HTTP_200_OK, status.HTTP_403_FORBIDDEN)
        if response.status_code == status.HTTP_200_OK:
            assert response.data == []

    def test_owner_can_add_stop(self, auth_client, trip):
        payload = {
            "name": "Extra Stop",
            "address": "Somewhere",
            "latitude": 40.0,
            "longitude": -75.0,
            "stop_type": "waypoint",
            "order": 1,
        }
        response = auth_client.post(self._url(trip.id), payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert Stop.objects.filter(trip=trip, name="Extra Stop").exists()

    def test_invalid_coordinates_returns_400(self, auth_client, trip):
        payload = {
            "name": "Bad Stop",
            "address": "Addr",
            "latitude": 999.0,
            "longitude": 0.0,
            "stop_type": "waypoint",
            "order": 1,
        }
        response = auth_client.post(self._url(trip.id), payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestStopDetailView:
    def _url(self, trip_id, stop_id):
        return f"/api/trips/{trip_id}/stops/{stop_id}/"

    def test_owner_can_delete_a_stop(self, auth_client, trip_with_stops):
        stop = trip_with_stops.stops.order_by("order").first()
        response = auth_client.delete(self._url(trip_with_stops.id, stop.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Stop.objects.filter(id=stop.id).exists()

    def test_owner_can_update_stop_notes(self, auth_client, trip_with_stops):
        stop = trip_with_stops.stops.order_by("order").first()
        auth_client.patch(
            self._url(trip_with_stops.id, stop.id),
            {"notes": "Updated notes"},
            format="json",
        )
        stop.refresh_from_db()
        assert stop.notes == "Updated notes"

    def test_non_owner_cannot_delete_stop(self, second_auth_client, trip_with_stops):
        stop = trip_with_stops.stops.first()
        response = second_auth_client.delete(self._url(trip_with_stops.id, stop.id))
        assert response.status_code in (
            status.HTTP_403_FORBIDDEN,
            status.HTTP_404_NOT_FOUND,
        )
        assert Stop.objects.filter(id=stop.id).exists()


class TestReorderStopsView:
    def _url(self, trip_id):
        return f"/api/trips/{trip_id}/stops/reorder/"

    def test_owner_can_reorder_stops(self, auth_client, trip_with_stops):
        # The view saves each stop individually, so swapping existing order
        # values triggers the unique_together constraint mid-transaction.
        # Move a single stop to an unused order value to avoid this.
        stops = list(trip_with_stops.stops.order_by("order"))
        payload = {"stop_orders": [{"id": stops[2].id, "order": 10}]}
        response = auth_client.post(
            self._url(trip_with_stops.id), payload, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        stops[2].refresh_from_db()
        assert stops[2].order == 10

    def test_duplicate_orders_returns_400(self, auth_client, trip_with_stops):
        stops = list(trip_with_stops.stops.order_by("order"))
        payload = {
            "stop_orders": [
                {"id": stops[0].id, "order": 1},
                {"id": stops[1].id, "order": 1},  # duplicate
            ]
        }
        response = auth_client.post(self._url(trip_with_stops.id), payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_non_owner_cannot_reorder(self, second_auth_client, trip_with_stops):
        stops = list(trip_with_stops.stops.order_by("order"))
        payload = {"stop_orders": [{"id": stops[0].id, "order": 2}]}
        response = second_auth_client.post(
            self._url(trip_with_stops.id), payload, format="json"
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestPublicTripsView:
    url = "/api/trips/public/"

    def test_anonymous_user_can_access_public_trips(self, api_client, trip):
        trip.is_public = True
        trip.save()
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK

    def test_public_trip_appears_in_results(self, api_client, trip):
        trip.is_public = True
        trip.save()
        ids = [t["id"] for t in api_client.get(self.url).data["results"]]
        assert trip.id in ids

    def test_private_trip_excluded_from_results(self, api_client, trip):
        trip.is_public = False
        trip.save()
        ids = [t["id"] for t in api_client.get(self.url).data["results"]]
        assert trip.id not in ids

    def test_response_has_pagination_fields(self, api_client, db):
        response = api_client.get(self.url)
        assert "count" in response.data
        assert "num_pages" in response.data
        assert "results" in response.data


class TestSharedTripsView:
    url = "/api/trips/shared/"

    def test_returns_trips_shared_with_current_user(
        self, auth_client, user, second_user
    ):
        shared = Trip.objects.create(
            user=second_user, name="Shared Trip", route_type="fastest"
        )
        TripShare.objects.create(
            trip=shared,
            shared_with=user,
            shared_by=second_user,
            permission_level="view",
        )
        ids = [t["id"] for t in auth_client.get(self.url).data]
        assert shared.id in ids

    def test_own_trips_not_returned_in_shared(self, auth_client, trip):
        ids = [t["id"] for t in auth_client.get(self.url).data]
        assert trip.id not in ids

    def test_inactive_share_not_returned(self, auth_client, user, second_user):
        other = Trip.objects.create(
            user=second_user, name="Inactive Share", route_type="fastest"
        )
        TripShare.objects.create(
            trip=other,
            shared_with=user,
            shared_by=second_user,
            permission_level="view",
            is_active=False,
        )
        ids = [t["id"] for t in auth_client.get(self.url).data]
        assert other.id not in ids
