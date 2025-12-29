import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Navigation, 
  Phone, 
  MessageCircle, 
  ExternalLink, 
  Store,
  Clock,
  CheckCircle,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getGoogleMapsLink, getApproximateCoordinates, calculateDistance } from "@/hooks/useGeolocation";
import { useCurrency } from "@/contexts/CurrencyContext";

interface Pharmacy {
  pharmacy_id: string;
  pharmacy_name: string;
  pharmacy_address: string | null;
  pharmacy_phone: string | null;
  distance?: number;
  selling_price?: number | null;
  current_stock?: number;
}

interface PharmacyMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  medication: {
    id: string;
    name: string;
    category: string;
    dispensing_unit: string;
  } | null;
  pharmacies: Pharmacy[];
  userLocation: { lat: number; lon: number } | null;
  onOrder: (pharmacy: Pharmacy) => void;
}

export const PharmacyMapModal = ({
  isOpen,
  onClose,
  medication,
  pharmacies,
  userLocation,
  onOrder,
}: PharmacyMapModalProps) => {
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const { formatPrice } = useCurrency();

  if (!medication) return null;

  // Sort pharmacies by distance
  const sortedPharmacies = [...pharmacies].sort((a, b) => {
    if (a.distance === undefined && b.distance === undefined) return 0;
    if (a.distance === undefined) return 1;
    if (b.distance === undefined) return -1;
    return a.distance - b.distance;
  });

  const openInMaps = (pharmacy: Pharmacy) => {
    const link = getGoogleMapsLink(pharmacy.pharmacy_address);
    if (link) {
      window.open(link, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-4 pb-2 border-b bg-gradient-to-r from-marketplace/10 to-primary/10">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-marketplace" />
            Pharmacies with {medication.name}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {pharmacies.length} {pharmacies.length === 1 ? 'pharmacy has' : 'pharmacies have'} this in stock
          </p>
        </DialogHeader>

        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {/* User Location Indicator */}
          {userLocation && (
            <div className="flex items-center gap-2 p-2.5 bg-success/10 rounded-xl border border-success/20 mb-3">
              <div className="h-8 w-8 rounded-full bg-success/20 flex items-center justify-center">
                <Navigation className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-xs font-medium text-success">Your location detected</p>
                <p className="text-[10px] text-muted-foreground">Pharmacies sorted by distance</p>
              </div>
            </div>
          )}

          {/* Pharmacies List */}
          <div className="space-y-2">
            {sortedPharmacies.map((pharmacy, index) => (
              <motion.div
                key={pharmacy.pharmacy_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedPharmacy?.pharmacy_id === pharmacy.pharmacy_id
                    ? 'border-marketplace bg-marketplace/5 shadow-md'
                    : 'border-border hover:border-marketplace/50 hover:bg-accent/30'
                }`}
                onClick={() => setSelectedPharmacy(pharmacy)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Store className="h-3.5 w-3.5 text-marketplace shrink-0" />
                      <h3 className="font-semibold text-sm truncate">{pharmacy.pharmacy_name}</h3>
                    </div>
                    
                    {pharmacy.pharmacy_address && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2 pl-5">
                        {pharmacy.pharmacy_address}
                      </p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap pl-5">
                      {pharmacy.distance !== undefined && (
                        <Badge 
                          className={`text-[9px] px-1.5 py-0 ${
                            pharmacy.distance <= 3 
                              ? 'bg-emerald-500 text-white' 
                              : pharmacy.distance <= 10
                              ? 'bg-amber-500 text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {pharmacy.distance < 1 
                            ? `${Math.round(pharmacy.distance * 1000)}m away` 
                            : `${pharmacy.distance.toFixed(1)}km away`
                          }
                        </Badge>
                      )}
                      {pharmacy.current_stock && (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[9px] px-1.5 py-0">
                          <CheckCircle className="h-2 w-2 mr-0.5" />
                          {pharmacy.current_stock} in stock
                        </Badge>
                      )}
                    </div>
                  </div>

                  {pharmacy.selling_price && (
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-marketplace">
                        {formatPrice(pharmacy.selling_price)}
                      </p>
                      <p className="text-[9px] text-muted-foreground">per {medication.dispensing_unit}</p>
                    </div>
                  )}
                </div>

                {/* Expanded Actions */}
                <AnimatePresence>
                  {selectedPharmacy?.pharmacy_id === pharmacy.pharmacy_id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                        <Button
                          size="sm"
                          className="flex-1 bg-[#25D366] hover:bg-[#20BD5A] text-white h-8 text-xs rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOrder(pharmacy);
                          }}
                        >
                          <MessageCircle className="h-3 w-3 mr-1" />
                          Order via WhatsApp
                        </Button>
                        
                        {pharmacy.pharmacy_phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`tel:${pharmacy.pharmacy_phone}`, '_blank');
                            }}
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        
                        {pharmacy.pharmacy_address && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              openInMaps(pharmacy);
                            }}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {pharmacies.length === 0 && (
            <div className="text-center py-8">
              <Store className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No pharmacies found</p>
            </div>
          )}
        </div>

        {/* Static Map Preview */}
        {sortedPharmacies.length > 0 && sortedPharmacies[0].pharmacy_address && (
          <div className="p-4 pt-0">
            <Button
              variant="outline"
              className="w-full h-10 text-xs font-medium rounded-xl border-dashed"
              onClick={() => openInMaps(sortedPharmacies[0])}
            >
              <MapPin className="h-3.5 w-3.5 mr-2 text-marketplace" />
              Open Nearest in Google Maps
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
