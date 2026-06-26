import React, { useState } from "react";
import { InteractiveMap } from "./InteractiveMap";
import { RecommendationsPanel } from "./RecommendationsPanel";
import { Trip, Recommendation } from "@/types/trip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Route, DollarSign, Eye, Edit, Trash2 } from "lucide-react";
import { toastService } from "@/services/toast";
import { apiService } from "@/services/api";

export const TripPlannerDemo: React.FC = () => {
  const [createdTrips, setCreatedTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [clickedMarkers, setClickedMarkers] = useState<Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    type: 'start' | 'stop' | 'destination';
  }>>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [loadingTripId, setLoadingTripId] = useState<string | null>(null);

  // Load existing trips from backend on component mount
  React.useEffect(() => {
    const loadTrips = async () => {
      try {
        setIsLoadingTrips(true);
        const response = await apiService.getTrips();
        console.log('Loaded trips from backend:', response);
        
        // Convert backend trips to frontend format (basic info only)
        const backendTrips: Trip[] = (response.results || response || []).map((trip: any) => ({
          id: trip.id.toString(),
          name: trip.name,
          stops: [], // Will be loaded when trip is clicked
          routeType: trip.route_type as 'fastest' | 'scenic' | 'custom',
          totalDistance: trip.total_distance || 0,
          totalTime: trip.total_time || 0,
          estimatedFuelCost: trip.estimated_fuel_cost || 0,
          startDate: trip.start_date ? new Date(trip.start_date) : undefined,
          endDate: trip.end_date ? new Date(trip.end_date) : undefined,
          createdAt: new Date(trip.created_at),
          updatedAt: new Date(trip.updated_at),
          stopsCount: trip.stops_count || 0,
        }));

        setCreatedTrips(backendTrips);
        console.log('Trips loaded successfully:', backendTrips.length);
        
      } catch (error) {
        console.error('Failed to load trips:', error);
        toastService.warning('Failed to load existing trips. You can still create new ones.', {
          title: 'Trips Load Failed'
        });
      } finally {
        setIsLoadingTrips(false);
      }
    };

    loadTrips();
  }, []);

  const handleCreateTrip = async (tripData: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Add the new trip to local state immediately for better UX
    const newTrip: Trip = {
      ...tripData,
      id: `trip-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setCreatedTrips(prev => [...prev, newTrip]);
    console.log('New trip created:', newTrip);

    // Reload trips from backend to get the actual created trip with proper ID and stop count
    try {
      const response = await apiService.getTrips();
      console.log('Reloaded trips after creation:', response);
      
      // Convert backend trips to frontend format
      const backendTrips: Trip[] = (response.results || response || []).map((trip: any) => ({
        id: trip.id.toString(),
        name: trip.name,
        stops: [], // Will be loaded when trip is clicked
        routeType: trip.route_type as 'fastest' | 'scenic' | 'custom',
        totalDistance: trip.total_distance || 0,
        totalTime: trip.total_time || 0,
        estimatedFuelCost: trip.estimated_fuel_cost || 0,
        startDate: trip.start_date ? new Date(trip.start_date) : undefined,
        endDate: trip.end_date ? new Date(trip.end_date) : undefined,
        createdAt: new Date(trip.created_at),
        updatedAt: new Date(trip.updated_at),
        // Add stops_count for display
        stopsCount: trip.stops_count || 0,
      }));

      setCreatedTrips(backendTrips);
      console.log('Trips reloaded successfully after creation');
      
    } catch (error) {
      console.error('Failed to reload trips after creation:', error);
      // Don't show error toast here as the trip was still created successfully
    }
  };

  const handleTripClick = async (trip: Trip) => {
    console.log('Trip clicked:', trip.id, trip.name);
    
    // If clicking the same trip, deselect it
    if (selectedTrip?.id === trip.id) {
      setSelectedTrip(null);
      setClickedMarkers([]);
      return;
    }

    // Set loading state for this trip
    setLoadingTripId(trip.id);

    try {
      // For locally created trips (ID starts with 'trip-'), use the existing data
      if (trip.id.startsWith('trip-')) {
        console.log('Loading local trip with stops:', trip.stops.length);
        setSelectedTrip(trip);
        // Convert trip stops to markers for map visualization
        const markers = trip.stops.map((stop, index) => ({
          id: stop.id,
          name: stop.name,
          lat: stop.lat || 0,
          lng: stop.lng || 0,
          type: stop.type === 'start' ? 'start' as const : 
                stop.type === 'destination' ? 'destination' as const : 
                'stop' as const
        }));
        setClickedMarkers(markers);
        console.log('Local trip loaded, markers set:', markers);
        return;
      }

      // For backend trips, fetch complete details including all stops
      console.log('Fetching backend trip details for ID:', trip.id);
      
      const tripDetails = await apiService.getTripDetails(parseInt(trip.id));
      console.log('Fetched trip details:', tripDetails);

      // Convert backend response to frontend format
      const formattedTrip: Trip = {
        id: tripDetails.id.toString(),
        name: tripDetails.name,
        stops: tripDetails.stops.map((stop: any) => ({
          id: stop.id.toString(),
          name: stop.name,
          address: stop.address,
          lat: stop.latitude,  // Backend uses 'latitude'
          lng: stop.longitude, // Backend uses 'longitude'
          type: stop.stop_type === 'start' ? 'start' : 
                stop.stop_type === 'destination' ? 'destination' : 'waypoint',
          arrivalTime: stop.arrival_time,
          departureTime: stop.departure_time,
          travelTime: stop.travel_time_to_next ? `${stop.travel_time_to_next}h` : undefined,
          travelDistance: stop.travel_distance_to_next ? `${stop.travel_distance_to_next} miles` : undefined,
        })),
        routeType: tripDetails.route_type as 'fastest' | 'scenic' | 'custom',
        totalDistance: tripDetails.total_distance,
        totalTime: tripDetails.total_time,
        estimatedFuelCost: tripDetails.estimated_fuel_cost,
        startDate: tripDetails.start_date ? new Date(tripDetails.start_date) : undefined,
        endDate: tripDetails.end_date ? new Date(tripDetails.end_date) : undefined,
        createdAt: new Date(tripDetails.created_at),
        updatedAt: new Date(tripDetails.updated_at),
      };

      setSelectedTrip(formattedTrip);

      // Convert stops to markers for map visualization
      const markers = formattedTrip.stops.map((stop, index) => ({
        id: stop.id,
        name: stop.name,
        lat: stop.lat || 0,
        lng: stop.lng || 0,
        type: stop.type === 'start' ? 'start' as const : 
              stop.type === 'destination' ? 'destination' as const : 
              'stop' as const
      }));
      
      setClickedMarkers(markers);

      console.log('Backend trip loaded with stops:', formattedTrip.stops.length);
      console.log('Markers set for map:', markers);
      
      toastService.success(`Trip "${trip.name}" loaded with ${formattedTrip.stops.length} stops!`, {
        title: "Trip Loaded"
      });

    } catch (error) {
      console.error('Failed to load trip details:', error);
      toastService.error(`Failed to load trip: ${error.message || 'Unknown error'}`, {
        title: "Trip Load Failed"
      });
    } finally {
      setLoadingTripId(null);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    const tripToDelete = createdTrips.find(trip => trip.id === tripId);
    const tripName = tripToDelete?.name || 'Trip';

    try {
      // If it's a real trip (has numeric ID), call API
      if (!tripId.startsWith('trip-')) {
        await apiService.deleteTrip(parseInt(tripId), tripName);
      } else {
        // For local trips, just show success toast
        toastService.api.tripDeleted(tripName);
      }

      // Update local state
      setCreatedTrips(prev => prev.filter(trip => trip.id !== tripId));
      if (selectedTrip?.id === tripId) {
        setSelectedTrip(null);
        setClickedMarkers([]);
      }
    } catch (error) {
      // Error toast is already handled by the API service
      console.error('Failed to delete trip:', error);
    }
  };

  const handleAddRecommendationToTrip = (recommendation: Recommendation) => {
    // Add recommendation as a new marker
    const newMarker = {
      id: `rec-${recommendation.id}`,
      name: recommendation.name,
      lat: recommendation.lat,
      lng: recommendation.lng,
      type: 'stop' as const
    };
    setClickedMarkers(prev => [...prev, newMarker]);
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters.toFixed(0)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="h-screen flex">
      {/* Left Sidebar - Created Trips */}
      <div className="w-80 bg-background border-r overflow-y-auto">
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-4">My Trips ({createdTrips.length})</h2>
          
          {isLoadingTrips ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your trips...</p>
            </div>
          ) : createdTrips.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No trips created yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Click on the map to add stops, then create your first trip
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {createdTrips.map((trip) => (
                <Card 
                  key={trip.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedTrip?.id === trip.id ? 'ring-2 ring-primary' : 'hover:bg-accent'
                  }`}
                  onClick={() => handleTripClick(trip)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{trip.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs">{trip.routeType}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {/* Trip Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center">
                        <Route className="h-3 w-3 mr-1 text-muted-foreground" />
                        <span>{formatDistance(trip.totalDistance)}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                        <span>{formatDuration(trip.totalTime)}</span>
                      </div>
                    </div>

                    {/* Stops Preview */}
                    <div>
                      <p className="text-xs font-medium mb-1">{trip.stopsCount || trip.stops.length} stops</p>
                      <div className="text-xs text-muted-foreground">
                        {trip.stops.length > 0 ? (
                          <>
                            {trip.stops.slice(0, 2).map((stop, index) => (
                              <div key={stop.id} className="truncate">
                                {index + 1}. {stop.name}
                              </div>
                            ))}
                            {trip.stops.length > 2 && (
                              <div>+{trip.stops.length - 2} more...</div>
                            )}
                          </>
                        ) : (
                          <div className="text-muted-foreground">
                            Click to view stops
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-1 pt-1">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTripClick(trip);
                        }}
                        disabled={loadingTripId === trip.id}
                      >
                        {loadingTripId === trip.id ? (
                          <>
                            <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full mr-1"></div>
                            Loading...
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </>
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implement edit functionality
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 px-2 text-red-600 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTrip(trip.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center - Interactive Map */}
      <div className="flex-1">
        <InteractiveMap
          onCreateTrip={handleCreateTrip}
          onAddMarker={(marker) => {
            console.log('Marker added:', marker);
          }}
          // Pass selected trip data to show route
          waypoints={selectedTrip ? selectedTrip.stops.map(stop => ({
            id: stop.id,
            name: stop.name,
            lat: stop.lat || 0,
            lng: stop.lng || 0
          })) : undefined}
          selectedRouteType={selectedTrip?.routeType}
          // Pass clicked markers for new trip creation
          initialMarkers={clickedMarkers}
          onMarkersChange={setClickedMarkers}
        />
      </div>

      {/* Right Sidebar - Recommendations */}
      <div className="w-80 bg-background border-l overflow-y-auto">
        <RecommendationsPanel
          selectedStops={clickedMarkers}
          onAddToTrip={handleAddRecommendationToTrip}
        />
      </div>
    </div>
  );
};