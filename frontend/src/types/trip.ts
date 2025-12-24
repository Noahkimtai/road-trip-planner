export interface Stop {
    id: number;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    coordinates: [number, number];
    place_id: string;
    stop_type: "start" | "waypoint" | "destination";
    order: number;
    arrival_time?: string;
    departure_time?: string;
    duration_minutes?: number;
    travel_time_to_next?: number;
    travel_distance_to_next?: number;
    notes?: string;
    estimated_cost?: number;
    created_at: string;
    updated_at: string;
    // Legacy properties for backward compatibility
    lat?: number;
    lng?: number;
    arrivalTime?: string;
    departureTime?: string;
    travelTime?: string;
    travelDistance?: string;
    type?: "start" | "destination" | "waypoint";
  }
  
  export interface Trip {
    id: number;
    name: string;
    description?: string;
    route_type: "fastest" | "scenic" | "custom";
    user_name: string;
    total_distance: number;
    total_time: number;
    estimated_fuel_cost: number;
    start_date?: string;
    end_date?: string;
    duration_days: number;
    stops: Stop[];
    stops_count: number;
    is_public: boolean;
    fuel_efficiency: number;
    fuel_price_per_gallon: number;
    vehicle_make?: string;
    vehicle_model?: string;
    vehicle_year?: string;
    created_at: string;
    updated_at: string;
    // Legacy properties for backward compatibility
    routeType?: "fastest" | "scenic" | "custom";
    totalDistance?: number;
    totalTime?: number;
    estimatedFuelCost?: number;
    startDate?: Date;
    endDate?: Date;
    createdAt?: Date;
    updatedAt?: Date;
    stopsCount?: number;
  }
  
  export interface Recommendation {
    id: string;
    name: string;
    type: "attraction" | "restaurant" | "accommodation";
    rating: number;
    distance: string;
    duration: string;
    description: string;
    imageUrl: string;
    tags: string[];
    lat: number;
    lng: number;
    priceLevel?: number;
    openingHours?: string[];
  }
  
  export interface WeatherForecast {
    location: string;
    temperature: number;
    condition: string;
    icon: string;
    humidity?: number;
    windSpeed?: number;
    date: Date;
  }
  
  export interface SearchResult {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    type: string;
    rating?: number;
    categories?: string[];
    relevance?: number;
  }
  