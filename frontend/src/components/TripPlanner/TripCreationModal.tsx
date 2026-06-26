import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  CalendarIcon,
  MapPin,
  Clock,
  Route,
  Loader2,
  Car,
  Fuel,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mapService } from "@/services/mapService";
import { apiService } from "@/services/api";
import { toastService } from "@/services/toast";
import { Trip, Stop, WeatherForecast } from "@/types/trip";
import { cars, getCarById, formatCarName } from "@/data/cars";

interface TripCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTrip: (trip: Omit<Trip, "id" | "createdAt" | "updatedAt">) => void;
  initialStops: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    type: "start" | "stop" | "destination";
  }>;
  routeType: "fastest" | "scenic" | "custom";
  editingTrip?: any; // Trip data for editing
}

export const TripCreationModal: React.FC<TripCreationModalProps> = ({
  isOpen,
  onClose,
  onCreateTrip,
  initialStops,
  routeType,
  editingTrip,
}) => {
  const [tripName, setTripName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Vehicle and fuel settings
  const [selectedCar, setSelectedCar] = useState("toyota-camry-2024");
  const [customMake, setCustomMake] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [customYear, setCustomYear] = useState("");
  const [fuelEfficiency, setFuelEfficiency] = useState("25");
  const [fuelPrice, setFuelPrice] = useState("3.50");
  const [isPublic, setIsPublic] = useState(false);

  const [tripData, setTripData] = useState<{
    totalDistance: number;
    totalTime: number;
    estimatedFuelCost: number;
    stops: Stop[];
    weather: WeatherForecast[];
  } | null>(null);

  // Calculate trip details when modal opens or stops change
  useEffect(() => {
    if (isOpen && initialStops.length > 0) {
      calculateTripDetails();
    }
  }, [isOpen, initialStops]);

  // Populate form fields when editing a trip
  useEffect(() => {
    if (editingTrip && isOpen) {
      console.log(
        "TripCreationModal: Populating form for editing:",
        editingTrip.name
      );

      setTripName(editingTrip.name || "");
      setDescription(editingTrip.description || "");
      setStartDate(
        editingTrip.startDate ? new Date(editingTrip.startDate) : undefined
      );
      setEndDate(
        editingTrip.endDate ? new Date(editingTrip.endDate) : undefined
      );

      // Set vehicle information
      if (editingTrip.vehicle_make && editingTrip.vehicle_model) {
        const matchingCar = cars.find(
          (car) =>
            car.make === editingTrip.vehicle_make &&
            car.model === editingTrip.vehicle_model &&
            car.year.toString() === editingTrip.vehicle_year
        );

        if (matchingCar) {
          setSelectedCar(matchingCar.id);
        } else {
          setSelectedCar("custom");
          setCustomMake(editingTrip.vehicle_make || "");
          setCustomModel(editingTrip.vehicle_model || "");
          setCustomYear(editingTrip.vehicle_year || "");
        }
      }

      setFuelEfficiency(editingTrip.fuel_efficiency?.toString() || "25");
      setFuelPrice(editingTrip.fuel_price_per_gallon?.toString() || "3.50");
      setIsPublic(editingTrip.is_public || false);
    } else if (!editingTrip && isOpen) {
      // Reset form when creating new trip
      resetForm();
    }
  }, [editingTrip, isOpen]);

  const calculateTripDetails = async () => {
    setIsLoading(true);
    try {
      // Convert initial stops to coordinates for directions API
      const coordinates: Array<[number, number]> = initialStops.map((stop) => [
        stop.lng,
        stop.lat,
      ]);

      // Get directions and calculate total distance/time
      const directions = await mapService.getDirections(coordinates, {
        profile:
          routeType === "fastest"
            ? "driving-traffic"
            : routeType === "scenic"
            ? "driving"
            : "driving",
        steps: true,
        alternatives: routeType === "scenic",
      });

      let totalDistance = 0;
      let totalTime = 0;
      const stops: Stop[] = [];

      if (directions.routes && directions.routes.length > 0) {
        const route = directions.routes[0];
        totalDistance = route.distance; // meters
        totalTime = route.duration; // seconds

        // Create stops with travel information
        initialStops.forEach((stop, index) => {
          const leg = route.legs[index - 1]; // Previous leg to this stop

          stops.push({
            id: stop.id,
            name: stop.name,
            address: `${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}`,
            lat: stop.lat,
            lng: stop.lng,
            type:
              index === 0
                ? "start"
                : index === initialStops.length - 1
                ? "destination"
                : "waypoint",
            travelDistance: leg
              ? `${(leg.distance / 1000).toFixed(1)} km`
              : undefined,
            travelTime: leg
              ? `${Math.round(leg.duration / 60)} min`
              : undefined,
          });
        });
      }

      // Calculate estimated fuel cost (rough estimate: 10km per liter, $1.5 per liter)
      const estimatedFuelCost = (totalDistance / 1000) * 0.1 * 1.5;

      // Get REAL weather for each stop using the enhanced mapbox service
      const weather: WeatherForecast[] = await Promise.all(
        initialStops.map(async (stop) => {
          try {
            const weatherData = await mapService.getWeatherForLocation(
              stop.lat,
              stop.lng,
              stop.name
            );
            return {
              location: weatherData.location,
              temperature: weatherData.temperature,
              condition: weatherData.condition,
              icon: weatherData.icon,
              humidity: weatherData.humidity,
              windSpeed: weatherData.windSpeed,
              date: weatherData.date,
            };
          } catch (error) {
            console.warn(`Failed to get weather for ${stop.name}:`, error);
            // Show warning toast only once for weather issues
            if (stop === initialStops[0]) {
              toastService.api.weatherLoadFailed();
            }
            // Fallback weather data
            return {
              location: stop.name,
              temperature: 25,
              condition: "Unknown",
              icon: "sun",
              humidity: 65,
              windSpeed: 8,
              date: new Date(),
            };
          }
        })
      );

      setTripData({
        totalDistance,
        totalTime,
        estimatedFuelCost,
        stops,
        weather,
      });
    } catch (error) {
      console.error("Error calculating trip details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTrip = async () => {
    if (!tripName.trim()) return;

    setIsCreating(true);
    try {
      // Get vehicle information
      let vehicleInfo = {};
      if (selectedCar === "custom") {
        vehicleInfo = {
          vehicle_make: customMake || "Custom",
          vehicle_model: customModel || "Vehicle",
          vehicle_year: customYear || "N/A",
        };
      } else {
        const selectedCarData = getCarById(selectedCar);
        if (selectedCarData) {
          vehicleInfo = {
            vehicle_make: selectedCarData.make,
            vehicle_model: selectedCarData.model,
            vehicle_year: selectedCarData.year.toString(),
          };
        }
      }

      // Prepare basic trip data for backend
      const backendTripData = {
        name: tripName.trim(),
        description: description.trim() || undefined,
        route_type: routeType,
        start_date: startDate
          ? startDate.toISOString().split("T")[0]
          : undefined,
        end_date: endDate ? endDate.toISOString().split("T")[0] : undefined,
        fuel_efficiency: parseFloat(fuelEfficiency),
        fuel_price_per_gallon: parseFloat(fuelPrice),
        is_public: isPublic,
        ...vehicleInfo,
      };

      if (editingTrip) {
        // Update existing trip
        console.log("TripCreationModal: Updating trip:", editingTrip.id);

        const updatedTrip = await toastService.promise(
          apiService.updateTrip(editingTrip.id, backendTripData),
          {
            loading: `Updating trip "${tripName.trim()}"...`,
            success: (result) =>
              `Trip "${tripName.trim()}" updated successfully!`,
            error: (error) =>
              `Failed to update trip: ${error.message || "Unknown error"}`,
          }
        );

        console.log("Trip updated successfully:", updatedTrip);

        // Create local trip object for immediate UI update
        const localTrip: Omit<Trip, "id" | "createdAt" | "updatedAt"> = {
          name: tripName.trim(),
          stops: editingTrip.stops || [], // Keep existing stops when editing
          routeType,
          totalDistance: editingTrip.totalDistance || 0,
          totalTime: editingTrip.totalTime || 0,
          estimatedFuelCost: editingTrip.estimatedFuelCost || 0,
          startDate,
          endDate,
        };

        // Call parent callback for immediate UI update
        onCreateTrip(localTrip);
      } else {
        // Create new trip
        if (!tripData) return;

        // Prepare stops data for new trip
        const stopsData = initialStops.map((stop, index) => ({
          name: stop.name,
          address: `${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}`,
          latitude: stop.lat,
          longitude: stop.lng,
          order: index + 1,
          stop_type:
            stop.type === "start"
              ? "start"
              : stop.type === "destination"
              ? "destination"
              : "waypoint",
        }));

        // Get route geometry for map visualization
        let routeGeometry = null;
        let routeBounds = null;

        if (tripData && tripData.stops.length >= 2) {
          try {
            const coordinates = initialStops.map((stop) => [
              stop.lng,
              stop.lat,
            ]);
            const directions = await mapService.getDirections(coordinates, {
              profile:
                routeType === "fastest"
                  ? "driving-traffic"
                  : routeType === "scenic"
                  ? "driving"
                  : "driving",
              geometries: "polyline",
              overview: "full",
            });

            if (directions.routes && directions.routes.length > 0) {
              routeGeometry = directions.routes[0].geometry;

              // Calculate bounds for map fitting
              const lats = initialStops.map((stop) => stop.lat);
              const lngs = initialStops.map((stop) => stop.lng);
              routeBounds = {
                northeast: { lat: Math.max(...lats), lng: Math.max(...lngs) },
                southwest: { lat: Math.min(...lats), lng: Math.min(...lngs) },
              };
            }
          } catch (error) {
            console.warn("Failed to get route geometry:", error);
          }
        }

        // Add additional data for new trip creation
        const newTripData = {
          ...backendTripData,
          // Include stops in the trip creation
          stops: stopsData,
          // Include route data for map visualization
          route_geometry: routeGeometry,
          route_bounds: routeBounds,
          // Include calculated metrics
          total_distance: tripData?.totalDistance || 0,
          total_time: tripData?.totalTime || 0,
          estimated_fuel_cost: tripData?.estimatedFuelCost || 0,
        };

        const createdTrip = await toastService.promise(
          apiService.createTrip(newTripData),
          {
            loading: `Creating trip "${tripName.trim()}"...`,
            success: (result) =>
              `Trip "${tripName.trim()}" created successfully!`,
            error: (error) =>
              `Failed to create trip: ${error.message || "Unknown error"}`,
          }
        );

        console.log("Trip created successfully with all stops:", createdTrip);

        // Create local trip object for immediate UI update
        const localTrip: Omit<Trip, "id" | "createdAt" | "updatedAt"> = {
          name: tripName.trim(),
          stops: tripData.stops,
          routeType,
          totalDistance: tripData.totalDistance,
          totalTime: tripData.totalTime,
          estimatedFuelCost: tripData.estimatedFuelCost,
          startDate,
          endDate,
        };

        // Call parent callback for immediate UI update
        onCreateTrip(localTrip);
      }

      // Close modal and reset form
      onClose();
      resetForm();
    } catch (error) {
      console.error(
        editingTrip ? "Failed to update trip:" : "Failed to create trip:",
        error
      );
      // Toast service already handled the error message
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setTripName("");
    setDescription("");
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedCar("toyota-camry-2024");
    setCustomMake("");
    setCustomModel("");
    setCustomYear("");
    setFuelEfficiency("25");
    setFuelPrice("3.50");
    setIsPublic(false);
    setTripData(null);
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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Only close if explicitly set to false, not on other interactions
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingTrip ? "Edit Trip" : "Create New Trip"}
          </DialogTitle>
          <DialogDescription>
            {editingTrip
              ? `Update details for "${editingTrip.name}"`
              : `Add details for your trip with ${initialStops.length} stops`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trip Details Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tripName">Trip Name *</Label>
              <Input
                id="tripName"
                placeholder="e.g., Weekend Safari Adventure"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe your trip..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  Start Date
                </Label>
                <DatePicker
                  date={startDate}
                  onDateChange={(date) => {
                    console.log("Start date selected:", date);
                    setStartDate(date);
                  }}
                  placeholder="Pick start date"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  End Date
                </Label>
                <DatePicker
                  date={endDate}
                  onDateChange={(date) => {
                    console.log("End date selected:", date);
                    setEndDate(date);
                  }}
                  placeholder="Pick end date"
                />
              </div>
            </div>

            <Separator />

            {/* Vehicle Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                <Label className="text-base font-semibold">
                  Vehicle Details
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Select Vehicle</Label>
                <Select value={selectedCar} onValueChange={setSelectedCar}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {cars.map((car) => (
                      <SelectItem key={car.id} value={car.id}>
                        {formatCarName(car)}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom Vehicle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedCar === "custom" && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Make</Label>
                    <Input
                      placeholder="Toyota"
                      value={customMake}
                      onChange={(e) => setCustomMake(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Model</Label>
                    <Input
                      placeholder="Camry"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Year</Label>
                    <Input
                      placeholder="2024"
                      value={customYear}
                      onChange={(e) => setCustomYear(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Fuel Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Fuel className="h-4 w-4" />
                <Label className="text-base font-semibold">Fuel Settings</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fuel Efficiency (MPG)</Label>
                  <Input
                    type="number"
                    placeholder="25"
                    value={fuelEfficiency}
                    onChange={(e) => setFuelEfficiency(e.target.value)}
                    min="5"
                    max="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fuel Price ($/gallon)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="3.50"
                    value={fuelPrice}
                    onChange={(e) => setFuelPrice(e.target.value)}
                    min="1"
                    max="10"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Privacy Settings */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Privacy</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="isPublic" className="text-sm">
                  Make this trip public (others can view and copy)
                </Label>
              </div>
            </div>
          </div>

          {/* Trip Summary */}
          <div className="space-y-4">
            {isLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Calculating trip details...</span>
                  </div>
                </CardContent>
              </Card>
            ) : tripData ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Route className="h-5 w-5 mr-2" />
                      Trip Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Distance
                        </p>
                        <p className="font-semibold">
                          {formatDistance(tripData.totalDistance)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Time
                        </p>
                        <p className="font-semibold">
                          {formatDuration(tripData.totalTime)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Estimated Fuel Cost
                      </p>
                      <p className="font-semibold">
                        ${tripData.estimatedFuelCost.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Route Type
                      </p>
                      <Badge variant="secondary">{routeType}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <MapPin className="h-5 w-5 mr-2" />
                      Trip route ({tripData.stops.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {tripData.stops.map((stop, index) => (
                        <div
                          key={stop.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2 ${
                                stop.type === "start"
                                  ? "bg-green-500 text-white"
                                  : stop.type === "destination"
                                  ? "bg-red-500 text-white"
                                  : "bg-blue-500 text-white"
                              }`}
                            >
                              {stop.type === "start"
                                ? "S"
                                : stop.type === "destination"
                                ? "D"
                                : index}
                            </div>
                            <span className="font-medium">{stop.name}</span>
                          </div>
                          {stop.travelDistance && (
                            <span className="text-muted-foreground text-xs">
                              {stop.travelDistance}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateTrip}
            disabled={
              !tripName.trim() ||
              (!tripData && !editingTrip) ||
              isLoading ||
              isCreating
            }
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {editingTrip ? "Updating Trip..." : "Creating Trip..."}
              </>
            ) : editingTrip ? (
              "Update Trip Details"
            ) : (
              "Create Trip"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
