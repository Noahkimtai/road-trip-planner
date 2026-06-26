import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CloudSun,
  Droplets,
  Fuel,
  Clock,
  Calendar,
  DollarSign,
  Save,
  Share2,
  MapPin,
  Sun,
  Cloud,
  Car,
  Route,
} from "lucide-react";
import { WeatherForecast, Trip } from "@/types/trip";
import { TripWeatherResponse } from "@/services/openai";

interface TripDetailsProps {
  selectedTrip?: Trip | null;
  weatherForecasts?: WeatherForecast[];
  tripWeatherData?: TripWeatherResponse;
  onSave?: () => void;
  onShare?: () => void;
}

const TripDetailsDashboard = ({
  selectedTrip,
  weatherForecasts = [],
  tripWeatherData,
  onSave = () => console.log("Saving trip..."),
  onShare = () => console.log("Sharing trip..."),
}: TripDetailsProps) => {
  // If no trip is selected, show a placeholder
  if (!selectedTrip) {
    return (
      <div className="w-full bg-background border-t">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Trip Selected</h3>
              <p className="text-sm">
                Select a trip from the itinerary panel to view its details
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Extract data from selected trip
  const totalDistance = selectedTrip.total_distance || 0;
  const totalTime = selectedTrip.total_time || 0;
  const estimatedFuelCost = selectedTrip.estimated_fuel_cost || 0;
  const startDate = selectedTrip.start_date ? new Date(selectedTrip.start_date) : null;
  const endDate = selectedTrip.end_date ? new Date(selectedTrip.end_date) : null;
  
  // Calculate completion percentage based on available data
  const completionPercentage = Math.min(
    100,
    Math.max(
      0,
      (selectedTrip.stops_count || 0) * 20 + // 20% per stop (up to 5 stops = 100%)
      (startDate ? 15 : 0) + // 15% for start date
      (endDate ? 15 : 0) + // 15% for end date
      (selectedTrip.vehicle_make ? 10 : 0) // 10% for vehicle info
    )
  );

  // Format dates for display
  const formatDate = (date: Date | null) => {
    if (!date) return "Not set";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Format distance (convert from meters to miles if needed)
  const formatDistance = (distance: number) => {
    if (distance > 1000) {
      // Assume it's in meters, convert to miles
      return `${(distance * 0.000621371).toFixed(1)} miles`;
    }
    // Assume it's already in miles
    return `${distance.toFixed(1)} miles`;
  };

  // Format time (convert from seconds to hours if needed)
  const formatTime = (time: number) => {
    if (time > 100) {
      // Assume it's in seconds, convert to hours
      const hours = Math.floor(time / 3600);
      const minutes = Math.floor((time % 3600) / 60);
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }
    // Assume it's already in hours
    return `${time.toFixed(1)} hours`;
  };

  // Render weather icon based on condition
  const renderWeatherIcon = (condition: string) => {
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('sunny') || lowerCondition.includes('clear')) {
      return <Sun className="h-5 w-5 text-yellow-500" />;
    } else if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
      return <Droplets className="h-5 w-5 text-blue-500" />;
    } else if (lowerCondition.includes('cloud')) {
      return <Cloud className="h-5 w-5 text-gray-500" />;
    } else {
      return <CloudSun className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <div className="w-full bg-background border-t">
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Trip Summary: {selectedTrip.name}</h2>
            {selectedTrip.description && (
              <p className="text-muted-foreground mt-1">{selectedTrip.description}</p>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={onSave}>
              <Save className="mr-2 h-4 w-4" />
              Save Trip
            </Button>
            <Button size="sm" onClick={onShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Trip Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Trip Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">Total Distance</span>
                  </div>
                  <span className="font-medium">{formatDistance(totalDistance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">Total Time</span>
                  </div>
                  <span className="font-medium">{formatTime(totalTime)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Fuel className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">Est. Fuel Cost</span>
                  </div>
                  <span className="font-medium">${estimatedFuelCost.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trip Dates & Route */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Trip Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">Start Date</span>
                  </div>
                  <span className="font-medium">{formatDate(startDate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">End Date</span>
                  </div>
                  <span className="font-medium">{formatDate(endDate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Route className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">Route Type</span>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {selectedTrip.route_type}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Information */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Vehicle Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Car className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">Vehicle</span>
                  </div>
                  <span className="font-medium text-right">
                    {selectedTrip.vehicle_year} {selectedTrip.vehicle_make} {selectedTrip.vehicle_model}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Fuel className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">Fuel Efficiency</span>
                  </div>
                  <span className="font-medium">{selectedTrip.fuel_efficiency} MPG</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">Fuel Price</span>
                  </div>
                  <span className="font-medium">${selectedTrip.fuel_price_per_gallon}/gal</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trip Completion */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Trip Planning Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Completion</span>
                  <span className="font-medium">{completionPercentage}%</span>
                </div>
                <Progress value={completionPercentage} className="h-2" />
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground">
                    {completionPercentage < 50
                      ? "You're just getting started! Add more stops to your itinerary."
                      : completionPercentage < 80
                        ? "Making good progress! Consider adding some attractions."
                        : "Almost ready to go! Finalize any remaining details."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trip Stops Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stops List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                Trip Stops ({selectedTrip.stops_count})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedTrip.stops && selectedTrip.stops.length > 0 ? (
                  selectedTrip.stops
                    .sort((a, b) => a.order - b.order)
                    .map((stop, index) => (
                      <div key={stop.id} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30">
                        <div className="flex-shrink-0">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            stop.stop_type === 'start' 
                              ? 'bg-green-500 text-white' 
                              : stop.stop_type === 'destination'
                              ? 'bg-red-500 text-white'
                              : 'bg-blue-500 text-white'
                          }`}>
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm truncate">{stop.name}</h4>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                stop.stop_type === 'start' 
                                  ? 'bg-green-50 text-green-700 border-green-200' 
                                  : stop.stop_type === 'destination'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {stop.stop_type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {stop.address}
                          </p>
                          {stop.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              {stop.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No stops added yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Weather Forecasts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center">
                <CloudSun className="h-5 w-5 mr-2 text-blue-500" />
                Weather Forecasts
                {tripWeatherData && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {tripWeatherData.tripDuration} days
                  </Badge>
                )}
              </CardTitle>
              {tripWeatherData && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Avg: {tripWeatherData.averageTemp}°C</span>
                  <span>•</span>
                  <span>{tripWeatherData.dominantCondition}</span>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {tripWeatherData && tripWeatherData.forecasts.length > 0 ? (
                <div className="relative">
                  {/* Horizontal Scrollable Weather Cards */}
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400" style={{ scrollbarWidth: 'thin' }}>
                    {tripWeatherData.forecasts.map((forecast, index) => (
                      <div
                        key={forecast.id}
                        className="flex-shrink-0 w-32 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100 hover:shadow-md transition-shadow"
                      >
                        {/* Location & Date */}
                        <div className="text-center mb-2">
                          <h4 className="font-medium text-xs text-gray-800 truncate">
                            {forecast.locationName}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {new Date(forecast.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>

                        {/* Weather Icon & Condition */}
                        <div className="text-center mb-2">
                          <div className="flex justify-center mb-1">
                            {renderWeatherIcon(forecast.condition)}
                          </div>
                          <p className="text-xs font-medium text-gray-700">
                            {forecast.condition}
                          </p>
                        </div>

                        {/* Temperature */}
                        <div className="text-center mb-2">
                          <div className="text-lg font-bold text-gray-800">
                            {forecast.temperature.current}°C
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>H: {forecast.temperature.high}°</span>
                            <span>L: {forecast.temperature.low}°</span>
                          </div>
                        </div>

                        {/* Weather Details */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center">
                              <Droplets className="h-3 w-3 text-blue-400 mr-1" />
                              <span className="text-gray-600">{forecast.humidity}%</span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-gray-600">{forecast.windSpeed}km/h</span>
                            </div>
                          </div>
                          {forecast.precipitation > 0 && (
                            <div className="flex items-center justify-center text-xs">
                              <Droplets className="h-3 w-3 text-blue-500 mr-1" />
                              <span className="text-blue-600">{forecast.precipitation}% rain</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Scroll Indicator */}
                  {tripWeatherData.forecasts.length > 3 && (
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gradient-to-l from-white via-white to-transparent w-8 h-full flex items-center justify-end pr-1">
                      <div className="text-gray-400 text-xs">→</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <CloudSun className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">AI Weather data loading...</p>
                  <p className="text-xs">Weather forecasts will appear here when available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              Export PDF
            </Button>
            <Button variant="outline" size="sm">
              Print
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripDetailsDashboard;
