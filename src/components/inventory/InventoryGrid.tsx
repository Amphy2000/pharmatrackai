import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Package, Calendar, AlertTriangle, Archive } from 'lucide-react';
import { Medication } from '@/types/medication';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useMedications } from '@/hooks/useMedications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface InventoryGridProps {
  medications: Medication[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onEdit: (medication: Medication) => void;
}

export const InventoryGrid = ({
  medications,
  selectedIds,
  onToggleSelect,
  onEdit,
}: InventoryGridProps) => {
  const { formatPrice } = useCurrency();
  const { isExpired, isLowStock, isExpiringSoon } = useMedications();

  const getStatusBadge = (medication: Medication) => {
    if (medication.is_shelved === false) {
      return <Badge variant="outline" className="text-[10px]">Unshelved</Badge>;
    }
    if (isExpired(medication.expiry_date)) {
      return <Badge variant="destructive" className="text-[10px]">Expired</Badge>;
    }
    if (isExpiringSoon(medication.expiry_date)) {
      return <Badge className="bg-amber-warning text-amber-warning-foreground text-[10px]">Expiring</Badge>;
    }
    if (isLowStock(medication.current_stock, medication.reorder_level)) {
      return <Badge className="bg-amber-warning text-amber-warning-foreground text-[10px]">Low Stock</Badge>;
    }
    return <Badge className="bg-success text-success-foreground text-[10px]">In Stock</Badge>;
  };

  const getCardClass = (medication: Medication) => {
    if (medication.is_shelved === false) return 'opacity-60 bg-muted/30';
    if (isExpired(medication.expiry_date)) return 'border-destructive/50 bg-destructive/5';
    if (isLowStock(medication.current_stock, medication.reorder_level)) return 'border-amber-500/50 bg-amber-50/5';
    return '';
  };

  if (medications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium text-foreground">No medications found</h3>
        <p className="text-sm text-muted-foreground">
          Add your first medication to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {medications.map((medication) => {
        const isSelected = selectedIds.has(medication.id);
        return (
          <div
            key={medication.id}
            className={cn(
              'relative p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md',
              getCardClass(medication),
              isSelected && 'ring-2 ring-primary border-primary'
            )}
            onClick={() => onEdit(medication)}
          >
            {/* Selection Checkbox */}
            <div
              className="absolute top-2 left-2 z-10"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(medication.id);
              }}
            >
              <Checkbox checked={isSelected} />
            </div>

            <div className="pt-5">
              {/* Status Badge */}
              <div className="mb-2">
                {getStatusBadge(medication)}
              </div>

              {/* Name */}
              <h3 className="font-medium text-sm line-clamp-2 mb-1">
                {medication.name}
                {medication.is_shelved === false && (
                  <Archive className="inline-block ml-1 h-3 w-3 text-muted-foreground" />
                )}
              </h3>

              {/* Category */}
              <p className="text-xs text-muted-foreground mb-2">{medication.category}</p>

              {/* Stock Info */}
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-muted-foreground">Stock:</span>
                <span className={cn(
                  'font-medium',
                  isLowStock(medication.current_stock, medication.reorder_level) && 'text-amber-600',
                  medication.current_stock === 0 && 'text-destructive'
                )}>
                  {medication.current_stock}
                </span>
              </div>

              {/* Price */}
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-medium text-primary">
                  {formatPrice(medication.selling_price || medication.unit_price)}
                </span>
              </div>

              {/* Expiry */}
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(parseISO(medication.expiry_date), 'MMM yyyy')}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
