import { useState, useCallback, useEffect } from "react";
import { Trip, Stop, StopInput, Recommendation, WeatherForecast } from "../types/trip";
import { apiService } from "../services/api";
import { openaiService, OpenAIRecommendation, TripWeatherResponse } from "../services/openai";

interface TripStore {
  currentTrip: Trip | null;
  allTrips: Trip[];
  recommendations: Recommendation[];
  categorizedRecommendations?: {
    restaurants: Recommendation[];
    attractions: Recommendation[];
    accommodations: Recommendation[];
  };
  weatherForecasts: WeatherForecast[];
  tripWeatherData?: TripWeatherResponse;
  isLoading: boolean;
  error: string | null;
}

export const useTripStore = () => {
  const [store, setStore] = useState<TripStore>({
    currentTrip: null,
    allTrips: [],
    recommendations: [],
    weatherForecasts: [],
    isLoading: false,
    error: null,
  });

  // Load all trips from backend
  const loadTrips = useCallback(async () => {
    setStore((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiService.getTrips();
      const trips = response.results || response;
      console.log("This are the trips we have:", trips);

      // Transform backend trips to frontend format
      const tripsWithStops = trips.map((trip: any) => ({
        id: trip.id,
        name: trip.name,
        description: trip.description,
        route_type: trip.route_type,
        user_name: trip.user_name,
        total_distance: trip.total_distance,
        total_time: trip.total_time,
        estimated_fuel_cost: trip.estimated_fuel_cost,
        start_date: trip.start_date,
        end_date: trip.end_date,
        duration_days: trip.duration_days,
        // Normalize stops so lat/lng legacy fields are always populated
        stops: (trip.stops || []).map((s: any) => ({
          ...s,
          lat: s.latitude,
          lng: s.longitude,
        })),
        stops_count: trip.stops_count,
        is_public: trip.is_public,
        fuel_efficiency: trip.fuel_efficiency,
        fuel_price_per_gallon: trip.fuel_price_per_gallon,
        vehicle_make: trip.vehicle_make,
        vehicle_model: trip.vehicle_model,
        vehicle_year: trip.vehicle_year,
        created_at: trip.created_at,
        updated_at: trip.updated_at,
        // Legacy properties for backward compatibility
        routeType: trip.route_type,
        totalDistance: trip.total_distance,
        totalTime: trip.total_time,
        estimatedFuelCost: trip.estimated_fuel_cost,
        startDate: trip.start_date ? new Date(trip.start_date) : undefined,
        endDate: trip.end_date ? new Date(trip.end_date) : undefined,
        createdAt: new Date(trip.created_at),
        updatedAt: new Date(trip.updated_at),
        stopsCount: trip.stops_count,
      }));

      setStore((prev) => ({
        ...prev,
        allTrips: tripsWithStops,
        isLoading: false,
      }));

      // Auto-select and load details for the first trip
      if (tripsWithStops.length > 0) {
        console.log("Auto-selecting first trip:", tripsWithStops[0].name);
        await loadTripDetails(tripsWithStops[0].id);
      }
    } catch (error: any) {
      setStore((prev) => ({
        ...prev,
        error: error.message || "Failed to load trips",
        isLoading: false,
      }));
    }
  }, []);

  // Load detailed trip information including stops
  const loadTripDetails = useCallback(async (tripId: number) => {
    try {
      console.log("Loading trip details for ID:", tripId);
      const tripDetails = await apiService.getTripDetails(tripId);
      
      // Transform the detailed trip data
      const detailedTrip = {
        ...tripDetails,
        // Normalize stops so lat/lng legacy fields are always populated
        stops: (tripDetails.stops || []).map((s: any) => ({
          ...s,
          lat: s.latitude,
          lng: s.longitude,
        })),
        // Legacy properties for backward compatibility
        routeType: tripDetails.route_type,
        totalDistance: tripDetails.total_distance,
        totalTime: tripDetails.total_time,
        estimatedFuelCost: tripDetails.estimated_fuel_cost,
        startDate: tripDetails.start_date ? new Date(tripDetails.start_date) : undefined,
        endDate: tripDetails.end_date ? new Date(tripDetails.end_date) : undefined,
        createdAt: new Date(tripDetails.created_at),
        updatedAt: new Date(tripDetails.updated_at),
        stopsCount: tripDetails.stops_count,
      };

      setStore((prev) => ({
        ...prev,
        currentTrip: detailedTrip,
      }));

      console.log("Trip details loaded successfully:", detailedTrip.name, "with", detailedTrip.stops?.length || 0, "stops");
      return detailedTrip;
    } catch (error: any) {
      console.error("Failed to load trip details:", error);
      setStore((prev) => ({
        ...prev,
        error: error.message || "Failed to load trip details",
      }));
      throw error;
    }
  }, []);

  // Create a new trip
  const createTrip = useCallback(
    async (tripData: {
      name: string;
      description?: string;
      route_type?: string;
    }) => {
      setStore((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const newTrip = await apiService.createTrip(tripData);

        // Ensure the trip has a stops array initialized
        const tripWithStops = {
          ...newTrip,
          stops: newTrip.stops || [], // Initialize empty stops array if not present
        };

        setStore((prev) => ({
          ...prev,
          allTrips: [tripWithStops, ...prev.allTrips],
          currentTrip: tripWithStops, // Set new trip as current
          isLoading: false,
        }));

        return tripWithStops;
      } catch (error: any) {
        setStore((prev) => ({
          ...prev,
          error: error.message || "Failed to create trip",
          isLoading: false,
        }));
        throw error;
      }
    },
    []
  );

  // Update an existing trip
  const updateTrip = useCallback(
    async (tripId: string, tripData: {
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
    }) => {
      setStore((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Convert string ID to number for API call
        const updatedTrip = await apiService.updateTrip(parseInt(tripId), tripData);

        // Ensure the trip has a stops array initialized
        const tripWithStops = {
          ...updatedTrip,
          stops: updatedTrip.stops || [], // Initialize empty stops array if not present
        };

        setStore((prev) => ({
          ...prev,
          allTrips: prev.allTrips.map(trip => 
            trip.id === parseInt(tripId) ? tripWithStops : trip
          ),
          currentTrip: prev.currentTrip?.id === parseInt(tripId) ? tripWithStops : prev.currentTrip,
          isLoading: false,
        }));

        return tripWithStops;
      } catch (error: any) {
        setStore((prev) => ({
          ...prev,
          error: error.message || "Failed to update trip",
          isLoading: false,
        }));
        throw error;
      }
    },
    []
  );

  // Delete a trip
  const deleteTrip = useCallback(
    async (tripId: string) => {
      setStore((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        await apiService.deleteTrip(parseInt(tripId));

        setStore((prev) => {
          const updatedTrips = prev.allTrips.filter(
            (trip) => trip.id !== parseInt(tripId)
          );
          return {
            ...prev,
            allTrips: updatedTrips,
            currentTrip:
              prev.currentTrip?.id === parseInt(tripId)
                ? updatedTrips.length > 0
                  ? updatedTrips[0]
                  : null
                : prev.currentTrip,
            isLoading: false,
          };
        });
      } catch (error: any) {
        setStore((prev) => ({
          ...prev,
          error: error.message || "Failed to delete trip",
          isLoading: false,
        }));
        throw error;
      }
    },
    []
  );

  // Set current trip
  const setCurrentTrip = useCallback((trip: Trip) => {
    setStore((prev) => ({
      ...prev,
      currentTrip: trip,
    }));
  }, []);

  // Add a new stop to the trip
  const addStop = useCallback(
    async (stop: StopInput) => {
      if (!store.currentTrip) return;

      setStore((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const newStop = await apiService.addStopToTrip(
          store.currentTrip.id,
          {
            name: stop.name,
            address: stop.address,
            latitude: stop.latitude || stop.lat || 0,
            longitude: stop.longitude || stop.lng || 0,
            stop_type: stop.stop_type || stop.type || "waypoint",
          }
        );

        // Update local state with the new stop from backend
        setStore((prev) => {
          if (!prev.currentTrip) return prev;

          const currentStops = prev.currentTrip.stops || [];
          const newStopFormatted = {
            id: newStop.id,
            name: newStop.name,
            address: newStop.address,
            latitude: newStop.latitude,
            longitude: newStop.longitude,
            coordinates: [newStop.longitude, newStop.latitude] as [number, number],
            place_id: newStop.place_id || "",
            stop_type: newStop.stop_type as "start" | "waypoint" | "destination",
            order: newStop.order,
            arrival_time: newStop.arrival_time,
            departure_time: newStop.departure_time,
            duration_minutes: newStop.duration_minutes,
            travel_time_to_next: newStop.travel_time_to_next,
            travel_distance_to_next: newStop.travel_distance_to_next,
            notes: newStop.notes || "",
            estimated_cost: newStop.estimated_cost,
            created_at: newStop.created_at,
            updated_at: newStop.updated_at,
            // Legacy properties for backward compatibility
            lat: newStop.latitude,
            lng: newStop.longitude,
            type: newStop.stop_type as "start" | "destination" | "waypoint",
            arrivalTime: newStop.arrival_time,
            departureTime: newStop.departure_time,
            travelTime: newStop.travel_time_to_next ? `${newStop.travel_time_to_next}h` : undefined,
            travelDistance: newStop.travel_distance_to_next ? `${newStop.travel_distance_to_next} miles` : undefined,
          };

          const updatedTrip = {
            ...prev.currentTrip,
            stops: [...currentStops, newStopFormatted],
            updated_at: new Date().toISOString(),
            updatedAt: new Date(),
          };

          return {
            ...prev,
            currentTrip: updatedTrip,
            isLoading: false,
          };
        });
      } catch (error: any) {
        setStore((prev) => ({
          ...prev,
          error: error.message || "Failed to add stop",
          isLoading: false,
        }));
      }
    },
    [store.currentTrip]
  );

  // Remove a stop from the trip
  const removeStop = useCallback(
    async (stopId: string) => {
      if (!store.currentTrip) return;

      setStore((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        await apiService.removeStopFromTrip(
          store.currentTrip.id,
          parseInt(stopId)
        );

        // Update local state
        setStore((prev) => {
          if (!prev.currentTrip) return prev;

          const currentStops = prev.currentTrip.stops || [];
          const updatedTrip = {
            ...prev.currentTrip,
            stops: currentStops.filter((stop) => stop.id !== parseInt(stopId)),
            updated_at: new Date().toISOString(),
            updatedAt: new Date(),
          };

          return {
            ...prev,
            currentTrip: updatedTrip,
            isLoading: false,
          };
        });
      } catch (error: any) {
        setStore((prev) => ({
          ...prev,
          error: error.message || "Failed to remove stop",
          isLoading: false,
        }));
      }
    },
    [store.currentTrip]
  );

  // Reorder stops
  const reorderStops = useCallback(
    async (newStops: Stop[]) => {
      if (!store.currentTrip) return;

      setStore((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Create the stop orders array for the backend
        const stopOrders = newStops.map((stop, index) => ({
          id: typeof stop.id === 'string' ? parseInt(stop.id) : stop.id,
          order: index + 1,
        }));

        await apiService.reorderStops(
          store.currentTrip.id,
          stopOrders
        );

        // Update local state
        setStore((prev) => {
          if (!prev.currentTrip) return prev;

          const updatedTrip = {
            ...prev.currentTrip,
            stops: newStops,
            updatedAt: new Date(),
          };

          return {
            ...prev,
            currentTrip: updatedTrip,
            isLoading: false,
          };
        });
      } catch (error: any) {
        setStore((prev) => ({
          ...prev,
          error: error.message || "Failed to reorder stops",
          isLoading: false,
        }));
      }
    },
    [store.currentTrip]
  );

  // Update route type
  const updateRouteType = useCallback((routeType: Trip["routeType"]) => {
    setStore((prev) => {
      if (!prev.currentTrip) return prev;

      const updatedTrip = {
        ...prev.currentTrip,
        routeType,
        updatedAt: new Date(),
      };

      return {
        ...prev,
        currentTrip: updatedTrip,
      };
    });
  }, []);

  // Calculate trip statistics using routing API
  const calculateTripStats = useCallback(async () => {
    setStore((prev) => {
      if (
        !prev.currentTrip ||
        !prev.currentTrip.stops ||
        prev.currentTrip.stops.length < 2
      )
        return prev;

      const waypoints = prev.currentTrip.stops
        .filter((stop) => (stop.latitude || stop.lat) && (stop.longitude || stop.lng))
        .map((stop) => ({
          lat: stop.latitude || stop.lat!,
          lng: stop.longitude || stop.lng!,
        }));

      if (waypoints.length < 2) return prev;

      // Use API service to calculate route
      apiService
        .calculateRoute(waypoints)
        .then((routeData) => {
          // Backend returns snake_case; mock fallback uses camelCase
          const totalDistance =
            routeData.total_distance ?? routeData.totalDistance ?? 0;
          const totalTime =
            routeData.total_time ?? routeData.totalTime ?? 0;
          const estimatedFuelCost = (totalDistance / 25) * 3.5; // 25 mpg, $3.5/gallon

          setStore((current) => {
            if (!current.currentTrip) return current;

            const updatedTrip = {
              ...current.currentTrip,
              total_distance: totalDistance,
              total_time: totalTime,
              totalDistance,
              totalTime,
              estimatedFuelCost,
              updatedAt: new Date(),
            };

            return {
              ...current,
              currentTrip: updatedTrip,
            };
          });
        })
        .catch((error) => {
          console.error("Failed to calculate route:", error);
        });

      return prev;
    });
  }, []);

  // Load OpenAI recommendations for current trip
  const loadRecommendations = useCallback(async () => {
    if (!store.currentTrip?.stops || store.currentTrip.stops.length === 0) {
      console.log("No current trip or stops available for recommendations");
      return;
    }

    setStore((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log(`🤖 Loading OpenAI recommendations for trip: ${store.currentTrip.name}`);
      
      // Prepare stops data for OpenAI
      const stopsForRecommendations = store.currentTrip.stops.map(stop => ({
        id: stop.id.toString(),
        name: stop.name,
        lat: stop.lat || stop.latitude,
        lng: stop.lng || stop.longitude,
      }));

      // Get recommendations from OpenAI for all stops
      const openaiRecommendations = await openaiService.getRecommendationsForTrip(stopsForRecommendations);

      // Convert OpenAI recommendations to the existing Recommendation format
      const convertToRecommendation = (openaiRec: OpenAIRecommendation): Recommendation => ({
        id: openaiRec.id,
        name: openaiRec.name,
        type: openaiRec.type,
        rating: openaiRec.rating || 4.0,
        distance: "nearby",
        duration: openaiRec.type === 'accommodation' ? 'Overnight' :
                 openaiRec.type === 'restaurant' ? '1-2 hrs' : '2-3 hrs',
        description: openaiRec.description,
        imageUrl: openaiRec.imageUrl || `https://picsum.photos/300/200?random=${openaiRec.id}`,
        tags: openaiRec.tags,
        lat: openaiRec.lat || 0,
        lng: openaiRec.lng || 0,
        address: openaiRec.address,
        priceLevel: openaiRec.priceLevel,
        openingHours: openaiRec.openingHours ? [openaiRec.openingHours] : undefined,
        phone: openaiRec.phone,
        website: openaiRec.website,
      });

      // Combine all recommendations
      const allRecommendations: Recommendation[] = [
        ...openaiRecommendations.restaurants.map(convertToRecommendation),
        ...openaiRecommendations.attractions.map(convertToRecommendation),
        ...openaiRecommendations.accommodations.map(convertToRecommendation),
      ];

      // Store the categorized recommendations for the RecommendationsPanel
      setStore((prev) => ({
        ...prev,
        recommendations: allRecommendations,
        // Store categorized recommendations for easy access
        categorizedRecommendations: {
          restaurants: openaiRecommendations.restaurants.map(convertToRecommendation),
          attractions: openaiRecommendations.attractions.map(convertToRecommendation),
          accommodations: openaiRecommendations.accommodations.map(convertToRecommendation),
        },
        isLoading: false,
      }));

      console.log(`✅ Loaded ${allRecommendations.length} total recommendations:`, {
        restaurants: openaiRecommendations.restaurants.length,
        attractions: openaiRecommendations.attractions.length,
        accommodations: openaiRecommendations.accommodations.length,
      });

    } catch (error: any) {
      console.error("❌ Failed to load OpenAI recommendations:", error);
      setStore((prev) => ({
        ...prev,
        error: error.message || "Failed to load recommendations",
        isLoading: false,
      }));
    }
  }, [store.currentTrip]);

  // Load OpenAI weather forecasts for current trip
  const loadWeatherForecasts = useCallback(async () => {
    if (!store.currentTrip?.stops || store.currentTrip.stops.length === 0) {
      console.log("No current trip or stops available for weather forecasts");
      return;
    }

    setStore((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log(`🌤️ Loading OpenAI weather forecasts for trip: ${store.currentTrip.name}`);
      
      // Prepare stops data for OpenAI weather
      const stopsForWeather = store.currentTrip.stops.map(stop => ({
        id: stop.id.toString(),
        name: stop.name,
        lat: stop.lat || stop.latitude,
        lng: stop.lng || stop.longitude,
      }));

      // Get weather forecasts from OpenAI for all stops
      const tripWeatherData = await openaiService.getWeatherForecastForTrip(
        stopsForWeather,
        store.currentTrip.startDate,
        store.currentTrip.endDate
      );

      // Convert OpenAI weather to the existing WeatherForecast format for backward compatibility
      const convertToWeatherForecast = (forecast: any): WeatherForecast => ({
        location: forecast.locationName,
        temperature: forecast.temperature.current,
        condition: forecast.condition,
        icon: forecast.icon,
        humidity: forecast.humidity,
        windSpeed: forecast.windSpeed,
        date: new Date(forecast.date),
      });

      const weatherForecasts = tripWeatherData.forecasts.map(convertToWeatherForecast);

      setStore((prev) => ({
        ...prev,
        weatherForecasts,
        tripWeatherData, // Store the full OpenAI weather response
        isLoading: false,
      }));

      console.log(`✅ Loaded weather forecasts for ${tripWeatherData.forecasts.length} location-days:`, {
        tripDuration: tripWeatherData.tripDuration,
        averageTemp: tripWeatherData.averageTemp,
        dominantCondition: tripWeatherData.dominantCondition,
      });

    } catch (error: any) {
      console.error("❌ Failed to load OpenAI weather forecasts:", error);
      setStore((prev) => ({
        ...prev,
        error: error.message || "Failed to load weather forecasts",
        isLoading: false,
      }));
    }
  }, [store.currentTrip]);

  // Auto-calculate stats when stops change
  useEffect(() => {
    if (store.currentTrip?.stops && store.currentTrip.stops.length >= 2) {
      calculateTripStats();
    }
  }, [store.currentTrip?.stops?.length, calculateTripStats]);

  return {
    ...store,
    loadTrips,
    loadTripDetails,
    createTrip,
    updateTrip,
    deleteTrip,
    setCurrentTrip,
    addStop,
    removeStop,
    reorderStops,
    updateRouteType,
    loadRecommendations,
    loadWeatherForecasts,
    calculateTripStats,
  };
};
