import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShoppingCart } from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { Medication } from '@/types/medication';

interface LowStockAlertsProps {
  onReorder: (medication: Medication) => void;
}

export const LowStockAlerts = ({ onReorder }: LowStockAlertsProps) => {
  const { medications, isLoading } = useMedications();
  const { formatPrice } = useCurrency();

  const lowStockMedications = medications.filter(
    med => med.current_stock <= med.reorder_level
  );

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
        {lowStockMedications.slice(0, 10).map((med) => (
          <div 
            key={med.id} 
            className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20"
          >
            <div className="flex-1">
              <div className="font-medium">{med.name}</div>
              <div className="text-sm text-muted-foreground">
                Stock: <span className="text-destructive font-bold">{med.current_stock}</span>
                {' / '}
                Reorder: {med.reorder_level}
              </div>
              <div className="text-xs text-muted-foreground">
                Unit Price: {formatPrice(med.unit_price)}
              </div>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onReorder(med)}
              className="gap-1"
            >
              <ShoppingCart className="h-4 w-4" />
              Reorder
            </Button>
          </div>
        ))}
        {lowStockMedications.length > 10 && (
          <div className="text-center text-sm text-muted-foreground">
            And {lowStockMedications.length - 10} more items...
          </div>
        )}
      </CardContent>
    </Card>
  );
};
