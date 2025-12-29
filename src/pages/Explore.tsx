import { useState, useEffect, useRef } from "react";
import { Search, MapPin, MessageCircle, Package, Store, Phone, Star, Download, Smartphone, X, ChevronRight, ArrowLeft, Shield, Clock, Zap, Heart, CheckCircle, Navigation, Sparkles, TrendingUp } from "lucide-react";
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
import { SpotlightSection } from "@/components/explore/SpotlightSection";
import { CategoryChips } from "@/components/explore/CategoryChips";
import { NearbyEssentials } from "@/components/explore/NearbyEssentials";
import { RequestDrugButton } from "@/components/explore/RequestDrugButton";
import { ExploreFlyer } from "@/components/explore/ExploreFlyer";
import { motion, AnimatePresence } from "framer-motion";
import { useGeolocation, calculateDistance, getApproximateCoordinates, getGoogleMapsLink } from "@/hooks/useGeolocation";
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
}

const Explore = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [medications, setMedications] = useState<PublicMedication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<'distance' | 'availability'>('distance');
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const { latitude, longitude, requestLocation } = useGeolocation();

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

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleBarcodeScanned = async (barcode: string) => {
    // First try to find in master barcode library
    const { data: drugData } = await supabase
      .from('master_barcode_library')
      .select('product_name')
      .eq('barcode', barcode)
      .single();

    if (drugData) {
      setSearchQuery(drugData.product_name);
      handleSearch(drugData.product_name);
    } else {
      // Fall back to searching with the barcode itself
      setSearchQuery(barcode);
      handleSearch(barcode);
    }
  };

  // Handle voice search result
  const handleVoiceResult = (transcript: string) => {
    setSearchQuery(transcript);
    handleSearch(transcript);
  };

  // Handle category selection
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

  // Track page visit on mount
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
      // Track the search
      await supabase.from("marketplace_searches").insert({
        search_query: query,
        location_filter: locationFilter || null,
        results_count: 0,
      });

      // Get public medications using the function (now with fuzzy search)
      const { data, error } = await supabase.rpc("get_public_medications", {
        search_term: query,
        location_filter: locationFilter || null,
      });

      if (error) throw error;

      // Add distance info and apply filters/sorting
      let processedMeds = (data || []).map((med: PublicMedication) => {
        if (latitude && longitude) {
          const pharmacyCoords = getApproximateCoordinates(med.pharmacy_address);
          if (pharmacyCoords) {
            const distance = calculateDistance(latitude, longitude, pharmacyCoords.lat, pharmacyCoords.lon);
            return { ...med, distance };
          }
        }
        return { ...med, distance: undefined as number | undefined };
      });

      // Apply sorting
      if (latitude && longitude) {
        processedMeds = processedMeds.sort((a: any, b: any) => {
          if (a.distance === undefined && b.distance === undefined) return 0;
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return a.distance - b.distance;
        });
      }


      // Apply smart shuffle for fair pharmacy lead distribution
      // This ensures different users see different arrangements
      // while still respecting featured items and other priorities
      processedMeds = smartShuffle(processedMeds, {
        prioritizeFeatured: true,
        groupByPharmacy: false,
        maxPerPharmacy: 5,
      });

      setMedications(processedMeds);

      // Track pharmacy views for each result
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

  const handleWhatsAppOrder = async (medication: PublicMedication | any, quantity: number = 1) => {
    // Track the WhatsApp lead
    try {
      await supabase.from("whatsapp_leads").insert({
        pharmacy_id: medication.pharmacy_id,
        medication_id: medication.id,
        medication_name: medication.name,
        quantity,
      });

      // Send SMS notification via edge function
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

    // Format phone number for WhatsApp
    const phone = medication.pharmacy_phone?.replace(/\D/g, "") || "";
    const message = encodeURIComponent(
      `Hello, I saw ${medication.name} in stock on PharmaTrack. I would like to order ${quantity}.`
    );
    
    const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  // Premium Mobile-optimized Medication Card
  const MedicationCard = ({ medication, isFeatured = false, index = 0 }: { medication: PublicMedication; isFeatured?: boolean; index?: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className={`overflow-hidden hover:shadow-xl transition-all duration-300 rounded-2xl border-0 ${
        isFeatured 
          ? 'bg-gradient-to-br from-marketplace/10 to-primary/5 shadow-marketplace/10' 
          : 'bg-gradient-to-br from-white to-muted/20 dark:from-card dark:to-muted/10 shadow-md'
      }`}>
        <CardContent className="p-0">
          <div className="p-4 md:p-5">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <h3 className="text-base md:text-lg font-bold text-foreground line-clamp-1">{medication.name}</h3>
                  {medication.is_featured && (
                    <Badge className="bg-gradient-to-r from-marketplace to-primary text-white gap-1 shrink-0 text-[10px] px-2 py-0.5 rounded-full">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      Featured
                    </Badge>
                  )}
                </div>
                <Badge variant="secondary" className="text-[10px] md:text-xs rounded-full">{medication.category}</Badge>
              </div>
              <Badge 
                variant="outline" 
                className="bg-success/10 text-success border-success/30 text-[10px] md:text-xs shrink-0 rounded-full px-2.5"
              >
                <CheckCircle className="h-2.5 w-2.5 mr-1" />
                {medication.current_stock} in stock
              </Badge>
            </div>
            
            {/* Pharmacy Info */}
            <div className="space-y-2 mb-4 p-3 bg-muted/30 rounded-xl">
              <div className="flex items-center gap-2 text-sm">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Store className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-foreground block truncate">{medication.pharmacy_name}</span>
                  {medication.distance !== undefined && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Navigation className="h-2.5 w-2.5" />
                      {medication.distance < 1 
                        ? `${Math.round(medication.distance * 1000)}m away` 
                        : `${medication.distance.toFixed(1)}km away`
                      }
                    </span>
                  )}
                </div>
                {medication.distance !== undefined && medication.distance <= 3 && (
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[9px] px-2 py-0.5 gap-1 shrink-0">
                    <Zap className="h-2.5 w-2.5" />
                    Quick Pickup
                  </Badge>
                )}
              </div>
              
              {medication.pharmacy_address && (
                <a 
                  href={getGoogleMapsLink(medication.pharmacy_address) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-primary hover:underline group pl-10"
                >
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{medication.pharmacy_address}</span>
                  <ChevronRight className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {medication.pharmacy_phone && (
                <a 
                  href={`tel:${medication.pharmacy_phone}`}
                  className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors shrink-0"
                >
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </a>
              )}
              <Button
                onClick={() => handleWhatsAppOrder(medication)}
                className="flex-1 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold h-10 rounded-xl shadow-lg shadow-[#25D366]/20"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Order via WhatsApp
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-marketplace/5 via-background to-background">
      {/* Mobile-First Header */}
      <header className="bg-gradient-to-br from-marketplace via-marketplace to-primary text-marketplace-foreground sticky top-0 z-50">
        {/* Top Bar - Always visible */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Link to="/" className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white/30 transition-colors">
                <ArrowLeft className="h-5 w-5 md:h-6 md:w-6" />
              </Link>
              <div>
                <h1 className="text-lg md:text-2xl font-bold tracking-tight">PharmaTrack</h1>
                <p className="text-[10px] md:text-sm opacity-80 -mt-0.5">Find Medicine Near You</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ExploreFlyer />
            </div>
          </div>
        </div>

        {/* Search Box - Mobile Optimized */}
        <div className="px-4 pb-4 space-y-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-marketplace/60" />
            <Input
              placeholder="Search medications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10 pr-10 h-11 md:h-14 text-sm md:text-lg bg-white text-foreground border-0 rounded-xl shadow-lg placeholder:text-muted-foreground/60"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <VoiceSearchButton onResult={handleVoiceResult} />
            </div>
          </div>
          
          {/* Location & Actions Row - Responsive */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-marketplace/60" />
              <Input
                placeholder="Location (e.g., Ikeja)"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="pl-8 h-9 text-xs md:text-sm bg-white/95 text-foreground border-0 rounded-lg placeholder:text-muted-foreground/60"
              />
            </div>
            <CustomerBarcodeScanner onScan={handleBarcodeScanned} />
            <Button 
              onClick={() => handleSearch()} 
              disabled={isLoading}
              className="bg-white text-marketplace hover:bg-white/90 font-semibold h-9 px-4 md:px-6 text-sm shadow-md"
            >
              {isLoading ? "..." : "Go"}
            </Button>
          </div>
        </div>
      </header>

      {/* Install App Banner - Mobile Optimized */}
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gradient-to-r from-primary to-marketplace text-white overflow-hidden"
          >
            <div className="px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <span className="text-xs md:text-sm font-medium">Install for faster access</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  onClick={handleInstallApp}
                  className="bg-white text-marketplace hover:bg-white/90 h-7 px-3 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Install
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowInstallBanner(false)}
                  className="text-white hover:bg-white/10 h-7 w-7"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content - Mobile First */}
      <main className="container mx-auto max-w-4xl px-3 md:px-4 py-4 md:py-6">
        {/* Categories with inline sort */}
        <CategoryChips 
          onCategorySelect={handleCategorySelect} 
          selectedCategory={selectedCategory} 
        />

        {/* Spotlight & Essentials - Always visible when not searching */}
        {!hasSearched && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <SpotlightSection onOrder={handleWhatsAppOrder} />
            <NearbyEssentials onOrder={handleWhatsAppOrder} />
          </motion.div>
        )}

        {/* Empty State - Premium Design */}
        {!hasSearched ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8 md:py-12"
          >
            <div className="h-20 w-20 md:h-28 md:w-28 mx-auto mb-5 md:mb-6 rounded-3xl bg-gradient-to-br from-marketplace/20 to-primary/20 flex items-center justify-center shadow-xl shadow-marketplace/10">
              <Search className="h-10 w-10 md:h-14 md:w-14 text-marketplace" />
            </div>
            <h2 className="text-xl md:text-3xl font-bold text-foreground mb-2">Find Your Medication</h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto px-4 mb-6">
              Search for any medication and order directly via WhatsApp!
            </p>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 px-4 mt-6">
              <div className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                <Shield className="h-3.5 w-3.5 text-success" />
                <span>Verified Pharmacies</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>Real-time Stock</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                <Heart className="h-3.5 w-3.5 text-destructive" />
                <span>Trusted Service</span>
              </div>
            </div>
          </motion.div>
        ) : isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse rounded-2xl border-0 shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="h-6 bg-muted rounded-lg flex-1" />
                    <div className="h-6 bg-muted rounded-full w-24" />
                  </div>
                  <div className="h-20 bg-muted/50 rounded-xl mb-4" />
                  <div className="h-10 bg-muted rounded-xl" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : medications.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="text-center py-12">
              <div className="h-24 w-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-lg">
                <Package className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">No Results Found</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                We couldn't find "{searchQuery}" in any nearby pharmacies. 
                Try a different search term or request this drug below.
              </p>
            </div>
            <RequestDrugButton searchQuery={searchQuery} />
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <p className="text-sm md:text-base text-muted-foreground">
                Found <span className="font-bold text-foreground">{medications.length}</span> result{medications.length !== 1 ? 's' : ''} for "<span className="font-medium text-foreground">{searchQuery}</span>"
              </p>
              {latitude && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Navigation className="h-3 w-3" />
                  Location active
                </Badge>
              )}
            </div>
            
            {/* Results Grid */}
            <div className="space-y-3 md:space-y-4">
              {medications.map((medication, index) => (
                <MedicationCard 
                  key={`${medication.id}-${medication.pharmacy_id}`} 
                  medication={medication}
                  index={index}
                />
              ))}
            </div>
          </motion.div>
        )}
      </main>

      {/* Premium Footer */}
      <footer className="bg-gradient-to-t from-muted/80 to-muted/30 py-10 mt-auto border-t border-border/50">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-marketplace to-primary flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-foreground">PharmaTrack</span>
              </div>
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} PharmaTrack. Connecting patients to pharmacies.
              </p>
            </div>
            
            <div className="flex flex-col items-center md:items-end gap-2">
              <Link 
                to="/auth" 
                className="inline-flex items-center gap-2 text-sm text-marketplace hover:underline font-medium group"
              >
                <Store className="h-4 w-4" />
                List your pharmacy
                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-success" />
                  Secure
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  Real-time
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Explore;