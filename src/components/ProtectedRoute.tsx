import { ReactNode, useEffect, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, WifiOff } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradePrompt } from '@/components/subscription';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PharmacySelector } from '@/components/pharmacy/PharmacySelector';
import { clearSelectedPharmacyId, getSelectedPharmacyId, setSelectedPharmacyId } from '@/hooks/useSelectedPharmacy';

interface ProtectedRouteProps {
  children: ReactNode;
  requireSubscription?: boolean;
}

const CACHE_KEY = 'pharmatrack_pharmacy_staff';
const PHARMACY_SELECTOR_SHOWN_KEY = 'pharmatrack_pharmacy_selector_shown';

interface CachedPharmacyStaff {
  id: string;
  pharmacyId: string;
  role: string;
  cachedAt: number;
}

export const ProtectedRoute = ({ children, requireSubscription = true }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const [hasPharmacy, setHasPharmacy] = useState<boolean | null>(null);
  const [checkingPharmacy, setCheckingPharmacy] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineError, setOfflineError] = useState(false);
  const [showPharmacySelector, setShowPharmacySelector] = useState(false);
  const [pharmacyCount, setPharmacyCount] = useState(0);
  const [pharmacyList, setPharmacyList] = useState<Array<{ id: string; pharmacy_id: string; role: string }>>([]);
  const { canAccessFeatures, isLoading: isLoadingSubscription } = useSubscription();

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setOfflineError(false);
      // Re-check pharmacy when coming back online
      if (user) {
        checkPharmacyData();
      }
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  // Cache pharmacy data
  const cachePharmacyData = useCallback((data: CachedPharmacyStaff) => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  }, []);

  // Get cached pharmacy data
  const getCachedPharmacyData = useCallback((): CachedPharmacyStaff | null => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    try {
      const parsed = JSON.parse(cached) as CachedPharmacyStaff;
      // Cache is valid for 7 days
      if (Date.now() - parsed.cachedAt < 7 * 24 * 60 * 60 * 1000) {
        return parsed;
      }
    } catch {
      // Invalid cache
    }
    return null;
  }, []);

  const checkPharmacyData = useCallback(async () => {
    if (!user) {
      setCheckingPharmacy(false);
      return;
    }

    // First, try to use cached data if offline
    if (!navigator.onLine) {
      const cachedData = getCachedPharmacyData();
      if (cachedData) {
        setHasPharmacy(true);
        setCheckingPharmacy(false);
        return;
      }
    }

    try {
      // Get ALL pharmacy_staff records for this user to check if they have multiple
      const { data, error } = await supabase
        .from('pharmacy_staff')
        .select('id, pharmacy_id, role, is_active')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        // If network error, try to use cached data
        if (error.message?.includes('Failed to fetch') || !navigator.onLine) {
          const cachedData = getCachedPharmacyData();
          if (cachedData) {
            setHasPharmacy(true);
            setOfflineError(false);
            toast({
              title: 'Offline Mode',
              description: 'Using cached data. Some features may be limited.',
            });
          } else {
            setOfflineError(true);
            setHasPharmacy(null);
          }
          setCheckingPharmacy(false);
          return;
        }
        throw error;
      }

      if (data && data.length > 0) {
        setPharmacyCount(data.length);
        setPharmacyList(data);

        // Check if user has a previously selected pharmacy
        const selectedPharmacyId = getSelectedPharmacyId();
        const matchingStaff = selectedPharmacyId 
          ? data.find(s => s.pharmacy_id === selectedPharmacyId)
          : null;

        // Check if we've shown the selector this session
        const selectorShownThisSession = sessionStorage.getItem(PHARMACY_SELECTOR_SHOWN_KEY);

        // If multiple pharmacies and either no valid selection OR haven't shown selector this session
        if (data.length > 1 && (!matchingStaff || !selectorShownThisSession)) {
          setShowPharmacySelector(true);
          setCheckingPharmacy(false);
          return;
        }

        // Use the matching staff or the first one
        const staffRow = matchingStaff || data[0];
        
        // Cache the selected pharmacy
        cachePharmacyData({
          id: staffRow.id,
          pharmacyId: staffRow.pharmacy_id,
          role: staffRow.role,
          cachedAt: Date.now(),
        });
        setSelectedPharmacyId(staffRow.pharmacy_id);
        setHasPharmacy(true);
      } else {
        // Clear any stale cache if user truly has no pharmacy
        localStorage.removeItem(CACHE_KEY);
        clearSelectedPharmacyId();
        setHasPharmacy(false);
      }
      setOfflineError(false);
    } catch (error) {
      console.error('Error checking pharmacy:', error);
      
      // On error, try cached data
      const cachedData = getCachedPharmacyData();
      if (cachedData) {
        setHasPharmacy(true);
        setOfflineError(false);
      } else if (!navigator.onLine) {
        setOfflineError(true);
        setHasPharmacy(null);
      } else {
        setHasPharmacy(false);
      }
    } finally {
      setCheckingPharmacy(false);
    }
  }, [user, getCachedPharmacyData, cachePharmacyData, toast]);

  useEffect(() => {
    checkPharmacyData();
  }, [checkPharmacyData]);

  if (isLoading || checkingPharmacy) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          {isOffline && (
            <p className="mt-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
              <WifiOff className="h-4 w-4" />
              Loading offline data...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show offline error state when we can't verify user and have no cached data
  if (offlineError && !hasPharmacy) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <WifiOff className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">You're Offline</h2>
          <p className="text-muted-foreground mb-6">
            Unable to verify your account. Please connect to the internet and try again.
            If you've used this app before while online, your data should be cached.
          </p>
          <Button 
            onClick={() => {
              if (navigator.onLine) {
                setOfflineError(false);
                setCheckingPharmacy(true);
                checkPharmacyData();
              } else {
                toast({
                  title: 'Still Offline',
                  description: 'Please check your internet connection',
                  variant: 'destructive',
                });
              }
            }}
            className="w-full"
          >
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Show pharmacy selector if user has multiple pharmacies and hasn't selected one
  if (showPharmacySelector && pharmacyCount > 1) {
    const handlePharmacySelect = (pharmacyId: string) => {
      setSelectedPharmacyId(pharmacyId);
      sessionStorage.setItem(PHARMACY_SELECTOR_SHOWN_KEY, 'true');
      setShowPharmacySelector(false);
      setCheckingPharmacy(true);
      checkPharmacyData();
    };

    return <PharmacySelector onSelect={handlePharmacySelect} />;
  }

  // If user has no pharmacy and not on onboarding page, redirect to onboarding
  if (hasPharmacy === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // Check subscription for protected routes (except admin, profile, settings, guide)
  const exemptRoutes = ['/admin', '/profile', '/settings', '/guide', '/onboarding'];
  const isExemptRoute = exemptRoutes.some(route => location.pathname.startsWith(route));
  
  if (requireSubscription && !isExemptRoute && hasPharmacy && !isLoadingSubscription && !canAccessFeatures) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <UpgradePrompt />
      </div>
    );
  }

  return <>{children}</>;
};
