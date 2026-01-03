import { Store, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type SaleType = 'retail' | 'wholesale';

interface SaleTypeToggleProps {
  saleType: SaleType;
  onSaleTypeChange: (type: SaleType) => void;
  className?: string;
}

export const SaleTypeToggle = ({ saleType, onSaleTypeChange, className = '' }: SaleTypeToggleProps) => {
  return (
    <div className={`flex items-center gap-2 p-1 rounded-xl bg-muted/50 border border-border/50 ${className}`}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onSaleTypeChange('retail')}
        className={`flex-1 h-8 gap-1.5 text-xs rounded-lg transition-all ${
          saleType === 'retail'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'hover:bg-muted'
        }`}
      >
        <Store className="h-3.5 w-3.5" />
        Retail
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onSaleTypeChange('wholesale')}
        className={`flex-1 h-8 gap-1.5 text-xs rounded-lg transition-all ${
          saleType === 'wholesale'
            ? 'bg-amber-500 text-white shadow-sm'
            : 'hover:bg-muted'
        }`}
      >
        <Truck className="h-3.5 w-3.5" />
        Wholesale
      </Button>
    </div>
  );
};
