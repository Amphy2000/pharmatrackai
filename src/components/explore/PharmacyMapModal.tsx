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
  CheckCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { getGoogleMapsLink } from "@/hooks/useGeolocation";

interface PharmacyInfo {
  pharmacy_id: string;
  pharmacy_name: string;
  pharmacy_address: string | null;
  pharmacy_phone: string | null;
  distance?: number;
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
  pharmacy: PharmacyInfo | null;
  onOrder: () => void;
}

export const PharmacyMapModal = ({
  isOpen,
  onClose,
  medication,
  pharmacy,
  onOrder,
}: PharmacyMapModalProps) => {
  if (!medication || !pharmacy) return null;

  const openInMaps = () => {
    const link = getGoogleMapsLink(pharmacy.pharmacy_address);
    if (link) {
      window.open(link, '_blank');
    }
  };

  const handleCall = () => {
    if (pharmacy.pharmacy_phone) {
      window.open(`tel:${pharmacy.pharmacy_phone}`, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-4 pb-3 border-b bg-gradient-to-r from-marketplace/10 to-primary/10">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Store className="h-4 w-4 text-marketplace" />
            {pharmacy.pharmacy_name}
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Medication Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-accent/30 border border-border/50"
          >
            <h3 className="font-semibold text-sm mb-1">{medication.name}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-full">
                {medication.category}
              </Badge>
              {pharmacy.current_stock && (
                <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px] px-1.5 py-0 rounded-full">
                  <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                  {pharmacy.current_stock} in stock
                </Badge>
              )}
            </div>
          </motion.div>

          {/* Pharmacy Details */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-2"
          >
            {pharmacy.pharmacy_address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{pharmacy.pharmacy_address}</span>
              </div>
            )}
            
            {pharmacy.distance !== undefined && (
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-marketplace shrink-0" />
                <Badge 
                  className={`text-xs px-2 py-0.5 ${
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
              </div>
            )}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-2 pt-2"
          >
            <Button
              className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white h-11 text-sm font-semibold rounded-xl shadow-sm"
              onClick={onOrder}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Order via WhatsApp
            </Button>
            
            <div className="flex gap-2">
              {pharmacy.pharmacy_phone && (
                <Button
                  variant="outline"
                  className="flex-1 h-10 rounded-xl"
                  onClick={handleCall}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
              )}
              
              {pharmacy.pharmacy_address && (
                <Button
                  variant="outline"
                  className="flex-1 h-10 rounded-xl border-marketplace/30 hover:bg-marketplace/10 hover:border-marketplace"
                  onClick={openInMaps}
                >
                  <ExternalLink className="h-4 w-4 mr-2 text-marketplace" />
                  Get Directions
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
