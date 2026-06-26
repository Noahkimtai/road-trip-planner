import { OpenAIRecommendation, RecommendationsResponse, WeatherForecast, TripWeatherResponse } from './types';

// Re-export so other modules can import these types from this file
export type { OpenAIRecommendation, RecommendationsResponse, WeatherForecast, TripWeatherResponse };

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY;
const PIXABAY_API_KEY = import.meta.env.VITE_PIXABAY_API_KEY;
const OPENAI_BASE_URL = "https://api.openai.com/v1";
const PEXELS_BASE_URL = "https://api.pexels.com/v1/search";
const PIXABAY_BASE_URL = "https://pixabay.com/api/";

class OpenAIService {
  private apiKey = OPENAI_API_KEY;
  private baseUrl = OPENAI_BASE_URL;
  private pexelsApiKey = PEXELS_API_KEY;
  private pixabayApiKey = PIXABAY_API_KEY;
  private imageCache: { [key: string]: string } = {};
  private usedImageUrls: Set<string> = new Set();

  constructor() {
    if (!this.apiKey) {
      console.error("❌ OpenAI API key is not defined!");
      console.log("Please add VITE_OPENAI_API_KEY to your .env file");
    } else {
      console.log("✅ OpenAI API key loaded successfully");
    }
    if (!this.pexelsApiKey) {
      console.warn("⚠️ Pexels API key not defined, fallback may be limited");
    }
    if (!this.pixabayApiKey) {
      console.warn("⚠️ Pixabay API key not defined, fallback may be limited");
    }
    // Load cached images from localStorage
    const cached = localStorage.getItem('imageCache');
    if (cached) {
      this.imageCache = JSON.parse(cached);
    }
  }

  // Location-specific keyword mappings
  private locationKeywordMap: { [key: string]: { [category: string]: string[] } } = {
    nairobi: {
      restaurant: ['nyama choma', 'kenyan cuisine', 'maasai decor', 'urban dining'],
      attraction: ['national park', 'museum', 'maasai market', 'city skyline'],
      accommodation: ['boutique hotel', 'modern hotel', 'safari lodge', 'urban retreat']
    },
    naivasha: {
      restaurant: ['lakeside dining', 'fresh fish', 'kenyan seafood', 'outdoor patio'],
      attraction: ['lake naivasha', 'flamingos', 'hells gate', 'rift valley'],
      accommodation: ['lakeside lodge', 'tented camp', 'eco-lodge', 'lake view']
    },
    kisumu: {
      restaurant: ['tilapia', 'lake victoria fish', 'luo cuisine', 'lakeside terrace'],
      attraction: ['lake victoria', 'dunga hill', 'museum', 'fishing boats'],
      accommodation: ['lakeside cabin', 'budget hotel', 'cultural lodge', 'lakefront']
    }
  };

  // Enhanced method to build specific recommendation prompts
  private buildRecommendationPrompt(
    locationName: string,
    lat?: number,
    lng?: number
  ): string {
    const coordinates = lat && lng ? ` (coordinates: ${lat}, ${lng})` : "";

    return `
Please provide travel recommendations for ${locationName}${coordinates}. 
Include specific details about cuisine types, architectural styles, and unique features for better image generation.

Return the response as a JSON object with this exact structure:

{
  "restaurants": [
    {
      "id": "unique-id",
      "name": "Restaurant Name",
      "description": "Brief description including specific cuisine type, signature dishes, and dining atmosphere",
      "type": "restaurant",
      "rating": 4.5,
      "priceLevel": 2,
      "address": "Full address",
      "tags": ["cuisine-type", "atmosphere", "specialty", "signature-dish"],
      "openingHours": "9:00 AM - 10:00 PM",
      "phone": "+1234567890",
      "cuisineStyle": "specific cuisine type (e.g., 'Kenyan seafood', 'Italian', 'Indian curry house')",
      "signatureDish": "main specialty dish",
      "diningStyle": "atmosphere description (e.g., 'lakeside terrace dining', 'cozy indoor', 'rooftop restaurant')"
    }
  ],
  "attractions": [
    {
      "id": "unique-id", 
      "name": "Attraction Name",
      "description": "Description including specific features, architecture, or natural elements",
      "type": "attraction",
      "rating": 4.8,
      "address": "Full address",
      "tags": ["category", "activity-type", "best-time", "main-feature"],
      "openingHours": "8:00 AM - 6:00 PM",
      "attractionType": "specific type (e.g., 'natural lake', 'historical museum', 'cultural market', 'wildlife sanctuary')",
      "mainFeature": "key visual element (e.g., 'flamingo colonies', 'traditional artifacts', 'panoramic views')",
      "setting": "environment description (e.g., 'rift valley setting', 'colonial architecture', 'lakefront location')"
    }
  ],
  "accommodations": [
    {
      "id": "unique-id",
      "name": "Hotel/Lodge Name", 
      "description": "Description including architectural style, room types, and unique amenities",
      "type": "accommodation",
      "rating": 4.3,
      "priceLevel": 3,
      "address": "Full address",
      "tags": ["hotel-type", "amenities", "location", "style"],
      "phone": "+1234567890",
      "website": "https://example.com",
      "accommodationType": "specific type (e.g., 'lakeside lodge', 'boutique hotel', 'safari camp')",
      "architecture": "building style (e.g., 'traditional African design', 'modern lakefront', 'colonial style')",
      "uniqueFeature": "standout amenity (e.g., 'infinity pool overlooking lake', 'traditional thatched roofs', 'private balconies')"
    }
  ]
}

Please provide 3-4 recommendations for each category. Focus on popular, well-reviewed places that are actually located in or near ${locationName}. Include specific details about cuisine types, architectural features, and unique characteristics for each recommendation.
    `.trim();
  }

