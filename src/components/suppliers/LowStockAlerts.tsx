import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShoppingCart, TrendingDown } from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { Medication } from '@/types/medication';

interface LowStockAlertsProps {
  onReorder: (medication: Medication) => void;
}

export const LowStockAlerts = ({ onReorder }: LowStockAlertsProps) => {
  const { medications, isLoading } = useMedications();
  const { supplierProducts } = useSuppliers();
  const { formatPrice } = useCurrency();

  const lowStockMedications = medications.filter(
    med => med.current_stock <= med.reorder_level
  );

  // Get best price for a medication from linked suppliers
  const getBestPrice = (medicationId: string) => {
    const products = supplierProducts
      .filter(p => p.medication_id === medicationId && p.is_available)
      .sort((a, b) => Number(a.unit_price) - Number(b.unit_price));
    
    return products.length > 0 ? products : null;
  };

  if (isLoading) {
    return null;
  }

  if (lowStockMedications.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">
            All items are well stocked.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Low Stock Alerts ({lowStockMedications.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {lowStockMedications.slice(0, 10).map((med) => {
          const supplierOptions = getBestPrice(med.id);
          const bestPrice = supplierOptions?.[0];
          
          return (
            <div 
              key={med.id} 
              className="p-3 rounded-lg bg-destructive/10 border border-destructive/20"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{med.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Stock: <span className="text-destructive font-bold">{med.current_stock}</span>
                    {' / '}
                    Reorder: {med.reorder_level}
                  </div>
                  
                  {/* Supplier Price Comparison */}
                  {supplierOptions && supplierOptions.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingDown className="h-3 w-3" />
                        <span>Best prices:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {supplierOptions.slice(0, 3).map((product, idx) => (
                          <Badge 
                            key={product.id} 
                            variant={idx === 0 ? "default" : "secondary"}
                            className={`text-xs ${idx === 0 ? 'bg-green-600' : ''}`}
                          >
                            {(product as any).suppliers?.name || 'Supplier'}: {formatPrice(Number(product.unit_price))}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-muted-foreground">
                      No suppliers linked
                    </div>
                  )}
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onReorder(med)}
                  className="gap-1 shrink-0"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Reorder
                </Button>
              </div>
            </div>
          );
        })}
        {lowStockMedications.length > 10 && (
          <div className="text-center text-sm text-muted-foreground">
            And {lowStockMedications.length - 10} more items...
          </div>
        )}
      </CardContent>
    </Card>
  );
};