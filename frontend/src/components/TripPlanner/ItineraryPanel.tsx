import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  MapPin,
  Clock,
  Car as CarIcon,
  Trash2,
  Calendar,
  DollarSign,
  Fuel,
  Edit,
  AlertTriangle,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stop, StopInput, Trip } from "@/types/trip";
import { SearchResult } from "@/types/trip";
import {
  cars,
  getCarsByType,
  getCarById,
  formatCarName,
  Car,
} from "@/data/cars";
import { SearchAutocomplete } from "@/components/ui/search-autocomplete";

interface ItineraryPanelProps {
  stops: Stop[];
  onAddStop: (stop: StopInput) => void;
  onRemoveStop: (stopId: string) => void;
  onReorderStops: (stops: Stop[]) => void;
  onRouteTypeChange: (routeType: string) => void;
  selectedRouteType: string;
  searchResults?: SearchResult[];
  isSearching?: boolean;
  onSearch?: (query: string) => void;
  onCreateTrip?: (tripData: {
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
  }) => void;
  hasExistingTrips?: boolean;
  isLoading?: boolean;
  // New props for trip management
  allTrips?: Trip[];
  currentTrip?: Trip | null;
  onSelectTrip?: (trip: Trip) => void;
  // New props for filtering
  selectedFilter?: string;
  onFilterChange?: (filter: string) => void;
  // New props for trip actions
  onEditTrip?: (trip: Trip) => void;
  onDeleteTrip?: (tripId: string) => void;
  onUpdateTrip?: (
    tripId: string,
    tripData: {
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
    }
  ) => void;
}

