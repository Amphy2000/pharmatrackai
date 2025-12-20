import { useState } from 'react';
import { Settings, DollarSign, X } from 'lucide-react';
import { useCurrency, CurrencyCode } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export const CurrencySettings = () => {
  const { currency, exchangeRate, setCurrency, setExchangeRate } = useCurrency();
  const [open, setOpen] = useState(false);
  const [tempRate, setTempRate] = useState(exchangeRate.toString());
  const { toast } = useToast();

  const handleSave = () => {
    const rate = parseFloat(tempRate);
    if (isNaN(rate) || rate <= 0) {
      toast({
        title: 'Invalid Exchange Rate',
        description: 'Please enter a valid positive number',
        variant: 'destructive',
      });
      return;
    }
    setExchangeRate(rate);
    toast({
      title: 'Settings Saved',
      description: `Exchange rate set to 1 USD = ${rate.toLocaleString()} NGN`,
    });
    setOpen(false);
  };

  const handleCurrencyChange = (value: CurrencyCode) => {
    setCurrency(value);
    toast({
      title: 'Currency Changed',
      description: `Display currency set to ${value === 'NGN' ? 'Nigerian Naira (₦)' : 'US Dollar ($)'}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-xl relative">
          <Settings className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Currency Settings
          </DialogTitle>
          <DialogDescription>
            Configure display currency and exchange rate
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Currency Selection */}
          <div className="space-y-2">
            <Label>Display Currency</Label>
            <Select value={currency} onValueChange={handleCurrencyChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">
                  <span className="flex items-center gap-2">
                    <span className="font-mono">$</span> US Dollar (USD)
                  </span>
                </SelectItem>
                <SelectItem value="NGN">
                  <span className="flex items-center gap-2">
                    <span className="font-mono">₦</span> Nigerian Naira (NGN)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Exchange Rate */}
          <div className="space-y-2">
            <Label>Exchange Rate</Label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm">
                <span>1 USD</span>
                <span className="text-muted-foreground">=</span>
              </div>
              <Input
                type="number"
                value={tempRate}
                onChange={(e) => setTempRate(e.target.value)}
                placeholder="1600"
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">NGN</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Set the exchange rate for automatic price conversion
            </p>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-xl bg-muted/30 space-y-2">
            <Label className="text-xs text-muted-foreground">Preview</Label>
            <div className="flex items-center justify-between">
              <span className="text-sm">$100.00 USD</span>
              <span className="text-sm text-muted-foreground">→</span>
              <span className="text-sm font-medium text-primary">
                ₦{(100 * parseFloat(tempRate || '0')).toLocaleString('en-NG', { minimumFractionDigits: 2 })} NGN
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-gradient-primary hover:opacity-90">
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
