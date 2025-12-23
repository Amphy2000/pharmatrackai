import { format } from 'date-fns';
import { User, Phone, Mail, Calendar, MapPin, Star, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MetadataViewer } from '@/components/common/MetadataViewer';
import type { Customer } from '@/types/customer';

interface CustomerDetailModalProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CustomerDetailModal = ({ customer, open, onOpenChange }: CustomerDetailModalProps) => {
  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{customer.full_name}</h2>
              <p className="text-sm text-muted-foreground font-normal">Customer Profile</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Contact Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contact Information</h3>
            <div className="grid gap-3">
              {customer.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.address}</span>
                </div>
              )}
              {customer.date_of_birth && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>DOB: {format(new Date(customer.date_of_birth), 'MMMM d, yyyy')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Loyalty Points */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-warning" />
              <span className="font-medium">Loyalty Points</span>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-1">
              {customer.loyalty_points} pts
            </Badge>
          </div>

          {/* Notes */}
          {customer.notes && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Notes</h3>
              <p className="text-sm p-3 rounded-lg bg-muted/50">{customer.notes}</p>
            </div>
          )}

          {/* Extended Records - Metadata */}
          {customer.metadata && Object.keys(customer.metadata).length > 0 && (
            <MetadataViewer
              metadata={customer.metadata}
              entityType="customer"
              entityId={customer.id}
              entityName={customer.full_name}
            />
          )}

          {/* Footer Info */}
          <div className="text-xs text-muted-foreground pt-4 border-t border-border/50">
            <p>Added on {format(new Date(customer.created_at), 'MMMM d, yyyy')}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
