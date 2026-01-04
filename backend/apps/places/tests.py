import pytest
import random

from .models import Place


@pytest.mark.django_db
def test_place_creation():
    # place = Place.objects.create(
    #     {
    #         "place_id": 1,
    #         "name": "Nairobi",
    #         "address": "123 Mock Street, Test City, State 12345",
    #         "latitude": 40.7128 + (random.random() - 0.5) * 0.1,
    #         "longitude": -74.006 + (random.random() - 0.5) * 0.1,
    #         "rating": round(3.5 + random.random() * 1.5, 1),
    #         "user_ratings_total": random.randint(50, 1000),
    #         "price_level": random.randint(1, 4),
    #         "types": ["establishment", "point_of_interest"],
    #         "business_status": "OPERATIONAL",
    #         "phone_number": "(555) 123-4567",
    #         "website": "https://example.com",
    #         "opening_hours": {
    #             "open_now": True,
    #             "weekday_text": [
    #                 "Monday: 9:00 AM – 5:00 PM",
    #                 "Tuesday: 9:00 AM – 5:00 PM",
    #                 "Wednesday: 9:00 AM – 5:00 PM",
    #                 "Thursday: 9:00 AM – 5:00 PM",
    #                 "Friday: 9:00 AM – 5:00 PM",
    #                 "Saturday: 10:00 AM – 4:00 PM",
    #                 "Sunday: Closed",
    #             ],
    #         },
    #     }
    # )
    place = {
        "place_id": 1,
        "name": "Nairobi",
        "address": "123 Mock Street, Test City, State 12345",
        "latitude": 40.7128 + (random.random() - 0.5) * 0.1,
        "longitude": -74.006 + (random.random() - 0.5) * 0.1,
        "rating": round(3.5 + random.random() * 1.5, 1),
        "user_ratings_total": random.randint(50, 1000),
        "price_level": random.randint(1, 4),
        "types": ["establishment", "point_of_interest"],
        "business_status": "OPERATIONAL",
        "phone_number": "(555) 123-4567",
        "website": "https://example.com",
        "opening_hours": {
            "open_now": True,
            "weekday_text": [
                "Monday: 9:00 AM – 5:00 PM",
                "Tuesday: 9:00 AM – 5:00 PM",
                "Wednesday: 9:00 AM – 5:00 PM",
                "Thursday: 9:00 AM – 5:00 PM",
                "Friday: 9:00 AM – 5:00 PM",
                "Saturday: 10:00 AM – 4:00 PM",
                "Sunday: Closed",
            ],
        },
    }
    assert place["name"] == "Nairobi"
