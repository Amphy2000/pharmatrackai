import { useState } from 'react';
import { format } from 'date-fns';
import { Package, Check, X, Link2, AlertCircle, Clock, Minus } from 'lucide-react';
import { useQuickItems, PendingQuickItem } from '@/hooks/useQuickItems';
import { useMedications } from '@/hooks/useMedications';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

export const PendingQuickItemsPanel = () => {
  const { pendingItems, isLoading, linkToMedication, markAsReviewed, pendingCount } = useQuickItems();
  const { medications, updateMedication } = useMedications();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedItem, setSelectedItem] = useState<PendingQuickItem | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const handleLinkClick = (item: PendingQuickItem) => {
    setSelectedItem(item);
    setLinkDialogOpen(true);
    setSearchQuery('');
  };

  // When linking: deduct stock from inventory since item was already sold
  const handleLink = async (medicationId: string) => {
    if (!selectedItem || !user) return;
    
    const medication = medications?.find(m => m.id === medicationId);
    if (!medication) return;

    setIsLinking(true);
    try {
      // Deduct the sold quantity from inventory
      const newStock = Math.max(0, medication.current_stock - selectedItem.quantity_sold);
      await updateMedication.mutateAsync({
        id: medicationId,
        current_stock: newStock,
      });

      // Mark quick item as linked
      await linkToMedication.mutateAsync({
        quickItemId: selectedItem.id,
        medicationId,
        reviewedBy: user.id,
      });
      
      toast({
        title: 'Item Linked & Stock Updated',
        description: `Deducted ${selectedItem.quantity_sold} from "${medication.name}" (${medication.current_stock} → ${newStock})`,
      });

      setLinkDialogOpen(false);
      setSelectedItem(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to link item and update stock',
        variant: 'destructive',
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleDismiss = async (item: PendingQuickItem) => {
    if (!user) return;
    
    await markAsReviewed.mutateAsync({
      quickItemId: item.id,
      reviewedBy: user.id,
      notes: 'Dismissed without linking',
    });
  };

  const filteredMedications = medications?.filter(med =>
    med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    med.batch_number.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="pt-6 text-center text-muted-foreground">
          Loading pending items...
        </CardContent>
      </Card>
    );
  }

  if (pendingCount === 0) {
    return null;
  }

  return (
    <>
      <Card className="glass-card border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Quick Items to Review</CardTitle>
                <CardDescription>
                  Staff sold these items without inventory record
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
              {pendingCount} pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background border border-border hover:border-amber-500/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{item.name}</span>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        ×{item.quantity_sold}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{formatPrice(item.selling_price)} each</span>
                      <span>•</span>
                      <span>by {item.sold_by_name || 'Unknown'}</span>
                      <span>•</span>
                      <span>{format(new Date(item.created_at), 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      onClick={() => handleLinkClick(item)}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Link
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDismiss(item)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Link to Inventory Item</DialogTitle>
            <DialogDescription>
              Link "{selectedItem?.name}" to an existing inventory item. 
              <span className="font-medium text-amber-600"> Stock will be deducted</span> since this item was already sold.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Minus className="h-4 w-4" />
                <span className="text-sm font-medium">Quick Item Sold (Stock Deduction)</span>
              </div>
              <div className="mt-2 text-sm text-amber-600 dark:text-amber-500">
                <p><strong>Name:</strong> {selectedItem?.name}</p>
                <p><strong>Sold Price:</strong> {formatPrice(selectedItem?.selling_price || 0)}</p>
                <p><strong>Quantity Sold:</strong> <span className="font-bold">-{selectedItem?.quantity_sold}</span></p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                When you link this to an inventory item, the quantity will be deducted from stock.
              </p>
            </div>

            <Command className="rounded-lg border">
              <CommandInput 
                placeholder="Search inventory..." 
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>No matching items found</CommandEmpty>
                <CommandGroup heading="Inventory Items">
                  {filteredMedications.slice(0, 10).map((med) => (
                    <CommandItem
                      key={med.id}
                      value={med.name}
                      onSelect={() => handleLink(med.id)}
                      className="cursor-pointer"
                      disabled={isLinking}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{med.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Stock: {med.current_stock} → {Math.max(0, med.current_stock - (selectedItem?.quantity_sold || 0))} • {formatPrice(med.selling_price || med.unit_price)}
                          </p>
                        </div>
                        <Check className="h-4 w-4 text-emerald-500 opacity-0 group-data-[selected=true]:opacity-100" />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)} disabled={isLinking}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
