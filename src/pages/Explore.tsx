import { useState, useEffect } from "react";
import { Search, MapPin, MessageCircle, Package, Store, Phone, Star, AlertCircle, Download, Smartphone, Mic } from "lucide-react";
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
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

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

      setMedications(data || []);

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

  const MedicationCard = ({ medication, isFeatured = false }: { medication: PublicMedication; isFeatured?: boolean }) => (
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${isFeatured ? 'border-marketplace/50 bg-marketplace/5' : ''}`}>
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* Medication Info */}
          <div className="flex-1 p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-foreground">{medication.name}</h3>
                  {medication.is_featured && (
                    <Badge className="bg-marketplace text-marketplace-foreground gap-1">
                      <Star className="h-3 w-3" />
                      Featured
                    </Badge>
                  )}
                </div>
                <Badge variant="secondary" className="mt-1">{medication.category}</Badge>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-marketplace">
                  {formatPrice(medication.selling_price || 0)}
                </p>
                <p className="text-sm text-muted-foreground">per {medication.dispensing_unit}</p>
              </div>
            </div>
            
            {/* Price Disclaimer */}
            <div className="flex items-start gap-2 p-2 bg-warning/10 rounded-lg border border-warning/20 mb-3">
              <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Confirm price with pharmacist via WhatsApp
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Store className="h-4 w-4" />
              <span className="font-medium text-foreground">{medication.pharmacy_name}</span>
            </div>
            
            {medication.pharmacy_address && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <MapPin className="h-4 w-4" />
                <span>{medication.pharmacy_address}</span>
              </div>
            )}
            
            <Badge 
              variant="outline" 
              className="bg-success/10 text-success border-success/30"
            >
              In Stock ({medication.current_stock} available)
            </Badge>
          </div>

          {/* Action Section */}
          <div className="bg-marketplace/5 p-6 flex flex-col justify-center items-center gap-3 md:w-48">
            <Button
              onClick={() => handleWhatsAppOrder(medication)}
              className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Buy Now
            </Button>
            {medication.pharmacy_phone && (
              <a 
                href={`tel:${medication.pharmacy_phone}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="h-4 w-4" />
                {medication.pharmacy_phone}
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-marketplace/5 to-background">
      {/* Header */}
      <header className="bg-marketplace text-marketplace-foreground py-6 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">PharmaTrack</h1>
                <p className="text-sm opacity-90">Find medications near you</p>
              </div>
            </div>
            <Link to="/auth">
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                Pharmacy Login
              </Button>
            </Link>
          </div>

          {/* Search Box */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-marketplace/60" />
              <Input
                placeholder="Search for medications or say 'drug for cough'"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-12 pr-12 h-14 text-lg bg-white text-foreground border-0 rounded-xl shadow-lg"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <VoiceSearchButton onResult={handleVoiceResult} />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-marketplace/60" />
                <Input
                  placeholder="Filter by location (e.g., Ikeja, Lagos)"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="pl-10 bg-white/90 text-foreground border-0 rounded-lg"
                />
              </div>
              <CustomerBarcodeScanner onScan={handleBarcodeScanned} />
              <Button 
                onClick={() => handleSearch()} 
                disabled={isLoading}
                className="bg-white text-marketplace hover:bg-white/90 font-semibold px-8"
              >
                {isLoading ? "Searching..." : "Search"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Install App Banner */}
      {showInstallBanner && (
        <div className="bg-gradient-to-r from-marketplace to-primary text-white py-3 px-4">
          <div className="container mx-auto max-w-4xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5" />
              <span className="text-sm font-medium">Install PharmaTrack for faster access</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleInstallApp}
                className="bg-white text-marketplace hover:bg-white/90"
              >
                <Download className="h-4 w-4 mr-1" />
                Install
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowInstallBanner(false)}
                className="text-white hover:bg-white/10"
              >
                Later
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <main className="container mx-auto max-w-4xl px-4 py-8">
        {/* Category Chips - Always visible */}
        <CategoryChips 
          onCategorySelect={handleCategorySelect} 
          selectedCategory={selectedCategory} 
        />

        {/* Spotlight Section - Featured Products */}
        {!hasSearched && (
          <>
            <SpotlightSection onOrder={handleWhatsAppOrder} />
            <NearbyEssentials onOrder={handleWhatsAppOrder} />
          </>
        )}

        {!hasSearched ? (
          <div className="text-center py-16">
            <div className="h-24 w-24 mx-auto mb-6 rounded-full bg-marketplace/10 flex items-center justify-center">
              <Search className="h-12 w-12 text-marketplace" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Find Your Medication</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Search for any medication and see which pharmacies near you have it in stock. 
              Order directly via WhatsApp!
            </p>
          </div>
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