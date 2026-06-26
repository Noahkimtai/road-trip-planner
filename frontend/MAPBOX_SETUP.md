# Mapbox API Setup Guide

## Getting Your Mapbox Access Token

1. **Sign up for Mapbox**:
   - Go to [https://www.mapbox.com/](https://www.mapbox.com/)
   - Click "Get started for free"
   - Create an account

2. **Get Your Access Token**:
   - After signing up, go to your dashboard
   - Navigate to "Access tokens" section
   - Copy your default public token (starts with `pk.`)
   - Or create a new token with the required scopes

3. **Configure Your Environment**:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - The token is already configured in `.env.example`, but you can replace it with your own:
     ```
     VITE_MAPBOX_ACCESS_TOKEN=your_actual_token_here
     ```

## Features Enabled

With Mapbox integration, you get:

- **Place Search**: Search for any location worldwide with autocomplete
- **Interactive Static Maps**: High-quality maps with custom markers
- **Multiple Map Styles**: 6 different professional map themes
- **Geolocation**: "Locate Me" functionality
- **Search Results on Map**: Visual markers for search results
- **Click to Add**: Click search results to add them as trip stops
- **Directions API**: Route calculation between waypoints
- **Reverse Geocoding**: Get place info from coordinates

## API Limits

The free tier includes:
- 50,000 map loads per month
- 100,000 geocoding requests per month
- All map styles included
- Static Maps API
- Directions API

## Troubleshooting

If the map doesn't load:
1. Check your access token is correct in `.env`
2. Restart your development server after adding the token
3. Check browser console for any errors
4. Ensure you're not exceeding API limits
5. Verify your token has the required scopes

## Map Styles Available

- `streets-v11`: Default street map (recommended)
- `outdoors-v11`: Outdoor/hiking focused map
- `light-v10`: Light minimalist style
- `dark-v10`: Dark theme style
- `satellite-v9`: Satellite imagery
- `satellite-streets-v11`: Satellite with street labels

Click the layers button (🗂️) in the map controls to cycle through styles.

## Advanced Features

### Directions API
The Mapbox service includes directions functionality:
```javascript
const directions = await mapboxService.getDirections([
  [-74.006, 40.7128], // New York
  [-118.2437, 34.0522] // Los Angeles
]);
```

### Reverse Geocoding
Get place information from coordinates:
```javascript
const place = await mapboxService.reverseGeocode(-74.006, 40.7128);
```

### Custom Markers
Add custom markers to static maps:
```javascript
const mapUrl = mapboxService.getStaticMapUrl({
  center: [-74.006, 40.7128],
  zoom: 12,
  width: 800,
  height: 600,
  markers: [
    { coordinates: [-74.006, 40.7128], color: 'red', label: 'A' }
  ]
});
```

## Token Security

- **Public tokens** (starting with `pk.`) are safe to use in frontend applications
- **Secret tokens** (starting with `sk.`) should NEVER be used in frontend code
- You can restrict token usage by URL, domain, or other scopes in your Mapbox dashboard
- Consider creating separate tokens for development and production environments

## Kenya-Focused Configuration

This application is configured for Kenya by default:

- **Search Results**: Automatically filtered to Kenya (`country: 'ke'`)
- **Map Center**: Defaults to Nairobi, Kenya (-1.2921, 36.8219)
- **Recommendations**: Default location set to Nairobi for better local results
- **Place Types**: Optimized for Kenyan points of interest, addresses, and places

### Customizing for Other Countries

To change the default country:

1. **Update Search Hook** (`frontend/src/hooks/useSearch.ts`):
   ```javascript
   country: 'us', // Change 'ke' to your country code
   ```

2. **Update Mapbox Service** (`frontend/src/services/mapbox.ts`):
   ```javascript
   const country = options?.country || 'us'; // Change 'ke' to your country code
   ```

3. **Update Map Center** (`frontend/src/components/TripPlanner/InteractiveMap.tsx`):
   ```javascript
   const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.0060 }); // NYC example
   ```

4. **Update Default Recommendations** (`frontend/src/components/home.tsx`):
   ```javascript
   tripStore.loadRecommendations(40.7128, -74.0060); // NYC example
   ```

## Migration from Geoapify

If you're migrating from Geoapify:
1. Update your environment variables from `VITE_GEOAPIFY_API_KEY` to `VITE_MAPBOX_ACCESS_TOKEN`
2. Mapbox uses `[longitude, latitude]` coordinate order (opposite of many other services)
3. Map styles have different names but similar functionality
4. Mapbox provides better performance and more features in the free tier