import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export const useGeolocation = (requestOnMount = false) => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocation is not supported' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (error) => {
        setState({
          latitude: null,
          longitude: null,
          error: error.message,
          loading: false,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  }, []);

  useEffect(() => {
    if (requestOnMount) {
      requestLocation();
    }
  }, [requestOnMount, requestLocation]);

  return { ...state, requestLocation };
};

/**
 * Calculate distance between two points using Haversine formula
 * @returns distance in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg: number): number => deg * (Math.PI / 180);

/**
 * Parse coordinates from address string (simplified geocoding)
 * For Nigerian addresses, this uses approximate city coordinates
 */
export const getApproximateCoordinates = (address: string | null): { lat: number; lon: number } | null => {
  if (!address) return null;
  
  const addressLower = address.toLowerCase();
  
  // Nigerian cities with approximate coordinates
  const cities: Record<string, { lat: number; lon: number }> = {
    'lagos': { lat: 6.5244, lon: 3.3792 },
    'ikeja': { lat: 6.6018, lon: 3.3515 },
    'victoria island': { lat: 6.4281, lon: 3.4219 },
    'lekki': { lat: 6.4698, lon: 3.5852 },
    'ikoyi': { lat: 6.4549, lon: 3.4308 },
    'yaba': { lat: 6.5158, lon: 3.3782 },
    'surulere': { lat: 6.5054, lon: 3.3542 },
    'abuja': { lat: 9.0765, lon: 7.3986 },
    'port harcourt': { lat: 4.8156, lon: 7.0498 },
    'kano': { lat: 12.0022, lon: 8.5920 },
    'ibadan': { lat: 7.3775, lon: 3.9470 },
    'benin': { lat: 6.3350, lon: 5.6037 },
    'enugu': { lat: 6.4584, lon: 7.5464 },
    'onitsha': { lat: 6.1459, lon: 6.7852 },
    'aba': { lat: 5.1067, lon: 7.3667 },
    'jos': { lat: 9.8965, lon: 8.8583 },
    'warri': { lat: 5.5176, lon: 5.7500 },
    'kaduna': { lat: 10.5167, lon: 7.4333 },
    'calabar': { lat: 4.9500, lon: 8.3250 },
    'uyo': { lat: 5.0333, lon: 7.9333 },
  };
  
  for (const [city, coords] of Object.entries(cities)) {
    if (addressLower.includes(city)) {
      return coords;
    }
  }
  
  return null;
};
