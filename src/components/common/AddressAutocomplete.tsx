import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2, Check } from 'lucide-react';
import { useGooglePlacesAutocomplete } from '@/hooks/useGooglePlacesAutocomplete';
import { cn } from '@/lib/utils';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, geocodeData?: {
    latitude: number;
    longitude: number;
    formatted_address: string;
    city?: string;
    state?: string;
    country?: string;
  }) => void;
  placeholder?: string;
  countryCode?: string;
  className?: string;
  disabled?: boolean;
}

export const AddressAutocomplete = ({
  value,
  onChange,
  placeholder = 'Enter pharmacy address...',
  countryCode,
  className,
  disabled,
}: AddressAutocompleteProps) => {
  const [inputValue, setInputValue] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isGeocoded, setIsGeocoded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const {
    predictions,
    isLoading,
    searchPlaces,
    geocodePlace,
    geocodeAddress,
    clearPredictions,
    isGoogleLoaded,
  } = useGooglePlacesAutocomplete();

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsGeocoded(false);
    onChange(newValue);

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (newValue.length >= 3) {
        searchPlaces(newValue, countryCode);
        setShowDropdown(true);
      } else {
        clearPredictions();
        setShowDropdown(false);
      }
    }, 300);
  };

  const handleSelectPrediction = async (prediction: typeof predictions[0]) => {
    setInputValue(prediction.description);
    setShowDropdown(false);
    clearPredictions();

    const geocodeData = await geocodePlace(prediction.place_id);
    if (geocodeData) {
      setIsGeocoded(true);
      onChange(geocodeData.formatted_address, {
        latitude: geocodeData.latitude,
        longitude: geocodeData.longitude,
        formatted_address: geocodeData.formatted_address,
        city: geocodeData.address_components.city,
        state: geocodeData.address_components.state,
        country: geocodeData.address_components.country,
      });
    }
  };

  const handleBlur = async () => {
    // If user typed an address but didn't select from dropdown, try to geocode it
    if (inputValue && !isGeocoded && inputValue.length >= 5) {
      const geocodeData = await geocodeAddress(inputValue);
      if (geocodeData) {
        setIsGeocoded(true);
        setInputValue(geocodeData.formatted_address);
        onChange(geocodeData.formatted_address, {
          latitude: geocodeData.latitude,
          longitude: geocodeData.longitude,
          formatted_address: geocodeData.formatted_address,
          city: geocodeData.address_components.city,
          state: geocodeData.address_components.state,
          country: geocodeData.address_components.country,
        });
      }
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={() => predictions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className={cn('pl-10 pr-10', className)}
          disabled={disabled}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : isGeocoded ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : null}
        </div>
      </div>

      {/* Predictions Dropdown */}
      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelectPrediction(prediction)}
              className="w-full px-3 py-2.5 text-left hover:bg-muted transition-colors flex items-start gap-2 border-b last:border-b-0"
            >
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {prediction.structured_formatting.main_text}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {prediction.structured_formatting.secondary_text}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Fallback note if Google not loaded */}
      {!isGoogleLoaded && inputValue.length >= 3 && (
        <p className="text-xs text-muted-foreground mt-1">
          Address autocomplete unavailable. Enter your full address.
        </p>
      )}
    </div>
  );
};
