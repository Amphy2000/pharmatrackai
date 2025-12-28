import { useState, useEffect } from 'react';
import { MapPin, Store, MessageCircle, Navigation, Loader2, ShoppingBag, Zap, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useGeolocation, calculateDistance, getApproximateCoordinates, getFallbackLocationName, getGoogleMapsLink } from '@/hooks/useGeolocation';
import { motion } from 'framer-motion';

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
}

interface NearbyEssentialsProps {
  onOrder: (medication: NearbyMedication) => void;
}

// Common essential medications that people regularly need
const ESSENTIAL_CATEGORIES = ['Analgesics', 'Antimalarials', 'Vitamins', 'Antibiotics', 'Antacids'];

export const NearbyEssentials = ({ onOrder }: NearbyEssentialsProps) => {
  const [medications, setMedications] = useState<NearbyMedication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { formatPrice } = useCurrency();
  const { latitude, longitude, loading: geoLoading, requestLocation } = useGeolocation();

  useEffect(() => {
    loadNearbyEssentials();
  }, [latitude, longitude]);

  const loadNearbyEssentials = async () => {
    try {
      setIsLoading(true);

      // Get non-featured, in-stock, public medications
      const { data, error } = await supabase
        .from('medications')
        .select(`
          id,
          name,
          category,
          current_stock,
          selling_price,
          dispensing_unit,
          pharmacy_id,
          pharmacies!inner (
            name,
            phone,
            address,
            subscription_status
          )
        `)
        .eq('is_public', true)
        .eq('is_featured', false)
        .eq('is_shelved', true)
        .gt('current_stock', 0)
        .in('pharmacies.subscription_status', ['active', 'trial'])
        .in('category', ESSENTIAL_CATEGORIES)
        .limit(30);

      if (error) throw error;

      let formatted = (data || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        current_stock: m.current_stock,
        selling_price: m.selling_price,
        dispensing_unit: m.dispensing_unit,
        pharmacy_id: m.pharmacy_id,
        pharmacy_name: m.pharmacies?.name || 'Unknown',
        pharmacy_phone: m.pharmacies?.phone,
        pharmacy_address: m.pharmacies?.address,
      }));

      // If location is available, filter by 5km and sort by distance
      if (latitude && longitude) {
        formatted = formatted
          .map((med) => {
            const pharmacyCoords = getApproximateCoordinates(med.pharmacy_address);
            if (pharmacyCoords) {
              const distance = calculateDistance(latitude, longitude, pharmacyCoords.lat, pharmacyCoords.lon);
              return { ...med, distance };
            }
            return { ...med, distance: undefined };
          })
          .filter((med) => med.distance === undefined || med.distance <= 5) // 5km radius
          .sort((a, b) => {
            if (a.distance === undefined) return 1;
            if (b.distance === undefined) return -1;
            return a.distance - b.distance;
          });
      }

      // Limit to 12 items for the grid
      setMedications(formatted.slice(0, 12));
    } catch (error) {
      console.error('Error loading nearby essentials:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <ShoppingBag className="h-4 w-4 md:h-5 md:w-5 text-primary animate-pulse" />
          <div className="h-5 md:h-6 bg-muted rounded w-36 md:w-48 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 md:h-48 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (medications.length === 0) return null;

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
            <ShoppingBag className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
          </div>
          <div>
            <h2 className="text-base md:text-xl font-bold text-foreground">Available Near You</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">Essential medications</p>
          </div>
        </div>
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
      </div>

      {/* Grid - Mobile Optimized */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-4">
        {medications.map((medication, index) => (
          <motion.div
            key={`nearby-${medication.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <Card
              className="overflow-hidden hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer group rounded-2xl border-0 bg-gradient-to-br from-white to-muted/30 dark:from-card dark:to-muted/10 shadow-sm"
              onClick={() => onOrder(medication)}
            >
              <CardContent className="p-3 md:p-4">
                <Badge variant="secondary" className="mb-1.5 md:mb-2 text-[10px] md:text-xs px-2 py-0.5 rounded-full">
                  {medication.category}
                </Badge>
                <h3 className="font-semibold text-xs md:text-sm line-clamp-2 mb-1.5 md:mb-2 group-hover:text-marketplace transition-colors min-h-[2.5rem] md:min-h-0">
                  {medication.name}
                </h3>
                <p className="text-base md:text-lg font-bold text-marketplace mb-1.5 md:mb-2">
                  {formatPrice(medication.selling_price || 0)}
                </p>
                
                {/* Pharmacy Name */}
                <div className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground mb-1">
                  <Store className="h-2.5 w-2.5 md:h-3 md:w-3 shrink-0" />
                  <span className="line-clamp-1">{medication.pharmacy_name}</span>
                </div>
                
                {/* Distance Badge - Enhanced */}
                {medication.distance !== undefined ? (
                  medication.distance <= 5 ? (
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[9px] md:text-[10px] px-1.5 py-0 mb-2 md:mb-3 gap-0.5">
                      <Zap className="h-2 w-2" />
                      {medication.distance < 1 ? `${Math.round(medication.distance * 1000)}m` : `${medication.distance.toFixed(1)}km`}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] md:text-[10px] px-1.5 py-0 mb-2 md:mb-3">
                      📍 {medication.distance.toFixed(1)}km
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline" className="text-[9px] md:text-[10px] px-1.5 py-0 mb-2 md:mb-3 text-muted-foreground">
                    {getFallbackLocationName(medication.pharmacy_address) || '📍 Available'}
                  </Badge>
                )}
                <Button
                  size="sm"
                  className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white h-8 md:h-9 text-[10px] md:text-xs font-semibold rounded-xl"
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
    </motion.div>
  );
};
