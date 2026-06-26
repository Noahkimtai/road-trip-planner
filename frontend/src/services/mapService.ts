// Map service using free/open-source alternatives to Mapbox:
//   - Nominatim (OpenStreetMap) for geocoding & reverse geocoding
//   - OSRM demo server for driving directions
// Maintains the same function signatures as the old mapboxService so the
// rest of the codebase needs minimal changes.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const OSRM_URL = "https://router.project-osrm.org";
const NOMINATIM_HEADERS = { "User-Agent": "RoadTripPlannerApp/1.0" };

interface NominatimPlace {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name: string;
  type: string;
  class: string;
  importance: number;
  address?: Record<string, string>;
}

// Kept for backward-compat with existing consumers
export interface MapboxPlace {
  id: string;
  place_name: string;
  place_type: string[];
  relevance: number;
  properties: Record<string, unknown>;
  text: string;
  center: [number, number]; // [longitude, latitude]
  geometry: { type: string; coordinates: [number, number] };
  context?: Array<{ id: string; text: string; short_code?: string }>;
}

export interface MapboxSearchResponse {
  type: string;
  query: string[];
  features: MapboxPlace[];
  attribution: string;
}

export interface MapboxDirectionsResponse {
  routes: Array<{
    geometry: string; // encoded polyline (polyline5)
    legs: Array<{
      distance: number; // metres
      duration: number; // seconds
      steps: Array<{
        distance: number;
        duration: number;
        geometry: string;
        instruction: string;
      }>;
    }>;
    distance: number;
    duration: number;
    weight: number;
    weight_name: string;
  }>;
  waypoints: Array<{ distance: number; name: string; location: [number, number] }>;
  code: string;
  uuid: string;
}

class MapService {
  // ─── Geocoding ──────────────────────────────────────────────────────────────

