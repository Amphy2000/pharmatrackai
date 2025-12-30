import { useState, useEffect, useRef, useMemo } from 'react';
import { Star, ChevronLeft, ChevronRight, MapPin, Store, MessageCircle, Clock, Navigation, Loader2, Sparkles, Zap, ExternalLink, Globe, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays } from 'date-fns';
import { useGeolocation, calculateDistance, getApproximateCoordinates, getFallbackLocationName, getGoogleMapsLink } from '@/hooks/useGeolocation';
import { motion } from 'framer-motion';
import { smartShuffle } from '@/utils/smartShuffle';

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
  region?: string;
}

interface SpotlightSectionProps {
  onOrder: (medication: FeaturedMedication) => void;
  onShowOnMap?: (medication: FeaturedMedication) => void;
}

export const SpotlightSection = ({ onOrder, onShowOnMap }: SpotlightSectionProps) => {
  const [featured, setFeatured] = useState<FeaturedMedication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { latitude, longitude, loading: geoLoading } = useGeolocation();

  useEffect(() => {
    loadFeaturedMedications();
  }, []);

  // Process featured with distance
  const processedFeatured = useMemo(() => {
    if (featured.length === 0) return [];

    let processed = featured.map(med => ({
      ...med,
      region: getFallbackLocationName(med.pharmacy_address) || undefined
    }));

    // Add distance info if geolocation available
    if (latitude && longitude) {
      processed = processed.map(med => {
        const pharmacyCoords = getApproximateCoordinates(med.pharmacy_address);
        if (pharmacyCoords) {
          const distance = calculateDistance(latitude, longitude, pharmacyCoords.lat, pharmacyCoords.lon);
          return { ...med, distance };
        }
        return med;
      });

      // Sort by distance
      processed = processed.sort((a, b) => {
        if (a.distance === undefined && b.distance === undefined) return 0;
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      });
    }

    // Apply smart shuffle for fair pharmacy lead distribution
    return smartShuffle(processed, {
      prioritizeFeatured: true,
      groupByPharmacy: false,
      maxPerPharmacy: 2,
    });
  }, [featured, latitude, longitude]);

  // Update active index on scroll
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      const scrollLeft = scrollElement.scrollLeft;
      const cardWidth = window.innerWidth < 768 ? 260 : 300;
      const newIndex = Math.round(scrollLeft / cardWidth);
      setActiveIndex(Math.min(newIndex, processedFeatured.length - 1));
    };

    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [processedFeatured.length]);

  const loadFeaturedMedications = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('get_featured_medications');
      if (error) throw error;

      const formatted = (data || []).map((m: any) => ({
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
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-marketplace animate-pulse" />
          <div className="h-5 bg-muted rounded w-24 animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[1, 2].map((i) => (
            <div key={i} className="min-w-[240px] h-44 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (processedFeatured.length === 0) {
    return null; // Don't show section if no featured items
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      {/* Clean Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-marketplace to-primary flex items-center justify-center">
            <Star className="h-3 w-3 text-white fill-white" />
          </div>
          <h2 className="text-sm font-bold text-foreground">Spotlight</h2>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {processedFeatured.length}
          </Badge>
        </div>
        
        {/* Minimal scroll arrows */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('left')}
            className="h-6 w-6 rounded-full"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('right')}
            className="h-6 w-6 rounded-full"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Cards */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-3 px-3"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {processedFeatured.map((medication, index) => {
          const daysLeft = getDaysRemaining(medication.featured_until);
          
          return (
            <motion.div
              key={`spotlight-${medication.id}-${medication.pharmacy_id}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="shrink-0"
            >
              <Card className="w-[240px] md:w-[280px] snap-start overflow-hidden border-0 bg-gradient-to-br from-white to-marketplace/5 dark:from-card dark:to-marketplace/10 shadow-md hover:shadow-lg transition-all rounded-xl">
                <CardContent className="p-3">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <Badge className="bg-gradient-to-r from-marketplace to-primary text-white gap-1 text-[10px] px-2 py-0.5 rounded-full">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      Spotlight
                    </Badge>
                    {daysLeft !== null && daysLeft <= 3 && daysLeft > 0 && (
                      <Badge variant="outline" className="text-[9px] gap-0.5 px-1.5 py-0">
                        <Clock className="h-2 w-2" />
                        {daysLeft}d
                      </Badge>
                    )}
                  </div>

                  {/* Product Info */}
                  <h3 className="font-bold text-sm mb-1 line-clamp-1">{medication.name}</h3>
                  
                  {/* Price Display */}
                  <div className="mb-2">
                    {medication.selling_price !== null && medication.selling_price > 0 ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold text-marketplace">₦{medication.selling_price.toLocaleString()}</span>
                        <span className="text-[9px] text-muted-foreground">/{medication.dispensing_unit}</span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/50 text-[10px] px-1.5 py-0.5">
                        <Phone className="h-2.5 w-2.5 mr-0.5" />
                        Price on Request
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 mb-2">
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{medication.category}</Badge>
                    <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[9px] px-1.5 py-0">
                      {medication.current_stock} in stock
                    </Badge>
                  </div>

                  {/* Pharmacy */}
                  <div className="space-y-1 mb-3 p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Store className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="font-medium text-foreground line-clamp-1">{medication.pharmacy_name}</span>
                    </div>
                    
                    {medication.distance !== undefined ? (
                      medication.distance <= 3 ? (
                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[8px] px-1.5 py-0 gap-0.5">
                          <Zap className="h-2 w-2" />
                          {medication.distance < 1 ? `${Math.round(medication.distance * 1000)}m` : `${medication.distance.toFixed(1)}km`}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Navigation className="h-2.5 w-2.5" />
                          {medication.distance.toFixed(1)}km away
                        </span>
                      )
                    ) : medication.region && (
                      <span className="text-[10px] text-muted-foreground">
                        📍 {medication.region}
                      </span>
                    )}
                  </div>

                  {/* CTAs */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => onOrder(medication)}
                      className="flex-1 bg-[#25D366] hover:bg-[#20BD5A] text-white h-8 text-xs font-semibold rounded-lg"
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1" />
                      {medication.selling_price !== null && medication.selling_price > 0 ? 'Order Now' : 'Ask Price'}
                    </Button>
                    {onShowOnMap && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onShowOnMap(medication)}
                        className="h-8 w-8 rounded-lg border-marketplace/30 hover:bg-marketplace/10 hover:border-marketplace shrink-0"
                      >
                        <MapPin className="h-3.5 w-3.5 text-marketplace" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Minimal dot indicators */}
      {processedFeatured.length > 2 && (
        <div className="flex justify-center gap-1 mt-2">
          {processedFeatured.slice(0, Math.min(processedFeatured.length, 5)).map((_, index) => (
            <div
              key={index}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === activeIndex 
                  ? 'w-3 bg-marketplace' 
                  : 'w-1 bg-muted-foreground/30'
              }`}
            />
          ))}
          {processedFeatured.length > 5 && (
            <span className="text-[8px] text-muted-foreground ml-1">+{processedFeatured.length - 5}</span>
          )}
        </div>
      )}
    </motion.div>
  );
};
