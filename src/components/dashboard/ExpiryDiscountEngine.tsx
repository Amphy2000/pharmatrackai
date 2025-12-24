import { useMedications } from '@/hooks/useMedications';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Percent, Clock, DollarSign, TrendingDown, Loader2 } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export const ExpiryDiscountEngine = () => {
  const { medications, updateMedication } = useMedications();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const [autoDiscountEnabled, setAutoDiscountEnabled] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  // Find products expiring within 60 days
  const today = new Date();
  
  const expiringProducts = (medications || [])
    .map(med => {
      const expiryDate = new Date(med.expiry_date);
      const daysUntilExpiry = differenceInDays(expiryDate, today);
      
      // Calculate suggested discount based on urgency
      let suggestedDiscount = 0;
      if (daysUntilExpiry <= 14) {
        suggestedDiscount = 30; // 30% off for 2 weeks or less
      } else if (daysUntilExpiry <= 30) {
        suggestedDiscount = 20; // 20% off for 1 month
      } else if (daysUntilExpiry <= 60) {
        suggestedDiscount = 10; // 10% off for 2 months
      }
      
      const originalValue = (med.selling_price || med.unit_price) * med.current_stock;
      const discountedPrice = (med.selling_price || med.unit_price) * (1 - suggestedDiscount / 100);
      const potentialRecovery = discountedPrice * med.current_stock;
      const lossIfExpired = originalValue;
      
      return {
        id: med.id,
        name: med.name,
        expiryDate: med.expiry_date,
        daysUntilExpiry,
        currentStock: med.current_stock,
        originalPrice: med.selling_price || med.unit_price,
        suggestedDiscount,
        discountedPrice,
        originalValue,
        potentialRecovery,
        lossIfExpired,
        batchNumber: med.batch_number,
      };
    })
    .filter(p => p.daysUntilExpiry > 0 && p.daysUntilExpiry <= 60 && p.currentStock > 0)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  // Calculate totals
  const totalAtRisk = expiringProducts.reduce((sum, p) => sum + p.lossIfExpired, 0);
  const totalRecoverable = expiringProducts.reduce((sum, p) => sum + p.potentialRecovery, 0);
  const potentialLossPrevented = totalRecoverable;

  const getUrgencyColor = (days: number) => {
    if (days <= 14) return 'bg-destructive/10 text-destructive border-destructive/20';
    if (days <= 30) return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-primary/10 text-primary border-primary/20';
  };

  const getUrgencyLabel = (days: number) => {
    if (days <= 14) return 'Critical';
    if (days <= 30) return 'Urgent';
    return 'Soon';
  };

  // Apply discount to a medication
  const handleApplyDiscount = async (product: typeof expiringProducts[0]) => {
    setApplyingId(product.id);
    try {
      await updateMedication.mutateAsync({
        id: product.id,
        selling_price: product.discountedPrice,
      });
      toast({
        title: 'Discount applied',
        description: `${product.name} now sells at ${formatPrice(product.discountedPrice)} (${product.suggestedDiscount}% off)`,
      });
    } catch (error) {
      toast({
        title: 'Failed to apply discount',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <Card className="glass-card mb-8">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-warning/20 flex items-center justify-center flex-shrink-0">
              <Percent className="h-5 w-5 text-warning" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">Expiry Discount Engine</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Recover value from expiring stock</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-13 sm:ml-0">
            <Switch 
              id="auto-discount" 
              checked={autoDiscountEnabled}
              onCheckedChange={setAutoDiscountEnabled}
            />
            <Label htmlFor="auto-discount" className="text-xs sm:text-sm">
              Auto-suggest at POS
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats - Mobile Responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 rounded-xl bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
              <p className="text-xs sm:text-sm text-muted-foreground">At Risk</p>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-destructive">{formatPrice(totalAtRisk)}</p>
          </div>
          <div className="p-3 sm:p-4 rounded-xl bg-success/10 border border-success/20">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
              <p className="text-xs sm:text-sm text-muted-foreground">Recoverable</p>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-success">{formatPrice(totalRecoverable)}</p>
          </div>
          <div className="p-3 sm:p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <p className="text-xs sm:text-sm text-muted-foreground">Products</p>
            </div>
            <p className="text-lg sm:text-2xl font-bold">{expiringProducts.length}</p>
          </div>
          <div className="p-3 sm:p-4 rounded-xl bg-warning/10 border border-warning/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-warning" />
              <p className="text-xs sm:text-sm text-muted-foreground">Avg Discount</p>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-warning">
              {expiringProducts.length > 0 
                ? Math.round(expiringProducts.reduce((sum, p) => sum + p.suggestedDiscount, 0) / expiringProducts.length)
                : 0}%
            </p>
          </div>
        </div>

        {/* Products List */}
        {expiringProducts.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Suggested Discounts</h4>
            <div className="grid gap-3">
              {expiringProducts.slice(0, 6).map((product) => (
                <div 
                  key={product.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl border gap-3 ${
                    product.daysUntilExpiry <= 14 
                      ? 'bg-destructive/5 border-destructive/20' 
                      : 'bg-muted/30 border-border'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-medium text-sm sm:text-base truncate">{product.name}</p>
                      <Badge variant="outline" className={`text-xs ${getUrgencyColor(product.daysUntilExpiry)}`}>
                        {getUrgencyLabel(product.daysUntilExpiry)}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      <span>{product.daysUntilExpiry}d left</span>
                      <span>{product.currentStock} units</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 justify-between sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-muted-foreground line-through">
                        {formatPrice(product.originalPrice)}
                      </p>
                      <p className="text-sm sm:text-lg font-bold text-success">
                        {formatPrice(product.discountedPrice)}
                      </p>
                    </div>
                    <Badge className="bg-gradient-primary text-primary-foreground h-8 sm:h-10 px-2 sm:px-4 text-sm sm:text-lg">
                      -{product.suggestedDiscount}%
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled={applyingId === product.id}
                      onClick={() => handleApplyDiscount(product)}
                      className="h-8 sm:h-9"
                    >
                      {applyingId === product.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Apply'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {expiringProducts.length > 6 && (
              <Button variant="outline" className="w-full">
                View All {expiringProducts.length} Products
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Percent className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No products expiring within 60 days. Great inventory management!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
