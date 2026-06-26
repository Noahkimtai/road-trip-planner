import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapIcon,
  Layers,
  Plus,
  Minus,
  LocateFixed,
  Route,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SearchResult, Trip } from "@/types/trip";
import { mapService } from "@/services/mapService";
import { TripCreationModal } from "./TripCreationModal";

// ─── Tile layer configurations ───────────────────────────────────────────────

type MapStyleKey = "streets" | "outdoors" | "light" | "dark" | "satellite";

const TILE_LAYERS: Record<
  MapStyleKey,
  { url: string; attribution: string; label: string }
> = {
  streets: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    label: "Streets",
  },
  outdoors: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors',
    label: "Outdoors",
  },
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://carto.com/attributions">CartoDB</a>',
    label: "Light",
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://carto.com/attributions">CartoDB</a>',
    label: "Dark",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
    label: "Satellite",
  },
};

const MAP_STYLE_CYCLE: MapStyleKey[] = [
  "streets",
  "outdoors",
  "light",
  "dark",
  "satellite",
];

// ─── Custom numbered DivIcon (avoids Leaflet's image-URL issues with Vite) ───

const createNumberedIcon = (label: string | number, bgColor = "#3b82f6") =>
  L.divIcon({
    html: `<div style="background:${bgColor};color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35)">${label}</div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });

// ─── Map sub-components (must live inside <MapContainer>) ────────────────────

// Captures the Leaflet map instance so the parent can call zoomIn/Out/setView
const MapRefCapture: React.FC<{
  mapRef: React.MutableRefObject<L.Map | null>;
}> = ({ mapRef }) => {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
};

// Pans/zooms to fit visible points whenever they change
const FitBoundsController: React.FC<{
  waypoints: Waypoint[];
  focusedLocation: { lat: number; lng: number; name: string } | null;
}> = ({ waypoints, focusedLocation }) => {
  const map = useMap();

  const waypointKey = waypoints
    .filter((w) => w.lat !== 0 && w.lng !== 0)
    .map((w) => `${w.lat},${w.lng}`)
    .join("|");

  useEffect(() => {
    if (focusedLocation) {
      map.setView([focusedLocation.lat, focusedLocation.lng], 13, {
        animate: true,
      });
      return;
    }

    const valid = waypoints.filter((w) => w.lat !== 0 && w.lng !== 0);
    if (valid.length >= 2) {
      const bounds = L.latLngBounds(
        valid.map((w) => [w.lat, w.lng] as L.LatLngTuple)
      );
      map.fitBounds(bounds, { padding: [60, 60] });
    } else if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], 12, { animate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, waypointKey, focusedLocation?.lat, focusedLocation?.lng]);

  return null;
};

// Fires the onMapClick callback with real lat/lng from every map click
const MapClickHandler: React.FC<{
  onMapClick: (lat: number, lng: number) => void;
}> = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => onMapClick(e.latlng.lat, e.latlng.lng),
  });
  return null;
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface RouteType {
  id: string;
  name: string;
  description: string;
}

interface InteractiveMapProps {
  waypoints?: Waypoint[];
  selectedRouteType?: string;
  searchResults?: SearchResult[];
  focusedLocation?: { lat: number; lng: number; name: string } | null;
  onWaypointDrag?: (waypointId: string, newLat: number, newLng: number) => void;
  onRouteTypeChange?: (routeType: string) => void;
  onSearchResultClick?: (result: SearchResult) => void;
  onClearFocus?: () => void;
  onAddMarker?: (marker: {
    lat: number;
    lng: number;
    name: string;
    type: "start" | "stop" | "destination";
  }) => void;
  onCreateTrip?: (trip: Omit<Trip, "id" | "createdAt" | "updatedAt">) => void;
  initialMarkers?: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    type: "start" | "stop" | "destination";
  }>;
  onMarkersChange?: (
    markers: Array<{
      id: string;
      name: string;
      lat: number;
      lng: number;
      type: "start" | "stop" | "destination";
    }>
  ) => void;
  editingTrip?: any;
  onEditComplete?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  waypoints = [
    { id: "1", name: "Nairobi", lat: -1.2921, lng: 36.8219 },
    { id: "2", name: "Mombasa", lat: -4.0435, lng: 39.6682 },
  ],
  selectedRouteType = "fastest",
  searchResults = [],
  focusedLocation = null,
  onWaypointDrag = () => {},
  onRouteTypeChange = () => {},
  onSearchResultClick = () => {},
  onClearFocus = () => {},
  onAddMarker = () => {},
  onCreateTrip = () => {},
  initialMarkers = [],
  onMarkersChange = () => {},
  editingTrip,
  onEditComplete = () => {},
}) => {
  // [lat, lng] tuples for Leaflet's Polyline
  const [routePath, setRoutePath] = useState<Array<[number, number]>>([]);
  const [clickedMarkers, setClickedMarkers] = useState<
    Array<{
      id: string;
      lat: number;
      lng: number;
      name: string;
      type: "start" | "stop" | "destination";
    }>
  >([]);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>("streets");
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);

  const mapRef = useRef<L.Map | null>(null);

  const routeTypes: RouteType[] = [
    {
      id: "fastest",
      name: "Fastest",
      description: "Optimized for shortest travel time",
    },
    {
      id: "scenic",
      name: "Scenic",
      description: "Prioritizes scenic routes and attractions",
    },
    { id: "custom", name: "Custom", description: "Manually adjusted route" },
  ];

  // Open the trip modal when an editingTrip is passed in
  useEffect(() => {
    if (editingTrip) setIsTripModalOpen(true);
  }, [editingTrip]);

  // Recalculate route whenever waypoints or route type changes
  useEffect(() => {
    const points = clickedMarkers.length >= 2 ? clickedMarkers : waypoints;
    if (points.length < 2) {
      setRoutePath([]);
      return;
    }

    const calculateRoute = async () => {
      const coordinates: Array<[number, number]> = points.map((p) => [
        p.lng,
        p.lat,
      ]);

      const opts: Parameters<typeof mapService.getDirections>[1] = {
        profile: "driving",
        overview: "full",
        steps: false,
      };

      if (selectedRouteType === "scenic") opts.alternatives = true;

      try {
        const directions = await mapService.getDirections(coordinates, opts);
        if (!directions.routes.length) return;

        let route = directions.routes[0];

        if (selectedRouteType === "scenic" && directions.routes.length > 1) {
          // Pick the longer route as "scenic"
          route = directions.routes.reduce((a, b) =>
            b.distance > a.distance ? b : a
          );
        }

        const decoded = mapService.decodePolyline(route.geometry);
        // decodePolyline returns [lng, lat]; Leaflet needs [lat, lng]
        setRoutePath(decoded.map(([lng, lat]) => [lat, lng]));
      } catch (err) {
        console.error("Route calculation failed:", err);
        setRoutePath([]);
      }
    };

    calculateRoute();
    // Use a stable key rather than the array reference to avoid re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    waypoints.map((w) => `${w.lat},${w.lng}`).join("|"),
    selectedRouteType,
    clickedMarkers.length,
  ]);

  // Handle a click on the map canvas
  const handleMapClick = useCallback(
    async (lat: number, lng: number) => {
      const markerType: "start" | "stop" | "destination" =
        clickedMarkers.length === 0 ? "start" : "stop";

      let placeName =
        markerType === "start"
          ? "Starting Point"
          : `Stop ${
              clickedMarkers.filter((m) => m.type === "stop").length + 1
            }`;

      try {
        const res = await mapService.reverseGeocode(lng, lat);
        if (res.features.length > 0) {
          placeName =
            res.features[0].text || res.features[0].place_name || placeName;
        }
      } catch {
        // keep fallback name
      }

      const newMarker = {
        id: `marker-${Date.now()}`,
        lat,
        lng,
        name: placeName,
        type: markerType,
      };

      setClickedMarkers((prev) => [...prev, newMarker]);
      onAddMarker(newMarker);
    },
    [clickedMarkers, onAddMarker]
  );

  const clearClickedMarkers = () => setClickedMarkers([]);

  // ── Zoom / locate handlers (use the captured map ref) ─────────────────────
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleLocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        mapRef.current?.setView(
          [pos.coords.latitude, pos.coords.longitude],
          15
        ),
      (err) => console.error("Geolocation error:", err)
    );
  };
  const handleCycleStyle = () => {
    setMapStyle((prev) => {
      const idx = MAP_STYLE_CYCLE.indexOf(prev);
      return MAP_STYLE_CYCLE[(idx + 1) % MAP_STYLE_CYCLE.length];
    });
  };

  const tileConfig = TILE_LAYERS[mapStyle];
  const defaultCenter: [number, number] =
    waypoints.length > 0 && waypoints[0].lat !== 0
      ? [waypoints[0].lat, waypoints[0].lng]
      : [-1.2921, 36.8219]; // Nairobi

  return (
    <div className="w-full h-full bg-background border rounded-lg overflow-hidden">
      <div className="relative w-full h-[600px]">
        {/* ── Leaflet map ─────────────────────────────────────────────────── */}
        <MapContainer
          center={defaultCenter}
          zoom={waypoints.length === 0 ? 7 : 10}
          style={{ width: "100%", height: "100%" }}
          zoomControl={false}
          className="z-0"
        >
          <TileLayer
            key={mapStyle}
            url={tileConfig.url}
            attribution={tileConfig.attribution}
          />

          <MapRefCapture mapRef={mapRef} />
          <FitBoundsController
            waypoints={waypoints}
            focusedLocation={focusedLocation}
          />
          <MapClickHandler onMapClick={handleMapClick} />

          {/* Trip waypoints (blue numbered) */}
          {waypoints.map((wp, i) => (
            <Marker
              key={`wp-${wp.id}`}
              position={[wp.lat, wp.lng]}
              icon={createNumberedIcon(i + 1, "#3b82f6")}
            >
              <Popup>
                <strong>{wp.name}</strong>
              </Popup>
            </Marker>
          ))}

          {/* Clicked markers (green = start, blue = stop) */}
          {clickedMarkers.map((m, i) => (
            <Marker
              key={m.id}
              position={[m.lat, m.lng]}
              icon={createNumberedIcon(
                m.type === "start" ? "S" : i + 1,
                m.type === "start" ? "#22c55e" : "#3b82f6"
              )}
            >
              <Popup>{m.name}</Popup>
            </Marker>
          ))}

          {/* Search result markers (red lettered) */}
          {searchResults.map((r, i) => (
            <Marker
              key={`sr-${r.id}`}
              position={[r.lat, r.lng]}
              icon={createNumberedIcon(
                String.fromCharCode(65 + i),
                "#ef4444"
              )}
              eventHandlers={{ click: () => onSearchResultClick(r) }}
            >
              <Popup>
                <strong>{r.name}</strong>
                <br />
                <small>{r.address}</small>
              </Popup>
            </Marker>
          ))}

          {/* Focused location marker (green star) */}
          {focusedLocation && (
            <Marker
              position={[focusedLocation.lat, focusedLocation.lng]}
              icon={createNumberedIcon("★", "#22c55e")}
            >
              <Popup>
                <strong>{focusedLocation.name}</strong>
              </Popup>
            </Marker>
          )}

          {/* Route polyline */}
          {routePath.length > 1 && (
            <Polyline
              positions={routePath}
              color="#3b82f6"
              weight={4}
              opacity={0.8}
            />
          )}
        </MapContainer>

        {/* ── Focused location card ────────────────────────────────────────── */}
        {focusedLocation && (
          <div className="absolute top-4 left-4 z-[1000] max-w-xs">
            <Card className="bg-green-50/95 backdrop-blur-sm border-green-200">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm flex items-center text-green-800">
                    <MapPin className="h-4 w-4 mr-1 text-green-600" />
                    Focused Location
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-green-600 hover:text-green-800"
                    onClick={onClearFocus}
                  >
                    ✕
                  </Button>
                </div>
                <div className="text-xs">
                  <p className="font-medium text-green-800">
                    {focusedLocation.name}
                  </p>
                  <p className="text-green-600">
                    {focusedLocation.lat.toFixed(4)},{" "}
                    {focusedLocation.lng.toFixed(4)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Search results panel ─────────────────────────────────────────── */}
        {searchResults.length > 0 && !focusedLocation && (
          <div className="absolute top-4 left-4 z-[1000] max-w-xs">
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardContent className="p-3">
                <h3 className="font-semibold text-sm mb-2 flex items-center">
                  <MapPin className="h-4 w-4 mr-1 text-red-500" />
                  Search Results ({searchResults.length})
                </h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {searchResults.slice(0, 5).map((result, index) => (
                    <div
                      key={result.id}
                      className="text-xs p-2 hover:bg-accent rounded cursor-pointer transition-colors"
                      onClick={() => onSearchResultClick(result)}
                    >
                      <div className="flex items-start gap-2">
                        <span className="bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{result.name}</p>
                          <p className="text-muted-foreground truncate">
                            {result.address}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {searchResults.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      +{searchResults.length - 5} more results
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Clicked markers control panel ────────────────────────────────── */}
        {clickedMarkers.length > 0 && (
          <div className="absolute top-4 right-16 z-[1000] max-w-xs">
            <Card className="bg-blue-50/95 backdrop-blur-sm border-blue-200">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm flex items-center text-blue-800">
                    <MapPin className="h-4 w-4 mr-1 text-blue-600" />
                    Trip Points ({clickedMarkers.length})
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                    onClick={clearClickedMarkers}
                  >
                    ✕
                  </Button>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto mb-2">
                  {clickedMarkers.map((marker, index) => (
                    <div
                      key={marker.id}
                      className="text-xs flex items-center gap-2"
                    >
                      <div
                        className={`rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold ${
                          marker.type === "start"
                            ? "bg-green-500 text-white"
                            : "bg-blue-500 text-white"
                        }`}
                      >
                        {marker.type === "start" ? "S" : index + 1}
                      </div>
                      <span className="font-medium text-blue-800 truncate">
                        {marker.name}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    disabled={clickedMarkers.length < 2}
                    onClick={() => setIsTripModalOpen(true)}
                  >
                    Create Trip
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={clearClickedMarkers}
                  >
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Map controls (right side) ────────────────────────────────────── */}
        <div className="absolute right-4 top-4 z-[1000] flex flex-col gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleZoomIn}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom In</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleZoomOut}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom Out</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleLocate}
                >
                  <LocateFixed className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>My Location</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleCycleStyle}
                >
                  <Layers className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Map Style: {TILE_LAYERS[mapStyle].label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* ── Route type selector (bottom) ─────────────────────────────────── */}
        {(clickedMarkers.length >= 2 || waypoints.length >= 2) && (
          <div className="absolute bottom-4 left-4 right-4 z-[1000]">
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center">
                    <Route className="h-4 w-4 mr-2" />
                    Route Options
                  </h3>
                  <div className="text-xs text-muted-foreground">
                    {clickedMarkers.length >= 2
                      ? `${clickedMarkers.length} points`
                      : `${waypoints.length} waypoints`}
                  </div>
                </div>
                <Tabs
                  value={selectedRouteType}
                  onValueChange={onRouteTypeChange}
                >
                  <TabsList className="w-full">
                    {routeTypes.map((route) => (
                      <TabsTrigger
                        key={route.id}
                        value={route.id}
                        className="flex-1"
                      >
                        <div className="flex items-center gap-2">
                          <Route className="h-4 w-4" />
                          <span>{route.name}</span>
                        </div>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {routeTypes.map((route) => (
                    <TabsContent key={route.id} value={route.id}>
                      <p className="text-sm text-muted-foreground">
                        {route.description}
                      </p>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Fallback when map has no content ─────────────────────────────── */}
        {waypoints.length === 0 && clickedMarkers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 text-center">
              <MapIcon className="h-8 w-8 mx-auto text-blue-400 mb-2" />
              <p className="text-sm text-slate-600">
                Click on the map to add stops, or select a trip on the left.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Trip creation / edit modal ──────────────────────────────────────── */}
      <TripCreationModal
        isOpen={isTripModalOpen}
        onClose={() => {
          setIsTripModalOpen(false);
          if (editingTrip && onEditComplete) onEditComplete();
        }}
        onCreateTrip={(trip) => {
          onCreateTrip(trip);
          clearClickedMarkers();
          setIsTripModalOpen(false);
          if (editingTrip && onEditComplete) onEditComplete();
        }}
        initialStops={editingTrip ? [] : clickedMarkers}
        routeType={selectedRouteType as "fastest" | "scenic" | "custom"}
        editingTrip={editingTrip}
      />
    </div>
  );
};

export default InteractiveMap;
