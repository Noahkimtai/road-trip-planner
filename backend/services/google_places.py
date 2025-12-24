"""
Google Places API service for place search and details.
"""

import requests
import logging
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from django.core.cache import cache
from apps.places.models import Place, PlaceSearchQuery

logger = logging.getLogger(__name__)


class GooglePlacesService:
    """Service for interacting with Google Places API."""

    def __init__(self):
        self.api_key = settings.GOOGLE_MAPS_API_KEY
        self.base_url = "https://maps.googleapis.com/maps/api/place"

        if not self.api_key:
            logger.warning("Google Maps API key not configured")
            self.client = None
        else:
            self.client = True  # Simple flag to indicate API is available

    def search_places(self, query, location=None, radius=50000, place_type=None):
        """
        Search for places using text search.

        Args:
            query (str): Search query
            location (tuple): (lat, lng) for location bias
            radius (int): Search radius in meters
            place_type (str): Type of place to search for

        Returns:
            list: List of place data
        """
        if not self.client:
            logger.error("Google Places API key not configured")
            return []

        # Check cache first
        cache_key = self._get_search_cache_key(query, location, radius, place_type)
        cached_results = cache.get(cache_key)
        if cached_results:
            logger.info(f"Returning cached search results for: {query}")
            return cached_results

        try:
            # Build API request URL
            url = f"{self.base_url}/textsearch/json"
            params = {
                "query": query,
                "key": self.api_key,
                "language": "en",
            }

            if location:
                params["location"] = f"{location[0]},{location[1]}"
                params["radius"] = radius

            if place_type:
                params["type"] = place_type

            # Make API request
            response = requests.get(url, params=params)
            response.raise_for_status()

            data = response.json()

            if data.get("status") != "OK":
                logger.error(
                    f"Google Places API error: {data.get('status')} - {data.get('error_message', '')}"
                )
                return []

            places_data = []
            for result in data.get("results", []):
                place_data = self._process_place_result(result)
                places_data.append(place_data)

                # Cache individual place data
                self._cache_place_data(result)

            # Cache search results for 1 hour
            cache.set(cache_key, places_data, 3600)

            # Store search query in database
            self._store_search_query(query, location, radius, place_type, places_data)

            logger.info(f"Found {len(places_data)} places for query: {query}")
            return places_data

        except Exception as e:
            logger.error(f"Error searching places: {str(e)}")
            return []

    def get_place_details(self, place_id):
        """
        Get detailed information about a specific place.

        Args:
            place_id (str): Google Places place ID

        Returns:
            dict: Detailed place information
        """
        if not self.client:
            logger.error("Google Places API key not configured")
            return None

        # Check if we have cached data
        try:
            place = Place.objects.get(google_place_id=place_id)
            if place.is_cache_valid:
                logger.info(f"Returning cached place details for: {place_id}")
                return self._place_model_to_dict(place)
        except Place.DoesNotExist:
            pass

        try:
            # Build API request URL
            url = f"{self.base_url}/details/json"
            params = {
                "place_id": place_id,
                "key": self.api_key,
                "fields": ",".join(
                    [
                        "place_id",
                        "name",
                        "formatted_address",
                        "geometry",
                        "rating",
                        "user_ratings_total",
                        "price_level",
                        "formatted_phone_number",
                        "international_phone_number",
                        "website",
                        "opening_hours",
                        "photos",
                        "reviews",
                        "types",
                        "business_status",
                    ]
                ),
                "language": "en",
            }

            # Make API request
            response = requests.get(url, params=params)
            response.raise_for_status()

            data = response.json()

            if data.get("status") != "OK":
                logger.error(
                    f"Google Places API error: {data.get('status')} - {data.get('error_message', '')}"
                )
                return None

            place_data = data.get("result", {})
            if place_data:
                # Cache the detailed data
                self._cache_place_data(place_data, detailed=True)
                return self._process_place_result(place_data, detailed=True)

        except Exception as e:
            logger.error(f"Error getting place details: {str(e)}")

        return None

    def get_nearby_places(self, latitude, longitude, radius=5000, place_type=None):
        """
        Get places near a specific location.

        Args:
            latitude (float): Latitude
            longitude (float): Longitude
            radius (int): Search radius in meters
            place_type (str): Type of places to search for

        Returns:
            list: List of nearby places
        """
        if not self.client:
            logger.error("Google Places API key not configured")
            return []

        # Check cache first
        cache_key = (
            f"nearby_places_{latitude}_{longitude}_{radius}_{place_type or 'all'}"
        )
        cached_results = cache.get(cache_key)
        if cached_results:
            logger.info(f"Returning cached nearby places for: {latitude}, {longitude}")
            return cached_results

        try:
            # Build API request URL
            url = f"{self.base_url}/nearbysearch/json"
            params = {
                "location": f"{latitude},{longitude}",
                "radius": radius,
                "key": self.api_key,
                "language": "en",
            }

            if place_type:
                params["type"] = place_type

            # Make API request
            response = requests.get(url, params=params)
            response.raise_for_status()

            data = response.json()

            if data.get("status") != "OK":
                logger.error(
                    f"Google Places API error: {data.get('status')} - {data.get('error_message', '')}"
                )
                return []

            places_data = []
            for result in data.get("results", []):
                place_data = self._process_place_result(result)
                places_data.append(place_data)

                # Cache individual place data
                self._cache_place_data(result)

            # Cache results for 30 minutes
            cache.set(cache_key, places_data, 1800)

            logger.info(f"Found {len(places_data)} nearby places")
            return places_data

        except Exception as e:
            logger.error(f"Error getting nearby places: {str(e)}")
            return []

    def _process_place_result(self, result, detailed=False):
        """Process a place result from Google Places API."""
        geometry = result.get("geometry", {})
        location = geometry.get("location", {})

        place_data = {
            "place_id": result.get("place_id"),
            "name": result.get("name"),
            "address": result.get("formatted_address", result.get("vicinity", "")),
            "latitude": location.get("lat"),
            "longitude": location.get("lng"),
            "rating": result.get("rating"),
            "user_ratings_total": result.get("user_ratings_total"),
            "price_level": result.get("price_level"),
            "types": result.get("types", []),
            "business_status": result.get("business_status"),
        }

        if detailed:
            place_data.update(
                {
                    "phone_number": result.get("formatted_phone_number"),
                    "international_phone_number": result.get(
                        "international_phone_number"
                    ),
                    "website": result.get("website"),
                    "opening_hours": result.get("opening_hours"),
                    "photos": [
                        photo.get("photo_reference")
                        for photo in result.get("photos", [])
                    ],
                    "reviews": result.get("reviews", [])[:5],  # Limit to 5 reviews
                }
            )

        return place_data

    def _cache_place_data(self, result, detailed=False):
        """Cache place data in the database."""
        try:
            place_id = result.get("place_id")
            if not place_id:
                return

            geometry = result.get("geometry", {})
            location = geometry.get("location", {})

            # Determine place type
            types = result.get("types", [])
            place_type = "other"
            type_mapping = {
                "tourist_attraction": "attraction",
                "restaurant": "restaurant",
                "lodging": "accommodation",
                "gas_station": "gas_station",
                "park": "park",
                "museum": "museum",
                "shopping_mall": "shopping",
                "amusement_park": "entertainment",
            }

            for api_type in types:
                if api_type in type_mapping:
                    place_type = type_mapping[api_type]
                    break

            # Create or update place
            place_data = {
                "google_place_id": place_id,
                "name": result.get("name", ""),
                "address": result.get("vicinity", ""),
                "formatted_address": result.get("formatted_address", ""),
                "latitude": location.get("lat"),
                "longitude": location.get("lng"),
                "place_type": place_type,
                "types": types,
                "rating": result.get("rating"),
                "user_ratings_total": result.get("user_ratings_total"),
                "price_level": result.get("price_level"),
                "business_status": result.get("business_status", ""),
                "cache_expires_at": timezone.now() + timedelta(days=7),
            }

            if detailed:
                place_data.update(
                    {
                        "phone_number": result.get("formatted_phone_number", ""),
                        "international_phone_number": result.get(
                            "international_phone_number", ""
                        ),
                        "website": result.get("website", ""),
                        "opening_hours": result.get("opening_hours", {}),
                        "photos": [
                            photo.get("photo_reference")
                            for photo in result.get("photos", [])
                        ],
                        "reviews": result.get("reviews", [])[:5],
                    }
                )

            Place.objects.update_or_create(place_id=place_id, defaults=place_data)

        except Exception as e:
            logger.error(f"Error caching place data: {str(e)}")

    def _store_search_query(self, query, location, radius, place_type, results):
        """Store search query and results in database."""
        try:
            lat, lng = location if location else (None, None)

            PlaceSearchQuery.objects.create(
                query=query,
                latitude=lat,
                longitude=lng,
                radius=radius,
                place_type=place_type or "",
                results=[r.get("place_id") for r in results if r.get("place_id")],
                total_results=len(results),
                expires_at=timezone.now() + timedelta(hours=1),
            )
        except Exception as e:
            logger.error(f"Error storing search query: {str(e)}")

    def _get_search_cache_key(self, query, location, radius, place_type):
        """Generate cache key for search results."""
        location_str = f"{location[0]}_{location[1]}" if location else "no_location"
        return f"places_search_{query}_{location_str}_{radius}_{place_type or 'all'}"

    def _place_model_to_dict(self, place):
        """Convert Place model instance to dictionary."""
        return {
            "place_id": place.place_id,
            "name": place.name,
            "address": place.formatted_address or place.address,
            "latitude": place.latitude,
            "longitude": place.longitude,
            "rating": place.rating,
            "user_ratings_total": place.user_ratings_total,
            "price_level": place.price_level,
            "types": place.types,
            "business_status": place.business_status,
            "phone_number": place.phone_number,
            "international_phone_number": place.international_phone_number,
            "website": place.website,
            "opening_hours": place.opening_hours,
            "photos": place.photos,
            "reviews": place.reviews,
        }


# Global instance
google_places_service = GooglePlacesService()