  // Enhanced addImageUrls to prevent duplicates
  private async addImageUrls(
    recommendations: any,
    locationName: string
  ): Promise<RecommendationsResponse> {
    const addImages = async (items: any[], type: string) => {
      return await Promise.all(
        items.map(async (item, index) => {
          const cacheKey = `${type}-${item.id}-${index}`;
          if (this.imageCache[cacheKey]) {
            return { ...item, imageUrl: this.imageCache[cacheKey] };
          }
          
          let imageUrl = await this.getCategorySpecificImageUrl(
            type,
            item.name,
            item.description,
            locationName,
            index,
            item
          );

          // Ensure unique image URL
          let attempt = 0;
          while (this.usedImageUrls.has(imageUrl) && attempt < 3) {
            console.warn(`Duplicate image URL detected for ${type} - ${item.name}, retrying...`);
            imageUrl = await this.getCategorySpecificImageUrl(
              type,
              item.name,
              item.description,
              locationName,
              index + attempt + 1, // Vary index for new prompt
              item
            );
            attempt++;
          }

          this.usedImageUrls.add(imageUrl);
          this.imageCache[cacheKey] = imageUrl;
          // Persist cache to localStorage
          localStorage.setItem('imageCache', JSON.stringify(this.imageCache));
          return { ...item, imageUrl };
        })
      );
    };

    // Reset usedImageUrls for each new batch
    this.usedImageUrls.clear();

    return {
      restaurants: await addImages(recommendations.restaurants || [], "restaurant"),
      attractions: await addImages(recommendations.attractions || [], "attraction"),
      accommodations: await addImages(recommendations.accommodations || [], "accommodation"),
    };
  }

