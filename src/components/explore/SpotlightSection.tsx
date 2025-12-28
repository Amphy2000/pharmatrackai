import { useState, useEffect, useRef } from 'react';
import { Star, ChevronLeft, ChevronRight, MapPin, Store, MessageCircle, Clock, Navigation, Loader2, Sparkles, Zap, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { differenceInDays } from 'date-fns';
import { useGeolocation, calculateDistance, getApproximateCoordinates, getFallbackLocationName, getGoogleMapsLink } from '@/hooks/useGeolocation';
import { motion } from 'framer-motion';

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
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { formatPrice } = useCurrency();
  const { latitude, longitude, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();

  useEffect(() => {
    loadFeaturedMedications();
  }, []);

  // Filter by location when user location is available
  // Note: We no longer filter OUT items - we just sort by distance and add distance info
  useEffect(() => {
    if (featured.length > 0) {
      if (latitude && longitude) {
        // Add distance info but don't filter out any products
        const withDistance = featured.map(med => {
          const pharmacyCoords = getApproximateCoordinates(med.pharmacy_address);
          if (pharmacyCoords) {
            const distance = calculateDistance(latitude, longitude, pharmacyCoords.lat, pharmacyCoords.lon);
            return { ...med, distance };
          }
          return { ...med, distance: undefined };
        });
        
        // Sort by distance (closest first, unknown distances last)
        const sorted = withDistance.sort((a, b) => {
          if (a.distance === undefined && b.distance === undefined) return 0;
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return a.distance - b.distance;
        });
        
        setFilteredFeatured(sorted);
        setLocationEnabled(true);
      } else {
        // No location - show all featured items as-is
        setFilteredFeatured(featured);
        setLocationEnabled(false);
      }
    } else {
      setFilteredFeatured([]);
    }
  }, [latitude, longitude, featured]);

  // Update active index on scroll
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      const scrollLeft = scrollElement.scrollLeft;
      const cardWidth = window.innerWidth < 768 ? 260 : 300;
      const newIndex = Math.round(scrollLeft / cardWidth);
      setActiveIndex(Math.min(newIndex, filteredFeatured.length - 1));
    };

    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [filteredFeatured.length]);

  const loadFeaturedMedications = async () => {
    try {
      setIsLoading(true);
      
      // Get featured medications via secure RPC function (bypasses RLS for public marketplace)
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
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-marketplace animate-pulse" />
          <div className="h-5 md:h-6 bg-muted rounded w-32 md:w-40 animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-[240px] md:min-w-[300px] h-44 md:h-48 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Always show section with empty state message on mobile if no featured items
  if (filteredFeatured.length === 0 && !isLoading) {
    return (
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-1.5 md:gap-2 mb-3">
          <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-gradient-to-br from-marketplace to-primary flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
          </div>
          <div>
            <h2 className="text-base md:text-xl font-bold text-foreground">Spotlight</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">Featured products</p>
          </div>
        </div>
        <div className="text-center py-6 bg-muted/30 rounded-2xl border border-dashed border-muted-foreground/20">
          <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No featured products available yet</p>
          <p className="text-xs text-muted-foreground/60">Check back soon for special offers!</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 md:mb-8"
    >
      {/* Header - Mobile Optimized */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-gradient-to-br from-marketplace to-primary flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
          </div>
          <div>
            <h2 className="text-base md:text-xl font-bold text-foreground">Spotlight</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">Featured products</p>
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
          {/* Scroll arrows - hidden on mobile, visible on desktop */}
          <div className="hidden md:flex items-center gap-1">
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
      </div>

      {/* Scrollable Cards Container - Mobile Touch Optimized */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide -mx-3 px-3"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {filteredFeatured.map((medication, index) => {
          const daysLeft = getDaysRemaining(medication.featured_until);
          
          return (
            <motion.div
              key={`spotlight-${medication.id}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="shrink-0"
            >
              <Card
                className="w-[240px] md:w-[300px] snap-start overflow-hidden border-0 bg-gradient-to-br from-white to-marketplace/5 dark:from-card dark:to-marketplace/10 shadow-lg hover:shadow-xl transition-all rounded-2xl"
              >
                <CardContent className="p-3 md:p-4">
                  {/* Header with badge */}
                  <div className="flex items-start justify-between mb-2 md:mb-3">
                    <Badge className="bg-gradient-to-r from-marketplace to-primary text-white gap-1 text-[10px] md:text-xs px-2 py-0.5 rounded-full">
                      <Star className="h-2.5 w-2.5 md:h-3 md:w-3 fill-current" />
                      Spotlight
                    </Badge>
                    {daysLeft !== null && daysLeft <= 7 && daysLeft > 0 && (
                      <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {daysLeft}d
                      </Badge>
                    )}
                  </div>

                  {/* Product Info */}
                  <h3 className="font-bold text-sm md:text-lg mb-1 line-clamp-1">{medication.name}</h3>
                  <Badge variant="secondary" className="mb-2 md:mb-3 text-[10px] md:text-xs">{medication.category}</Badge>

                  {/* Price */}
                  <p className="text-xl md:text-2xl font-bold text-marketplace mb-2 md:mb-3">
                    {formatPrice(medication.selling_price || 0)}
                    <span className="text-[10px] md:text-sm font-normal text-muted-foreground ml-1">
                      /{medication.dispensing_unit}
                    </span>
                  </p>

                  {/* Pharmacy Info with Distance */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-1.5 text-xs md:text-sm">
                      <Store className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="font-medium text-foreground line-clamp-1">{medication.pharmacy_name}</span>
                    </div>
                    
                    {/* Distance Display - Always show */}
                    {medication.distance !== undefined ? (
                      <div className="flex items-center gap-1.5">
                        {medication.distance <= 5 ? (
                          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[9px] md:text-[10px] px-2 py-0.5 gap-1">
                            <Zap className="h-2.5 w-2.5" />
                            Fast Pickup • {medication.distance < 1 ? `${Math.round(medication.distance * 1000)}m` : `${medication.distance.toFixed(1)}km`}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px] md:text-[10px] px-2 py-0.5">
                            📍 {medication.distance.toFixed(1)}km away
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[9px] md:text-[10px] px-2 py-0.5 text-muted-foreground">
                          📍 {getFallbackLocationName(medication.pharmacy_address) || 'Location available'}
                        </Badge>
                      </div>
                    )}
                    
                    {/* Clickable Address */}
                    {medication.pharmacy_address && (
                      <a 
                        href={getGoogleMapsLink(medication.pharmacy_address) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[10px] md:text-xs text-primary hover:text-primary/80 transition-colors group"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="line-clamp-1 flex-1 underline-offset-2 group-hover:underline">
                          {medication.pharmacy_address}
                        </span>
                        <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-50 group-hover:opacity-100" />
                      </a>
                    )}
                  </div>

                  {/* CTA */}
                  <Button
                    onClick={() => onOrder(medication)}
                    className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white h-9 md:h-10 text-xs md:text-sm font-semibold rounded-xl"
                  >
                    <MessageCircle className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" />
                    Order via WhatsApp
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Dot Indicators - Mobile only */}
      {filteredFeatured.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3 md:hidden">
          {filteredFeatured.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === activeIndex 
                  ? 'w-4 bg-marketplace' 
                  : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};
