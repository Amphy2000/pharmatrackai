import { useState, useEffect } from 'react';
import { Star, Clock, Loader2, Sparkles, Zap, Crown, Check, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const DURATION_OPTIONS = [
  { value: '7', label: '7 Days', description: 'Weekly Boost', price: 1000, icon: Zap, popular: false },
  { value: '14', label: '14 Days', description: 'Stock Clearer', price: 1500, icon: Sparkles, popular: true },
  { value: '30', label: '30 Days', description: 'Store Anchor', price: 2500, icon: Crown, popular: false },
];

interface FeatureDurationSelectProps {
  medicationId: string;
  medicationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Load Paystack script dynamically
const loadPaystackScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).PaystackPop) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Paystack script'));
    document.body.appendChild(script);
  });
};

export const FeatureDurationSelect = ({
  medicationId,
  medicationName,
  open,
  onOpenChange,
}: FeatureDurationSelectProps) => {
  const [duration, setDuration] = useState<string>('14');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paystackReady, setPaystackReady] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatPrice } = useCurrency();

  useEffect(() => {
    if (open) {
      loadPaystackScript()
        .then(() => setPaystackReady(true))
        .catch(console.error);
    }
  }, [open]);

  const calculateExpiryDate = (days: number) => {
    return addDays(new Date(), days);
  };

  const handlePayWithPaystack = async () => {
    setIsSubmitting(true);
    try {
      // Initialize payment on the backend
      const { data: paymentData, error } = await supabase.functions.invoke('create-featured-payment', {
        body: {
          medication_id: medicationId,
          medication_name: medicationName,
          duration: parseInt(duration, 10),
          callback_url: window.location.href,
        },
      });

      if (error) throw error;
      if (!paymentData) throw new Error('Failed to initialize payment');

      const selectedOption = DURATION_OPTIONS.find(o => o.value === duration);

      // Open Paystack inline popup
      const handler = (window as any).PaystackPop.setup({
        key: paymentData.key || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email: paymentData.email,
        amount: selectedOption!.price * 100, // Convert to kobo
        ref: paymentData.reference,
        currency: 'NGN',
        channels: ['card', 'bank', 'ussd', 'bank_transfer'],
        metadata: {
          medication_id: medicationId,
          medication_name: medicationName,
          duration: parseInt(duration, 10),
          type: 'featured_product',
        },
        onClose: () => {
          setIsSubmitting(false);
          toast({
            title: 'Payment Cancelled',
            description: 'You closed the payment window. Try again when ready.',
            variant: 'destructive',
          });
        },
        callback: (response: any) => {
          console.log('Payment successful:', response);
          queryClient.invalidateQueries({ queryKey: ['medications'] });
          queryClient.invalidateQueries({ queryKey: ['featured-medications'] });
          onOpenChange(false);
          toast({
            title: 'Payment Successful! 🎉',
            description: `"${medicationName}" is now featured in the Spotlight for ${duration} days.`,
          });
          setIsSubmitting(false);
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error('Error initializing payment:', error);
      toast({
        title: 'Payment Error',
        description: error instanceof Error ? error.message : 'Failed to initialize payment',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const selectedDuration = DURATION_OPTIONS.find(o => o.value === duration);
  const previewDate = calculateExpiryDate(parseInt(duration, 10));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-marketplace fill-marketplace" />
            Feature This Product
          </DialogTitle>
          <DialogDescription>
            Choose how long "{medicationName}" should appear in the Spotlight section.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Pricing Cards */}
          <div className="grid gap-3">
            {DURATION_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = duration === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => setDuration(option.value)}
                  className={cn(
                    "relative w-full p-4 rounded-xl border-2 transition-all text-left",
                    isSelected 
                      ? "border-marketplace bg-marketplace/5 shadow-lg shadow-marketplace/10" 
                      : "border-border hover:border-marketplace/50 bg-card"
                  )}
                >
                  {option.popular && (
                    <Badge className="absolute -top-2.5 right-4 bg-gradient-to-r from-marketplace to-primary text-white text-[10px]">
                      Most Popular
                    </Badge>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center",
                        isSelected 
                          ? "bg-marketplace text-white" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{option.label}</span>
                          <span className="text-xs text-muted-foreground">• {option.description}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Expires: {format(calculateExpiryDate(parseInt(option.value, 10)), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-lg font-bold",
                        isSelected ? "text-marketplace" : "text-foreground"
                      )}>
                        {formatPrice(option.price)}
                      </span>
                      <div className={cn(
                        "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                        isSelected 
                          ? "border-marketplace bg-marketplace text-white" 
                          : "border-muted-foreground/30"
                      )}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Summary */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <span>Promotion Summary</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Duration:</span>
                <span className="font-medium">{selectedDuration?.label} - {selectedDuration?.description}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Featured until:</span>
                <span className="font-medium">{format(previewDate, 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
                <span className="text-sm font-medium">Total:</span>
                <span className="text-lg font-bold text-marketplace">{formatPrice(selectedDuration?.price || 0)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <CreditCard className="h-3.5 w-3.5" />
            <span>Secure payment powered by Paystack</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handlePayWithPaystack} 
            disabled={isSubmitting || !paystackReady}
            className="bg-marketplace hover:bg-marketplace/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay {formatPrice(selectedDuration?.price || 0)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
