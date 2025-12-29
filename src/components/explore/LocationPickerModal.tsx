import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Navigation, Search, Check, Loader2 } from 'lucide-react';
import { KADUNA_NEIGHBORHOODS } from '@/data/kadunaNighborhoods';
import { motion } from 'framer-motion';

interface LocationPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectNeighborhood: (name: string) => void;
  onUseAutoDetection: () => void;
  currentNeighborhood: string | null;
  isManualSelection: boolean;
  isDetecting: boolean;
  onSubmitCustomLocation?: (location: string) => void;
}

const ZONES = [
  { key: 'central', label: 'Central', color: 'bg-blue-500' },
  { key: 'north', label: 'North', color: 'bg-green-500' },
  { key: 'south', label: 'South', color: 'bg-orange-500' },
  { key: 'west', label: 'West/New', color: 'bg-purple-500' },
] as const;

export const LocationPickerModal = ({
  open,
  onOpenChange,
  onSelectNeighborhood,
  onUseAutoDetection,
  currentNeighborhood,
  isManualSelection,
  isDetecting,
  onSubmitCustomLocation,
}: LocationPickerModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [customLocation, setCustomLocation] = useState('');

  const filteredNeighborhoods = KADUNA_NEIGHBORHOODS.filter(n =>
    n.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedByZone = ZONES.map(zone => ({
    ...zone,
    neighborhoods: filteredNeighborhoods.filter(n => n.zone === zone.key),
  })).filter(zone => zone.neighborhoods.length > 0);

  const handleSelect = (name: string) => {
    onSelectNeighborhood(name);
    onOpenChange(false);
    setShowOtherInput(false);
    setSearchQuery('');
  };

  const handleAutoDetection = () => {
    onUseAutoDetection();
    onOpenChange(false);
    setShowOtherInput(false);
    setSearchQuery('');
  };

  const handleSubmitCustom = () => {
    if (customLocation.trim()) {
      onSubmitCustomLocation?.(customLocation.trim());
      onSelectNeighborhood(customLocation.trim());
      onOpenChange(false);
      setShowOtherInput(false);
      setCustomLocation('');
      setSearchQuery('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-marketplace" />
            Choose Your Location
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Auto Detection Button */}
          <Button
            variant="outline"
            className={`w-full h-12 justify-start gap-3 ${
              !isManualSelection ? 'border-marketplace bg-marketplace/5' : ''
            }`}
            onClick={handleAutoDetection}
            disabled={isDetecting}
          >
            {isDetecting ? (
              <Loader2 className="h-5 w-5 animate-spin text-marketplace" />
            ) : (
              <Navigation className="h-5 w-5 text-marketplace" />
            )}
            <div className="text-left flex-1">
              <div className="font-medium">Use Automatic Detection</div>
              <div className="text-xs text-muted-foreground">
                {isDetecting ? 'Detecting your location...' : 'Let GPS find your neighborhood'}
              </div>
            </div>
            {!isManualSelection && currentNeighborhood && (
              <Check className="h-5 w-5 text-marketplace" />
            )}
          </Button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search neighborhoods..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Neighborhoods List */}
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {groupedByZone.map(zone => (
                <div key={zone.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`h-2 w-2 rounded-full ${zone.color}`} />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {zone.label} Kaduna
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {zone.neighborhoods.map((hood, i) => (
                      <motion.div
                        key={hood.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className={`w-full justify-start h-9 text-xs ${
                            currentNeighborhood === hood.name
                              ? 'border-marketplace bg-marketplace/10 text-marketplace'
                              : 'hover:border-marketplace/50'
                          }`}
                          onClick={() => handleSelect(hood.name)}
                        >
                          <MapPin className="h-3 w-3 mr-1.5 shrink-0" />
                          <span className="truncate">{hood.name}</span>
                          {currentNeighborhood === hood.name && (
                            <Check className="h-3 w-3 ml-auto text-marketplace" />
                          )}
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Other / Not Listed Option */}
              <div className="pt-2 border-t">
                {!showOtherInput ? (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-foreground"
                    onClick={() => setShowOtherInput(true)}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Other / My area is not listed
                  </Button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2"
                  >
                    <p className="text-xs text-muted-foreground">
                      Tell us your area - this helps us expand our coverage!
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type your area name..."
                        value={customLocation}
                        onChange={e => setCustomLocation(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSubmitCustom()}
                        className="flex-1"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={handleSubmitCustom}
                        disabled={!customLocation.trim()}
                        className="bg-marketplace hover:bg-marketplace/90"
                      >
                        Add
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>

              {filteredNeighborhoods.length === 0 && searchQuery && (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No neighborhoods found for "{searchQuery}"</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-marketplace"
                    onClick={() => {
                      setCustomLocation(searchQuery);
                      setShowOtherInput(true);
                    }}
                  >
                    Add this as a new area
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
