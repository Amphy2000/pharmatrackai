import { useState, useEffect } from 'react';
import { MapPin, Store, MessageCircle, Navigation, Loader2, ShoppingBag, Zap, Globe, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useGeolocation, calculateDistance, getApproximateCoordinates, getFallbackLocationName, getGoogleMapsLink } from '@/hooks/useGeolocation';
import { motion, AnimatePresence } from 'framer-motion';
import { smartShuffle } from '@/utils/smartShuffle';

interface NearbyMedication {
  id: string;
  name: string;
  category: string;
  current_stock: number;
  selling_price: number | null;
  dispensing_unit: string;
  pharmacy_id: string;
  pharmacy_name: string;
  pharmacy_phone: string | null;
  pharmacy_address: string | null;
  distance?: number;
  region?: string;
}

interface NearbyEssentialsProps {
  onOrder: (medication: NearbyMedication) => void;
}

export const NearbyEssentials = ({ onOrder }: NearbyEssentialsProps) => {
  const [medications, setMedications] = useState<NearbyMedication[]>([]);
  const [allMedications, setAllMedications] = useState<NearbyMedication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showingNearby, setShowingNearby] = useState(true);
  const [hasNearbyItems, setHasNearbyItems] = useState(true);
  const { latitude, longitude, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();

  // Auto-request location on mount for best UX
  useEffect(() => {
    // Only auto-request if not already loading/have location
    if (!latitude && !longitude && !geoLoading) {
      requestLocation();
    }
  }, []);

  useEffect(() => {
    loadNearbyEssentials();
  }, [latitude, longitude]);

  const loadNearbyEssentials = async () => {
    try {
      setIsLoading(true);

      // Use the RPC function which bypasses RLS for public marketplace access
      const { data, error } = await supabase.rpc('get_public_medications', {
        search_term: null,
        location_filter: null
      });

      if (error) throw error;

      // Filter to non-featured items only (featured go to spotlight)
      let formatted = (data || [])
        .filter((m: any) => !m.is_featured)
        .map((m: any) => ({
          id: m.id,
          name: m.name,
          category: m.category,
          current_stock: m.current_stock,
          selling_price: m.selling_price,
          dispensing_unit: m.dispensing_unit,
          pharmacy_id: m.pharmacy_id,
          pharmacy_name: m.pharmacy_name || 'Unknown',
          pharmacy_phone: m.pharmacy_phone,
          pharmacy_address: m.pharmacy_address,
          region: getFallbackLocationName(m.pharmacy_address) || undefined,
        }));

      // Store all medications for "Browse All" fallback
      setAllMedications(formatted);

      // If location is available, calculate distances and filter by proximity
      if (latitude && longitude) {
        const withDistance = formatted.map((med) => {
          const pharmacyCoords = getApproximateCoordinates(med.pharmacy_address);
          if (pharmacyCoords) {
            const distance = calculateDistance(latitude, longitude, pharmacyCoords.lat, pharmacyCoords.lon);
            return { ...med, distance };
          }
          return { ...med, distance: undefined };
        });

        // Filter to 10km radius for "nearby"
        const nearbyMeds = withDistance.filter((med) => 
          med.distance !== undefined && med.distance <= 10
        );

        if (nearbyMeds.length > 0) {
          // Sort by distance (closest first)
          const sorted = nearbyMeds.sort((a, b) => {
            if (a.distance === undefined) return 1;
            if (b.distance === undefined) return -1;
            return a.distance - b.distance;
          });

          // Apply smart shuffle for fair pharmacy lead distribution
          const shuffled = smartShuffle(sorted, {
            prioritizeFeatured: false,
            groupByPharmacy: false,
            maxPerPharmacy: 3,
          });

          setMedications(shuffled.slice(0, 16));
          setShowingNearby(true);
          setHasNearbyItems(true);
        } else {
          // No nearby pharmacies - show all with smart shuffle
          const shuffled = smartShuffle(withDistance, {
            prioritizeFeatured: false,
            groupByPharmacy: false,
            maxPerPharmacy: 2,
          });
          setMedications(shuffled.slice(0, 16));
          setShowingNearby(false);
          setHasNearbyItems(false);
        }
      } else {
        // No location - apply smart shuffle for fair distribution
        const shuffled = smartShuffle(formatted, {
          prioritizeFeatured: false,
          groupByPharmacy: false,
          maxPerPharmacy: 2,
        });
        setMedications(shuffled.slice(0, 16));
        setShowingNearby(false);
        setHasNearbyItems(false);
      }
    } catch (error) {
      console.error('Error loading nearby essentials:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrowseAll = () => {
    // Show all medications shuffled fairly
    const shuffled = smartShuffle(allMedications, {
      prioritizeFeatured: false,
      groupByPharmacy: false,
      maxPerPharmacy: 2,
    });
    setMedications(shuffled.slice(0, 24));
    setShowingNearby(false);
  };

  if (isLoading) {
    return (
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <ShoppingBag className="h-4 w-4 md:h-5 md:w-5 text-primary animate-pulse" />
          <div className="h-5 md:h-6 bg-muted rounded w-36 md:w-48 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 md:h-48 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (medications.length === 0) {
    return (
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-1.5 md:gap-2 mb-3">
          <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
            <ShoppingBag className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
          </div>
          <div>
            <h2 className="text-base md:text-xl font-bold text-foreground">Available Medications</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">Browse what's in stock</p>
          </div>
        </div>
        <div className="text-center py-8 bg-muted/30 rounded-2xl border border-dashed border-muted-foreground/20">
          <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground mb-2">No medications available yet</p>
          <p className="text-xs text-muted-foreground/60 mb-4">Pharmacies are adding products. Check back soon!</p>
          <Button variant="outline" size="sm" onClick={loadNearbyEssentials}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-6 md:mb-8"
    >
      {/* Header - Mobile Optimized */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
            {showingNearby ? (
              <Navigation className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
            ) : (
              <Globe className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-base md:text-xl font-bold text-foreground">
              {showingNearby ? 'Available Near You' : 'Browse All Medications'}
            </h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              {showingNearby 
                ? 'Quick pickup available' 
                : hasNearbyItems 
                  ? 'Showing all regions' 
                  : 'No pharmacies nearby • Showing all'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {!latitude && !geoLoading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={requestLocation}
              className="gap-1 text-[10px] md:text-xs h-7 px-2"
            >
              <Navigation className="h-3 w-3" />
              <span className="hidden sm:inline">Enable</span> Location
            </Button>
          )}
          {geoLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {latitude && !showingNearby && hasNearbyItems && (
            <Button
              variant="ghost"
              size="sm"
              onClick={loadNearbyEssentials}
              className="gap-1 text-[10px] md:text-xs h-7 px-2"
            >
              <Navigation className="h-3 w-3" />
              Show Nearby
            </Button>
          )}
        </div>
      </div>

      {/* No nearby pharmacies banner */}
      <AnimatePresence>
        {!hasNearbyItems && latitude && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">No pharmacies within 10km</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  We're showing medications from all regions. More pharmacies joining soon!
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid - Mobile Optimized */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-4">
        {medications.map((medication, index) => (
          <motion.div
            key={`nearby-${medication.id}-${medication.pharmacy_id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
          >
            <Card
              className="overflow-hidden hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer group rounded-2xl border-0 bg-gradient-to-br from-white to-muted/30 dark:from-card dark:to-muted/10 shadow-sm h-full"
              onClick={() => onOrder(medication)}
            >
              <CardContent className="p-3 md:p-4 flex flex-col h-full">
                <Badge variant="secondary" className="mb-1.5 md:mb-2 text-[10px] md:text-xs px-2 py-0.5 rounded-full w-fit">
                  {medication.category}
                </Badge>
                <h3 className="font-semibold text-xs md:text-sm line-clamp-2 mb-1.5 md:mb-2 group-hover:text-marketplace transition-colors min-h-[2.5rem] md:min-h-0 flex-grow">
                  {medication.name}
                </h3>
                <Badge 
                  variant="outline" 
                  className="bg-success/10 text-success border-success/30 text-[10px] mb-1.5 md:mb-2 w-fit"
                >
                  {medication.current_stock} in stock
                </Badge>
                
                {/* Pharmacy Name */}
                <div className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground mb-1">
                  <Store className="h-2.5 w-2.5 md:h-3 md:w-3 shrink-0" />
                  <span className="line-clamp-1">{medication.pharmacy_name}</span>
                </div>
                
                {/* Distance Badge - Enhanced */}
                {medication.distance !== undefined ? (
                  medication.distance <= 3 ? (
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[9px] md:text-[10px] px-1.5 py-0 mb-2 md:mb-3 gap-0.5 w-fit">
                      <Zap className="h-2 w-2" />
                      {medication.distance < 1 ? `${Math.round(medication.distance * 1000)}m` : `${medication.distance.toFixed(1)}km`}
                    </Badge>
                  ) : medication.distance <= 10 ? (
                    <Badge variant="outline" className="text-[9px] md:text-[10px] px-1.5 py-0 mb-2 md:mb-3 gap-0.5 w-fit">
                      <Navigation className="h-2 w-2" />
                      {medication.distance.toFixed(1)}km
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] md:text-[10px] px-1.5 py-0 mb-2 md:mb-3 text-muted-foreground w-fit">
                      📍 {medication.region || `${medication.distance.toFixed(0)}km`}
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline" className="text-[9px] md:text-[10px] px-1.5 py-0 mb-2 md:mb-3 text-muted-foreground w-fit">
                    📍 {medication.region || 'Available'}
                  </Badge>
                )}
                
                <Button
                  size="sm"
                  className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white h-8 md:h-9 text-[10px] md:text-xs font-semibold rounded-xl mt-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOrder(medication);
                  }}
                >
                  <MessageCircle className="h-3 w-3 md:h-3.5 md:w-3.5 mr-1" />
                  Order
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Browse All Button - shown when viewing nearby and there are more */}
      {showingNearby && allMedications.length > medications.length && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-center"
        >
          <Button 
            variant="outline" 
            onClick={handleBrowseAll}
            className="gap-2"
          >
            <Globe className="h-4 w-4" />
            Browse All Regions
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};
