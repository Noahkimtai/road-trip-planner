import React, { useState, useEffect, useRef } from "react";
import { Search, X, MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SearchResult } from "@/types/trip";

interface SearchAutocompleteProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  onResultSelect: (result: SearchResult) => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  className?: string;
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  placeholder = "Search for a destination",
  onSearch,
  onResultSelect,
  searchResults,
  isSearching,
  className = "",
}) => {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length > 2) {
        onSearch(query.trim());
        setShowResults(true);
      } else {
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showResults || searchResults.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < searchResults.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : searchResults.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
            handleResultSelect(searchResults[selectedIndex]);
          }
          break;
        case "Escape":
          setShowResults(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showResults, searchResults, selectedIndex]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleResultSelect = (result: SearchResult) => {
    setQuery(result.name);
    setShowResults(false);
    setSelectedIndex(-1);
    onResultSelect(result);
  };

  const clearSearch = () => {
    setQuery("");
    setShowResults(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className="pl-9 pr-8"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length > 2 && searchResults.length > 0) {
              setShowResults(true);
            }
          }}
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {isSearching && (
          <div className="absolute right-8 top-2.5">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-hidden">
          <CardContent className="p-0">
            {isSearching ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <div
                    key={result.id}
                    className={`p-3 cursor-pointer border-b last:border-b-0 transition-colors ${
                      index === selectedIndex
                        ? "bg-accent"
                        : "hover:bg-accent/50"
                    }`}
                    onClick={() => handleResultSelect(result)}
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {result.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.address}
                        </p>
                        {result.categories && result.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {result.categories.slice(0, 2).map((category) => (
                              <span
                                key={category}
                                className="text-xs bg-secondary px-1.5 py-0.5 rounded"
                              >
                                {category}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : query.trim().length > 2 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No results found for "{query}"
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
};