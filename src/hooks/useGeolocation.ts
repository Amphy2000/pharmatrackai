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
 * For Nigerian addresses, this uses approximate city/area coordinates
 */
export const getApproximateCoordinates = (address: string | null): { lat: number; lon: number } | null => {
  if (!address) return null;
  
  const addressLower = address.toLowerCase();
  
  // Nigerian cities and areas with approximate coordinates
  const locations: Record<string, { lat: number; lon: number }> = {
    // Lagos State - Major Areas
    'lagos': { lat: 6.5244, lon: 3.3792 },
    'ikeja': { lat: 6.6018, lon: 3.3515 },
    'victoria island': { lat: 6.4281, lon: 3.4219 },
    'vi': { lat: 6.4281, lon: 3.4219 },
    'lekki': { lat: 6.4698, lon: 3.5852 },
    'ikoyi': { lat: 6.4549, lon: 3.4308 },
    'yaba': { lat: 6.5158, lon: 3.3782 },
    'surulere': { lat: 6.5054, lon: 3.3542 },
    'maryland': { lat: 6.5722, lon: 3.3636 },
    'ojodu': { lat: 6.6333, lon: 3.3667 },
    'berger': { lat: 6.6167, lon: 3.3500 },
    'agege': { lat: 6.6167, lon: 3.3167 },
    'ogba': { lat: 6.6333, lon: 3.3333 },
    'oshodi': { lat: 6.5500, lon: 3.3500 },
    'festac': { lat: 6.4667, lon: 3.2833 },
    'apapa': { lat: 6.4500, lon: 3.3667 },
    'ajah': { lat: 6.4667, lon: 3.5667 },
    'ikorodu': { lat: 6.6194, lon: 3.5105 },
    'badagry': { lat: 6.4167, lon: 2.8833 },
    'epe': { lat: 6.5833, lon: 3.9833 },
    'mushin': { lat: 6.5333, lon: 3.3500 },
    'isolo': { lat: 6.5167, lon: 3.3333 },
    'egbeda': { lat: 6.5833, lon: 3.3167 },
    'alimosho': { lat: 6.6167, lon: 3.2833 },
    'gbagada': { lat: 6.5500, lon: 3.4000 },
    'magodo': { lat: 6.6167, lon: 3.4167 },
    'ogudu': { lat: 6.5833, lon: 3.4000 },
    'kosofe': { lat: 6.6000, lon: 3.4333 },
    'anthony': { lat: 6.5667, lon: 3.3667 },
    
    // Abuja FCT
    'abuja': { lat: 9.0765, lon: 7.3986 },
    'garki': { lat: 9.0333, lon: 7.4833 },
    'wuse': { lat: 9.0833, lon: 7.4667 },
    'maitama': { lat: 9.1000, lon: 7.5000 },
    'asokoro': { lat: 9.0333, lon: 7.5333 },
    'gwarinpa': { lat: 9.1167, lon: 7.4000 },
    'kubwa': { lat: 9.1500, lon: 7.3500 },
    'nyanya': { lat: 8.9667, lon: 7.5167 },
    'karu': { lat: 8.9833, lon: 7.5500 },
    'lugbe': { lat: 8.9667, lon: 7.3833 },
    'jabi': { lat: 9.0667, lon: 7.4333 },
    'utako': { lat: 9.0833, lon: 7.4333 },
    
    // Other Major Cities
    'port harcourt': { lat: 4.8156, lon: 7.0498 },
    'ph': { lat: 4.8156, lon: 7.0498 },
    'kano': { lat: 12.0022, lon: 8.5920 },
    'ibadan': { lat: 7.3775, lon: 3.9470 },
    'benin': { lat: 6.3350, lon: 5.6037 },
    'benin city': { lat: 6.3350, lon: 5.6037 },
    'enugu': { lat: 6.4584, lon: 7.5464 },
    'onitsha': { lat: 6.1459, lon: 6.7852 },
    'aba': { lat: 5.1067, lon: 7.3667 },
    'jos': { lat: 9.8965, lon: 8.8583 },
    'warri': { lat: 5.5176, lon: 5.7500 },
    'kaduna': { lat: 10.5167, lon: 7.4333 },
    'calabar': { lat: 4.9500, lon: 8.3250 },
    'uyo': { lat: 5.0333, lon: 7.9333 },
    'owerri': { lat: 5.4833, lon: 7.0333 },
    'abeokuta': { lat: 7.1500, lon: 3.3500 },
    'ilorin': { lat: 8.5000, lon: 4.5500 },
    'akure': { lat: 7.2500, lon: 5.1950 },
    'ado ekiti': { lat: 7.6167, lon: 5.2167 },
    'osogbo': { lat: 7.7667, lon: 4.5667 },
    'sokoto': { lat: 13.0622, lon: 5.2339 },
    'maiduguri': { lat: 11.8333, lon: 13.1500 },
    'makurdi': { lat: 7.7333, lon: 8.5333 },
    'lokoja': { lat: 7.8000, lon: 6.7333 },
    'lafia': { lat: 8.4833, lon: 8.5167 },
    'minna': { lat: 9.6139, lon: 6.5569 },
    'bauchi': { lat: 10.3100, lon: 9.8433 },
    'gombe': { lat: 10.2833, lon: 11.1667 },
    'yola': { lat: 9.2000, lon: 12.4833 },
    'jalingo': { lat: 8.9000, lon: 11.3667 },
    'damaturu': { lat: 11.7500, lon: 11.9667 },
    'birnin kebbi': { lat: 12.4500, lon: 4.2000 },
    'gusau': { lat: 12.1667, lon: 6.6667 },
    'dutse': { lat: 11.7000, lon: 9.3333 },
    'awka': { lat: 6.2167, lon: 7.0667 },
    'asaba': { lat: 6.2000, lon: 6.7333 },
    'abakaliki': { lat: 6.3333, lon: 8.1000 },
    'umuahia': { lat: 5.5333, lon: 7.4833 },
    'eket': { lat: 4.6500, lon: 7.9333 },
    
    // Niger State - Adding Patigi area
    'patigi': { lat: 8.7167, lon: 5.7500 },
    'bida': { lat: 9.0833, lon: 6.0167 },
    'kontagora': { lat: 10.4000, lon: 5.4667 },
    'suleja': { lat: 9.1833, lon: 7.1833 },
    'new bussa': { lat: 9.8833, lon: 4.5167 },
  };
  
  // Check for exact matches first (more specific areas)
  for (const [location, coords] of Object.entries(locations)) {
    if (addressLower.includes(location)) {
      return coords;
    }
  }
  
  return null;
};
