import { useState, useEffect, useCallback } from 'react';
import { KADUNA_NEIGHBORHOODS, NeighborhoodCoordinates } from '@/data/kadunaNighborhoods';
import { calculateDistance } from '@/hooks/useGeolocation';

const MANUAL_LOCATION_KEY = 'pharmatrack_manual_location';
const MANUAL_LOCATION_EXPIRY_KEY = 'pharmatrack_manual_location_expiry';
const EXPIRY_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface LocationOverrideState {
  /** The currently active neighborhood name (manual or auto-detected) */
  activeNeighborhood: string | null;
  /** Whether the user has manually selected a location */
  isManualSelection: boolean;
  /** Loading state for auto-detection */
  isDetecting: boolean;
  /** Error message if detection fails */
  error: string | null;
}

interface UseLocationOverrideReturn extends LocationOverrideState {
  /** Select a neighborhood manually (persists to localStorage) */
  selectNeighborhood: (name: string) => void;
  /** Clear manual selection and use GPS again */
  clearManualSelection: () => void;
  /** Get the coordinates for the active neighborhood */
  getActiveCoordinates: () => { lat: number; lon: number } | null;
  /** Snap GPS coordinates to the nearest known neighborhood */
  snapToNeighborhood: (lat: number, lon: number) => string | null;
  /** Refresh auto-detection */
  refreshDetection: (lat: number, lon: number) => void;
}

/**
 * Get saved manual location from localStorage
 */
const getSavedManualLocation = (): string | null => {
  try {
    const expiry = localStorage.getItem(MANUAL_LOCATION_EXPIRY_KEY);
    if (expiry && Date.now() > parseInt(expiry, 10)) {
      // Expired, clear it
      localStorage.removeItem(MANUAL_LOCATION_KEY);
      localStorage.removeItem(MANUAL_LOCATION_EXPIRY_KEY);
      return null;
    }
    return localStorage.getItem(MANUAL_LOCATION_KEY);
  } catch {
    return null;
  }
};

/**
 * Save manual location to localStorage with expiry
 */
const saveManualLocation = (neighborhood: string): void => {
  try {
    localStorage.setItem(MANUAL_LOCATION_KEY, neighborhood);
    localStorage.setItem(MANUAL_LOCATION_EXPIRY_KEY, String(Date.now() + EXPIRY_DURATION));
  } catch {
    // Ignore storage errors
  }
};

/**
 * Clear manual location from localStorage
 */
const clearSavedManualLocation = (): void => {
  try {
    localStorage.removeItem(MANUAL_LOCATION_KEY);
    localStorage.removeItem(MANUAL_LOCATION_EXPIRY_KEY);
  } catch {
    // Ignore storage errors
  }
};

/**
 * Find the closest neighborhood to given coordinates
 */
const findClosestNeighborhood = (
  lat: number,
  lon: number,
  neighborhoods: NeighborhoodCoordinates[] = KADUNA_NEIGHBORHOODS
): { name: string; distance: number } | null => {
  let closest: { name: string; distance: number } | null = null;

  for (const hood of neighborhoods) {
    const dist = calculateDistance(lat, lon, hood.lat, hood.lon);
    if (!closest || dist < closest.distance) {
      closest = { name: hood.name, distance: dist };
    }
  }

  // Only return if within 50km of a known neighborhood
  if (closest && closest.distance <= 50) {
    return closest;
  }

  return null;
};

/**
 * Hook to manage location override (manual selection vs GPS snapping)
 */
export const useLocationOverride = (
  gpsLat: number | null,
  gpsLon: number | null,
  gpsLoading: boolean
): UseLocationOverrideReturn => {
  const [state, setState] = useState<LocationOverrideState>(() => {
    const savedManual = getSavedManualLocation();
    return {
      activeNeighborhood: savedManual,
      isManualSelection: !!savedManual,
      isDetecting: false,
      error: null,
    };
  });

  // Auto-detect neighborhood from GPS when coordinates change
  useEffect(() => {
    // Skip if user has manual selection
    if (state.isManualSelection) return;

    if (gpsLoading) {
      setState(prev => ({ ...prev, isDetecting: true }));
      return;
    }

    if (gpsLat && gpsLon) {
      const closest = findClosestNeighborhood(gpsLat, gpsLon);
      setState(prev => ({
        ...prev,
        activeNeighborhood: closest?.name || null,
        isDetecting: false,
        error: closest ? null : 'Could not determine your neighborhood',
      }));
    } else {
      setState(prev => ({
        ...prev,
        activeNeighborhood: null,
        isDetecting: false,
      }));
    }
  }, [gpsLat, gpsLon, gpsLoading, state.isManualSelection]);

  const selectNeighborhood = useCallback((name: string) => {
    saveManualLocation(name);
    setState({
      activeNeighborhood: name,
      isManualSelection: true,
      isDetecting: false,
      error: null,
    });
  }, []);

  const clearManualSelection = useCallback(() => {
    clearSavedManualLocation();
    setState(prev => ({
      ...prev,
      isManualSelection: false,
      isDetecting: gpsLoading,
    }));
  }, [gpsLoading]);

  const getActiveCoordinates = useCallback((): { lat: number; lon: number } | null => {
    if (!state.activeNeighborhood) return null;
    
    const hood = KADUNA_NEIGHBORHOODS.find(n => n.name === state.activeNeighborhood);
    if (hood) {
      return { lat: hood.lat, lon: hood.lon };
    }
    return null;
  }, [state.activeNeighborhood]);

  const snapToNeighborhood = useCallback((lat: number, lon: number): string | null => {
    const closest = findClosestNeighborhood(lat, lon);
    return closest?.name || null;
  }, []);

  const refreshDetection = useCallback((lat: number, lon: number) => {
    if (state.isManualSelection) return;
    
    const closest = findClosestNeighborhood(lat, lon);
    setState(prev => ({
      ...prev,
      activeNeighborhood: closest?.name || null,
      isDetecting: false,
    }));
  }, [state.isManualSelection]);

  return {
    ...state,
    selectNeighborhood,
    clearManualSelection,
    getActiveCoordinates,
    snapToNeighborhood,
    refreshDetection,
  };
};
