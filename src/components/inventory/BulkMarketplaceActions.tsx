import { useState } from 'react';
import { Globe, GlobeLock, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface BulkMarketplaceActionsProps {
  selectedIds: Set<string>;
  onComplete: () => void;
}

export const BulkMarketplaceActions = ({ selectedIds, onComplete }: BulkMarketplaceActionsProps) => {
  const [isListing, setIsListing] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<'list' | 'remove' | null>(null);

  const selectedCount = selectedIds.size;
  const needsConfirmation = selectedCount > 50;

  const handleListOnMarketplace = async () => {
    if (needsConfirmation && confirmDialog !== 'list') {
      setConfirmDialog('list');
      return;
    }

    setIsListing(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('medications')
        .update({ is_public: true })
        .in('id', ids);

      if (error) throw error;

      toast.success(`Listed ${selectedCount} items on marketplace`);
      onComplete();
    } catch (error) {
      console.error('Error listing on marketplace:', error);
      toast.error('Failed to list items on marketplace');
    } finally {
      setIsListing(false);
      setConfirmDialog(null);
    }
  };

  const handleRemoveFromMarketplace = async () => {
    if (needsConfirmation && confirmDialog !== 'remove') {
      setConfirmDialog('remove');
      return;
    }

    setIsRemoving(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('medications')
        .update({ is_public: false })
        .in('id', ids);

      if (error) throw error;

      toast.success(`Removed ${selectedCount} items from marketplace`);
      onComplete();
    } catch (error) {
      console.error('Error removing from marketplace:', error);
      toast.error('Failed to remove items from marketplace');
    } finally {
      setIsRemoving(false);
      setConfirmDialog(null);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleListOnMarketplace}
        disabled={isListing}
        className="gap-1.5"
      >
        {isListing ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Globe className="h-3 w-3" />
        )}
        List on Marketplace
        {selectedCount > 1 && (
          <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">
            {selectedCount}
          </Badge>
        )}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleRemoveFromMarketplace}
        disabled={isRemoving}
        className="gap-1.5"
      >
        {isRemoving ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <GlobeLock className="h-3 w-3" />
        )}
        Remove from Marketplace
      </Button>

      {/* Confirmation Dialog for Large Bulk Operations */}
      <AlertDialog open={confirmDialog !== null} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              {confirmDialog === 'list' ? 'List' : 'Remove'} {selectedCount} Items?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to {confirmDialog === 'list' ? 'make' : 'remove'} {selectedCount} items {confirmDialog === 'list' ? 'public on the marketplace' : 'from the marketplace'}. This will affect visibility for all selected products.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDialog === 'list' ? handleListOnMarketplace : handleRemoveFromMarketplace}
              className={confirmDialog === 'list' ? 'bg-marketplace text-marketplace-foreground' : ''}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
