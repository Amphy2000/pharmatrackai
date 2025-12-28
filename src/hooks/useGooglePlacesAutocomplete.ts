import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          AutocompleteService: new () => GoogleAutocompleteService;
          AutocompleteSessionToken: new () => GoogleSessionToken;
          PlacesServiceStatus: {
            OK: string;
          };
        };
      };
    };
  }
}

interface GoogleSessionToken {}

interface GoogleAutocompleteService {
  getPlacePredictions: (
    request: GoogleAutocompleteRequest,
    callback: (results: GooglePrediction[] | null, status: string) => void
  ) => void;
}

interface GoogleAutocompleteRequest {
  input: string;
  sessionToken: GoogleSessionToken;
  types?: string[];
  componentRestrictions?: { country: string };
}

interface GooglePrediction {
  place_id?: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface GeocodeResult {
  formatted_address: string;
  latitude: number;
  longitude: number;
  place_id: string;
  address_components: {
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    street?: string;
    street_number?: string;
  };
}

export const useGooglePlacesAutocomplete = () => {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<GeocodeResult | null>(null);
  const autocompleteService = useRef<GoogleAutocompleteService | null>(null);
  const sessionToken = useRef<GoogleSessionToken | null>(null);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

  // Check if Google Maps is loaded
  useEffect(() => {
    const checkGoogleLoaded = () => {
      if (window.google?.maps?.places) {
        setIsGoogleLoaded(true);
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
      }
    };

    // Check immediately
    checkGoogleLoaded();

    // If not loaded, check periodically
    const interval = setInterval(() => {
      if (window.google?.maps?.places) {
        checkGoogleLoaded();
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const searchPlaces = useCallback(async (input: string, countryCode?: string) => {
    if (!input || input.length < 3) {
      setPredictions([]);
      return;
    }

    // If Google Maps JS is loaded, use it for autocomplete
    if (isGoogleLoaded && autocompleteService.current && window.google?.maps?.places) {
      try {
        const request: GoogleAutocompleteRequest = {
          input,
          sessionToken: sessionToken.current!,
          types: ['address'],
        };

        if (countryCode) {
          request.componentRestrictions = { country: countryCode };
        }

        autocompleteService.current.getPlacePredictions(request, (results, status) => {
          if (status === window.google?.maps?.places?.PlacesServiceStatus.OK && results) {
            setPredictions(results.map(r => ({
              place_id: r.place_id || '',
              description: r.description,
              structured_formatting: {
                main_text: r.structured_formatting?.main_text || '',
                secondary_text: r.structured_formatting?.secondary_text || '',
              },
            })));
          } else {
            setPredictions([]);
          }
        });
      } catch (error) {
        console.error('Places autocomplete error:', error);
        setPredictions([]);
      }
    } else {
      // Fallback: no autocomplete without Google Maps JS
      setPredictions([]);
    }
  }, [isGoogleLoaded]);

  const geocodePlace = useCallback(async (placeId: string): Promise<GeocodeResult | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: { placeId },
      });

      if (error) throw error;

      setSelectedPlace(data);
      // Reset session token after place selection
      if (isGoogleLoaded && window.google?.maps?.places) {
        sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
      }
      setPredictions([]);
      return data;
    } catch (error) {
      console.error('Geocode error:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isGoogleLoaded]);

  const geocodeAddress = useCallback(async (address: string): Promise<GeocodeResult | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: { address },
      });

      if (error) throw error;

      setSelectedPlace(data);
      return data;
    } catch (error) {
      console.error('Geocode error:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearPredictions = useCallback(() => {
    setPredictions([]);
  }, []);

  return {
    predictions,
    isLoading,
    selectedPlace,
    searchPlaces,
    geocodePlace,
    geocodeAddress,
    clearPredictions,
    isGoogleLoaded,
  };
};
