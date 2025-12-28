import { useState, useEffect } from "react";
import { Search, MapPin, MessageCircle, Package, Store, Phone, Star, AlertCircle, Download, Smartphone, X, Menu, ChevronRight, ArrowLeft } from "lucide-react";
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
import { DistanceFilter, DistanceRadius, SortOption } from "@/components/explore/DistanceFilter";
import { ExploreFlyer } from "@/components/explore/ExploreFlyer";
import { motion, AnimatePresence } from "framer-motion";
import { useGeolocation, calculateDistance, getApproximateCoordinates } from "@/hooks/useGeolocation";

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
}

const Explore = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [medications, setMedications] = useState<PublicMedication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [distanceRadius, setDistanceRadius] = useState<DistanceRadius>('all');
  const [sortOption, setSortOption] = useState<SortOption>('distance');
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

      // Apply distance filter
      if (distanceRadius !== 'all' && latitude && longitude) {
        processedMeds = processedMeds.filter((med: any) => 
          med.distance === undefined || med.distance <= distanceRadius
        );
      }

      // Apply sorting
      processedMeds = processedMeds.sort((a: any, b: any) => {
        switch (sortOption) {
          case 'distance':
            if (a.distance === undefined && b.distance === undefined) return 0;
            if (a.distance === undefined) return 1;
            if (b.distance === undefined) return -1;
            return a.distance - b.distance;
          case 'price-low':
            return (a.selling_price || 0) - (b.selling_price || 0);
          case 'price-high':
            return (b.selling_price || 0) - (a.selling_price || 0);
          case 'availability':
            return b.current_stock - a.current_stock;
          default:
            return 0;
        }
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

  // Mobile-optimized Medication Card
  const MedicationCard = ({ medication, isFeatured = false }: { medication: PublicMedication; isFeatured?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`overflow-hidden hover:shadow-lg transition-all ${isFeatured ? 'border-marketplace/50 bg-marketplace/5' : ''}`}>
        <CardContent className="p-0">
          {/* Mobile-first layout */}
          <div className="p-4 md:p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-lg md:text-xl font-bold text-foreground truncate">{medication.name}</h3>
                  {medication.is_featured && (
                    <Badge className="bg-marketplace text-marketplace-foreground gap-1 shrink-0">
                      <Star className="h-3 w-3" />
                      Featured
                    </Badge>
                  )}
                </div>
                <Badge variant="secondary" className="text-xs">{medication.category}</Badge>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl md:text-2xl font-bold text-marketplace">
                  {formatPrice(medication.selling_price || 0)}
                </p>
                <p className="text-xs text-muted-foreground">/{medication.dispensing_unit}</p>
              </div>
            </div>
            
            {/* Compact Price Disclaimer */}
            <div className="flex items-center gap-2 p-2 bg-warning/10 rounded-lg border border-warning/20 mb-3">
              <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0" />
              <p className="text-[11px] text-muted-foreground">Confirm price with pharmacist</p>
            </div>
            
            {/* Pharmacy Info - Compact */}
            <div className="space-y-1.5 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium text-foreground truncate">{medication.pharmacy_name}</span>
              </div>
              
              {medication.pharmacy_address && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{medication.pharmacy_address}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between gap-3">
              <Badge 
                variant="outline" 
                className="bg-success/10 text-success border-success/30 text-xs"
              >
                {medication.current_stock} in stock
              </Badge>
              
              {/* Mobile-friendly Action Button */}
              <div className="flex items-center gap-2">
                {medication.pharmacy_phone && (
                  <a 
                    href={`tel:${medication.pharmacy_phone}`}
                    className="h-9 w-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                  >
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </a>
                )}
                <Button
                  onClick={() => handleWhatsAppOrder(medication)}
                  className="bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold h-9 px-4"
                  size="sm"
                >
                  <MessageCircle className="mr-1.5 h-4 w-4" />
                  <span className="hidden sm:inline">Buy Now</span>
                  <span className="sm:hidden">Order</span>
                </Button>
              </div>
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
      <main className="container mx-auto max-w-4xl px-3 md:px-4 py-4 md:py-8">
        {/* Filter Bar - Always visible */}
        <div className="flex items-center justify-between mb-4">
          <CategoryChips 
            onCategorySelect={handleCategorySelect} 
            selectedCategory={selectedCategory} 
          />
          <DistanceFilter
            selectedRadius={distanceRadius}
            selectedSort={sortOption}
            onRadiusChange={setDistanceRadius}
            onSortChange={setSortOption}
            locationEnabled={!!latitude}
            onEnableLocation={requestLocation}
          />
        </div>

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

        {/* Empty State - Hidden when there's content above */}
        {!hasSearched ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8 md:py-16"
          >
            <div className="h-16 w-16 md:h-24 md:w-24 mx-auto mb-4 md:mb-6 rounded-full bg-gradient-to-br from-marketplace/20 to-primary/20 flex items-center justify-center">
              <Search className="h-8 w-8 md:h-12 md:w-12 text-marketplace" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">Find Your Medication</h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto px-4">
              Search for any medication and order directly via WhatsApp!
            </p>
          </motion.div>
        ) : isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded w-1/3 mb-4" />
                  <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : medications.length === 0 ? (
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="h-24 w-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <Package className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">No Results Found</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                We couldn't find "{searchQuery}" in any nearby pharmacies. 
                Try a different search term or request this drug below.
              </p>
            </div>
            <RequestDrugButton searchQuery={searchQuery} />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Found <span className="font-semibold text-foreground">{medications.length}</span> result{medications.length !== 1 ? 's' : ''} for "{searchQuery}"
            </p>
            
            {medications.map((medication) => (
              <MedicationCard 
                key={`${medication.id}-${medication.pharmacy_id}`} 
                medication={medication} 
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-muted/50 py-8 mt-auto">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 PharmaTrack. Connecting patients to pharmacies.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Are you a pharmacy owner?{" "}
            <Link to="/auth" className="text-marketplace hover:underline font-medium">
              List your products here
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Explore;