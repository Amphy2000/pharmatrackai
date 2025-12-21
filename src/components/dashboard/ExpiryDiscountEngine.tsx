import { useMedications } from '@/hooks/useMedications';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Percent, Clock, DollarSign, TrendingDown } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { useState } from 'react';

export const ExpiryDiscountEngine = () => {
  const { medications } = useMedications();
  const { formatPrice } = useCurrency();
  const [autoDiscountEnabled, setAutoDiscountEnabled] = useState(true);

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

  return (
    <Card className="glass-card mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-warning/20 flex items-center justify-center">
              <Percent className="h-5 w-5 text-warning" />
            </div>
            <div>
              <CardTitle className="text-lg">Expiry Discount Engine</CardTitle>
              <CardDescription>Recover value from expiring stock with smart discounts</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch 
                id="auto-discount" 
                checked={autoDiscountEnabled}
                onCheckedChange={setAutoDiscountEnabled}
              />
              <Label htmlFor="auto-discount" className="text-sm">
                Auto-suggest at POS
              </Label>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-muted-foreground">At Risk</p>
            </div>
            <p className="text-2xl font-bold text-destructive">{formatPrice(totalAtRisk)}</p>
          </div>
          <div className="p-4 rounded-xl bg-success/10 border border-success/20">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-success" />
              <p className="text-sm text-muted-foreground">Recoverable</p>
            </div>
            <p className="text-2xl font-bold text-success">{formatPrice(totalRecoverable)}</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Products</p>
            </div>
            <p className="text-2xl font-bold">{expiringProducts.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-warning" />
              <p className="text-sm text-muted-foreground">Avg Discount</p>
            </div>
            <p className="text-2xl font-bold text-warning">
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
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    product.daysUntilExpiry <= 14 
                      ? 'bg-destructive/5 border-destructive/20' 
                      : 'bg-muted/30 border-border'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{product.name}</p>
                      <Badge variant="outline" className={getUrgencyColor(product.daysUntilExpiry)}>
                        {getUrgencyLabel(product.daysUntilExpiry)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Expires: {format(new Date(product.expiryDate), 'MMM dd, yyyy')}</span>
                      <span>{product.daysUntilExpiry} days left</span>
                      <span>{product.currentStock} units</span>
                      <span>Batch: {product.batchNumber}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground line-through">
                        {formatPrice(product.originalPrice)}
                      </p>
                      <p className="text-lg font-bold text-success">
                        {formatPrice(product.discountedPrice)}
                      </p>
                    </div>
                    <Badge className="bg-gradient-primary text-primary-foreground h-10 px-4 text-lg">
                      -{product.suggestedDiscount}%
                    </Badge>
                    <Button size="sm" variant="outline">
                      Apply
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
