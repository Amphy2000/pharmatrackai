/**
 * Utility to detect marketplace zone from coordinates or address text
 */

import { NIGERIAN_CITY_NEIGHBORHOODS, NeighborhoodCoordinates } from '@/data/kadunaNighborhoods';

/**
 * Calculate distance between two coordinates using Haversine formula
 */
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Detect city from coordinates
 */
export const detectCityFromCoordinates = (lat: number, lon: number): string | null => {
  // Define approximate bounding boxes for major cities
  const cityBounds: Record<string, { minLat: number; maxLat: number; minLon: number; maxLon: number }> = {
    kaduna: { minLat: 10.35, maxLat: 10.65, minLon: 7.30, maxLon: 7.55 },
    lagos: { minLat: 6.35, maxLat: 6.70, minLon: 3.15, maxLon: 3.65 },
    abuja: { minLat: 8.90, maxLat: 9.20, minLon: 7.25, maxLon: 7.60 },
    kano: { minLat: 11.90, maxLat: 12.10, minLon: 8.45, maxLon: 8.65 },
    'port-harcourt': { minLat: 4.75, maxLat: 4.90, minLon: 6.90, maxLon: 7.10 },
  };

  for (const [city, bounds] of Object.entries(cityBounds)) {
    if (lat >= bounds.minLat && lat <= bounds.maxLat && 
        lon >= bounds.minLon && lon <= bounds.maxLon) {
      return city;
    }
  }

  return null;
};

/**
 * Find the nearest neighborhood from coordinates
 */
export const findNearestNeighborhood = (
  lat: number, 
  lon: number, 
  city?: string
): { neighborhood: NeighborhoodCoordinates; distance: number } | null => {
  // Detect city if not provided
  const detectedCity = city || detectCityFromCoordinates(lat, lon) || 'kaduna';
  const neighborhoods = NIGERIAN_CITY_NEIGHBORHOODS[detectedCity] || NIGERIAN_CITY_NEIGHBORHOODS.kaduna;

  let nearest: NeighborhoodCoordinates | null = null;
  let minDistance = Infinity;

  for (const neighborhood of neighborhoods) {
    const distance = haversineDistance(lat, lon, neighborhood.lat, neighborhood.lon);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = neighborhood;
    }
  }

  if (nearest) {
    return { neighborhood: nearest, distance: minDistance };
  }

  return null;
};

/**
 * Detect zone from address text using fuzzy matching
 */
export const detectZoneFromAddressText = (address: string): {
  neighborhood: string;
  zone: string;
  city: string;
} | null => {
  const addressLower = address.toLowerCase();

  // Check each city's neighborhoods
  for (const [city, neighborhoods] of Object.entries(NIGERIAN_CITY_NEIGHBORHOODS)) {
    for (const neighborhood of neighborhoods) {
      const nameLower = neighborhood.name.toLowerCase();
      // Check if the neighborhood name appears in the address
      if (addressLower.includes(nameLower) || 
          // Also check for common variations
          addressLower.includes(nameLower.replace(/\s+/g, '')) ||
          addressLower.includes(nameLower.split(' ')[0])) {
        return {
          neighborhood: neighborhood.name,
          zone: neighborhood.zone,
          city: city,
        };
      }
    }
  }

  // Check for city names
  const cityKeywords: Record<string, string[]> = {
    kaduna: ['kaduna'],
    lagos: ['lagos', 'eko'],
    abuja: ['abuja', 'fct'],
    kano: ['kano'],
    'port-harcourt': ['port harcourt', 'port-harcourt', 'ph', 'rivers'],
  };

  for (const [city, keywords] of Object.entries(cityKeywords)) {
    for (const keyword of keywords) {
      if (addressLower.includes(keyword)) {
        // Return city-level match without specific neighborhood
        return {
          neighborhood: city.charAt(0).toUpperCase() + city.slice(1),
          zone: 'central',
          city: city,
        };
      }
    }
  }

  return null;
};

/**
 * Main function to detect marketplace zone from geocode data or address text
 */
export const detectMarketplaceZone = (params: {
  latitude?: number;
  longitude?: number;
  address: string;
  city?: string;
  state?: string;
}): {
  zone: string;
  neighborhood: string;
  city: string;
  confidence: 'high' | 'medium' | 'low';
} => {
  const { latitude, longitude, address, city, state } = params;

  // Try coordinates first (most accurate)
  if (latitude && longitude) {
    const detectedCity = detectCityFromCoordinates(latitude, longitude);
    const nearest = findNearestNeighborhood(latitude, longitude, detectedCity || undefined);
    
    if (nearest && nearest.distance < 10) { // Within 10km
      return {
        zone: nearest.neighborhood.name,
        neighborhood: nearest.neighborhood.name,
        city: detectedCity || city || 'unknown',
        confidence: nearest.distance < 3 ? 'high' : 'medium',
      };
    }
  }

  // Try address text matching
  const textMatch = detectZoneFromAddressText(address);
  if (textMatch) {
    return {
      zone: textMatch.neighborhood,
      neighborhood: textMatch.neighborhood,
      city: textMatch.city,
      confidence: 'medium',
    };
  }

  // Fall back to city/state if available
  if (city) {
    return {
      zone: city,
      neighborhood: city,
      city: city.toLowerCase(),
      confidence: 'low',
    };
  }

  if (state) {
    return {
      zone: state,
      neighborhood: state,
      city: state.toLowerCase(),
      confidence: 'low',
    };
  }

  // Last resort - extract from address
  const addressParts = address.split(',').map(p => p.trim());
  const lastPart = addressParts[addressParts.length - 1] || address;
  
  return {
    zone: lastPart,
    neighborhood: lastPart,
    city: 'unknown',
    confidence: 'low',
  };
};
