// API service for backend integration
import { toastService } from "./toast";

const API_BASE_URL = "http://localhost:8000/api";

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem("access_token");
};

// Helper function to make authenticated requests
const makeAuthenticatedRequest = async (
  url: string,
  options: RequestInit = {}
) => {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error ||
        errorData.detail ||
        `HTTP error! status: ${response.status}`
    );
  }

  return response.json();
};

export interface PlacesSearchResponse {
  results: Array<{
    place_id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    rating?: number;
    types: string[];
  }>;
}

export interface WeatherResponse {
  location: string;
  current: {
    temp_f: number;
    condition: {
      text: string;
      icon: string;
    };
    humidity: number;
    wind_mph: number;
  };
}

export interface RecommendationsResponse {
  results: Array<{
    place_id: string;
    name: string;
    rating: number;
    price_level?: number;
    types: string[];
    latitude: number;
    longitude: number;
    business_status: string;
  }>;
}

interface RegisterData {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  password: string;
  password_confirm: string;
}

class ApiService {
  private baseUrl = API_BASE_URL;

  // Authentication methods
  async register(userData: RegisterData) {
    const response = await fetch(`${this.baseUrl}/auth/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error ||
          errorData.detail ||
          `Registration failed: ${response.status}`
      );
    }

    const data = await response.json();

    // Store tokens in localStorage
    if (data.tokens) {
      localStorage.setItem("access_token", data.tokens.access);
      localStorage.setItem("refresh_token", data.tokens.refresh);
    }

    return data;
  }

  async login(email: string, password: string) {
    const response = await fetch(`${this.baseUrl}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.error ||
        errorData.detail ||
        `Login failed: ${response.status}`;
      toastService.api.loginFailed(errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Store tokens in localStorage
    if (data.tokens) {
      localStorage.setItem("access_token", data.tokens.access);
      localStorage.setItem("refresh_token", data.tokens.refresh);
    }

    // Show success toast
    const userName = data.user?.first_name || data.user?.username || "User";
    toastService.api.loginSuccess(userName);

    return data;
  }

  async logout() {
    const refreshToken = localStorage.getItem("refresh_token");

    if (refreshToken) {
      try {
        await makeAuthenticatedRequest(`${this.baseUrl}/auth/logout/`, {
          method: "POST",
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch (error) {
        console.error("Logout error:", error);
      }
    }

    // Clear tokens from localStorage
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    // Show logout success toast
    toastService.api.logoutSuccess();
  }

  async getCurrentUser() {
    try {
      return await makeAuthenticatedRequest(`${this.baseUrl}/auth/me/`);
    } catch (error) {
      console.error("Get current user error:", error);
      throw error;
    }
  }

  // Search for places using backend API
  async searchPlaces(query: string): Promise<PlacesSearchResponse> {
    try {
      const response = await makeAuthenticatedRequest(
        `${this.baseUrl}/places/search/?q=${encodeURIComponent(query)}`
      );
      return response;
    } catch (error) {
      console.error("Places search error:", error);
      // Fallback to mock data if API fails
      return this._getMockPlacesData(query);
    }
  }

  // Trip Management APIs
  async getTrips() {
    try {
      return await makeAuthenticatedRequest(`${this.baseUrl}/trips/`);
    } catch (error) {
      console.error("Get trips error:", error);
      return { results: [] };
    }
  }

  async createTrip(tripData: {
    name: string;
    description?: string;
    route_type?: string;
    start_date?: string;
    end_date?: string;
    fuel_efficiency?: number;
    fuel_price_per_gallon?: number;
    vehicle_make?: string;
    vehicle_model?: string;
    vehicle_year?: string;
    is_public?: boolean;
    // New fields for enhanced trip creation
    stops?: Array<{
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      order: number;
      stop_type: string;
    }>;
    route_geometry?: string;
    route_bounds?: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
    total_distance?: number;
    total_time?: number;
    estimated_fuel_cost?: number;
  }) {
    try {
      return await makeAuthenticatedRequest(`${this.baseUrl}/trips/`, {
        method: "POST",
        body: JSON.stringify(tripData),
      });
    } catch (error) {
      console.error("Create trip error:", error);
      throw error;
    }
  }

  async getTripDetails(tripId: number) {
    try {
      return await makeAuthenticatedRequest(`${this.baseUrl}/trips/${tripId}/`);
    } catch (error) {
      console.error("Get trip details error:", error);
      throw error;
    }
  }

  async updateTrip(tripId: number, tripData: any) {
    try {
      return await makeAuthenticatedRequest(
        `${this.baseUrl}/trips/${tripId}/`,
        {
          method: "PUT",
          body: JSON.stringify(tripData),
        }
      );
    } catch (error) {
      console.error("Update trip error:", error);
      throw error;
    }
  }

  async deleteTrip(tripId: number, tripName?: string) {
    try {
      const token = getAuthToken();
      const response = await fetch(`${this.baseUrl}/trips/${tripId}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || `HTTP error! status: ${response.status}`);
      }

      // DELETE requests often return empty body (204 No Content)
      // Don't try to parse JSON if response is empty
      let result = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          result = await response.json();
        } catch (e) {
          // Ignore JSON parse errors for DELETE requests
          console.log('DELETE response has no JSON body (this is normal)');
        }
      }

      // Show success toast
      toastService.api.tripDeleted(tripName || 'Trip');

      return result;
    } catch (error) {
      console.error('Delete trip error:', error);
      toastService.error(
        `Failed to delete trip: ${error.message || 'Unknown error'}`
      );
      throw error;
    }
  }

  // Stop Management APIs
  async addStopToTrip(
    tripId: number,
    stopData: {
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      order?: number;
      stop_type?: string;
    }
  ) {
    try {
      return await makeAuthenticatedRequest(
        `${this.baseUrl}/trips/${tripId}/stops/`,
        {
          method: "POST",
          body: JSON.stringify(stopData),
        }
      );
    } catch (error) {
      console.error("Add stop error:", error);
      throw error;
    }
  }

  async removeStopFromTrip(tripId: number, stopId: number) {
    try {
      return await makeAuthenticatedRequest(
        `${this.baseUrl}/trips/${tripId}/stops/${stopId}/`,
        {
          method: "DELETE",
        }
      );
    } catch (error) {
      console.error("Remove stop error:", error);
      throw error;
    }
  }

  async reorderStops(
    tripId: number,
    stopOrders: Array<{ id: number; order: number }>
  ) {
    try {
      return await makeAuthenticatedRequest(
        `${this.baseUrl}/trips/${tripId}/stops/reorder/`,
        {
          method: "POST",
          body: JSON.stringify({ stop_orders: stopOrders }),
        }
      );
    } catch (error) {
      console.error("Reorder stops error:", error);
      throw error;
    }
  }

  // Get weather forecast for a location
  async getWeatherForecast(lat: number, lng: number): Promise<WeatherResponse> {
    try {
      const response = await makeAuthenticatedRequest(
        `${this.baseUrl}/weather/current/?lat=${lat}&lng=${lng}`
      );
      return response;
    } catch (error) {
      console.error("Weather forecast error:", error);
      // Fallback to mock data if API fails
      return this._getMockWeatherData(lat, lng);
    }
  }

  // Get recommendations near a location
  async getNearbyRecommendations(
    lat: number,
    lng: number,
    type?: string
  ): Promise<RecommendationsResponse> {
    try {
      const url = type
        ? `${this.baseUrl}/recommendations/nearby/?lat=${lat}&lng=${lng}&type=${type}`
        : `${this.baseUrl}/recommendations/?lat=${lat}&lng=${lng}`;

      const response = await makeAuthenticatedRequest(url);
      return response;
    } catch (error) {
      console.error("Recommendations error:", error);
      // Fallback to mock data if API fails
      return this._getMockRecommendationsData(lat, lng, type);
    }
  }

  // Calculate route between points
  async calculateRoute(waypoints: Array<{ lat: number; lng: number }>) {
    try {
      return await makeAuthenticatedRequest(
        `${this.baseUrl}/routes/calculate/`,
        {
          method: "POST",
          body: JSON.stringify({ waypoints }),
        }
      );
    } catch (error) {
      console.error("Route calculation error:", error);
      // Fallback to mock calculation
      return this._getMockRouteData(waypoints);
    }
  }

  // Fallback mock data methods
  private _getMockPlacesData(query: string): PlacesSearchResponse {
    return {
      results: [
        {
          place_id: `place_${Date.now()}_1`,
          name: `${query} National Park`,
          address: `${query}, State, USA`,
          latitude: 40.7128 + Math.random() * 10,
          longitude: -74.006 + Math.random() * 10,
          rating: 4.5,
          types: ["park", "tourist_attraction"],
        },
        {
          place_id: `place_${Date.now()}_2`,
          name: `${query} Downtown`,
          address: `Downtown ${query}, State, USA`,
          latitude: 40.7128 + Math.random() * 10,
          longitude: -74.006 + Math.random() * 10,
          rating: 4.2,
          types: ["locality", "political"],
        },
      ],
    };
  }

  private _getMockWeatherData(lat: number, lng: number): WeatherResponse {
    const conditions = [
      "Sunny",
      "Partly Cloudy",
      "Light Rain",
      "Clear",
      "Overcast",
    ];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];

    return {
      location: `Location (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
      current: {
        temp_f: 65 + Math.random() * 25,
        condition: {
          text: condition,
          icon: condition.toLowerCase().replace(" ", "_"),
        },
        humidity: 40 + Math.random() * 40,
        wind_mph: Math.random() * 15,
      },
    };
  }

  private _getMockRecommendationsData(
    lat: number,
    lng: number,
    type?: string
  ): RecommendationsResponse {
    const results = [];
    for (let i = 0; i < 3; i++) {
      results.push({
        place_id: `${type || "general"}_${Date.now()}_${i}`,
        name: `Mock ${type || "Place"} ${i + 1}`,
        rating: 3.5 + Math.random() * 1.5,
        price_level: Math.floor(Math.random() * 4) + 1,
        types: [type || "establishment"],
        latitude: lat + (Math.random() - 0.5) * 0.1,
        longitude: lng + (Math.random() - 0.5) * 0.1,
        business_status: "OPERATIONAL",
      });
    }
    return { results };
  }

  private _getMockRouteData(waypoints: Array<{ lat: number; lng: number }>) {
    if (waypoints.length < 2) {
      return { totalDistance: 0, totalTime: 0, legs: [] };
    }

    const totalDistance = waypoints.length * 150; // Mock: 150 miles per segment
    const totalTime = totalDistance / 60; // Mock: 60 mph average

    return {
      totalDistance: Math.round(totalDistance),
      totalTime: Math.round(totalTime * 10) / 10,
      legs: waypoints.slice(0, -1).map(() => ({
        distance: { text: "150 miles", value: 150 },
        duration: { text: "2.5 hours", value: 2.5 },
      })),
    };
  }
}

export const apiService = new ApiService();
