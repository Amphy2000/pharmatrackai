import { useState, useEffect, useRef } from "react";
import { Search, MapPin, MessageCircle, Package, Store, Phone, Star, Download, Smartphone, X, ChevronRight, ArrowLeft, Shield, Clock, Zap, Heart, CheckCircle, Navigation, Sparkles, TrendingUp, Grid3X3, List, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { CustomerBarcodeScanner } from "@/components/explore/CustomerBarcodeScanner";
import { VoiceSearchButton } from "@/components/explore/VoiceSearchButton";
import { CategoryChips } from "@/components/explore/CategoryChips";
import { RequestDrugButton } from "@/components/explore/RequestDrugButton";
import { ExploreFlyer } from "@/components/explore/ExploreFlyer";
import { motion, AnimatePresence } from "framer-motion";
import { useGeolocation, calculateDistance, getApproximateCoordinates, getGoogleMapsLink, getFallbackLocationName } from "@/hooks/useGeolocation";
import { smartShuffle } from "@/utils/smartShuffle";

interface PublicMedication {
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
  is_featured: boolean | null;
  featured_until?: string | null;
  distance?: number;
  region?: string;
}

const Explore = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [medications, setMedications] = useState<PublicMedication[]>([]);
  const [featuredMedications, setFeaturedMedications] = useState<PublicMedication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const { latitude, longitude, requestLocation, loading: geoLoading } = useGeolocation();
  const spotlightRef = useRef<HTMLDivElement>(null);

  // Listen for PWA install prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Auto-request location and load initial data
  useEffect(() => {
    if (!latitude && !longitude && !geoLoading) {
      requestLocation();
    }
    loadInitialData();
  }, []);

  // Reload when location changes
  useEffect(() => {
    if (latitude && longitude) {
      loadInitialData();
    }
  }, [latitude, longitude]);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const loadInitialData = async () => {
    try {
      setInitialLoading(true);

      // Load featured medications
      const { data: featuredData } = await supabase.rpc('get_featured_medications');
      
      // Load all public medications
      const { data: allData } = await supabase.rpc('get_public_medications', {
        search_term: null,
        location_filter: null
      });

      // Process featured
      let processedFeatured: PublicMedication[] = (featuredData || []).map((m: any) => ({
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
        is_featured: true,
        featured_until: m.featured_until,
        region: getFallbackLocationName(m.pharmacy_address) || undefined,
      }));

      // Process regular (non-featured)
      let processedRegular: PublicMedication[] = (allData || [])
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
          is_featured: false,
          region: getFallbackLocationName(m.pharmacy_address) || undefined,
        }));

      // Add distance if location available
      if (latitude && longitude) {
        const addDistance = (items: PublicMedication[]) => 
          items.map(med => {
            const coords = getApproximateCoordinates(med.pharmacy_address);
            if (coords) {
              return { ...med, distance: calculateDistance(latitude, longitude, coords.lat, coords.lon) };
            }
            return med;
          }).sort((a, b) => {
            if (a.distance === undefined && b.distance === undefined) return 0;
            if (a.distance === undefined) return 1;
            if (b.distance === undefined) return -1;
            return a.distance - b.distance;
          });

        processedFeatured = addDistance(processedFeatured);
        processedRegular = addDistance(processedRegular);
      }

      // Apply smart shuffle
      processedFeatured = smartShuffle(processedFeatured, { prioritizeFeatured: true, maxPerPharmacy: 2 });
      processedRegular = smartShuffle(processedRegular, { prioritizeFeatured: false, maxPerPharmacy: 3 });

      setFeaturedMedications(processedFeatured as PublicMedication[]);
      setMedications(processedRegular.slice(0, 20) as PublicMedication[]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleBarcodeScanned = async (barcode: string) => {
    const { data: drugData } = await supabase
      .from('master_barcode_library')
      .select('product_name')
      .eq('barcode', barcode)
      .single();

    if (drugData) {
      setSearchQuery(drugData.product_name);
      handleSearch(drugData.product_name);
    } else {
      setSearchQuery(barcode);
      handleSearch(barcode);
    }
  };

  const handleVoiceResult = (transcript: string) => {
    setSearchQuery(transcript);
    handleSearch(transcript);
  };

  const handleCategorySelect = (category: string) => {
    if (category) {
      setSelectedCategory(category);
      setSearchQuery(category);
      handleSearch(category);
    } else {
      setSelectedCategory(null);
      setSearchQuery("");
      setHasSearched(false);
    }
  };

  // Track page visit
  useEffect(() => {
    const trackVisit = async () => {
      try {
        await supabase.from("marketplace_views").insert({
          pharmacy_id: "00000000-0000-0000-0000-000000000000",
          visit_type: "page_visit",
        });
      } catch (error) {
        console.error("Error tracking visit:", error);
      }
    };
    trackVisit();
  }, []);

  const handleSearch = async (searchTerm?: string) => {
    const query = searchTerm || searchQuery;
    if (!query.trim()) {
      toast({
        title: "Enter a search term",
        description: "Please type the name of a medication to search",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      await supabase.from("marketplace_searches").insert({
        search_query: query,
        location_filter: locationFilter || null,
        results_count: 0,
      });

      const { data, error } = await supabase.rpc("get_public_medications", {
        search_term: query,
        location_filter: locationFilter || null,
      });

      if (error) throw error;

      let processedMeds = (data || []).map((med: any) => {
        const result: PublicMedication = {
          ...med,
          region: getFallbackLocationName(med.pharmacy_address) || undefined,
        };
        if (latitude && longitude) {
          const pharmacyCoords = getApproximateCoordinates(med.pharmacy_address);
          if (pharmacyCoords) {
            result.distance = calculateDistance(latitude, longitude, pharmacyCoords.lat, pharmacyCoords.lon);
          }
        }
        return result;
      });

      // Sort by distance if available
      if (latitude && longitude) {
        processedMeds = processedMeds.sort((a: any, b: any) => {
          if (a.distance === undefined && b.distance === undefined) return 0;
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return a.distance - b.distance;
        });
      }

      processedMeds = smartShuffle(processedMeds, {
        prioritizeFeatured: true,
        groupByPharmacy: false,
        maxPerPharmacy: 5,
      });

      setMedications(processedMeds);

      if (data && data.length > 0) {
        const uniquePharmacies = [...new Set(data.map((m: PublicMedication) => m.pharmacy_id))];
        for (const pharmacyId of uniquePharmacies) {
          await supabase.from("marketplace_views").insert({
            pharmacy_id: pharmacyId,
            search_query: query,
            visit_type: "search",
          });
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: "Unable to search medications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsAppOrder = async (medication: PublicMedication, quantity: number = 1) => {
    try {
      await supabase.from("whatsapp_leads").insert({
        pharmacy_id: medication.pharmacy_id,
        medication_id: medication.id,
        medication_name: medication.name,
        quantity,
      });

      await supabase.functions.invoke("notify-whatsapp-lead", {
        body: {
          pharmacy_id: medication.pharmacy_id,
          medication_name: medication.name,
          quantity,
        },
      });
    } catch (error) {
      console.error("Error tracking WhatsApp lead:", error);
    }

    const phone = medication.pharmacy_phone?.replace(/\D/g, "") || "";
    const message = encodeURIComponent(
      `Hello, I saw ${medication.name} in stock on PharmaTrack. I would like to order ${quantity}.`
    );
    
    const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  const scrollSpotlight = (direction: 'left' | 'right') => {
    if (spotlightRef.current) {
      spotlightRef.current.scrollBy({
        left: direction === 'left' ? -300 : 300,
        behavior: 'smooth',
      });
    }
  };

  // Compact Product Card
  const ProductCard = ({ medication, index = 0 }: { medication: PublicMedication; index?: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
    >
      <Card 
        className={`group overflow-hidden hover:shadow-lg transition-all duration-300 rounded-2xl border border-border/50 cursor-pointer ${
          medication.is_featured 
            ? 'bg-gradient-to-br from-marketplace/5 via-white to-primary/5 dark:from-marketplace/10 dark:via-card dark:to-primary/10 ring-1 ring-marketplace/20' 
            : 'bg-card hover:bg-accent/30'
        }`}
        onClick={() => handleWhatsAppOrder(medication)}
      >
        <CardContent className="p-3.5">
          {/* Top Row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              {medication.is_featured && (
                <Badge className="bg-gradient-to-r from-marketplace to-primary text-white gap-1 text-[9px] px-1.5 py-0 mb-1.5 rounded-full">
                  <Star className="h-2 w-2 fill-current" />
                  Spotlight
                </Badge>
              )}
              <h3 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-marketplace transition-colors">
                {medication.name}
              </h3>
            </div>
            {medication.distance !== undefined && medication.distance <= 3 && (
              <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-[8px] px-1.5 py-0.5 shrink-0 gap-0.5 rounded-full">
                <Zap className="h-2 w-2" />
                Near
              </Badge>
            )}
          </div>

          {/* Category & Stock */}
          <div className="flex items-center gap-1.5 mb-2.5">
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 rounded-full">{medication.category}</Badge>
            <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[9px] px-1.5 py-0 rounded-full">
              <CheckCircle className="h-2 w-2 mr-0.5" />
              {medication.current_stock}
            </Badge>
          </div>

          {/* Pharmacy */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-2.5">
            <Store className="h-3 w-3 shrink-0" />
            <span className="truncate font-medium">{medication.pharmacy_name}</span>
            {medication.distance !== undefined && (
              <span className="shrink-0 text-[10px]">• {medication.distance < 1 ? `${Math.round(medication.distance * 1000)}m` : `${medication.distance.toFixed(1)}km`}</span>
            )}
          </div>

          {/* CTA */}
          <Button
            size="sm"
            className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white h-8 text-xs font-semibold rounded-xl shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleWhatsAppOrder(medication);
            }}
          >
            <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
            Order Now
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Header */}
      <header className="bg-gradient-to-br from-marketplace via-marketplace to-primary text-white sticky top-0 z-50 shadow-lg">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link to="/" className="h-9 w-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center hover:bg-white/25 transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold tracking-tight">PharmaTrack</h1>
                <p className="text-[10px] opacity-80">Find Medicine Near You</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ExploreFlyer />
            </div>
          </div>

          {/* Unified Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search medications, pharmacies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10 pr-24 h-11 text-sm bg-white text-foreground border-0 rounded-xl shadow-lg placeholder:text-muted-foreground/60"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <VoiceSearchButton onResult={handleVoiceResult} />
              <CustomerBarcodeScanner onScan={handleBarcodeScanned} />
              <Button 
                onClick={() => handleSearch()} 
                disabled={isLoading}
                size="sm"
                className="bg-marketplace text-white hover:bg-marketplace/90 h-8 px-3 text-xs rounded-lg"
              >
                {isLoading ? "..." : "Go"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Install Banner */}
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gradient-to-r from-primary to-marketplace text-white overflow-hidden"
          >
            <div className="px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <span className="text-xs font-medium">Install app for faster access</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" onClick={handleInstallApp} className="bg-white text-marketplace hover:bg-white/90 h-7 px-3 text-xs">
                  <Download className="h-3 w-3 mr-1" />
                  Install
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setShowInstallBanner(false)} className="text-white hover:bg-white/10 h-7 w-7">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="px-4 py-4 space-y-5">
        {/* Location Status */}
        {!latitude && !geoLoading && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border/50"
          >
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Enable location for nearby pharmacies</span>
            </div>
            <Button size="sm" variant="secondary" onClick={requestLocation} className="h-7 text-xs">
              Enable
            </Button>
          </motion.div>
        )}

        {/* Category Chips */}
        <CategoryChips onCategorySelect={handleCategorySelect} selectedCategory={selectedCategory} />

        {/* Spotlight Section */}
        {!hasSearched && featuredMedications.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-marketplace to-primary flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Spotlight</h2>
                  <p className="text-[10px] text-muted-foreground">Featured medications</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => scrollSpotlight('left')} className="h-7 w-7 rounded-full">
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => scrollSpotlight('right')} className="h-7 w-7 rounded-full">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div
              ref={spotlightRef}
              className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-4 px-4"
              style={{ scrollbarWidth: 'none' }}
            >
              {featuredMedications.map((med, index) => (
                <motion.div
                  key={`spotlight-${med.id}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="shrink-0 snap-start"
                >
                  <Card 
                    className="w-[200px] overflow-hidden border-0 bg-gradient-to-br from-white via-marketplace/5 to-primary/5 dark:from-card dark:via-marketplace/10 dark:to-primary/10 shadow-md hover:shadow-lg transition-all rounded-xl cursor-pointer group"
                    onClick={() => handleWhatsAppOrder(med)}
                  >
                    <CardContent className="p-3">
                      <Badge className="bg-gradient-to-r from-marketplace to-primary text-white gap-1 text-[9px] px-1.5 py-0 mb-2 rounded-full">
                        <Star className="h-2 w-2 fill-current" />
                        Featured
                      </Badge>
                      <h3 className="font-bold text-xs mb-1.5 line-clamp-2 group-hover:text-marketplace transition-colors">{med.name}</h3>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Badge variant="secondary" className="text-[8px] px-1 py-0">{med.category}</Badge>
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[8px] px-1 py-0">
                          {med.current_stock} left
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
                        <Store className="h-2.5 w-2.5" />
                        <span className="truncate">{med.pharmacy_name}</span>
                      </div>
                      {med.distance !== undefined && (
                        <Badge 
                          className={`text-[8px] px-1.5 py-0 mb-2 ${
                            med.distance <= 3 
                              ? 'bg-emerald-500 text-white' 
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {med.distance < 1 ? `${Math.round(med.distance * 1000)}m` : `${med.distance.toFixed(1)}km`}
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white h-7 text-[10px] font-semibold rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWhatsAppOrder(med);
                        }}
                      >
                        <MessageCircle className="h-3 w-3 mr-1" />
                        Order
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Main Products Section */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                {latitude ? <Navigation className="h-3.5 w-3.5 text-white" /> : <Package className="h-3.5 w-3.5 text-white" />}
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  {hasSearched ? `Results for "${searchQuery}"` : latitude ? 'Available Near You' : 'Browse Medications'}
                </h2>
                <p className="text-[10px] text-muted-foreground">
                  {medications.length} {medications.length === 1 ? 'item' : 'items'} available
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                size="icon" 
                onClick={() => setViewMode('grid')} 
                className="h-7 w-7 rounded-lg"
              >
                <Grid3X3 className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                size="icon" 
                onClick={() => setViewMode('list')} 
                className="h-7 w-7 rounded-lg"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {initialLoading ? (
            <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-3`}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-44 bg-muted rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : medications.length > 0 ? (
            <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-3`}>
              {medications.map((med, index) => (
                <ProductCard key={`${med.id}-${med.pharmacy_id}`} medication={med} index={index} />
              ))}
            </div>
          ) : hasSearched ? (
            <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-muted-foreground/20">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground mb-2">No medications found</p>
              <p className="text-xs text-muted-foreground/60 mb-4">Try a different search term or location</p>
              <RequestDrugButton searchQuery={searchQuery} />
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-muted-foreground/20">
              <Search className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Search for medications</p>
              <p className="text-xs text-muted-foreground/60">Type a medication name above to get started</p>
            </div>
          )}
        </motion.section>

        {/* Request Drug CTA */}
        {!hasSearched && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center pt-4"
          >
            <RequestDrugButton />
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default Explore;
