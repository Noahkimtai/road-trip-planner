import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  MapPin, 
  Search, 
  Plus, 
  RefreshCw, 
  Cloud, 
  Star,
  Clock,
  DollarSign,
  Route,
  ArrowLeft,
  Home
} from 'lucide-react';
import { useTripStore } from '../hooks/useTripStore';
import { useSearch } from '../hooks/useSearch';

export const DynamicFeatureDemo: React.FC = () => {
  const tripStore = useTripStore();
  const search = useSearch();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      await search.searchPlaces(searchQuery);
    }
  };

  const handleAddSearchResult = (result: any) => {
    tripStore.addStop({
      name: result.name,
      address: result.address,
      lat: result.lat,
      lng: result.lng,
    });
    search.clearResults();
    setSearchQuery('');
  };

  const refreshRecommendations = () => {
    const lastStop = tripStore.currentTrip?.stops[tripStore.currentTrip.stops.length - 1];
    if (lastStop?.lat && lastStop?.lng) {
      tripStore.loadRecommendations(lastStop.lat, lastStop.lng);
    }
  };

  const refreshWeather = () => {
    tripStore.loadWeatherForecasts();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button 
                variant="ghost" 
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Main App
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-xl font-semibold">Features Demo</h1>
          </div>
          <Link to="/">
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Main App
            </Button>
          </Link>
        </div>
      </header>

      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">🚗 Road Trip Planner</h1>
          <p className="text-muted-foreground">
            Search places, get recommendations, view weather, and calculate routes in real-time.
          </p>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> This demo showcases all the primary features of this app. Use the "Back to Main App" button above to return to the full trip planning interface.
            </p>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search & Trip Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Dynamic Search & Trip Building
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for destinations..."
                className="flex-1"
              />
              <Button type="submit" disabled={search.isLoading}>
                {search.isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </form>

            {search.results.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Search Results:</p>
                {search.results.map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">{result.name}</p>
                      <p className="text-xs text-muted-foreground">{result.address}</p>
                      {result.rating && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs">{result.rating}</span>
                        </div>
                      )}
                    </div>
                    <Button size="sm" onClick={() => handleAddSearchResult(result)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            <div>
              <p className="text-sm font-medium mb-2">Current Trip Stops:</p>
              <div className="space-y-2">
                {tripStore.currentTrip?.stops.map((stop, index) => (
                  <div key={stop.id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{stop.name}</p>
                        <p className="text-xs text-muted-foreground">{stop.address}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => tripStore.removeStop(stop.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trip Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              Dynamic Trip Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted rounded">
                <MapPin className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                <p className="text-2xl font-bold">{tripStore.currentTrip?.totalDistance || 0}</p>
                <p className="text-xs text-muted-foreground">Miles</p>
              </div>
              <div className="text-center p-3 bg-muted rounded">
                <Clock className="h-6 w-6 mx-auto mb-1 text-green-500" />
                <p className="text-2xl font-bold">{tripStore.currentTrip?.totalTime.toFixed(1) || 0}</p>
                <p className="text-xs text-muted-foreground">Hours</p>
              </div>
            </div>
            
            <div className="text-center p-3 bg-muted rounded">
              <DollarSign className="h-6 w-6 mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-bold">${tripStore.currentTrip?.estimatedFuelCost.toFixed(0) || 0}</p>
              <p className="text-xs text-muted-foreground">Estimated Fuel Cost</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Route Type:</p>
              <div className="flex gap-2">
                {['fastest', 'scenic', 'custom'].map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant={tripStore.currentTrip?.routeType === type ? 'default' : 'outline'}
                    onClick={() => tripStore.updateRouteType(type as any)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Dynamic Recommendations
              </div>
              <Button size="sm" onClick={refreshRecommendations} disabled={tripStore.isLoading}>
                <RefreshCw className={`h-4 w-4 ${tripStore.isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tripStore.isLoading ? (
              <div className="text-center py-4">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading recommendations...</p>
              </div>
            ) : tripStore.recommendations.length > 0 ? (
              <div className="space-y-3">
                {tripStore.recommendations.slice(0, 3).map((rec) => (
                  <div key={rec.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{rec.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs">{rec.rating.toFixed(1)}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {rec.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{rec.distance}</span>
                      </div>
                      <div className="flex gap-1 mt-1">
                        {rec.tags.slice(0, 2).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => tripStore.addStop({
                        name: rec.name,
                        address: rec.description,
                        lat: rec.lat,
                        lng: rec.lng,
                      })}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>Add more stops to get recommendations!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dynamic Weather */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Dynamic Weather Forecasts
              </div>
              <Button size="sm" onClick={refreshWeather} disabled={tripStore.isLoading}>
                <RefreshCw className={`h-4 w-4 ${tripStore.isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tripStore.weatherForecasts.length > 0 ? (
              <div className="space-y-3">
                {tripStore.weatherForecasts.map((forecast, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded">
                    <div>
                      <p className="font-medium">{forecast.location}</p>
                      <p className="text-sm text-muted-forecast">{forecast.condition}</p>
                      {forecast.humidity && (
                        <p className="text-xs text-muted-foreground">
                          Humidity: {forecast.humidity}% • Wind: {forecast.windSpeed?.toFixed(1)} mph
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{Math.round(forecast.temperature)}°F</p>
                      <p className="text-xs text-muted-foreground">
                        {forecast.date.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>Add stops with coordinates to see weather!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {tripStore.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600 text-sm">{tripStore.error}</p>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
};

export default DynamicFeatureDemo;