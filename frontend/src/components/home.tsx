import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import InteractiveMap from "./TripPlanner/InteractiveMap";
import ItineraryPanel from "./TripPlanner/ItineraryPanel";
import RecommendationsPanel from "./TripPlanner/RecommendationsPanel";
import TripDetailsDashboard from "./TripPlanner/TripDetailsDashboard";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Menu,
  Bell,
  MapPin,
  Settings,
  Zap,
  LogOut,
} from "lucide-react";
import { useTripStore } from "../hooks/useTripStore";
import { useSearch } from "../hooks/useSearch";
import { useAuth } from "../contexts/AuthContext";
import { SearchAutocomplete } from "./ui/search-autocomplete";

export default function Home() {
  const tripStore = useTripStore();
  const search = useSearch();
  const { user, logout } = useAuth();
  const [focusedLocation, setFocusedLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [editingTrip, setEditingTrip] = useState<any>(null);

  const handleLogout = async () => {
    await logout();
  };

  // Load initial data
  useEffect(() => {
    // Load trips from backend when component mounts
    console.log('Home: Loading trips on mount');
    tripStore.loadTrips();
  }, []);

  // Debug: Log when allTrips changes
  useEffect(() => {
    console.log('Home: allTrips changed:', tripStore.allTrips.length, 'trips');
    console.log('Home: allTrips data:', tripStore.allTrips);
    console.log('Home: currentTrip:', tripStore.currentTrip);
    console.log('Home: hasExistingTrips will be:', tripStore.allTrips.length > 0);
  }, [tripStore.allTrips]);

  // Load weather and recommendations when current trip changes
  useEffect(() => {
    if (tripStore.currentTrip) {
      console.log('Home: Current trip changed, loading data for:', tripStore.currentTrip.name);
      tripStore.loadWeatherForecasts();
      
      // Load OpenAI recommendations for all stops in the current trip
      if (tripStore.currentTrip.stops && tripStore.currentTrip.stops.length > 0) {
        console.log('Home: Loading OpenAI recommendations for all stops in trip:', tripStore.currentTrip.name);
        tripStore.loadRecommendations();
      } else {
        console.log('Home: No stops in current trip, skipping recommendations');
      }
    }
  }, [tripStore.currentTrip?.id, tripStore.currentTrip?.stops?.length]);

  // Handle search result selection from header search
  const handleHeaderSearchSelect = (result: any) => {
    // Add the selected result as a stop to the current trip
    if (tripStore.currentTrip) {
      tripStore.addStop({
        name: result.name,
        address: result.address,
        lat: result.lat,
        lng: result.lng,
        latitude: result.lat,
        longitude: result.lng,
      });
    }
  };

  // Handle edit trip from ItineraryPanel
  const handleEditTrip = (trip: any) => {
    console.log("Home: Edit trip requested:", trip.name);
    console.log("Home: Setting editing trip data:", trip);
    setEditingTrip(trip);
  };
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Road Trip Planner</h1>
          <Link to="/demo">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Quick Demo Search
            </Button>
          </Link>
        </div>

        <div className="flex items-center space-x-2">
          <div className="max-w-xs hidden md:block">
            <SearchAutocomplete
              placeholder="Search destinations..."
              onSearch={search.searchPlaces}
              onResultSelect={handleHeaderSearchSelect}
              searchResults={search.results}
              isSearching={search.isLoading}
              className="w-64"
            />
          </div>
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>

          {/* User Info and Logout */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium">
                {user?.full_name || `${user?.first_name} ${user?.last_name}`}
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
                  user?.email || "user"
                }`}
                alt={user?.full_name || "User"}
              />
              <AvatarFallback>
                {user?.first_name?.[0]}
                {user?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Itinerary */}
        <motion.div
          initial={{ x: -350 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-[350px] border-r overflow-y-auto flex-shrink-0 bg-background"
        >
          <ItineraryPanel
            stops={tripStore.currentTrip?.stops || []}
            onAddStop={(stop) => tripStore.addStop(stop)}
            onRemoveStop={tripStore.removeStop}
            onReorderStops={tripStore.reorderStops}
            onRouteTypeChange={tripStore.updateRouteType}
            selectedRouteType={tripStore.currentTrip?.routeType || "fastest"}
            searchResults={search.results}
            isSearching={search.isLoading}
            onSearch={search.searchPlaces}
            onCreateTrip={async (tripData) => {
              try {
                await tripStore.createTrip(tripData);
              } catch (error) {
                console.error("Failed to create trip:", error);
              }
            }}
            hasExistingTrips={tripStore.allTrips.length > 0}
            isLoading={tripStore.isLoading}
            // New props for trip management
            allTrips={tripStore.allTrips}
            currentTrip={tripStore.currentTrip}
            onSelectTrip={tripStore.setCurrentTrip}
            // Edit and delete trip handlers
            onEditTrip={handleEditTrip}
            onDeleteTrip={async (tripId) => {
              try {
                console.log("Home: Delete trip requested:", tripId);
                await tripStore.deleteTrip(tripId);
              } catch (error) {
                console.error("Failed to delete trip:", error);
              }
            }}
            onUpdateTrip={async (tripId, tripData) => {
              try {
                console.log("Home: Update trip requested:", tripId, tripData);
                await tripStore.updateTrip(tripId, tripData);
                setEditingTrip(null); // Clear editing state after update
              } catch (error) {
                console.error("Failed to update trip:", error);
              }
            }}
          />
        </motion.div>

        {/* Center - Map */}
        <div className="flex-1 relative overflow-hidden">
          <InteractiveMap
            waypoints={
              tripStore.currentTrip?.stops?.map((stop) => ({
                id: stop.id.toString(),
                name: stop.name,
                lat: stop.lat || stop.latitude || 0,
                lng: stop.lng || stop.longitude || 0,
              })) || []
            }
            selectedRouteType={tripStore.currentTrip?.routeType || "fastest"}
            searchResults={search.results}
            focusedLocation={focusedLocation}
            onRouteTypeChange={tripStore.updateRouteType}
            // Pass editing trip data to InteractiveMap
            editingTrip={editingTrip}
            onEditComplete={() => setEditingTrip(null)}
            onSearchResultClick={(result) => {
              // Focus on the clicked search result first
              setFocusedLocation({
                lat: result.lat,
                lng: result.lng,
                name: result.name
              });
              
              // Then add it as a stop to the current trip
              if (tripStore.currentTrip) {
                tripStore.addStop({
                  name: result.name,
                  address: result.address,
                  lat: result.lat,
                  lng: result.lng,
                  latitude: result.lat,
                  longitude: result.lng,
                });
              }
            }}
            onClearFocus={() => {
              console.log('Clearing focused location');
              setFocusedLocation(null);
            }}
            onAddMarker={(marker) => {
              console.log('Adding marker to trip:', marker);
              // Add the clicked marker as a stop to the current trip
              if (tripStore.currentTrip) {
                tripStore.addStop({
                  name: marker.name,
                  address: `${marker.lat.toFixed(4)}, ${marker.lng.toFixed(4)}`,
                  lat: marker.lat,
                  lng: marker.lng,
                  latitude: marker.lat,
                  longitude: marker.lng,
                });
              } else {
                // If no current trip, show a message or create a new trip
                console.log('No current trip selected. Please select or create a trip first.');
                // alert('Please select or create a trip first before adding markers.');
              }
            }}
          />

          {/* Map Controls */}
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full shadow-md"
              onClick={() => {
                const stops = tripStore.currentTrip?.stops;
                if (stops && stops.length > 0) {
                  const lastStop = stops[stops.length - 1];
                  if ((lastStop?.latitude || lastStop?.lat) && (lastStop?.longitude || lastStop?.lng)) {
                    tripStore.loadRecommendations();
                  }
                }
              }}
            >
              <MapPin className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full shadow-md"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Right Panel - Recommendations */}
        <motion.div
          initial={{ x: 350 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-[350px] border-l overflow-y-auto flex-shrink-0 bg-background"
        >
          <RecommendationsPanel
            recommendations={tripStore.categorizedRecommendations}
            isLoading={tripStore.isLoading}
            onAddToTrip={(rec) =>
              tripStore.addStop({
                name: rec.name,
                address: rec.address || rec.description,
                lat: rec.lat,
                lng: rec.lng,
                latitude: rec.lat,
                longitude: rec.lng,
              })
            }
          />
        </motion.div>
      </div>

      {/* Bottom Panel - Trip Details */}
      <motion.div
        initial={{ y: 150 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="h-[150px] border-t flex-shrink-0 bg-background"
      >
        <TripDetailsDashboard
          selectedTrip={tripStore.currentTrip}
          weatherForecasts={tripStore.weatherForecasts}
          tripWeatherData={tripStore.tripWeatherData}
          onSave={() => console.log("Saving trip...", tripStore.currentTrip)}
          onShare={() => console.log("Sharing trip...", tripStore.currentTrip)}
        />
      </motion.div>
    </div>
  );
}