  async searchPlaces(
    query: string,
    options?: {
      limit?: number;
      proximity?: [number, number];
      bbox?: [number, number, number, number];
      country?: string;
      types?: string[];
    }
  ): Promise<MapboxSearchResponse> {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      limit: String(options?.limit ?? 10),
      addressdetails: "1",
    });

    if (options?.country) params.append("countrycodes", options.country);

    if (options?.bbox) {
      // Nominatim viewbox: left,top,right,bottom
      const [minX, minY, maxX, maxY] = options.bbox;
      params.append("viewbox", `${minX},${maxY},${maxX},${minY}`);
      params.append("bounded", "1");
    }

    const response = await fetch(`${NOMINATIM_URL}/search?${params}`, {
      headers: NOMINATIM_HEADERS,
    });

    if (!response.ok) throw new Error(`Nominatim search error: ${response.status}`);

    const data: NominatimPlace[] = await response.json();
    return {
      type: "FeatureCollection",
      query: [query],
      features: data.map(this._toMapboxPlace),
      attribution: "© OpenStreetMap contributors",
    };
  }

  async reverseGeocode(
    longitude: number,
    latitude: number
  ): Promise<MapboxSearchResponse> {
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      format: "json",
      addressdetails: "1",
    });

    const response = await fetch(`${NOMINATIM_URL}/reverse?${params}`, {
      headers: NOMINATIM_HEADERS,
    });

    if (!response.ok)
      throw new Error(`Nominatim reverse geocode error: ${response.status}`);

    const place: NominatimPlace = await response.json();
    return {
      type: "FeatureCollection",
      query: [`${longitude},${latitude}`],
      features: [this._toMapboxPlace(place)],
      attribution: "© OpenStreetMap contributors",
    };
  }

  // ─── Routing ────────────────────────────────────────────────────────────────

  async getDirections(
    coordinates: Array<[number, number]>, // [lng, lat]
    options?: {
      profile?: "driving" | "walking" | "cycling" | "driving-traffic";
      geometries?: "geojson" | "polyline" | "polyline6";
      overview?: "full" | "simplified" | "false";
      steps?: boolean;
      alternatives?: boolean;
      continue_straight?: boolean;
      waypoint_snapping?: string;
      approaches?: string[];
      annotations?: string[];
    }
  ): Promise<MapboxDirectionsResponse> {
    const profileMap: Record<string, string> = {
      driving: "driving",
      "driving-traffic": "driving",
      walking: "foot",
      cycling: "bike",
    };
    const profile = profileMap[options?.profile ?? "driving"] ?? "driving";
    const coordStr = coordinates.map(([lng, lat]) => `${lng},${lat}`).join(";");

    const params = new URLSearchParams({
      overview: "full",
      geometries: "polyline",
      steps: String(options?.steps ?? false),
    });
    if (options?.alternatives) params.append("alternatives", "true");

    const response = await fetch(
      `${OSRM_URL}/route/v1/${profile}/${coordStr}?${params}`
    );

    if (!response.ok) throw new Error(`OSRM error: ${response.status}`);

    const data = await response.json();
    if (data.code !== "Ok")
      throw new Error(`OSRM routing failed: ${data.message ?? data.code}`);

    return {
      routes: data.routes.map((r: any) => ({
        geometry: r.geometry,
        legs: r.legs.map((leg: any) => ({
          distance: leg.distance,
          duration: leg.duration,
          steps: (leg.steps ?? []).map((s: any) => ({
            distance: s.distance,
            duration: s.duration,
            geometry: s.geometry ?? "",
            instruction: s.maneuver?.instruction ?? "",
          })),
        })),
        distance: r.distance,
        duration: r.duration,
        weight: r.duration,
        weight_name: "duration",
      })),
      waypoints: (data.waypoints ?? []).map((wp: any) => ({
        distance: 0,
        name: wp.name ?? "",
        location: wp.location as [number, number],
      })),
      code: data.code,
      uuid: "",
    };
  }

  // ─── Utilities ──────────────────────────────────────────────────────────────

  convertToSearchResult(feature: MapboxPlace) {
    const [lng, lat] = feature.center;
    return {
      id: feature.id,
      name: feature.text,
      address: feature.place_name,
      lat,
      lng,
      type: feature.place_type[0] ?? "place",
      categories: feature.place_type,
      relevance: feature.relevance,
    };
  }

  async getPlaceDetails(coordinates: [number, number]) {
    const [lng, lat] = coordinates;
    try {
      const res = await this.reverseGeocode(lng, lat);
      const place = res.features[0];
      if (place) {
        return {
          name: place.text,
          address: place.place_name,
          coordinates: [lng, lat] as [number, number],
          placeType: place.place_type[0] ?? "place",
          context: place.context ?? [],
        };
      }
    } catch {
      // fall through
    }
    return {
      name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      coordinates: [lng, lat] as [number, number],
      placeType: "coordinate",
      context: [],
    };
  }

  // No longer needed with Leaflet — kept so old callers don't break
  getStaticMapUrl(_options: unknown): string {
    return "";
  }
  getSimpleMapUrl(_options: unknown): string {
    return "";
  }

  // ─── Weather (OpenWeatherMap — unchanged) ────────────────────────────────────

  async getWeatherForLocation(
    latitude: number,
    longitude: number,
    locationName?: string
  ): Promise<{
    location: string;
    temperature: number;
    condition: string;
    icon: string;
    humidity: number;
    windSpeed: number;
    date: Date;
  }> {
    const key = import.meta.env.VITE_OPENWEATHER_API_KEY;

    if (!key) {
      return {
        location: locationName ?? `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
        temperature: Math.round(25 + Math.random() * 10),
        condition: ["Sunny", "Partly Cloudy", "Cloudy", "Rainy"][
          Math.floor(Math.random() * 4)
        ],
        icon: "sun",
        humidity: Math.round(60 + Math.random() * 20),
        windSpeed: Math.round(5 + Math.random() * 10),
        date: new Date(),
      };
    }

    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${key}&units=metric`
      );
      if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
      const data = await res.json();
      return {
        location:
          locationName ?? data.name ?? `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
        temperature: Math.round(data.main.temp),
        condition: data.weather[0].description,
        icon: data.weather[0].icon,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        date: new Date(),
      };
    } catch {
      return {
        location: locationName ?? `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
        temperature: 25,
        condition: "Unknown",
        icon: "sun",
        humidity: 65,
        windSpeed: 8,
        date: new Date(),
      };
    }
  }

  // ─── POI Search (mock — Nominatim Overpass not integrated) ──────────────────

  async searchPOI(
    latitude: number,
    longitude: number,
    type: "restaurant" | "attraction" | "accommodation",
    options?: { radius?: number; limit?: number }
  ) {
    return this._mockPOI(latitude, longitude, type, options?.limit ?? 10);
  }

  async calculateTripMetrics(
    coordinates: Array<[number, number]>,
    _routeType: "fastest" | "scenic" | "custom" = "fastest"
  ) {
    const directions = await this.getDirections(coordinates, {
      profile: "driving",
      steps: true,
    });

    if (!directions.routes.length) throw new Error("No route found");

    const route = directions.routes[0];
    return {
      totalDistance: route.distance,
      totalTime: route.duration,
      estimatedFuelCost: (route.distance / 1000 / 10) * 1.5,
      legs: route.legs.map((leg, i) => ({
        distance: leg.distance,
        duration: leg.duration,
        startPoint: coordinates[i],
        endPoint: coordinates[i + 1],
      })),
    };
  }

  // Decode a Google/Mapbox/OSRM polyline5-encoded string → [[lng, lat], ...]
  decodePolyline(encoded: string): Array<[number, number]> {
    const coords: Array<[number, number]> = [];
    let i = 0;
    let lat = 0;
    let lng = 0;

    while (i < encoded.length) {
      let b: number;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      lat += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      lng += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

      coords.push([lng * 1e-5, lat * 1e-5]);
    }
    return coords;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private _toMapboxPlace = (place: NominatimPlace): MapboxPlace => ({
    id: `nominatim.${place.place_id}`,
    place_name: place.display_name,
    place_type: [place.type ?? place.class ?? "place"],
    relevance: place.importance ?? 0.5,
    properties: { category: place.type },
    text: place.name || place.display_name.split(",")[0].trim(),
    center: [parseFloat(place.lon), parseFloat(place.lat)],
    geometry: {
      type: "Point",
      coordinates: [parseFloat(place.lon), parseFloat(place.lat)],
    },
  });

  private _mockPOI(
    lat: number,
    lng: number,
    type: "restaurant" | "attraction" | "accommodation",
    limit: number
  ) {
    const names = {
      restaurant: ["Local Bistro", "Pizza Corner", "Sushi House", "Coffee Shop", "BBQ Grill"],
      attraction: ["City Museum", "Historic Monument", "Art Gallery", "Central Park", "Zoo"],
      accommodation: ["Grand Hotel", "Budget Inn", "Boutique Lodge", "Resort", "Hostel"],
    };
    return Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      id: `mock-${type}-${i}`,
      name: names[type][i % names[type].length],
      type,
      rating: 3.5 + Math.random() * 1.5,
      distance: `${(Math.random() * 2 + 0.1).toFixed(1)}km`,
      duration: `${Math.round(Math.random() * 20 + 5)}min`,
      description: `Popular ${type} in the area`,
      imageUrl: `https://picsum.photos/300/200?random=${i}`,
      tags: [type, "nearby"],
      lat: lat + (Math.random() - 0.5) * 0.01,
      lng: lng + (Math.random() - 0.5) * 0.01,
      priceLevel: Math.floor(Math.random() * 4) + 1,
      openingHours: ["9:00 AM - 10:00 PM"],
      address: `${Math.floor(Math.random() * 999) + 1} Main Street`,
    }));
  }
}

export const mapService = new MapService();
// Backward-compat alias so old imports of mapboxService still work
export const mapboxService = mapService;
