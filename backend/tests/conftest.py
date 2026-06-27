import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="alice@example.com",
        username="alice",
        first_name="Alice",
        last_name="Test",
        password="Passw0rd!99",
    )


@pytest.fixture
def second_user(db):
    return User.objects.create_user(
        email="bob@example.com",
        username="bob",
        first_name="Bob",
        last_name="Test",
        password="Passw0rd!88",
    )


@pytest.fixture
def auth_client(user):
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


@pytest.fixture
def second_auth_client(second_user):
    client = APIClient()
    refresh = RefreshToken.for_user(second_user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


@pytest.fixture
def trip(user):
    from apps.trips.models import Trip
    return Trip.objects.create(
        user=user,
        name="Cross-Country Drive",
        description="A scenic drive",
        route_type="fastest",
        fuel_efficiency=30.0,
        fuel_price_per_gallon=4.0,
    )


@pytest.fixture
def trip_with_stops(trip):
    from apps.trips.models import Stop

    Stop.objects.create(
        trip=trip,
        name="New York",
        address="New York, NY",
        latitude=40.7128,
        longitude=-74.0060,
        stop_type="start",
        order=1,
        travel_distance_to_next=280.0,
        travel_time_to_next=4.5,
    )
    Stop.objects.create(
        trip=trip,
        name="Philadelphia",
        address="Philadelphia, PA",
        latitude=39.9526,
        longitude=-75.1652,
        stop_type="waypoint",
        order=2,
        travel_distance_to_next=140.0,
        travel_time_to_next=2.5,
    )
    Stop.objects.create(
        trip=trip,
        name="Washington D.C.",
        address="Washington, D.C.",
        latitude=38.9072,
        longitude=-77.0369,
        stop_type="destination",
        order=3,
    )
    trip.refresh_from_db()
    return trip
