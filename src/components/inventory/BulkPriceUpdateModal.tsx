import { useState, useMemo } from 'react';
import { Calculator, Check, X, Percent, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useMedications } from '@/hooks/useMedications';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/hooks/use-toast';
import { Medication } from '@/types/medication';

interface BulkPriceUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BulkPriceUpdateModal = ({ open, onOpenChange }: BulkPriceUpdateModalProps) => {
  const { medications, updateMedication } = useMedications();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [markupPercent, setMarkupPercent] = useState<string>('');
  const [fixedPrice, setFixedPrice] = useState<string>('');
  const [priceMode, setPriceMode] = useState<'markup' | 'fixed'>('markup');
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMedications = useMemo(() => {
    if (!searchTerm) return medications;
    const lower = searchTerm.toLowerCase();
    return medications.filter(
      (m) =>
        m.name.toLowerCase().includes(lower) ||
        m.category.toLowerCase().includes(lower)
    );
  }, [medications, searchTerm]);

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredMedications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMedications.map((m) => m.id)));
    }
  };

  const calculateNewPrice = (medication: Medication): number => {
    if (priceMode === 'fixed') {
      return parseFloat(fixedPrice) || 0;
    }
    const markup = parseFloat(markupPercent) || 0;
    const costPrice = medication.unit_price;
    return Math.round(costPrice * (1 + markup / 100));
  };

  const handleUpdate = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: 'No items selected',
        description: 'Please select at least one medication to update.',
        variant: 'destructive',
      });
      return;
    }

    if (priceMode === 'markup' && !markupPercent) {
      toast({
        title: 'Enter markup percentage',
        description: 'Please enter a markup percentage.',
        variant: 'destructive',
      });
      return;
    }

    if (priceMode === 'fixed' && !fixedPrice) {
      toast({
        title: 'Enter fixed price',
        description: 'Please enter a fixed selling price.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);
    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedIds) {
      const medication = medications.find((m) => m.id === id);
      if (!medication) continue;

      const newPrice = calculateNewPrice(medication);

      try {
        await updateMedication.mutateAsync({
          id,
          selling_price: newPrice,
        });
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setIsUpdating(false);

    if (successCount > 0) {
      toast({
        title: 'Prices Updated',
        description: `Successfully updated ${successCount} medication(s).${errorCount > 0 ? ` ${errorCount} failed.` : ''}`,
      });
    }

    if (errorCount === 0) {
      onOpenChange(false);
      setSelectedIds(new Set());
      setMarkupPercent('');
      setFixedPrice('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Bulk Price Update
          </DialogTitle>
          <DialogDescription>
            Select medications and apply markup percentage or fixed selling price.
          </DialogDescription>
        </DialogHeader>

        {/* Price Mode Selection */}
        <div className="grid grid-cols-2 gap-4 py-4">
          <div
            onClick={() => setPriceMode('markup')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              priceMode === 'markup'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Percent className="h-5 w-5 text-primary" />
              <span className="font-medium">Markup %</span>
            </div>
            <Input
              type="number"
              placeholder="e.g., 30"
              value={markupPercent}
              onChange={(e) => setMarkupPercent(e.target.value)}
              disabled={priceMode !== 'markup'}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Calculates from cost price
            </p>
          </div>

          <div
            onClick={() => setPriceMode('fixed')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              priceMode === 'fixed'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="font-medium">Fixed Price</span>
            </div>
            <Input
              type="number"
              placeholder="e.g., 500"
              value={fixedPrice}
              onChange={(e) => setFixedPrice(e.target.value)}
              disabled={priceMode !== 'fixed'}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Same price for all selected
            </p>
          </div>
        </div>

        {/* Search and Select All */}
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search medications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={selectAll}>
            {selectedIds.size === filteredMedications.length ? 'Deselect All' : 'Select All'}
          </Button>
          <Badge variant="secondary">{selectedIds.size} selected</Badge>
        </div>

        {/* Medications List */}
        <ScrollArea className="flex-1 min-h-0 max-h-[300px] border rounded-lg">
          <div className="p-2 space-y-1">
            {filteredMedications.map((medication) => {
              const isSelected = selectedIds.has(medication.id);
              const newPrice = isSelected ? calculateNewPrice(medication) : null;

              return (
                <div
                  key={medication.id}
                  onClick={() => toggleSelect(medication.id)}
                  className={`p-3 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                    isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isSelected} />
                    <div>
                      <p className="font-medium">{medication.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Cost: {formatPrice(medication.unit_price)}
                        {medication.selling_price && (
                          <span className="ml-2">
                            Current: {formatPrice(medication.selling_price)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {isSelected && newPrice !== null && (
                    <Badge className="bg-success text-success-foreground">
                      → {formatPrice(newPrice)}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={isUpdating || selectedIds.size === 0}
            className="bg-gradient-primary"
          >
            {isUpdating ? (
              'Updating...'
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Update {selectedIds.size} Items
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
