import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { User, Phone, Mail, Calendar, MapPin, Star, ShoppingBag, Building2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MetadataViewer } from '@/components/common/MetadataViewer';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { Customer } from '@/types/customer';

interface CustomerDetailModalProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CustomerDetailModal = ({ customer, open, onOpenChange }: CustomerDetailModalProps) => {
  const { formatPrice } = useCurrency();

  // Fetch customer's purchase history with branch info
  const { data: purchaseHistory = [] } = useQuery({
    queryKey: ['customer-purchase-history', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id,
          quantity,
          total_price,
          sale_date,
          receipt_id,
          branch_id,
          branches (name, is_main_branch),
          medications (name, category)
        `)
        .eq('customer_id', customer.id)
        .order('sale_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!customer?.id && open,
  });

  if (!customer) return null;

  // Calculate total spent
  const totalSpent = purchaseHistory.reduce((sum, p) => sum + (p.total_price || 0), 0);
  const totalTransactions = purchaseHistory.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
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

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 mt-4 pb-4">
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

            {/* Loyalty & Spending Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-4 rounded-xl bg-warning/10 border border-warning/20">
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-warning" />
                  <span className="font-medium text-sm">Loyalty Points</span>
                </div>
                <Badge variant="secondary" className="text-base px-3 py-1">
                  {customer.loyalty_points} pts
                </Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  <span className="font-medium text-sm">Total Spent</span>
                </div>
                <Badge variant="secondary" className="text-base px-3 py-1">
                  {formatPrice(totalSpent)}
                </Badge>
              </div>
            </div>

            {/* Purchase History with Branch Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Purchase History
                </h3>
                <span className="text-xs text-muted-foreground">{totalTransactions} transactions</span>
              </div>
              
              {purchaseHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/50 text-center">
                  No purchase history yet
                </p>
              ) : (
                <div className="space-y-2">
                  {purchaseHistory.map((purchase: any) => (
                    <div 
                      key={purchase.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {purchase.medications?.name || 'Unknown Item'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(purchase.sale_date), 'MMM d, yyyy')}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">Qty: {purchase.quantity}</span>
                          {/* Branch Badge */}
                          <span className="text-xs text-muted-foreground">•</span>
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium text-primary">
                              {purchase.branches?.name || 'Main Branch'}
                              {purchase.branches?.is_main_branch && ' (HQ)'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <p className="font-medium text-sm">{formatPrice(purchase.total_price)}</p>
                        {purchase.receipt_id && (
                          <code className="text-xs text-muted-foreground">{purchase.receipt_id}</code>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