  // Enhanced image generation with unique prompts
  private async getCategorySpecificImageUrl(
    category: string,
    itemName: string,
    itemDescription: string,
    locationName: string,
    index: number,
    extraData?: any
  ): Promise<string> {
    if (!this.apiKey) {
      console.warn("OpenAI API key not available, using fallback image");
      return this.getFallbackImage(category, itemName, itemDescription, locationName, index, extraData);
    }

    try {
      const prompt = this.generateImagePrompt(category, itemName, itemDescription, locationName, index, extraData);
      
      console.log(`🎨 Generating ${category} image for ${itemName} with prompt:`, prompt.substring(0, 100) + '...');
      
      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
          response_format: "url",
        }),
      });

      if (!response.ok) {
        throw new Error(`DALL·E API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const imageUrl = data.data[0]?.url;
      if (!imageUrl) {
        throw new Error("No image URL received from DALL·E");
      }

      console.log(`✅ Generated ${category} image for ${itemName}: ${imageUrl}`);
      return imageUrl;
    } catch (error) {
      console.error(`❌ Failed to generate ${category} image for ${itemName}:`, error);
      return this.getFallbackImage(category, itemName, itemDescription, locationName, index, extraData);
    }
  }

  // Enhanced prompt generation with increased variability
  private generateImagePrompt(
    category: string,
    itemName: string,
    itemDescription: string,
    locationName: string,
    index: number,
    extraData?: any
  ): string {
    const cleanItemName = itemName.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const cleanDescription = itemDescription.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const variation = index % 8; // Expanded to 8 variations

    const lightingVariations = [
      "golden hour glow", "bright midday light", "soft morning light", "twilight ambiance",
      "warm evening light", "overcast soft light", "sunset hues", "clear daylight"
    ];
    const perspectiveVariations = [
      "wide-angle view", "close-up detail", "aerial perspective", "ground-level view",
      "panoramic view", "angled facade view", "interior focus", "landscape-integrated view"
    ];
    const lighting = lightingVariations[variation];
    const perspective = perspectiveVariations[variation];

    // Add unique identifier to prompt
    const uniqueId = extraData?.id || cleanItemName;

    switch (category) {
      case "restaurant":
        return this.generateRestaurantImagePrompt(cleanItemName, cleanDescription, locationName, lighting, perspective, extraData, uniqueId);
      
      case "attraction":
        return this.generateAttractionImagePrompt(cleanItemName, cleanDescription, locationName, lighting, perspective, extraData, uniqueId);
      
      case "accommodation":
        return this.generateAccommodationImagePrompt(cleanItemName, cleanDescription, locationName, lighting, perspective, extraData, uniqueId);
      
      default:
        return `A high-quality, photorealistic ${perspective} of a travel scene at ${itemName} (ID: ${uniqueId}) in ${locationName}, Kenya, with ${lighting}, showcasing unique cultural or natural elements of Kenya.`;
    }
  }

  // Specific restaurant image prompt with unique details
  private generateRestaurantImagePrompt(
    itemName: string,
    description: string,
    locationName: string,
    lighting: string,
    perspective: string,
    extraData?: any,
    uniqueId?: string
  ): string {
    const cuisineStyle = extraData?.cuisineStyle || this.extractCuisineType(description);
    const signatureDish = extraData?.signatureDish || this.extractSignatureDish(description);
    const diningStyle = extraData?.diningStyle || this.extractDiningStyle(description);

    const dishVariations = [
      "grilled with Kenyan spices and ugali", "fried with crispy sukuma wiki", "stewed with rich coconut sauce", "served with chapati and kachumbari",
      "roasted with Luo-inspired herbs", "marinated in coastal flavors", "presented on banana leaves with samosas", "garnished with fresh coriander"
    ];
    const settingVariations = [
      "lakeside terrace with Lake Victoria views and Luo fishing boats", "vibrant outdoor patio with acacia trees and Maasai art", 
      "cozy indoor with beaded Maasai decor and wooden carvings", "rooftop with Kisumu skyline and sunset views",
      "garden setting with tropical plants and Kenyan pottery", "open-air dining with savannah backdrop and fire pit",
      "rustic interior with Luo cultural artifacts", "modern dining with glass windows and city views"
    ];
    const variation = parseInt(this.createConsistentSeed(`${itemName}-${uniqueId}-${locationName}`)) % 8;
    const dishPrep = dishVariations[variation];
    const setting = settingVariations[variation];

    let foodDescription = "";
    if (cuisineStyle.includes("kenyan") || cuisineStyle.includes("african")) {
      foodDescription = `${dishPrep} ${signatureDish || "dishes like tilapia, nyama choma, ugali, sukuma wiki, or githeri"}`;
    } else if (cuisineStyle.includes("seafood") || description.includes("fish")) {
      foodDescription = `${dishPrep} seafood like tilapia, prawns, or fish curry with Luo spices`;
    } else if (cuisineStyle.includes("italian")) {
      foodDescription = `${dishPrep} Italian dishes like wood-fired pizza or creamy pasta`;
    } else if (cuisineStyle.includes("indian")) {
      foodDescription = `${dishPrep} Indian dishes like spicy curry, naan, or tandoori chicken`;
    } else if (cuisineStyle.includes("cafe") || description.includes("coffee")) {
      foodDescription = `${dishPrep} cafe items like artisanal coffee, mandazi, or Kenyan pastries`;
    } else {
      foodDescription = `${dishPrep} authentic Kenyan cuisine artfully presented`;
    }

    return `A photorealistic ${perspective} of a Kenyan restaurant scene at ${itemName} (ID: ${uniqueId}) in ${locationName}, showcasing ${foodDescription} elegantly plated on a table in a ${setting}. The scene includes Maasai-patterned tablecloths, Luo-inspired decor, or African wood carvings, captured with ${lighting}, emphasizing a vibrant, culturally rich dining experience unique to ${locationName}, Kenya.`;
  }

  // Specific attraction image prompt with unique details
  private generateAttractionImagePrompt(
    itemName: string,
    description: string,
    locationName: string,
    lighting: string,
    perspective: string,
    extraData?: any,
    uniqueId?: string
  ): string {
    const attractionType = extraData?.attractionType || this.extractAttractionType(itemName, description);
    const mainFeature = extraData?.mainFeature || this.extractMainFeature(description);
    const setting = extraData?.setting || this.extractSetting(description);

    const featureVariations = [
      "featuring vibrant wildlife like flamingos or hippos", "showcasing rift valley gorges or rock formations",
      "highlighting Luo artifacts or Maasai beadwork exhibits", "emphasizing lush savannah or Lake Victoria views",
      "showcasing traditional Kenyan huts or colonial architecture", "featuring local fishing or market activities",
      "highlighting dramatic cliffs or volcanic landscapes", "emphasizing vibrant Maasai or Luo market stalls"
    ];
    const variation = parseInt(this.createConsistentSeed(`${itemName}-${uniqueId}-${locationName}`)) % 8;
    const feature = featureVariations[variation];

    let visualDescription = "";
    if (attractionType.includes("lake") || itemName.toLowerCase().includes("naivasha") || itemName.toLowerCase().includes("victoria")) {
      visualDescription = `${perspective} of a serene lake with clear water, acacia trees, and ${mainFeature || "flamingos or fishing boats"}`;
    } else if (attractionType.includes("museum")) {
      visualDescription = `${perspective} of a museum with colonial or Luo-inspired architecture, displaying ${mainFeature || "traditional Luo artifacts or Maasai beadwork"}`;
    } else if (attractionType.includes("market")) {
      visualDescription = `${perspective} of a bustling market with colorful stalls, beaded crafts, and ${mainFeature || "fresh fish or produce"}`;
    } else if (attractionType.includes("park") || attractionType.includes("sanctuary")) {
      visualDescription = `${perspective} of a nature park with savannah landscapes, zebras, and ${mainFeature || "walking trails or wildlife"}`;
    } else if (attractionType.includes("gorge") || attractionType.includes("rock")) {
      visualDescription = `${perspective} of dramatic gorges or volcanic rock formations with ${mainFeature || "rift valley views"}`;
    } else if (attractionType.includes("cultural")) {
      visualDescription = `${perspective} of a cultural site with traditional Luo or Maasai huts and ${mainFeature || "community performances"}`;
    } else {
      visualDescription = `${perspective} of a scenic landmark with ${mainFeature || "natural Kenyan beauty"}`;
    }

    return `A stunning, photorealistic ${visualDescription} at ${itemName} (ID: ${uniqueId}) in ${locationName}, Kenya, captured with ${lighting}, ${feature}. Include visitors for scale and vibrant Kenyan elements like acacia trees, Luo fishing boats, or Maasai patterns specific to ${locationName}.`;
  }

  // Specific accommodation image prompt with unique details
  private generateAccommodationImagePrompt(
    itemName: string,
    description: string,
    locationName: string,
    lighting: string,
    perspective: string,
    extraData?: any,
    uniqueId?: string
  ): string {
    const accommodationType = extraData?.accommodationType || this.extractAccommodationType(itemName, description);
    const architecture = extraData?.architecture || this.extractArchitecture(description);
    const uniqueFeature = extraData?.uniqueFeature || this.extractUniqueFeature(description);

    const featureVariations = [
      "featuring a welcoming entrance with Luo or Maasai art", "showcasing a cozy room with Kenyan fabrics",
      "highlighting lush gardens or infinity pools with lake views", "emphasizing thatched roofs or acacia wood beams",
      "featuring lakefront verandas with Lake Victoria scenery", "showcasing modern glass facades with city views",
      "highlighting tented camp setups with savannah backdrop", "emphasizing cultural decor like beaded lamps or Luo pottery"
    ];
    const variation = parseInt(this.createConsistentSeed(`${itemName}-${uniqueId}-${locationName}`)) % 8;
    const feature = featureVariations[variation];

    let visualDescription = "";
    if (accommodationType.includes("lodge")) {
      visualDescription = `${perspective} of a safari lodge with thatched roofs, wooden structures, and ${uniqueFeature || "savannah or lake views"}`;
    } else if (accommodationType.includes("resort")) {
      visualDescription = `${perspective} of a luxury resort with manicured gardens, pools, and ${uniqueFeature || "modern amenities"}`;
    } else if (accommodationType.includes("hotel")) {
      visualDescription = `${perspective} of a hotel with modern or colonial facades and ${uniqueFeature || "grand entrance with Kenyan art"}`;
    } else if (accommodationType.includes("camp")) {
      visualDescription = `${perspective} of a tented camp with canvas structures and ${uniqueFeature || "lakeside or savannah views"}`;
    } else {
      visualDescription = `${perspective} of an accommodation with ${uniqueFeature || "authentic Kenyan design"}`;
    }

    return `A photorealistic ${visualDescription} at ${itemName} (ID: ${uniqueId}) in ${locationName}, Kenya, captured with ${lighting}, ${feature}. Include African-inspired decor like Maasai beadwork, Luo pottery, or natural surroundings like acacia trees or Lake Victoria to convey hospitality specific to ${locationName}.`;
  }

  // Enhanced fallback with Pexels and Pixabay, with relevance scoring
  private async getFallbackImage(
    category: string,
    itemName: string,
    itemDescription: string,
    locationName: string,
    index: number,
    extraData?: any
  ): Promise<string> {
    const cleanName = itemName.toLowerCase();
    const seed = parseInt(this.createConsistentSeed(`${category}-${itemName}-${index}-${locationName}-${extraData?.id || ''}`)) % 8;
    let keywords = this.getCategoryKeywords(category, cleanName, itemDescription, locationName, extraData);

    // Try Pexels first
    if (this.pexelsApiKey) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const imageUrl = await this.fetchPexelsImage(keywords, seed + attempt);
          if (imageUrl && !this.usedImageUrls.has(imageUrl)) {
            return imageUrl;
          }
        } catch (error) {
          console.warn(`⚠️ Pexels API error for ${category} - ${itemName}:`, error);
        }
        // Adjust keywords for retry
        keywords = this.getAlternativeKeywords(keywords, locationName, category);
      }
    }

    // Fallback to Pixabay
    if (this.pixabayApiKey) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const imageUrl = await this.fetchPixabayImage(keywords, seed + attempt);
          if (imageUrl && !this.usedImageUrls.has(imageUrl)) {
            return imageUrl;
          }
        } catch (error) {
          console.warn(`⚠️ Pixabay API error for ${category} - ${itemName}:`, error);
        }
        // Adjust keywords for retry
        keywords = this.getAlternativeKeywords(keywords, locationName, category);
      }
    }

    // Curated Kenyan-specific default images
    const defaultImages = {
      restaurant: [
        "https://images.pexels.com/photos/1058277/pexels-photo-1058277.jpeg?auto=compress&cs=tinysrgb&w=400&h=300", // Kenyan tilapia dish
        "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=400&h=300", // Nyama choma
        "https://images.pexels.com/photos/3186654/pexels-photo-3186654.jpeg?auto=compress&cs=tinysrgb&w=400&h=300", // Lakeside dining
        "https://images.pexels.com/photos/262047/pexels-photo-262047.jpeg?auto=compress&cs=tinysrgb&w=400&h=300", // Outdoor Kenyan patio
        "https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg?auto=compress&cs=tinysrgb&w=400&h=300", // Cafe with mandazi
        "https://images.pexels.com/photos/1410235/pexels-photo-1410235.jpeg?auto=compress&cs=tinysrgb&w=400&h=300", // Street food stall
        "https://images.pexels.com/photos/1487511/pexels-photo-1487511.jpeg?auto=compress&cs=tinysrgb&w=400&h=300", // Fine dining with Kenyan decor
        "https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=400&h=300" // Local cuisine
      ],
      attraction: [
        "https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=400&h=300", // Lake with flamingos
        "https://images.pexels.com/photos/2312904/pexels-photo-2312904.jpeg?auto=compress&cs=tinysrgb&w=400&h=300", // Cultural museum
        "https://images.pexels.com/photos/1320686/pexels-photo-1320686.jpeg?auto=compress&cs=tinysrgb&w=400&h=300", // Savannah park
        "https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg?auto=compress&cs=tinysrgb&w=400&h=300", // Rift valley gorge
        "https://images.pexels.com/photos/753639/pexels-photo-753639.jpeg?auto=compress&cs=tinysrgb&w=400&h=300", // Cultural market
        "https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=400&h=300", // Lake Victoria view
        "https://images.pexels.com/photos/1314550/pexels-photo-1314550.jpeg?auto=compress&cs=tinysrgb&w=400&h=300", // Wildlife sanctuary
        "https://images.pexels.com/photos/3601426/pexels-photo-3601426.jpeg?auto=compress&cs=tinysrgb&w=400&h=300" // Maasai cultural site
      ],
      accommodation: [
        "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=400&h=300", // Lakeside lodge
        "https://images.pexels.com/photos/1579253/pexels-photo-1579253.jpeg?auto=compress&cs=tinysrgb&w=400&h=300", // Modern Kenyan hotel
        "https://images.pexels.com/photos/261169/pexels-photo-261169.jpeg?auto=compress&cs=tinysrgb&w=400&h=300", // Luxury resort
        "https://images.pexels.com/photos/261388/pexels-photo-261388.jpeg?auto=compress&cs=tinysrgb&w=400&h=300", // Boutique hotel
        "https://images.pexels.com/photos/297697/pexels-photo-297697.jpeg?auto=compress&cs=tinysrgb&w=400&h=300", // Tented camp
        "https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg?auto=compress&cs=tinysrgb&w=400&h=300", // Luxury suite with Kenyan decor
        "https://images.pexels.com/photos/338504/pexels-photo-338504.jpeg?auto=compress&cs=tinysrgb&w=400&h=300", // Eco-lodge
        "https://images.pexels.com/photos/97083/pexels-photo-97083.jpeg?auto=compress&cs=tinysrgb&w=400&h=300" // Lakeside cabin
      ],
      default: [
        "https://images.pexels.com/photos/346529/pexels-photo-346529.jpeg?auto=compress&cs=tinysrgb&w=400&h=300" // Generic Kenyan travel
      ]
    };

    const images = defaultImages[category] || defaultImages.default;
    if (category === "restaurant") {
      if (cleanName.includes("fish") || cleanName.includes("tilapia") || cleanName.includes("dunga")) return images[0];
      if (cleanName.includes("grill") || cleanName.includes("nyama")) return images[1];
      if (cleanName.includes("cafe") || cleanName.includes("coffee")) return images[4];
      if (cleanName.includes("outdoor") || cleanName.includes("terrace") || extraData?.diningStyle?.includes("lakeside")) return images[3];
    } else if (category === "attraction") {
      if (cleanName.includes("lake") || cleanName.includes("naivasha") || cleanName.includes("victoria")) return images[0];
      if (cleanName.includes("museum") || cleanName.includes("cultural")) return images[1];
      if (cleanName.includes("gorge") || cleanName.includes("rock") || cleanName.includes("hells gate")) return images[3];
      if (cleanName.includes("park") || cleanName.includes("sanctuary")) return images[2];
    } else if (category === "accommodation") {
      if (cleanName.includes("lodge") || cleanName.includes("camp") || cleanName.includes("fisherman")) return images[0];
      if (cleanName.includes("resort")) return images[2];
      if (cleanName.includes("boutique")) return images[3];
      if (cleanName.includes("hotel")) return images[1];
    }
    return images[seed % images.length];
  }

  // Fetch image from Pexels with relevance scoring
  private async fetchPexelsImage(keywords: string[], seed: number): Promise<string> {
    const query = keywords.join(" ");
    try {
      const params = new URLSearchParams({ query, per_page: '15', page: String((seed % 5) + 1) });
      const response = await fetch(`${PEXELS_BASE_URL}?${params}`, {
        headers: { Authorization: this.pexelsApiKey },
      });
      if (!response.ok) throw new Error(`Pexels API error: ${response.status}`);
      const data = await response.json();
      const photos = data.photos;
      if (photos && photos.length > 0) {
        // Score images by keyword relevance
        const scoredPhotos = photos.map((photo: any, index: number) => ({
          url: photo.src.medium,
          score: this.scoreImageRelevance(photo, keywords, index, seed)
        }));
        scoredPhotos.sort((a: any, b: any) => b.score - a.score);
        return scoredPhotos[0].url;
      }
      throw new Error("No photos found");
    } catch (error) {
      console.error(`Pexels API error for query "${query}":`, error);
      throw error;
    }
  }

  // Fetch image from Pixabay with relevance scoring
  private async fetchPixabayImage(keywords: string[], seed: number): Promise<string> {
    const query = keywords.join("+");
    try {
      const params = new URLSearchParams({ key: this.pixabayApiKey, q: query, per_page: '20', page: String((seed % 5) + 1) });
      const response = await fetch(`${PIXABAY_BASE_URL}?${params}`);
      if (!response.ok) throw new Error(`Pixabay API error: ${response.status}`);
      const data = await response.json();
      const hits = data.hits;
      if (hits && hits.length > 0) {
        // Score images by keyword relevance
        const scoredHits = hits.map((hit: any, index: number) => ({
          url: hit.webformatURL,
          score: this.scoreImageRelevance(hit, keywords, index, seed)
        }));
        scoredHits.sort((a: any, b: any) => b.score - a.score);
        return scoredHits[0].url;
      }
      throw new Error("No photos found");
    } catch (error) {
      console.error(`Pixabay API error for query "${query}":`, error);
      throw error;
    }
  }

  // Score image relevance based on keywords and metadata
  private scoreImageRelevance(image: any, keywords: string[], index: number, seed: number): number {
    let score = 0;
    const lowerKeywords = keywords.map(k => k.toLowerCase());
    
    // Check image metadata (Pexels: photographer, Pixabay: tags)
    const metadata = image.photographer?.toLowerCase() || image.tags?.join(" ").toLowerCase() || "";
    lowerKeywords.forEach(keyword => {
      if (metadata.includes(keyword)) {
        score += keyword.includes("kenya") || keyword.includes("nairobi") || keyword.includes("naivasha") || keyword.includes("kisumu") ? 30 : 10;
      }
    });

    // Prioritize images with "kenya" or location-specific tags
    if (metadata.includes("kenya")) score += 20;
    if (metadata.includes("africa")) score += 10;

    // Adjust score based on seed to maintain some randomness
    score += (seed % 5) - (index * 2);
    return score;
  }

  // Generate category-specific keywords with location prioritization
  private getCategoryKeywords(
    category: string,
    itemName: string,
    itemDescription: string,
    locationName: string,
    extraData?: any
  ): string[] {
    const cleanLocation = locationName.toLowerCase();
    const locationKeywords = this.locationKeywordMap[cleanLocation]?.[category] || [];
    let specificKeywords: string[] = [];

    switch (category) {
      case "restaurant":
        const cuisineStyle = extraData?.cuisineStyle || this.extractCuisineType(itemDescription);
        const signatureDish = extraData?.signatureDish || this.extractSignatureDish(itemDescription);
        specificKeywords = [signatureDish, cuisineStyle, ...locationKeywords];
        break;
      case "attraction":
        const attractionType = extraData?.attractionType || this.extractAttractionType(itemName, itemDescription);
        const mainFeature = extraData?.mainFeature || this.extractMainFeature(itemDescription);
        specificKeywords = [mainFeature, attractionType, ...locationKeywords];
        break;
      case "accommodation":
        const accommodationType = extraData?.accommodationType || this.extractAccommodationType(itemName, itemDescription);
        const uniqueFeature = extraData?.uniqueFeature || this.extractUniqueFeature(itemDescription);
        specificKeywords = [uniqueFeature, accommodationType, ...locationKeywords];
        break;
      default:
        specificKeywords = [...locationKeywords, "travel"];
    }

    // Prioritize specific keywords, then location, then generic
    return [...new Set([...specificKeywords, cleanLocation, "kenya", category])].filter(k => k);
  }

  // Generate alternative keywords for retry
  private getAlternativeKeywords(keywords: string[], locationName: string, category: string): string[] {
    const cleanLocation = locationName.toLowerCase();
    const locationKeywords = this.locationKeywordMap[cleanLocation]?.[category] || [];
    const fallbackKeywords = {
      restaurant: ['kenyan food', 'local cuisine', 'dining'],
      attraction: ['tourism', 'landmark', 'culture'],
      accommodation: ['hotel', 'lodge', 'stay']
    };
    return [...new Set([...locationKeywords, ...fallbackKeywords[category], cleanLocation, "kenya"])].filter(k => !keywords.includes(k));
  }

  // Helper methods for extracting details
  private extractCuisineType(description: string): string {
    const cuisineKeywords = {
      'kenyan': ['kenyan', 'african', 'local', 'traditional', 'ugali', 'nyama choma', 'tilapia', 'githeri', 'mukimo', 'kuku choma'],
      'seafood': ['seafood', 'fish', 'tilapia', 'prawns', 'marine'],
      'italian': ['italian', 'pizza', 'pasta', 'risotto'],
      'indian': ['indian', 'curry', 'tandoori', 'biryani', 'naan'],
      'cafe': ['cafe', 'coffee', 'bistro', 'breakfast', 'mandazi']
    };

    for (const [cuisine, keywords] of Object.entries(cuisineKeywords)) {
      if (keywords.some(keyword => description.toLowerCase().includes(keyword))) {
        return cuisine;
      }
    }
    return 'kenyan';
  }

  private extractSignatureDish(description: string): string {
    const dishes = ['tilapia', 'nyama choma', 'ugali', 'sukuma wiki', 'chapati', 'githeri', 'mukimo', 'kuku choma', 'pizza', 'pasta', 'curry', 'samosa', 'mandazi'];
    const found = dishes.find(dish => description.toLowerCase().includes(dish));
    return found || 'tilapia';
  }

  private extractDiningStyle(description: string): string {
    if (description.includes('lakeside') || description.includes('water') || description.includes('lake')) return 'lakeside dining';
    if (description.includes('rooftop')) return 'rooftop dining';
    if (description.includes('outdoor') || description.includes('garden') || description.includes('patio')) return 'outdoor dining';
    if (description.includes('cozy') || description.includes('intimate')) return 'cozy indoor dining';
    return 'lakeside dining';
  }

  private extractAttractionType(name: string, description: string): string {
    const combined = `${name} ${description}`.toLowerCase();
    
    if (combined.includes('lake') || combined.includes('victoria') || combined.includes('naivasha')) return 'natural lake';
    if (combined.includes('museum')) return 'museum';
    if (combined.includes('market')) return 'market';
    if (combined.includes('park') || combined.includes('sanctuary')) return 'nature park';
    if (combined.includes('gorge') || combined.includes('rock') || combined.includes('hells gate')) return 'geological formation';
    if (combined.includes('cultural') || combined.includes('luo') || combined.includes('maasai')) return 'cultural site';
    return 'natural lake';
  }

  private extractMainFeature(description: string): string {
    const features = ['flamingo', 'wildlife', 'artifacts', 'panoramic view', 'rock formation', 'cultural display', 'hippos', 'beadwork', 'fishing boats'];
    const found = features.find(feature => description.toLowerCase().includes(feature.split(' ')[0]));
    return found || 'wildlife';
  }

  private extractSetting(description: string): string {
    if (description.includes('rift valley') || description.includes('hells gate')) return 'rift valley setting';
    if (description.includes('colonial')) return 'colonial architecture';
    if (description.includes('lakefront') || description.includes('lake')) return 'lakefront location';
    return 'lakefront location';
  }

  private extractAccommodationType(name: string, description: string): string {
    const combined = `${name} ${description}`.toLowerCase();
    
    if (combined.includes('lodge')) return 'lodge';
    if (combined.includes('resort')) return 'resort';
    if (combined.includes('camp')) return 'camp';
    if (combined.includes('hotel')) return 'hotel';
    return 'lodge';
  }

  private extractArchitecture(description: string): string {
    if (description.includes('traditional') || description.includes('african') || description.includes('luo') || description.includes('maasai')) return 'traditional African architecture';
    if (description.includes('colonial')) return 'colonial style architecture';
    if (description.includes('modern')) return 'modern architecture';
    return 'traditional African architecture';
  }

  private extractUniqueFeature(description: string): string {
    if (description.includes('pool')) return 'swimming pool';
    if (description.includes('lake') || description.includes('waterfront')) return 'lake access';
    if (description.includes('garden')) return 'garden setting';
    if (description.includes('balcon')) return 'private balconies';
    return 'lake access';
  }

  // Utility methods
  private createConsistentSeed(key: string): string {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString();
  }

  private removeDuplicates(items: OpenAIRecommendation[]): OpenAIRecommendation[] {
    const seen = new Set();
    return items.filter((item) => {
      const key = item.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Mock data methods
  private getMockRecommendations(locationName: string): RecommendationsResponse {
    const mockRestaurants: OpenAIRecommendation[] = [
      {
        id: `${locationName}-rest-1`,
        name: `${locationName} Bistro`,
        description: `Popular local restaurant serving authentic Kenyan cuisine with tilapia and ugali in ${locationName}`,
        type: "restaurant",
        rating: 4.5,
        priceLevel: 2,
        address: `Main Street, ${locationName}`,
        imageUrl: "https://images.pexels.com/photos/1058277/pexels-photo-1058277.jpeg?auto=compress&cs=tinysrgb&w=400&h=300",
        tags: ["kenyan cuisine", "popular", "family-friendly", "tilapia"],
        openingHours: "9:00 AM - 10:00 PM",
        cuisineStyle: "Kenyan seafood",
        signatureDish: "grilled tilapia",
        diningStyle: "lakeside dining"
      },
      {
        id: `${locationName}-rest-2`,
        name: `Cafe ${locationName}`,
        description: `Cozy cafe with artisanal coffee and mandazi in ${locationName}`,
        type: "restaurant",
        rating: 4.2,
        priceLevel: 1,
        address: `Central Plaza, ${locationName}`,
        imageUrl: "https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg?auto=compress&cs=tinysrgb&w=400&h=300",
        tags: ["cafe", "coffee", "breakfast"],
        openingHours: "7:00 AM - 6:00 PM",
        cuisineStyle: "cafe",
        signatureDish: "mandazi",
        diningStyle: "cozy indoor dining"
      },
    ];

    const mockAttractions: OpenAIRecommendation[] = [
      {
        id: `${locationName}-attr-1`,
        name: `${locationName} Museum`,
        description: `Learn about the rich history and culture of ${locationName} with traditional Luo artifacts`,
        type: "attraction",
        rating: 4.7,
        address: `Museum District, ${locationName}`,
        imageUrl: "https://images.pexels.com/photos/2312904/pexels-photo-2312904.jpeg?auto=compress&cs=tinysrgb&w=400&h=300",
        tags: ["museum", "history", "culture"],
        openingHours: "9:00 AM - 5:00 PM",
        attractionType: "historical museum",
        mainFeature: "traditional artifacts",
        setting: "colonial architecture"
      },
      {
        id: `${locationName}-attr-2`,
        name: `${locationName} Park`,
        description: `Beautiful natural park perfect for relaxation and wildlife viewing`,
        type: "attraction",
        rating: 4.4,
        address: `Park Avenue, ${locationName}`,
        imageUrl: "https://images.pexels.com/photos/1320686/pexels-photo-1320686.jpeg?auto=compress&cs=tinysrgb&w=400&h=300",
        tags: ["nature", "outdoor", "family"],
        openingHours: "6:00 AM - 8:00 PM",
        attractionType: "nature park",
        mainFeature: "wildlife viewing",
        setting: "natural setting"
      },
    ];

    const mockAccommodations: OpenAIRecommendation[] = [
      {
        id: `${locationName}-hotel-1`,
        name: `${locationName} Grand Hotel`,
        description: `Luxury hotel with modern amenities and lake views in ${locationName}`,
        type: "accommodation",
        rating: 4.6,
        priceLevel: 3,
        address: `Downtown, ${locationName}`,
        imageUrl: "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=400&h=300",
        tags: ["luxury", "downtown", "lake-view"],
        website: "https://example.com",
        accommodationType: "hotel",
        architecture: "modern architecture",
        uniqueFeature: "infinity pool"
      },
    ];

    return {
      restaurants: mockRestaurants,
      attractions: mockAttractions,
      accommodations: mockAccommodations,
    };
  }

  private getMockRecommendationsForTrip(
    stops: Array<{ name: string }>
  ): RecommendationsResponse {
    const allMock = stops.map((stop) => this.getMockRecommendations(stop.name));

    return {
      restaurants: allMock.flatMap((m) => m.restaurants).slice(0, 12),
      attractions: allMock.flatMap((m) => m.attractions).slice(0, 12),
      accommodations: allMock.flatMap((m) => m.accommodations).slice(0, 8),
    };
  }

  // Weather-related methods
  async getWeatherForecastForTrip(
    stops: Array<{
      id: string;
      name: string;
      lat?: number;
      lng?: number;
    }>,
    startDate?: Date,
    endDate?: Date
  ): Promise<TripWeatherResponse> {
    if (!this.apiKey) {
      console.warn("OpenAI API key not available, returning mock weather data");
      return this.getMockWeatherForTrip(stops, startDate, endDate);
    }

    try {
      console.log(
        `🌤️ Fetching OpenAI weather forecasts for ${stops.length} stops`
      );

      const prompt = this.buildWeatherPrompt(stops, startDate, endDate);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are a weather expert providing realistic weather forecasts for travel planning. Always respond with valid JSON format and realistic weather data for the specified locations and dates.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 1500,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error("No weather content received from OpenAI");
      }

      const weatherData = JSON.parse(content);

      console.log(`✅ OpenAI weather forecasts fetched for trip:`, weatherData);
      return weatherData;
    } catch (error) {
      console.error(`❌ OpenAI weather API error:`, error);
      return this.getMockWeatherForTrip(stops, startDate, endDate);
    }
  }

  private buildWeatherPrompt(
    stops: Array<{ name: string; lat?: number; lng?: number }>,
    startDate?: Date,
    endDate?: Date
  ): string {
    const dateRange =
      startDate && endDate
        ? `from ${startDate.toDateString()} to ${endDate.toDateString()}`
        : "for the next 7 days";

    const stopsInfo = stops
      .map((stop) => {
        const coords =
          stop.lat && stop.lng ? ` (${stop.lat}, ${stop.lng})` : "";
        return `${stop.name}${coords}`;
      })
      .join(", ");

    return `
Please provide weather forecasts for a trip to these locations: ${stopsInfo} ${dateRange}.

Return the response as a JSON object with this exact structure:

{
  "forecasts": [
    {
      "id": "location-date-id",
      "locationName": "Location Name",
      "date": "2024-01-15",
      "temperature": {
        "high": 28,
        "low": 18,
        "current": 23
      },
      "condition": "Partly Cloudy",
      "description": "Pleasant weather with some clouds",
      "humidity": 65,
      "windSpeed": 12,
      "precipitation": 10,
      "icon": "partly-cloudy"
    }
  ],
  "tripDuration": 7,
  "averageTemp": 25,
  "dominantCondition": "Partly Cloudy"
}

Please provide realistic weather forecasts for each location. Use appropriate weather conditions for the geographic location and season. Include temperature in Celsius, wind speed in km/h, humidity as percentage, and precipitation chance as percentage.

Weather icons should be one of: "sunny", "partly-cloudy", "cloudy", "rainy", "stormy", "snowy", "foggy".

Make sure all JSON is valid and properly formatted.
    `.trim();
  }

  private getMockWeatherForTrip(
    stops: Array<{ name: string; lat?: number; lng?: number }>,
    startDate?: Date,
    endDate?: Date
  ): TripWeatherResponse {
    const weatherConditions = [
      "Sunny",
      "Partly Cloudy",
      "Cloudy",
      "Light Rain",
      "Clear",
    ];
    const weatherIcons = ["sunny", "partly-cloudy", "cloudy", "rainy", "sunny"];

    const forecasts: WeatherForecast[] = [];
    const tripDays =
      endDate && startDate
        ? Math.ceil(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 7;

    stops.forEach((stop, stopIndex) => {
      for (let day = 0; day < Math.min(tripDays, 7); day++) {
        const date = new Date();
        if (startDate) {
          date.setTime(startDate.getTime() + day * 24 * 60 * 60 * 1000);
        } else {
          date.setDate(date.getDate() + day);
        }

        const conditionIndex = (stopIndex + day) % weatherConditions.length;
        const baseTemp = 20 + stopIndex * 3 + Math.random() * 10;

        forecasts.push({
          id: `${stop.name}-${date.toISOString().split("T")[0]}`,
          locationName: stop.name,
          date: date.toISOString().split("T")[0],
          temperature: {
            high: Math.round(baseTemp + 5),
            low: Math.round(baseTemp - 5),
            current: Math.round(baseTemp),
          },
          condition: weatherConditions[conditionIndex],
          description: `${weatherConditions[conditionIndex]} weather expected in ${stop.name}`,
          humidity: 50 + Math.round(Math.random() * 30),
          windSpeed: 5 + Math.round(Math.random() * 15),
          precipitation: Math.round(Math.random() * 40),
          icon: weatherIcons[conditionIndex],
          lat: stop.lat,
          lng: stop.lng,
        });
      }
    });

    const averageTemp =
      forecasts.reduce((sum, f) => sum + f.temperature.current, 0) /
      forecasts.length;
    const dominantCondition =
      weatherConditions[Math.floor(Math.random() * weatherConditions.length)];

    return {
      forecasts,
      tripDuration: tripDays,
      averageTemp: Math.round(averageTemp),
      dominantCondition,
    };
  }

  async getRecommendationsForLocation(
    locationName: string,
    lat?: number,
    lng?: number
  ): Promise<RecommendationsResponse> {
    if (!this.apiKey) {
      console.warn("OpenAI API key not available, returning mock data");
      return this.getMockRecommendations(locationName);
    }

    try {
      console.log(`🤖 Fetching OpenAI recommendations for: ${locationName}`);

      const prompt = this.buildRecommendationPrompt(locationName, lat, lng);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are a travel expert providing detailed recommendations for travelers. Always respond with valid JSON format and include specific details about cuisine types, architectural styles, and unique features.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error("No content received from OpenAI");
      }

      const recommendations = JSON.parse(content);
      const processedRecommendations = await this.addImageUrls(
        recommendations,
        locationName
      );

      console.log(
        `✅ OpenAI recommendations fetched for ${locationName}:`,
        processedRecommendations
      );
      return processedRecommendations;
    } catch (error) {
      console.error(`❌ OpenAI API error for ${locationName}:`, error);
      return this.getMockRecommendations(locationName);
    }
  }

  async getRecommendationsForTrip(
    stops: Array<{
      id: string;
      name: string;
      lat?: number;
      lng?: number;
    }>
  ): Promise<{
    restaurants: OpenAIRecommendation[];
    attractions: OpenAIRecommendation[];
    accommodations: OpenAIRecommendation[];
  }> {
    console.log(`🗺️ Fetching recommendations for ${stops.length} stops`);

    try {
      const allRecommendations = await Promise.all(
        stops.map((stop) =>
          this.getRecommendationsForLocation(stop.name, stop.lat, stop.lng)
        )
      );

      const combined = {
        restaurants: [] as OpenAIRecommendation[],
        attractions: [] as OpenAIRecommendation[],
        accommodations: [] as OpenAIRecommendation[],
      };

      allRecommendations.forEach((rec, index) => {
        const stopName = stops[index].name;

        combined.restaurants.push(
          ...rec.restaurants.map((r) => ({
            ...r,
            id: `${stopName}-${r.id}`,
            tags: [...r.tags, `Near ${stopName}`],
          }))
        );

        combined.attractions.push(
          ...rec.attractions.map((a) => ({
            ...a,
            id: `${stopName}-${a.id}`,
            tags: [...a.tags, `Near ${stopName}`],
          }))
        );

        combined.accommodations.push(
          ...rec.accommodations.map((h) => ({
            ...h,
            id: `${stopName}-${h.id}`,
            tags: [...h.tags, `Near ${stopName}`],
          }))
        );
      });

      combined.restaurants = this.removeDuplicates(combined.restaurants).slice(0, 12);
      combined.attractions = this.removeDuplicates(combined.attractions).slice(0, 12);
      combined.accommodations = this.removeDuplicates(combined.accommodations).slice(0, 8);

      console.log(`✅ Combined recommendations:`, {
        restaurants: combined.restaurants.length,
        attractions: combined.attractions.length,
        accommodations: combined.accommodations.length,
      });

      return combined;
    } catch (error) {
      console.error("❌ Error fetching trip recommendations:", error);
      return this.getMockRecommendationsForTrip(stops);
    }
  }
}

export const openaiService = new OpenAIService();