const ItineraryPanel: React.FC<ItineraryPanelProps> = ({
  stops,
  onAddStop,
  onRemoveStop,
  onReorderStops,
  onRouteTypeChange,
  selectedRouteType,
  searchResults = [],
  isSearching = false,
  onSearch,
  onCreateTrip,
  hasExistingTrips = false,
  isLoading = false,
  // New props for trip management
  allTrips = [],
  currentTrip,
  onSelectTrip,
  // New props for filtering
  selectedFilter = "all",
  onFilterChange,
  // New props for trip actions
  onEditTrip,
  onDeleteTrip,
  onUpdateTrip,
}) => {
  const [showCreateTrip, setShowCreateTrip] = useState(!hasExistingTrips);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  // Internal state for filter when parent doesn't provide it
  const [internalFilter, setInternalFilter] = useState("all");

  // Always use internal state for now since parent doesn't provide filter management
  const currentFilter = internalFilter;
  const handleFilterChange = (value: string) => {
    console.log("Setting internal filter to:", value);
    setInternalFilter(value);
  };

  // State for delete confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);

  // Handle delete trip with confirmation
  const handleDeleteClick = (trip: Trip, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card selection
    setTripToDelete(trip);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (tripToDelete && onDeleteTrip) {
      onDeleteTrip(tripToDelete.id.toString());
    }
    setDeleteModalOpen(false);
    setTripToDelete(null);
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setTripToDelete(null);
  };

  // Handle edit trip
  const handleEditClick = (trip: Trip, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card selection

    console.log("Edit button clicked for trip:", trip.name);
    console.log("onEditTrip callback exists:", !!onEditTrip);

    // Call the onEditTrip callback with the trip data
    // This should trigger the TripCreationModal with pre-filled data
    if (onEditTrip) {
      console.log("Calling onEditTrip with trip data");
      onEditTrip(trip);
    } else {
      console.warn("onEditTrip callback not provided by parent component");
      console.log("Parent component needs to implement onEditTrip prop that:");
      console.log("1. Opens TripCreationModal with pre-filled data");
      console.log("2. Changes button text to 'Update Trip Details'");
      console.log("3. Calls PUT endpoint for updating trip");
      console.log("Trip data that should be passed to modal:", trip);
    }
  };

  // Filter trips based on selected filter
  const filteredTrips = useMemo(() => {
    if (currentFilter === "all") return allTrips;
    return allTrips.filter((trip) => trip.route_type === currentFilter);
  }, [allTrips, currentFilter]);

  // Calculate total distance and time for all fetched trips
  const totalStats = useMemo(() => {
    const totalDistance = filteredTrips.reduce(
      (sum, trip) => sum + (trip.totalDistance || 0),
      0
    );
    const totalTime = filteredTrips.reduce(
      (sum, trip) => sum + (trip.totalTime || 0),
      0
    );
    return { totalDistance, totalTime };
  }, [filteredTrips]);
  const [tripName, setTripName] = useState("");
  const [tripDescription, setTripDescription] = useState("");
  const [routeType, setRouteType] = useState("fastest");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedCar, setSelectedCar] = useState("toyota-camry-2024");
  const [customMake, setCustomMake] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [customYear, setCustomYear] = useState("");
  const [customMpg, setCustomMpg] = useState("25");
  const [fuelPrice, setFuelPrice] = useState("3.50");

  // Update showCreateTrip when hasExistingTrips changes (e.g., when trips are loaded)
  useEffect(() => {
    // Only update if not loading to avoid flickering
    if (!isLoading) {
      console.log(
        "ItineraryPanel: hasExistingTrips changed to:",
        hasExistingTrips
      );
      setShowCreateTrip(!hasExistingTrips);
    }
  }, [hasExistingTrips, isLoading]);

  // Prepare car options for the searchable combobox
  const carOptions = useMemo(() => {
    const options = cars
      .filter((car) => car.id !== "custom")
      .map((car) => ({
        value: car.id,
        label: formatCarName(car),
        group:
          car.type === "sedan"
            ? "Sedans"
            : car.type === "suv"
            ? "SUVs"
            : car.type === "truck"
            ? "Trucks"
            : car.type === "hybrid"
            ? "Hybrids"
            : car.type === "electric"
            ? "Electric"
            : car.type === "hatchback"
            ? "Hatchbacks"
            : car.type === "coupe"
            ? "Sports Cars"
            : "Other",
      }));

    // Add custom option at the end
    options.push({
      value: "custom",
      label: "Custom - Enter your custom mpg",
      group: "Custom",
    });

    return options;
  }, []);

  const handleAddStop = (result: SearchResult) => {
    onAddStop({
      name: result.name,
      address: result.address,
      lat: result.lat,
      lng: result.lng,
      latitude: result.lat,
      longitude: result.lng,
    });
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(stops);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onReorderStops(items);
  };

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (tripName.trim()) {
      // Get MPG from selected car or custom input
      const selectedCarData = getCarById(selectedCar);
      const mpg =
        selectedCar === "custom"
          ? parseFloat(customMpg)
          : selectedCarData?.mpg || 25;

      // Prepare vehicle information for the backend
      let vehicleInfo = {};
      if (selectedCar === "custom") {
        // Include custom vehicle details
        vehicleInfo = {
          vehicle_make: customMake || "Custom",
          vehicle_model: customModel || "Vehicle",
          vehicle_year: customYear || "N/A",
        };
      } else if (selectedCarData) {
        // Include selected vehicle details
        vehicleInfo = {
          vehicle_make: selectedCarData.make,
          vehicle_model: selectedCarData.model,
          vehicle_year: selectedCarData.year.toString(),
        };
      }

      const tripData = {
        name: tripName,
        description: tripDescription || undefined,
        route_type: routeType,
        start_date: startDate
          ? startDate.toISOString().split("T")[0]
          : undefined,
        end_date: endDate ? endDate.toISOString().split("T")[0] : undefined,
        fuel_efficiency: mpg,
        fuel_price_per_gallon: parseFloat(fuelPrice),
        ...vehicleInfo, // Include vehicle information
      };

      // Check if we're editing or creating
      if (editingTrip && onUpdateTrip) {
        // Update existing trip
        onUpdateTrip(editingTrip.id.toString(), tripData);
      } else if (onCreateTrip) {
        // Create new trip
        onCreateTrip(tripData);
      }

      // Reset form and close modal
      resetForm();
    }
  };

  const resetForm = () => {
    setTripName("");
    setTripDescription("");
    setRouteType("fastest");
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedCar("toyota-camry-2024");
    setCustomMake("");
    setCustomModel("");
    setCustomYear("");
    setCustomMpg("25");
    setFuelPrice("3.50");
    setEditingTrip(null);
    setShowCreateTrip(false);
  };

  // Show create trip interface if no existing trips or user wants to create new trip
  if (!hasExistingTrips || showCreateTrip) {
    return (
      <div className="h-full w-[350px] bg-background border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold mb-4">
            {editingTrip ? "Edit Trip" : "Trip Itinerary"}
          </h2>

        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">
              You haven't created any trip yet. Click anywhere in the map to create your first trip to start planning your adventure!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-[350px] bg-background border-r flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Trip Itinerary</h2>
          {/* <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateTrip(true)}
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Trip
          </Button> */}
        </div>

        <SearchAutocomplete
          placeholder="Search for a destination"
          onSearch={onSearch || (() => {})}
          onResultSelect={handleAddStop}
          searchResults={searchResults}
          isSearching={isSearching}
          className="mb-4"
        />
      </div>

      {/* Trip List - Bigger section */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Route Type Filter */}
        <div className="mb-4">
          <Label className="text-sm font-medium mb-2 block">
            Filter Your Current Trips by Route Type
          </Label>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center space-x-1">
              <input
                type="radio"
                id="filter-all"
                name="routeFilter"
                value="all"
                checked={currentFilter === "all"}
                onChange={(e) => {
                  console.log("Filter changed to:", e.target.value);
                  console.log("Current filter before:", currentFilter);
                  console.log("Internal filter before:", internalFilter);
                  console.log("onFilterChange exists:", !!onFilterChange);
                  handleFilterChange(e.target.value);
                }}
                className="h-4 w-4 accent-black"
              />
              <Label htmlFor="filter-all" className="text-sm cursor-pointer">
                All
              </Label>
            </div>
            <div className="flex items-center space-x-1">
              <input
                type="radio"
                id="filter-fastest"
                name="routeFilter"
                value="fastest"
                checked={currentFilter === "fastest"}
                onChange={(e) => {
                  console.log("Filter changed to:", e.target.value);
                  handleFilterChange(e.target.value);
                }}
                className="h-4 w-4 accent-black"
              />
              <Label
                htmlFor="filter-fastest"
                className="text-sm cursor-pointer"
              >
                Fastest
              </Label>
            </div>
            <div className="flex items-center space-x-1">
              <input
                type="radio"
                id="filter-scenic"
                name="routeFilter"
                value="scenic"
                checked={currentFilter === "scenic"}
                onChange={(e) => {
                  console.log("Filter changed to:", e.target.value);
                  handleFilterChange(e.target.value);
                }}
                className="h-4 w-4 accent-black"
              />
              <Label htmlFor="filter-scenic" className="text-sm cursor-pointer">
                Scenic
              </Label>
            </div>
            <div className="flex items-center space-x-1">
              <input
                type="radio"
                id="filter-custom"
                name="routeFilter"
                value="custom"
                checked={currentFilter === "custom"}
                onChange={(e) => {
                  console.log("Filter changed to:", e.target.value);
                  handleFilterChange(e.target.value);
                }}
                className="h-4 w-4 accent-black"
              />
              <Label htmlFor="filter-custom" className="text-sm cursor-pointer">
                Custom
              </Label>
            </div>
          </div>
        </div>

        {/* Trip List */}
        {isLoading && filteredTrips.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p>Loading trips...</p>
          </div>
        ) : filteredTrips.length > 0 ? (
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Trips ({filteredTrips.length}{" "}
              {currentFilter === "all" ? "total" : currentFilter})
            </Label>
            {filteredTrips.map((trip) => (
              <Card
                key={trip.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  currentTrip?.id === trip.id
                    ? "ring-2 ring-primary bg-primary/5"
                    : "hover:bg-accent/50"
                }`}
                onClick={() => onSelectTrip?.(trip)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate mb-1">
                        {trip.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <span className="bg-secondary px-2 py-1 rounded-full">
                          {trip.route_type || "fastest"}
                        </span>
                        <span>{trip.stops?.length || 0} stops</span>
                        {trip.startDate && (
                          <span>
                            • {new Date(trip.startDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">
                            Distance:{" "}
                          </span>
                          <span className="font-medium">
                            {trip.totalDistance
                              ? `${(trip.totalDistance / 1000).toFixed(1)} km`
                              : "--"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Time: </span>
                          <span className="font-medium">
                            {trip.totalTime
                              ? `${Math.round(
                                  trip.totalTime / 3600
                                )}h ${Math.round(
                                  (trip.totalTime % 3600) / 60
                                )}m`
                              : "--"}
                          </span>
                        </div>
                      </div>
                      {trip.estimatedFuelCost && (
                        <div className="text-xs mt-1">
                          <span className="text-muted-foreground">
                            Est. Cost:{" "}
                          </span>
                          <span className="font-medium text-green-600">
                            ${trip.estimatedFuelCost.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {currentTrip?.id === trip.id && (
                        <div className="w-3 h-3 bg-primary rounded-full flex-shrink-0 mr-2" />
                      )}
                      {/* Edit Icon */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-blue-100"
                        onClick={(e) => handleEditClick(trip, e)}
                        title="Edit trip"
                      >
                        <Edit className="h-3 w-3 text-blue-600" />
                      </Button>
                      {/* Delete Icon */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-red-100"
                        onClick={(e) => handleDeleteClick(trip, e)}
                        title="Delete trip"
                      >
                        <Trash2 className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">
              {currentFilter === "all"
                ? "No trips found. Click anywhere in the map to create your first trip!"
                : `No ${currentFilter} trips found. Click anywhere in the map or search a destination to create your first ${currentFilter} trip!`}
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Delete Trip
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this trip? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          {tripToDelete && (
            <div className="py-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <h4 className="font-semibold text-sm mb-1">
                  {tripToDelete.name}
                </h4>
                <div className="text-xs text-muted-foreground">
                  <span className="bg-secondary px-2 py-1 rounded-full mr-2">
                    {tripToDelete.route_type || "fastest"}
                  </span>
                  <span>{tripToDelete.stops?.length || 0} stops</span>
                  {tripToDelete.startDate && (
                    <span>
                      {" "}
                      • {new Date(tripToDelete.startDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Trip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ItineraryPanel;
