import { useState, useRef, useEffect } from 'react';
import { Plus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/hooks/use-toast';

export interface QuickItem {
  name: string;
  price: number;
  quantity: number;
}

interface QuickItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddQuickItem: (item: QuickItem) => void;
}

export const QuickItemModal = ({ open, onOpenChange, onAddQuickItem }: QuickItemModalProps) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const { formatPrice, currency } = useCurrency();
  const { toast } = useToast();
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus name input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const priceNum = parseFloat(price);
    const qtyNum = parseInt(quantity) || 1;
    
    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a product name',
        variant: 'destructive',
      });
      return;
    }
    
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({
        title: 'Invalid price',
        description: 'Please enter a valid price',
        variant: 'destructive',
      });
      return;
    }
    
    onAddQuickItem({
      name: name.trim(),
      price: priceNum,
      quantity: qtyNum,
    });
    
    // Reset form
    setName('');
    setPrice('');
    setQuantity('1');
    onOpenChange(false);
    
    toast({
      title: 'Quick Item Added',
      description: `${name} added to cart. Will be saved for manager review.`,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name && price) {
      handleSubmit(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Quick Item (Express Sale)
          </DialogTitle>
          <DialogDescription>
            Add an unlisted item. Manager will review inventory details later.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="quick-name">Product Name *</Label>
            <Input
              id="quick-name"
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., P-mol, Vitamin C"
              className="h-11"
              autoComplete="off"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quick-price">Price ({currency}) *</Label>
              <Input
                id="quick-price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="0.00"
                className="h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quick-qty">Quantity</Label>
              <Input
                id="quick-qty"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-11"
              />
            </div>
          </div>
          
          {name && price && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-bold text-primary">
                  {formatPrice(parseFloat(price || '0') * parseInt(quantity || '1'))}
                </span>
              </div>
            </div>
          )}
        </form>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="gap-2">
            <Plus className="h-4 w-4" />
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
