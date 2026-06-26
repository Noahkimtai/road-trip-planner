export interface OpenAIRecommendation {
  id: string;
  name: string;
  description: string;
  type: "restaurant" | "attraction" | "accommodation";
  rating: number;
  address: string;
  imageUrl: string;
  tags: string[];
  priceLevel?: number;
  openingHours?: string;
  phone?: string;
  website?: string;
  // restaurant-specific
  cuisineStyle?: string;
  signatureDish?: string;
  diningStyle?: string;
  // attraction-specific
  attractionType?: string;
  mainFeature?: string;
  setting?: string;
  // accommodation-specific
  accommodationType?: string;
  architecture?: string;
  uniqueFeature?: string;
}

export interface RecommendationsResponse {
  restaurants: OpenAIRecommendation[];
  attractions: OpenAIRecommendation[];
  accommodations: OpenAIRecommendation[];
}

export interface WeatherForecast {
  id: string;
  locationName: string;
  date: string;
  temperature: {
    high: number;
    low: number;
    current: number;
  };
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  icon: string;
  lat?: number;
  lng?: number;
}

export interface TripWeatherResponse {
  forecasts: WeatherForecast[];
  tripDuration: number;
  averageTemp: number;
  dominantCondition: string;
}
