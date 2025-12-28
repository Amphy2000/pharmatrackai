import { useState, useEffect } from 'react';
import { MapPin, Store, MessageCircle, Package, Navigation, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useGeolocation, calculateDistance, getApproximateCoordinates } from '@/hooks/useGeolocation';

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
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-primary animate-pulse" />
          <div className="h-6 bg-muted rounded w-48 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (medications.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Available Near You</h2>
          {latitude && (
            <Badge variant="outline" className="ml-2 gap-1 text-xs">
              <Navigation className="h-3 w-3" />
              Within 5km
            </Badge>
          )}
        </div>
        {!latitude && !geoLoading && (
          <Button
            variant="ghost"
            size="sm"
            onClick={requestLocation}
            className="gap-1.5 text-xs"
          >
            <Navigation className="h-3 w-3" />
            Enable Location
          </Button>
        )}
        {geoLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {medications.map((medication) => (
          <Card
            key={`nearby-${medication.id}`}
            className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => onOrder(medication)}
          >
            <CardContent className="p-4">
              <Badge variant="secondary" className="mb-2 text-xs">
                {medication.category}
              </Badge>
              <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-marketplace transition-colors">
                {medication.name}
              </h3>
              <p className="text-lg font-bold text-marketplace mb-2">
                {formatPrice(medication.selling_price || 0)}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <Store className="h-3 w-3" />
                <span className="line-clamp-1">{medication.pharmacy_name}</span>
              </div>
              {medication.distance !== undefined && (
                <Badge variant="outline" className="text-[10px]">
                  {medication.distance < 1
                    ? `${Math.round(medication.distance * 1000)}m away`
                    : `${medication.distance.toFixed(1)}km away`}
                </Badge>
              )}
              <Button
                size="sm"
                className="w-full mt-3 bg-[#25D366] hover:bg-[#20BD5A] text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onOrder(medication);
                }}
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                Order
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
