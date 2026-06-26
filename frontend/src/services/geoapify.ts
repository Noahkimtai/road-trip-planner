// Geoapify API service for maps and geocoding
const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY || '143656f0173e46d0a6a2c6a00864300e';
const GEOAPIFY_BASE_URL = 'https://api.geoapify.com/v1';

export interface GeoapifyPlace {
  place_id: string;
  formatted: string;
  name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
  lat: number;
  lon: number;
  place_type: string;
  categories?: string[];
  datasource?: {
    sourcename: string;
    attribution: string;
  };
}

export interface GeoapifySearchResponse {
  type: string;
  features: Array<{
    type: string;
    properties: GeoapifyPlace;
    geometry: {
      type: string;
      coordinates: [number, number]; // [longitude, latitude]
    };
  }>;
}

class GeoapifyService {
  private apiKey = GEOAPIFY_API_KEY;
  private baseUrl = GEOAPIFY_BASE_URL;

  // Search for places using Geoapify Geocoding API
  async searchPlaces(query: string, options?: {
    limit?: number;
    bias?: { lat: number; lon: number };
    filter?: { country?: string; bbox?: [number, number, number, number] };
  }): Promise<GeoapifySearchResponse> {
    const params = new URLSearchParams({
      text: query,
      apiKey: this.apiKey,
      limit: (options?.limit || 10).toString(),
      format: 'geojson',
    });

    // Add bias (prioritize results near a location)
    if (options?.bias) {
      params.append('bias', `proximity:${options.bias.lon},${options.bias.lat}`);
    }

    // Add country filter
    if (options?.filter?.country) {
      params.append('filter', `countrycode:${options.filter.country}`);
    }

    // Add bounding box filter
    if (options?.filter?.bbox) {
      const [minLon, minLat, maxLon, maxLat] = options.filter.bbox;
      params.append('filter', `rect:${minLon},${minLat},${maxLon},${maxLat}`);
    }

    try {
      const response = await fetch(`${this.baseUrl}/geocode/search?${params}`);
      
      if (!response.ok) {
        throw new Error(`Geoapify API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Geoapify search error:', error);
      throw error;
    }
  }

  // Reverse geocoding - get place info from coordinates
  async reverseGeocode(lat: number, lon: number): Promise<GeoapifySearchResponse> {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      apiKey: this.apiKey,
      format: 'geojson',
    });

    try {
      const response = await fetch(`${this.baseUrl}/geocode/reverse?${params}`);
      
      if (!response.ok) {
        throw new Error(`Geoapify API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Geoapify reverse geocode error:', error);
      throw error;
    }
  }

  // Get static map URL
  getStaticMapUrl(options: {
    center: { lat: number; lon: number };
    zoom: number;
    width: number;
    height: number;
    markers?: Array<{
      lat: number;
      lon: number;
      color?: string;
      size?: 'small' | 'medium' | 'large';
      text?: string;
    }>;
    style?: 'osm-carto' | 'osm-bright' | 'positron' | 'dark-matter' | 'klokantech-basic';
  }): string {
    const { center, zoom, width, height, markers = [], style = 'osm-carto' } = options;
    
    const params = new URLSearchParams({
      style,
      width: width.toString(),
      height: height.toString(),
      center: `lonlat:${center.lon},${center.lat}`,
      zoom: zoom.toString(),
      apiKey: this.apiKey,
    });

    // Add markers
    markers.forEach((marker, index) => {
      const markerParams = [
        `lonlat:${marker.lon},${marker.lat}`,
        marker.color || 'red',
        marker.size || 'medium',
      ];
      
      if (marker.text) {
        markerParams.push(`text:${encodeURIComponent(marker.text)}`);
      }
      
      params.append('marker', markerParams.join(';'));
    });

    return `${this.baseUrl}/staticmap?${params}`;
  }

  // Convert Geoapify place to our SearchResult format
  convertToSearchResult(feature: GeoapifySearchResponse['features'][0]) {
    const props = feature.properties;
    const [lon, lat] = feature.geometry.coordinates;
    
    return {
      id: props.place_id,
      name: props.name || props.formatted.split(',')[0],
      address: props.formatted,
      lat,
      lng: lon, // Note: we use 'lng' in our app, Geoapify uses 'lon'
      type: props.place_type,
      categories: props.categories,
    };
  }
}

export const geoapifyService = new GeoapifyService();