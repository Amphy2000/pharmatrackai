import { useState, useMemo } from 'react';
import { Package, TrendingDown, AlertTriangle, Calendar, DollarSign, Percent, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Medication } from '@/types/medication';
import { useCurrency } from '@/contexts/CurrencyContext';
import { differenceInDays, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SlowMovingProductsPanelProps {
  medications: Medication[];
  salesData?: { medication_id: string; quantity: number; sale_date: string }[];
}

interface SlowMovingItem {
  medication: Medication;
  daysInStock: number;
  expiresInDays: number;
  valueAtRisk: number;
  suggestedDiscount: number;
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
}

export const SlowMovingProductsPanel = ({ medications, salesData = [] }: SlowMovingProductsPanelProps) => {
  const { formatPrice } = useCurrency();
  const [showAll, setShowAll] = useState(false);

  const slowMovingItems = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Calculate sales velocity for each medication
    const salesByMedication = new Map<string, number>();
    salesData.forEach(sale => {
      const saleDate = new Date(sale.sale_date);
      if (saleDate >= thirtyDaysAgo) {
        salesByMedication.set(
          sale.medication_id, 
          (salesByMedication.get(sale.medication_id) || 0) + sale.quantity
        );
      }
    });

    const items: SlowMovingItem[] = medications
      .filter(med => med.current_stock > 0 && med.is_shelved)
      .map(med => {
        const expiryDate = new Date(med.expiry_date);
        const createdDate = new Date(med.created_at);
        const daysInStock = differenceInDays(today, createdDate);
        const expiresInDays = differenceInDays(expiryDate, today);
        const salesLast30Days = salesByMedication.get(med.id) || 0;
        const sellingPrice = Number(med.selling_price || med.unit_price);
        const valueAtRisk = med.current_stock * sellingPrice;
        
        // Calculate daily sales rate
        const dailySalesRate = salesLast30Days / 30;
        const daysToSellCurrent = dailySalesRate > 0 ? med.current_stock / dailySalesRate : Infinity;
        
        // Determine urgency and suggested discount
        let urgencyLevel: SlowMovingItem['urgencyLevel'] = 'low';
        let suggestedDiscount = 0;
        let reason = '';
        
        // Check if item will expire before it can sell at current rate
        if (expiresInDays <= 0) {
          urgencyLevel = 'critical';
          suggestedDiscount = 50;
          reason = 'Expired - remove from shelves immediately';
        } else if (expiresInDays <= 30 && daysToSellCurrent > expiresInDays) {
          urgencyLevel = 'critical';
          suggestedDiscount = 40;
          reason = `Expires in ${expiresInDays} days - won't sell at current rate`;
        } else if (expiresInDays <= 60 && daysToSellCurrent > expiresInDays) {
          urgencyLevel = 'high';
          suggestedDiscount = 30;
          reason = `Expiring soon - ${Math.round(daysToSellCurrent - expiresInDays)} extra days of stock`;
        } else if (dailySalesRate === 0 && daysInStock > 60) {
          urgencyLevel = 'high';
          suggestedDiscount = 25;
          reason = `Zero sales in 30 days - ${daysInStock} days old`;
        } else if (dailySalesRate < 0.1 && daysInStock > 30) {
          urgencyLevel = 'medium';
          suggestedDiscount = 15;
          reason = `Very slow sales - ${salesLast30Days} units in 30 days`;
        } else if (daysToSellCurrent > 180) {
          urgencyLevel = 'low';
          suggestedDiscount = 10;
          reason = 'Overstocked - will take 6+ months to sell';
        } else {
          return null; // Not slow moving
        }

        return {
          medication: med,
          daysInStock,
          expiresInDays,
          valueAtRisk,
          suggestedDiscount,
          urgencyLevel,
          reason,
        };
      })
      .filter((item): item is SlowMovingItem => item !== null)
      .sort((a, b) => {
        // Sort by urgency then by value at risk
        const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        if (urgencyOrder[a.urgencyLevel] !== urgencyOrder[b.urgencyLevel]) {
          return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
        }
        return b.valueAtRisk - a.valueAtRisk;
      });

    return items;
  }, [medications, salesData]);

  const displayItems = showAll ? slowMovingItems : slowMovingItems.slice(0, 5);
  
  const totalValueAtRisk = slowMovingItems.reduce((sum, item) => sum + item.valueAtRisk, 0);
  const criticalCount = slowMovingItems.filter(i => i.urgencyLevel === 'critical').length;
  const highCount = slowMovingItems.filter(i => i.urgencyLevel === 'high').length;

  const urgencyStyles = {
    critical: {
      bg: 'bg-destructive/10 border-destructive/30',
      badge: 'bg-destructive text-destructive-foreground',
      icon: 'text-destructive',
    },
    high: {
      bg: 'bg-warning/10 border-warning/30',
      badge: 'bg-warning text-warning-foreground',
      icon: 'text-warning',
    },
    medium: {
      bg: 'bg-primary/10 border-primary/30',
      badge: 'bg-primary/20 text-primary',
      icon: 'text-primary',
    },
    low: {
      bg: 'bg-muted/50 border-muted',
      badge: 'bg-muted text-muted-foreground',
      icon: 'text-muted-foreground',
    },
  };

  if (slowMovingItems.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-success" />
            </div>
            Slow-Moving Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Package className="h-10 w-10 text-success mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              All products are selling well! No slow-moving inventory detected.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-warning" />
            </div>
            <div>
              <span>AI: Slow-Moving Products</span>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                Items at risk of expiry or overstock
              </p>
            </div>
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <DollarSign className="h-3 w-3" />
            {formatPrice(totalValueAtRisk)} at risk
          </Badge>
        </div>
        
        {/* Quick Stats */}
        <div className="flex items-center gap-2 mt-3">
          {criticalCount > 0 && (
            <Badge className="bg-destructive text-destructive-foreground gap-1">
              <AlertTriangle className="h-3 w-3" />
              {criticalCount} Critical
            </Badge>
          )}
          {highCount > 0 && (
            <Badge className="bg-warning text-warning-foreground gap-1">
              {highCount} High Priority
            </Badge>
          )}
          <Badge variant="outline">
            {slowMovingItems.length} items total
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {displayItems.map((item, index) => (
          <div
            key={item.medication.id}
            className={cn(
              'p-3 rounded-lg border transition-all',
              urgencyStyles[item.urgencyLevel].bg
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                item.urgencyLevel === 'critical' ? 'bg-destructive/20' :
                item.urgencyLevel === 'high' ? 'bg-warning/20' :
                'bg-muted'
              )}>
                <Package className={cn('h-4 w-4', urgencyStyles[item.urgencyLevel].icon)} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm truncate">{item.medication.name}</h4>
                  <Badge className={cn('text-[10px] shrink-0', urgencyStyles[item.urgencyLevel].badge)}>
                    {item.urgencyLevel.toUpperCase()}
                  </Badge>
                </div>
                
                <p className="text-xs text-muted-foreground mb-2">{item.reason}</p>
                
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <span className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    {item.medication.current_stock} units
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Expires {item.expiresInDays <= 0 ? 'EXPIRED' : `in ${item.expiresInDays}d`}
                  </span>
                  <span className="flex items-center gap-1 text-destructive font-medium">
                    <DollarSign className="h-3 w-3" />
                    {formatPrice(item.valueAtRisk)} at risk
                  </span>
                </div>
              </div>
              
              <div className="text-right shrink-0">
                <Badge className="bg-success/20 text-success border-success/30 gap-1">
                  <Percent className="h-3 w-3" />
                  -{item.suggestedDiscount}%
                </Badge>
                <p className="text-[10px] text-muted-foreground mt-1">Suggested</p>
              </div>
            </div>
          </div>
        ))}
        
        {slowMovingItems.length > 5 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="w-full gap-2"
          >
            {showAll ? (
              <>
                <EyeOff className="h-4 w-4" />
                Show Less
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                View All {slowMovingItems.length} Items
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
