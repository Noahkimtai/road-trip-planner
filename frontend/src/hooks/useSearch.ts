import { useState, useCallback } from "react";
import { SearchResult } from "../types/trip";
import { apiService } from "../services/api";
import { mapService } from "../services/mapService";

export const useSearch = () => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchPlaces = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const mapResponse = await mapService.searchPlaces(query, {
        limit: 10,
        country: "ke",
        types: ["poi", "address", "place"],
      });

      const searchResults: SearchResult[] = mapResponse.features.map(
        (feature) => {
          const converted = mapService.convertToSearchResult(feature);
          return {
            id: converted.id,
            name: converted.name,
            address: converted.address,
            lat: converted.lat,
            lng: converted.lng,
            type: converted.type,
            categories: converted.categories,
            relevance: converted.relevance,
          };
        }
      );

      setResults(searchResults);
    } catch (mapError) {
      console.warn("Map search failed, falling back to backend API:", mapError);
      
      // Fallback to backend API if Geoapify fails
      try {
        const response = await apiService.searchPlaces(query);
        
        // Handle backend API format
        const searchResults: SearchResult[] = response.results.map(place => ({
          id: place.place_id,
          name: place.name,
          address: place.address || place.formatted_address,
          lat: place.latitude || place.geometry?.location?.lat,
          lng: place.longitude || place.geometry?.location?.lng,
          type: place.types?.[0] || "establishment",
          rating: place.rating,
        }));

        setResults(searchResults);
      } catch (backendError) {
        console.error('Both Geoapify and backend search failed:', backendError);
        setError("Failed to search places");
        setResults([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    isLoading,
    error,
    searchPlaces,
    clearResults,
  };
};
