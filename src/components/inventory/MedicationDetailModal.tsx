import { format, parseISO, differenceInDays } from 'date-fns';
import { Package, Calendar, Hash, MapPin, AlertTriangle, X, Building2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MetadataViewer } from '@/components/common/MetadataViewer';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { Medication } from '@/types/medication';

interface MedicationDetailModalProps {
  medication: Medication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MedicationDetailModal = ({ medication, open, onOpenChange }: MedicationDetailModalProps) => {
  const { formatPrice } = useCurrency();
  
  if (!medication) return null;

  const today = new Date();
  const expiryDate = parseISO(medication.expiry_date);
  const daysToExpiry = differenceInDays(expiryDate, today);
  const isExpired = daysToExpiry <= 0;
  const isExpiringSoon = daysToExpiry > 0 && daysToExpiry <= 30;
  const isLowStock = medication.current_stock <= medication.reorder_level;
  const stockPercentage = Math.min(100, Math.round((medication.current_stock / Math.max(medication.reorder_level * 2, 1)) * 100));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{medication.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{medication.category}</Badge>
                {medication.is_controlled && (
                  <Badge variant="destructive">Controlled</Badge>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Stock Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Stock Level</h3>
              {isLowStock && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Low Stock
                </Badge>
              )}
            </div>
            <div className="p-4 rounded-xl bg-muted/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{medication.current_stock}</span>
                <span className="text-sm text-muted-foreground">
                  Reorder at: {medication.reorder_level}
                </span>
              </div>
              <Progress value={stockPercentage} className="h-2" />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Cost Price</p>
              <p className="text-lg font-bold">{formatPrice(medication.unit_price)}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Selling Price</p>
              <p className="text-lg font-bold">{formatPrice(medication.selling_price || medication.unit_price)}</p>
            </div>
          </div>

          {/* Batch & Expiry */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Batch Information</h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 text-sm">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span>Batch: {medication.batch_number}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className={isExpired ? 'text-destructive font-medium' : isExpiringSoon ? 'text-warning font-medium' : ''}>
                  Expires: {format(expiryDate, 'MMMM d, yyyy')}
                  {isExpired && ' (EXPIRED)'}
                  {isExpiringSoon && ` (${daysToExpiry} days)`}
                </span>
              </div>
              {medication.location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>Location: {medication.location}</span>
                </div>
              )}
              {medication.supplier && (
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>Supplier: {medication.supplier}</span>
                </div>
              )}
            </div>
          </div>

          {/* NAFDAC Info */}
          {medication.nafdac_reg_number && (
            <div className="p-3 rounded-lg bg-success/10 border border-success/20">
              <p className="text-sm font-medium text-success">
                NAFDAC Reg: {medication.nafdac_reg_number}
              </p>
            </div>
          )}

          {/* Extended Records - Metadata */}
          {medication.metadata && Object.keys(medication.metadata).length > 0 && (
            <MetadataViewer
              metadata={medication.metadata}
              entityType="medication"
              entityId={medication.id}
              entityName={medication.name}
            />
          )}

          {/* Footer Info */}
          <div className="text-xs text-muted-foreground pt-4 border-t border-border/50">
            <p>Added on {format(new Date(medication.created_at), 'MMMM d, yyyy')}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
