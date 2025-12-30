import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Clock, AlertTriangle, Trash2, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/CurrencyContext';
import { differenceInDays } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { FeatureDurationSelect } from '@/components/inventory/FeatureDurationSelect';

export const PromotionsManagement = () => {
  const { pharmacy } = usePharmacy();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const [renewingItem, setRenewingItem] = useState<{ id: string; name: string } | null>(null);

  // Fetch featured medications for this pharmacy
  const { data: featuredItems = [], isLoading } = useQuery({
    queryKey: ['featured-medications', pharmacy?.id],
    queryFn: async () => {
      if (!pharmacy?.id) return [];
      
      const { data, error } = await supabase
        .from('medications')
        .select('id, name, category, selling_price, is_featured, featured_until, current_stock')
        .eq('pharmacy_id', pharmacy.id)
        .eq('is_featured', true)
        .order('featured_until', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!pharmacy?.id,
  });

  // Remove from featured mutation
  const removeFeaturedMutation = useMutation({
    mutationFn: async (medicationId: string) => {
      const { error } = await supabase
        .from('medications')
        .update({ is_featured: false, featured_until: null })
        .eq('id', medicationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featured-medications'] });
      toast({
        title: "Removed from featured",
        description: "The product has been removed from your featured slots.",
      });
    },
    onError: (error) => {
      console.error('Error removing featured:', error);
      toast({
        title: "Error",
        description: "Failed to remove featured product. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getDaysRemaining = (featuredUntil: string | null): number | null => {
    if (!featuredUntil) return null;
    return differenceInDays(new Date(featuredUntil), new Date());
  };

  const slotsUsed = featuredItems.length;

  return (
    <div className="space-y-6">
      {/* Slots Overview */}
      <Card className="border-marketplace/30 bg-gradient-to-br from-marketplace/5 to-background">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-marketplace fill-marketplace" />
                Featured Products
              </CardTitle>
              <CardDescription>
                Promote your products in the marketplace spotlight
              </CardDescription>
            </div>
            <Badge 
              variant="secondary"
              className="text-lg px-4 py-2"
            >
              {slotsUsed} Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Feature products to boost visibility. Payment via Paystack is required for each feature period.
          </p>
        </CardContent>
      </Card>

      {/* Active Featured Products */}
      <Card>
        <CardHeader>
          <CardTitle>Active Promotions</CardTitle>
          <CardDescription>
            Products currently featured in the marketplace spotlight
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : featuredItems.length === 0 ? (
            <div className="text-center py-12">
              <Star className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Featured Products</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Go to Inventory and click the Star icon on products you want to promote
              </p>
              <Button variant="outline" asChild>
                <a href="/inventory">Go to Inventory</a>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {featuredItems.map((item) => {
                const daysLeft = getDaysRemaining(item.featured_until);
                const isExpiringSoon = daysLeft !== null && daysLeft <= 3;
                const isExpired = daysLeft !== null && daysLeft < 0;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-lg border ${
                      isExpired 
                        ? 'border-destructive/30 bg-destructive/5'
                        : isExpiringSoon 
                          ? 'border-warning/30 bg-warning/5' 
                          : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{item.name}</h4>
                          <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(item.selling_price || 0)} • {item.current_stock} in stock
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Countdown Timer */}
                        {daysLeft !== null && (
                          <div 
                            className={`flex flex-col items-center p-2 rounded-lg ${
                              isExpired 
                                ? 'bg-destructive/10 text-destructive' 
                                : isExpiringSoon 
                                  ? 'bg-warning/10 text-warning' 
                                  : 'bg-primary/10 text-primary'
                            }`}
                          >
                            <div className="flex items-center gap-1">
                              {isExpiringSoon && <AlertTriangle className="h-4 w-4" />}
                              <Clock className="h-4 w-4" />
                            </div>
                            <p className="text-2xl font-bold tabular-nums">
                              {isExpired ? '0' : daysLeft}
                            </p>
                            <p className="text-xs font-medium">
                              {isExpired 
                                ? 'EXPIRED' 
                                : daysLeft === 1
                                  ? 'day left'
                                  : 'days left'
                              }
                            </p>
                          </div>
                        )}
                        {daysLeft === null && (
                          <div className="flex flex-col items-center p-2 rounded-lg bg-muted text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <p className="text-xs mt-1">∞</p>
                            <p className="text-xs">No expiry</p>
                          </div>
                        )}

                        {/* Extend Button - Opens Paystack Payment */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => setRenewingItem({ id: item.id, name: item.name })}
                        >
                          <CreditCard className="h-4 w-4" />
                          Extend
                        </Button>

                        {/* Remove Button */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove from Featured?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove "{item.name}" from the marketplace spotlight. You can re-add it later by paying for a new feature period.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeFeaturedMutation.mutate(item.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">How Featured Products Work</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground">1.</span>
              Featured products appear in the "Spotlight" section on the marketplace
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground">2.</span>
              Pay via Paystack to feature a product for 7, 14, or 30 days
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground">3.</span>
              Featured products get 3x more visibility on average
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground">4.</span>
              You'll receive SMS reminders 2 days before promotions expire
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Paystack Payment Dialog for Extending */}
      {renewingItem && (
        <FeatureDurationSelect
          medicationId={renewingItem.id}
          medicationName={renewingItem.name}
          open={!!renewingItem}
          onOpenChange={(open) => {
            if (!open) setRenewingItem(null);
          }}
        />
      )}
    </div>
  );
};