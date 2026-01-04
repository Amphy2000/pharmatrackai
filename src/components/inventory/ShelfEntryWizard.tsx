import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMedications } from '@/hooks/useMedications';
import { usePharmacy } from '@/hooks/usePharmacy';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  Check, 
  Package, 
  Calendar,
  Zap,
  ArrowRight,
  Sparkles,
  Volume2
} from 'lucide-react';
import { format, addYears } from 'date-fns';

interface ShelfEntry {
  id: string;
  name: string;
  quantity: string;
  saved: boolean;
}

interface ShelfEntryWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_EXPIRY_OPTIONS = [
  { label: '+1 Year', months: 12 },
  { label: '+2 Years', months: 24 },
  { label: '+3 Years', months: 36 },
];

export const ShelfEntryWizard = ({ open, onOpenChange }: ShelfEntryWizardProps) => {
  const { addMedication } = useMedications();
  const { pharmacy } = usePharmacy();
  
  const [entries, setEntries] = useState<ShelfEntry[]>([
    { id: '1', name: '', quantity: '', saved: false },
  ]);
  const [sharedExpiry, setSharedExpiry] = useState(() => {
    return format(addYears(new Date(), 2), 'yyyy-MM-dd');
  });
  const [skipCosts, setSkipCosts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio for feedback beep
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQomZsT/6q5ACDOY2OamdBonJLv/x3scCjOk/uyuRgwjfuD5pU4AD2y+9axJChNqxPOrQQsOYM38sD8LCl/V/rA2CglZ2f6xLgsFWOD+si8JBFrn/rQwCANb6v61MggCXu/+tzMIAWD0/rg1CAFi+P66NggBZP3/vDgIAWb//705CABo//++OwgAav//wDwIAGz//8E+CABu//7CQAgAcP/+xEEIAHH//sVDCABy//7GRQgAc//+x0cIAHT//shJCAB1//7KSwgAdv/+y00IAHX//stPCAB0//7MVQgAc//+zFcIAHH//sxZCABv//7LXAgAa//+y14IAGj//sphCABk//7KYwgAYf/+ymYIAF///splCABe//7JZQgAXf/+yWUIAF3//sllCABd//7JZQgAXf/+yWUIAF3//sllCABd//7JZQgAXf/+yWU=');
  }, []);

  const playBeep = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const savedCount = entries.filter(e => e.saved).length;
  const progressPercent = entries.length > 0 ? (savedCount / entries.length) * 100 : 0;

  const handleExpiryPreset = (months: number) => {
    const newDate = new Date();
    newDate.setMonth(newDate.getMonth() + months);
    setSharedExpiry(format(newDate, 'yyyy-MM-dd'));
  };

  const addNewRow = () => {
    const newId = Date.now().toString();
    setEntries(prev => [...prev, { id: newId, name: '', quantity: '', saved: false }]);
    // Focus the new row after render
    setTimeout(() => {
      const input = inputRefs.current.get(`name-${newId}`);
      input?.focus();
    }, 50);
  };

  const updateEntry = (id: string, field: 'name' | 'quantity', value: string) => {
    setEntries(prev => prev.map(e => 
      e.id === id ? { ...e, [field]: value, saved: false } : e
    ));
  };

  const removeEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, id: string, field: 'name' | 'quantity') => {
    const entry = entries.find(en => en.id === id);
    
    if (e.key === 'Tab' && !e.shiftKey && field === 'quantity') {
      // Tab from quantity field
      const currentIndex = entries.findIndex(en => en.id === id);
      const isLastRow = currentIndex === entries.length - 1;
      
      if (isLastRow && entry?.name && entry?.quantity) {
        // Add new row if current has data
        e.preventDefault();
        addNewRow();
      }
    }
    
    if (e.key === 'Enter') {
      e.preventDefault();
      if (field === 'name') {
        // Move to quantity field
        const qtyInput = inputRefs.current.get(`qty-${id}`);
        qtyInput?.focus();
      } else if (field === 'quantity' && entry?.name && entry?.quantity) {
        // Add new row
        addNewRow();
      }
    }
  };

  const handleSaveAll = async () => {
    const unsavedEntries = entries.filter(e => e.name.trim() && e.quantity.trim() && !e.saved);
    
    if (unsavedEntries.length === 0) {
      toast.info('No new items to save');
      return;
    }

    setIsSaving(true);
    let successCount = 0;

    for (const entry of unsavedEntries) {
      try {
        await addMedication.mutateAsync({
          name: entry.name.trim(),
          current_stock: parseInt(entry.quantity, 10) || 0,
          expiry_date: sharedExpiry,
          batch_number: `SHELF-${Date.now().toString(36).toUpperCase()}`,
          unit_price: skipCosts ? 0 : 0,
          category: 'Other',
          reorder_level: 10,
          dispensing_unit: 'unit',
          is_controlled: false,
        });
        
        setEntries(prev => prev.map(e => 
          e.id === entry.id ? { ...e, saved: true } : e
        ));
        successCount++;
        playBeep();
      } catch (error) {
        console.error(`Failed to save ${entry.name}:`, error);
      }
    }

    setIsSaving(false);
    
    if (successCount > 0) {
      toast.success(`${successCount} products added to inventory!`, {
        description: skipCosts ? 'Remember to add cost prices later from invoices' : undefined,
      });
    }
  };

  const handleClose = () => {
    // Reset state
    setEntries([{ id: '1', name: '', quantity: '', saved: false }]);
    setSharedExpiry(format(addYears(new Date(), 2), 'yyyy-MM-dd'));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-display">Shelf Entry Wizard</DialogTitle>
              <DialogDescription>
                Fast entry mode — just type product name and quantity
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 space-y-4 min-h-0">
          {/* Shared Expiry Date */}
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Shared Expiry:</Label>
            <Input
              type="date"
              value={sharedExpiry}
              onChange={(e) => setSharedExpiry(e.target.value)}
              className="w-40 h-8"
            />
            <div className="flex gap-1 ml-auto">
              {PRESET_EXPIRY_OPTIONS.map((preset) => (
                <Button
                  key={preset.months}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleExpiryPreset(preset.months)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3">
            <Progress value={progressPercent} className="flex-1 h-2" />
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {savedCount} saved
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 w-7 p-0 ${soundEnabled ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Entry Table */}
          <div className="border rounded-lg">
            <div className="p-3 space-y-2">
              {/* Header */}
              <div className="grid grid-cols-[1fr,100px,40px] gap-2 text-xs font-medium text-muted-foreground px-1">
                <span>Product Name</span>
                <span>Quantity</span>
                <span></span>
              </div>

              {/* Entries */}
              <AnimatePresence>
                {entries.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`grid grid-cols-[1fr,100px,40px] gap-2 items-center ${
                      entry.saved ? 'opacity-60' : ''
                    }`}
                  >
                    <Input
                      ref={(el) => {
                        if (el) inputRefs.current.set(`name-${entry.id}`, el);
                      }}
                      placeholder={`Product ${index + 1}...`}
                      value={entry.name}
                      onChange={(e) => updateEntry(entry.id, 'name', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, entry.id, 'name')}
                      disabled={entry.saved}
                      className="h-10"
                      autoFocus={index === 0}
                    />
                    <Input
                      ref={(el) => {
                        if (el) inputRefs.current.set(`qty-${entry.id}`, el);
                      }}
                      type="number"
                      placeholder="Qty"
                      value={entry.quantity}
                      onChange={(e) => updateEntry(entry.id, 'quantity', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, entry.id, 'quantity')}
                      disabled={entry.saved}
                      className="h-10"
                      min="0"
                    />
                    <div className="flex justify-center">
                      {entry.saved ? (
                        <div className="h-8 w-8 rounded-full bg-success/20 flex items-center justify-center">
                          <Check className="h-4 w-4 text-success" />
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeEntry(entry.id)}
                          disabled={entries.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add More Button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-10 border border-dashed border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50"
                onClick={addNewRow}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add another row (or press Tab/Enter)
              </Button>
            </div>
          </div>

          {/* Skip Costs Option */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Checkbox 
              id="skip-costs" 
              checked={skipCosts}
              onCheckedChange={(checked) => setSkipCosts(!!checked)}
            />
            <Label htmlFor="skip-costs" className="text-sm cursor-pointer flex-1">
              <span className="font-medium">Skip cost prices</span>
              <span className="text-muted-foreground ml-1">— I'll add them later from invoices</span>
            </Label>
            <Badge variant="outline" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              Faster
            </Badge>
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 flex-shrink-0 border-t gap-2">
          <Button variant="outline" onClick={handleClose}>
            I'll finish later
          </Button>
          <Button 
            onClick={handleSaveAll} 
            disabled={isSaving || entries.every(e => e.saved || !e.name || !e.quantity)}
            className="gap-2 bg-gradient-primary hover:opacity-90"
          >
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                Save {entries.filter(e => !e.saved && e.name && e.quantity).length} Products
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
