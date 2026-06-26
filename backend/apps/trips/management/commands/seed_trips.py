"""
Management command: seed_trips
Creates realistic Kenya road-trip seed data for a given user.

Usage:
    python manage.py seed_trips --user-id 3
    python manage.py seed_trips --user-id 3 --clear   # wipe first, then seed
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from apps.trips.models import Trip, Stop

User = get_user_model()

# ---------------------------------------------------------------------------
# Seed definitions
# ---------------------------------------------------------------------------

TRIPS = [
    # ── Trip 1: Nairobi → Mombasa ──────────────────────────────────────────
    {
        "name": "Nairobi to Mombasa Coastal Road Trip",
        "description": (
            "A classic Kenya road trip along the A109 highway from Nairobi "
            "down to the coast, passing through savannah plains, the Tsavo "
            "wilderness corridor and ending at the historic coastal city of "
            "Mombasa."
        ),
        "route_type": "fastest",
        "total_distance": 484.0,
        "total_time": 8.5,
        "estimated_fuel_cost": 67.76,
        "start_date": "2026-07-04",
        "end_date": "2026-07-07",
        "is_public": True,
        "fuel_efficiency": 25.0,
        "fuel_price_per_gallon": 3.50,
        "vehicle_make": "Toyota",
        "vehicle_model": "Land Cruiser",
        "vehicle_year": "2022",
        "stops": [
            {
                "name": "Nairobi CBD",
                "address": "Kenyatta Avenue, Nairobi, Kenya",
                "latitude": -1.2921,
                "longitude": 36.8219,
                "stop_type": "start",
                "order": 1,
                "duration_minutes": 30,
                "notes": "Departure point — fuel up and grab supplies.",
                "estimated_cost": 20.0,
            },
            {
                "name": "Machakos Town",
                "address": "Machakos, Kenya",
                "latitude": -1.5177,
                "longitude": 37.2634,
                "stop_type": "waypoint",
                "order": 2,
                "travel_time_to_next": 1.2,
                "travel_distance_to_next": 63.0,
                "duration_minutes": 45,
                "notes": "Lunch stop at Machakos People's Park.",
                "estimated_cost": 15.0,
            },
            {
                "name": "Mtito Andei",
                "address": "Mtito Andei, Makueni County, Kenya",
                "latitude": -2.6833,
                "longitude": 38.1667,
                "stop_type": "waypoint",
                "order": 3,
                "travel_time_to_next": 2.5,
                "travel_distance_to_next": 175.0,
                "duration_minutes": 30,
                "notes": "Halfway fuel stop. Tsavo East gate is nearby.",
                "estimated_cost": 40.0,
            },
            {
                "name": "Voi Town",
                "address": "Voi, Taita-Taveta County, Kenya",
                "latitude": -3.3955,
                "longitude": 38.5567,
                "stop_type": "waypoint",
                "order": 4,
                "travel_time_to_next": 1.5,
                "travel_distance_to_next": 101.0,
                "duration_minutes": 30,
                "notes": "Gateway to Tsavo West. Good overnight option.",
                "estimated_cost": 10.0,
            },
            {
                "name": "Mombasa — Old Town",
                "address": "Old Town, Mombasa Island, Kenya",
                "latitude": -4.0534,
                "longitude": 39.6681,
                "stop_type": "destination",
                "order": 5,
                "travel_time_to_next": None,
                "travel_distance_to_next": None,
                "duration_minutes": 120,
                "notes": (
                    "Final destination. Explore Fort Jesus, the Old Town "
                    "spice markets and Likoni Ferry."
                ),
                "estimated_cost": 50.0,
            },
        ],
    },

    # ── Trip 2: Nairobi → Maasai Mara Safari ───────────────────────────────
    {
        "name": "Nairobi to Maasai Mara Safari Drive",
        "description": (
            "Iconic scenic drive from Nairobi through the Great Rift Valley "
            "escarpment and rolling Narok plains to the world-famous Maasai "
            "Mara National Reserve — best in July–October during the Great "
            "Migration."
        ),
        "route_type": "scenic",
        "total_distance": 270.0,
        "total_time": 5.5,
        "estimated_fuel_cost": 37.80,
        "start_date": "2026-07-18",
        "end_date": "2026-07-21",
        "is_public": True,
        "fuel_efficiency": 22.0,
        "fuel_price_per_gallon": 3.50,
        "vehicle_make": "Toyota",
        "vehicle_model": "Prado",
        "vehicle_year": "2021",
        "stops": [
            {
                "name": "Nairobi — Westlands",
                "address": "Westlands, Nairobi, Kenya",
                "latitude": -1.2676,
                "longitude": 36.8040,
                "stop_type": "start",
                "order": 1,
                "duration_minutes": 20,
                "notes": "Early morning departure to beat Nairobi traffic.",
                "estimated_cost": 0.0,
            },
            {
                "name": "Narok Town",
                "address": "Narok, Narok County, Kenya",
                "latitude": -1.0827,
                "longitude": 35.8715,
                "stop_type": "waypoint",
                "order": 2,
                "travel_time_to_next": 2.0,
                "travel_distance_to_next": 140.0,
                "duration_minutes": 40,
                "notes": "Last proper fuel stop and supermarket before the Mara.",
                "estimated_cost": 60.0,
            },
            {
                "name": "Maasai Mara — Sekenani Gate",
                "address": "Sekenani Gate, Maasai Mara, Narok, Kenya",
                "latitude": -1.5167,
                "longitude": 35.2500,
                "stop_type": "waypoint",
                "order": 3,
                "travel_time_to_next": 0.5,
                "travel_distance_to_next": 20.0,
                "duration_minutes": 30,
                "notes": "Park entry. Pay conservation fees here (approx $80/person).",
                "estimated_cost": 80.0,
            },
            {
                "name": "Maasai Mara National Reserve",
                "address": "Maasai Mara National Reserve, Kenya",
                "latitude": -1.5021,
                "longitude": 35.1437,
                "stop_type": "destination",
                "order": 4,
                "travel_time_to_next": None,
                "travel_distance_to_next": None,
                "duration_minutes": 240,
                "notes": (
                    "Three nights. Dawn and dusk game drives. "
                    "Look for the Big Five and the wildebeest crossing."
                ),
                "estimated_cost": 400.0,
            },
        ],
    },

    # ── Trip 3: Mount Kenya Circuit ─────────────────────────────────────────
    {
        "name": "Mount Kenya Circuit — Tea & Trekking",
        "description": (
            "A circular drive around Africa's second-highest peak through "
            "lush tea estates, cedar forests, highland towns and the "
            "semi-arid Laikipia plateau. "
            "Ideal for a long weekend or a full week."
        ),
        "route_type": "custom",
        "total_distance": 520.0,
        "total_time": 10.0,
        "estimated_fuel_cost": 72.80,
        "start_date": "2026-08-01",
        "end_date": "2026-08-05",
        "is_public": False,
        "fuel_efficiency": 25.0,
        "fuel_price_per_gallon": 3.50,
        "vehicle_make": "Subaru",
        "vehicle_model": "Forester",
        "vehicle_year": "2020",
        "stops": [
            {
                "name": "Nairobi — Thika Road",
                "address": "Thika Superhighway, Nairobi, Kenya",
                "latitude": -1.2921,
                "longitude": 36.8219,
                "stop_type": "start",
                "order": 1,
                "duration_minutes": 15,
                "notes": "Head north on the Thika Superhighway.",
                "estimated_cost": 0.0,
            },
            {
                "name": "Nyeri Town",
                "address": "Nyeri, Central Kenya",
                "latitude": -0.4167,
                "longitude": 36.9500,
                "stop_type": "waypoint",
                "order": 2,
                "travel_time_to_next": 2.0,
                "travel_distance_to_next": 155.0,
                "duration_minutes": 60,
                "notes": (
                    "Visit Baden-Powell's grave at St. Peter's Church. "
                    "Outspan Hotel is a great base for Aberdares day trips."
                ),
                "estimated_cost": 30.0,
            },
            {
                "name": "Nanyuki",
                "address": "Nanyuki, Laikipia, Kenya",
                "latitude": 0.0167,
                "longitude": 37.0667,
                "stop_type": "waypoint",
                "order": 3,
                "travel_time_to_next": 1.5,
                "travel_distance_to_next": 88.0,
                "duration_minutes": 90,
                "notes": (
                    "Equator monument photo stop. Bases for Mount Kenya "
                    "treks depart from here. Try the Sportsman's Arms."
                ),
                "estimated_cost": 50.0,
            },
            {
                "name": "Meru Town",
                "address": "Meru, Meru County, Kenya",
                "latitude": 0.0469,
                "longitude": 37.6490,
                "stop_type": "waypoint",
                "order": 4,
                "travel_time_to_next": 1.5,
                "travel_distance_to_next": 96.0,
                "duration_minutes": 45,
                "notes": "Gateway to Meru National Park. Famous for miraa (khat).",
                "estimated_cost": 20.0,
            },
            {
                "name": "Embu",
                "address": "Embu, Embu County, Kenya",
                "latitude": -0.5333,
                "longitude": 37.4500,
                "stop_type": "waypoint",
                "order": 5,
                "travel_time_to_next": 2.0,
                "travel_distance_to_next": 125.0,
                "duration_minutes": 60,
                "notes": (
                    "Tana River source views. "
                    "En route back to Nairobi via Sagana and Thika."
                ),
                "estimated_cost": 25.0,
            },
            {
                "name": "Nairobi — Return",
                "address": "Kenyatta Avenue, Nairobi, Kenya",
                "latitude": -1.2921,
                "longitude": 36.8219,
                "stop_type": "destination",
                "order": 6,
                "travel_time_to_next": None,
                "travel_distance_to_next": None,
                "duration_minutes": 0,
                "notes": "Circuit complete.",
                "estimated_cost": 0.0,
            },
        ],
    },
]


# ---------------------------------------------------------------------------
# Command
# ---------------------------------------------------------------------------

class Command(BaseCommand):
    help = "Seed realistic Kenya road-trip data for a given user."

    def add_arguments(self, parser):
        parser.add_argument(
            "--user-id",
            type=int,
            required=True,
            help="Primary key of the user to seed data for.",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            default=False,
            help="Delete all existing trips for this user before seeding.",
        )

    def handle(self, *args, **options):
        user_id = options["user_id"]

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise CommandError(f"User with id={user_id} does not exist.")

        if options["clear"]:
            deleted, _ = Trip.objects.filter(user=user).delete()
            self.stdout.write(
                self.style.WARNING(f"Deleted {deleted} existing trips for {user.email}.")
            )

        created_trips = 0
        created_stops = 0

        for trip_data in TRIPS:
            stops_data = trip_data.pop("stops")

            trip = Trip.objects.create(user=user, **trip_data)
            created_trips += 1

            for stop_data in stops_data:
                Stop.objects.create(trip=trip, **stop_data)
                created_stops += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f"  ✓ Trip '{trip.name}' — {len(stops_data)} stops"
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nSeeding complete: {created_trips} trips, "
                f"{created_stops} stops created for user '{user.email}'."
            )
        )
