import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Clock, Plus, MessageCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/CurrencyContext';
import { differenceInDays, format } from 'date-fns';
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

const MAX_FEATURED_SLOTS = 3;
const ADMIN_WHATSAPP = '2348012345678'; // Replace with actual admin number

export const PromotionsManagement = () => {
  const { pharmacy } = usePharmacy();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();

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

  const handleRequestMoreSlots = () => {
    const message = encodeURIComponent(
      `Hello! I would like to purchase more featured slots for ${pharmacy?.name}. Currently using ${featuredItems.length}/${MAX_FEATURED_SLOTS} slots.`
    );
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${message}`, '_blank');
  };

  const getDaysRemaining = (featuredUntil: string | null): number | null => {
    if (!featuredUntil) return null;
    return differenceInDays(new Date(featuredUntil), new Date());
  };

  const slotsUsed = featuredItems.length;
  const slotsPercentage = (slotsUsed / MAX_FEATURED_SLOTS) * 100;

  return (
    <div className="space-y-6">
      {/* Slots Overview */}
      <Card className="border-marketplace/30 bg-gradient-to-br from-marketplace/5 to-background">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-marketplace fill-marketplace" />
                Featured Slots
              </CardTitle>
              <CardDescription>
                Promote your products in the marketplace spotlight
              </CardDescription>
            </div>
            <Badge 
              variant={slotsUsed >= MAX_FEATURED_SLOTS ? "destructive" : "secondary"}
              className="text-lg px-4 py-2"
            >
              {slotsUsed} / {MAX_FEATURED_SLOTS}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={slotsPercentage} className="h-3" />
            
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {slotsUsed >= MAX_FEATURED_SLOTS 
                  ? "All slots used. Remove an item or request more slots."
                  : `${MAX_FEATURED_SLOTS - slotsUsed} slot${MAX_FEATURED_SLOTS - slotsUsed !== 1 ? 's' : ''} available`
                }
              </p>
              <Button
                onClick={handleRequestMoreSlots}
                variant="outline"
                className="gap-2 border-marketplace/30 hover:bg-marketplace/10"
              >
                <MessageCircle className="h-4 w-4" />
                Request More Slots
              </Button>
            </div>
          </div>
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
                Go to Inventory and toggle "Featured" on products you want to promote
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
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      isExpired 
                        ? 'border-destructive/30 bg-destructive/5'
                        : isExpiringSoon 
                          ? 'border-warning/30 bg-warning/5' 
                          : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{item.name}</h4>
                        <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(item.selling_price || 0)} • {item.current_stock} in stock
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Countdown */}
                      {daysLeft !== null && (
                        <div className={`text-center ${isExpiringSoon || isExpired ? 'text-destructive' : 'text-muted-foreground'}`}>
                          <div className="flex items-center gap-1">
                            {isExpiringSoon && <AlertTriangle className="h-4 w-4" />}
                            <Clock className="h-4 w-4" />
                          </div>
                          <p className="text-xs font-medium">
                            {isExpired 
                              ? 'Expired' 
                              : daysLeft === 0 
                                ? 'Expires today'
                                : `${daysLeft}d left`
                            }
                          </p>
                        </div>
                      )}
                      {daysLeft === null && (
                        <div className="text-center text-muted-foreground">
                          <Clock className="h-4 w-4 mx-auto" />
                          <p className="text-xs">No expiry</p>
                        </div>
                      )}

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
                              This will remove "{item.name}" from the marketplace spotlight. You can re-add it later.
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
              Maximum {MAX_FEATURED_SLOTS} products can be featured at once
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground">3.</span>
              Set an expiry date when featuring to auto-remove after promotion ends
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground">4.</span>
              Contact admin via WhatsApp to purchase additional slots
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
