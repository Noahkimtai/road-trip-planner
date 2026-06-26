import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  MapPin,
  Clock,
  Star,
  DollarSign,
  Utensils,
  Camera,
  Bed,
  Loader2,
  Navigation,
  Phone,
  Globe,
  Plus,
} from "lucide-react";
import { Recommendation } from "@/types/trip";

interface RecommendationsPanelProps {
  recommendations?: {
    restaurants: Recommendation[];
    attractions: Recommendation[];
    accommodations: Recommendation[];
  };
  isLoading?: boolean;
  onAddToTrip?: (recommendation: Recommendation) => void;
}

export const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
  recommendations = {
    restaurants: [],
    attractions: [],
    accommodations: [],
  },
  isLoading = false,
  onAddToTrip,
}) => {
  const [activeTab, setActiveTab] = useState("restaurants");

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${
          i < Math.floor(rating)
            ? "fill-yellow-400 text-yellow-400"
            : i < rating
            ? "fill-yellow-200 text-yellow-200"
            : "text-gray-300"
        }`}
      />
    ));
  };

  const renderPriceLevel = (level?: number) => {
    if (!level) return null;
    return Array.from({ length: 4 }, (_, i) => (
      <DollarSign
        key={i}
        className={`h-3 w-3 ${i < level ? "text-green-600" : "text-gray-300"}`}
      />
    ));
  };

  const getTabIcon = (type: string) => {
    switch (type) {
      case "restaurants":
        return <Utensils className="h-4 w-4" />;
      case "attractions":
        return <Camera className="h-4 w-4" />;
      case "accommodations":
        return <Bed className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const renderRecommendationCard = (recommendation: Recommendation) => (
    <Card key={recommendation.id} className="mb-4 hover:shadow-lg transition-all duration-200 border-0 shadow-sm">
      <CardContent className="p-0">
        {/* Image */}
        <div className="relative w-full h-32 overflow-hidden rounded-t-lg">
          <img
            src={recommendation.imageUrl}
            alt={recommendation.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              e.currentTarget.src = `https://picsum.photos/300/200?random=${recommendation.id}`;
            }}
          />
          <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs flex items-center">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
            {recommendation.rating?.toFixed(1) || "4.0"}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-sm leading-tight pr-2">
              {recommendation.name}
            </h3>
            {recommendation.priceLevel && (
              <div className="flex text-green-600">
                {Array.from({ length: recommendation.priceLevel }, (_, i) => (
                  <DollarSign key={i} className="h-3 w-3" />
                ))}
              </div>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
            {recommendation.description}
          </p>
          
          {/* Address */}
          {recommendation.address && (
            <div className="flex items-center text-xs text-muted-foreground mb-2">
              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate">{recommendation.address}</span>
            </div>
          )}
          
          {/* Contact Info */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            {recommendation.openingHours && (
              <div className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                <span>{recommendation.openingHours}</span>
              </div>
            )}
            {recommendation.phone && (
              <div className="flex items-center">
                <Phone className="h-3 w-3 mr-1" />
                <span>{recommendation.phone}</span>
              </div>
            )}
          </div>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-1 mb-3">
            {recommendation.tags?.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5">
                {tag}
              </Badge>
            ))}
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {recommendation.website && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => window.open(recommendation.website, '_blank')}
                >
                  <Globe className="h-3 w-3 mr-1" />
                  Visit
                </Button>
              )}
            </div>
            <Button
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => onAddToTrip?.(recommendation)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add to Trip
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Check if we have any recommendations
  const hasRecommendations = recommendations.restaurants.length > 0 || 
                            recommendations.attractions.length > 0 || 
                            recommendations.accommodations.length > 0;

  if (!hasRecommendations && !isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No recommendations available
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Select a trip with stops to see AI-powered recommendations for restaurants, attractions, and accommodations
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-2">Recommendations</h2>
        <p className="text-sm text-muted-foreground">
          Check out these places during your trip
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="h-full flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
            <TabsTrigger
              value="restaurants"
              className="flex items-center gap-2"
            >
              {getTabIcon("restaurants")}
              <span className="hidden sm:inline">Food</span>
            </TabsTrigger>
            <TabsTrigger
              value="attractions"
              className="flex items-center gap-2"
            >
              {getTabIcon("attractions")}
              <span className="hidden sm:inline">Attractions</span>
            </TabsTrigger>
            <TabsTrigger
              value="accommodations"
              className="flex items-center gap-2"
            >
              {getTabIcon("accommodations")}
              <span className="hidden sm:inline">Stay</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Finding recommendations...</span>
              </div>
            ) : (
              <>
                <TabsContent value="restaurants" className="mt-0">
                  <div className="space-y-0">
                    {recommendations.restaurants.length > 0 ? (
                      recommendations.restaurants.map(renderRecommendationCard)
                    ) : (
                      <div className="text-center py-8">
                        <Utensils className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          No restaurants found nearby
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="attractions" className="mt-0">
                  <div className="space-y-0">
                    {recommendations.attractions.length > 0 ? (
                      recommendations.attractions.map(renderRecommendationCard)
                    ) : (
                      <div className="text-center py-8">
                        <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          No attractions found nearby
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="accommodations" className="mt-0">
                  <div className="space-y-0">
                    {recommendations.accommodations.length > 0 ? (
                      recommendations.accommodations.map(
                        renderRecommendationCard
                      )
                    ) : (
                      <div className="text-center py-8">
                        <Bed className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          No accommodations found nearby
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default RecommendationsPanel;
