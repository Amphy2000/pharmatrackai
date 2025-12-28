import { useState, useEffect, useRef } from 'react';
import { Star, ChevronLeft, ChevronRight, MapPin, Store, MessageCircle, Clock, Navigation, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { differenceInDays } from 'date-fns';
import { useGeolocation, calculateDistance, getApproximateCoordinates } from '@/hooks/useGeolocation';

interface FeaturedMedication {
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
  is_featured: boolean;
  featured_until: string | null;
  distance?: number;
}

interface SpotlightSectionProps {
  onOrder: (medication: FeaturedMedication) => void;
}

export const SpotlightSection = ({ onOrder }: SpotlightSectionProps) => {
  const [featured, setFeatured] = useState<FeaturedMedication[]>([]);
  const [filteredFeatured, setFilteredFeatured] = useState<FeaturedMedication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { formatPrice } = useCurrency();
  const { latitude, longitude, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();

  useEffect(() => {
    loadFeaturedMedications();
  }, []);

  // Filter by location when user location is available
  useEffect(() => {
    if (latitude && longitude && featured.length > 0) {
      const filtered = featured
        .map(med => {
          const pharmacyCoords = getApproximateCoordinates(med.pharmacy_address);
          if (pharmacyCoords) {
            const distance = calculateDistance(latitude, longitude, pharmacyCoords.lat, pharmacyCoords.lon);
            return { ...med, distance };
          }
          return { ...med, distance: undefined };
        })
        .filter(med => med.distance === undefined || med.distance <= 10) // 10km radius
        .sort((a, b) => {
          // Sort by distance, unknown distances go last
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return a.distance - b.distance;
        });
      
      setFilteredFeatured(filtered);
      setLocationEnabled(true);
    } else {
      setFilteredFeatured(featured);
      setLocationEnabled(false);
    }
  }, [latitude, longitude, featured]);

  const loadFeaturedMedications = async () => {
    try {
      setIsLoading(true);
      
      // First expire old featured items
      await supabase.rpc('expire_featured_items');
      
      // Get featured medications - limit to 3 per pharmacy is enforced at DB level
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
          is_featured,
          featured_until,
          pharmacies!inner (
            name,
            phone,
            address,
            subscription_status
          )
        `)
        .eq('is_public', true)
        .eq('is_featured', true)
        .eq('is_shelved', true)
        .gt('current_stock', 0)
        .in('pharmacies.subscription_status', ['active', 'trial'])
        .or('featured_until.is.null,featured_until.gt.now()')
        .limit(20);

      if (error) throw error;

      const formatted = (data || []).map((m: any) => ({
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
        is_featured: m.is_featured,
        featured_until: m.featured_until,
      }));

      setFeatured(formatted);
    } catch (error) {
      console.error('Error loading featured:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const getDaysRemaining = (featuredUntil: string | null) => {
    if (!featuredUntil) return null;
    return differenceInDays(new Date(featuredUntil), new Date());
  };

  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-5 w-5 text-marketplace animate-pulse" />
          <div className="h-6 bg-muted rounded w-40 animate-pulse" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-[300px] h-48 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (filteredFeatured.length === 0 && !isLoading) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-marketplace fill-marketplace" />
          <h2 className="text-xl font-bold text-foreground">Spotlight</h2>
          <Badge variant="secondary" className="ml-2">Featured Products</Badge>
          {locationEnabled && (
            <Badge variant="outline" className="ml-2 gap-1 text-xs">
              <Navigation className="h-3 w-3" />
              Within 10km
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('left')}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('right')}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {filteredFeatured.map((medication) => {
          const daysLeft = getDaysRemaining(medication.featured_until);
          
          return (
            <Card
              key={`spotlight-${medication.id}`}
              className="min-w-[300px] max-w-[300px] snap-start overflow-hidden border-marketplace/30 bg-gradient-to-br from-marketplace/5 to-background hover:shadow-lg transition-all"
            >
              <CardContent className="p-4">
                {/* Header with badge */}
                <div className="flex items-start justify-between mb-3">
                  <Badge className="bg-marketplace text-marketplace-foreground gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Spotlight
                  </Badge>
                  {daysLeft !== null && daysLeft <= 7 && daysLeft > 0 && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Clock className="h-3 w-3" />
                      {daysLeft}d left
                    </Badge>
                  )}
                </div>

                {/* Product Info */}
                <h3 className="font-bold text-lg mb-1 line-clamp-1">{medication.name}</h3>
                <Badge variant="secondary" className="mb-3 text-xs">{medication.category}</Badge>

                {/* Price */}
                <p className="text-2xl font-bold text-marketplace mb-3">
                  {formatPrice(medication.selling_price || 0)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    /{medication.dispensing_unit}
                  </span>
                </p>

                {/* Pharmacy Info */}
                <div className="space-y-1 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Store className="h-3 w-3" />
                    <span className="font-medium text-foreground line-clamp-1">{medication.pharmacy_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="line-clamp-1">
                      {medication.pharmacy_address || 'Location not specified'}
                    </span>
                    {medication.distance !== undefined && (
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        {medication.distance < 1 
                          ? `${Math.round(medication.distance * 1000)}m`
                          : `${medication.distance.toFixed(1)}km`
                        }
                      </Badge>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <Button
                  onClick={() => onOrder(medication)}
                  className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white"
                  size="sm"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Order via WhatsApp
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
