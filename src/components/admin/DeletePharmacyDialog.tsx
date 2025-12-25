import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
import { Input } from '@/components/ui/input';
import { Loader2, AlertTriangle } from 'lucide-react';

interface DeletePharmacyDialogProps {
  pharmacy: {
    id: string;
    name: string;
    email: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeletePharmacyDialog = ({ pharmacy, open, onOpenChange }: DeletePharmacyDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmName, setConfirmName] = useState('');

  const deletePharmacyMutation = useMutation({
    mutationFn: async (pharmacyId: string) => {
      // Delete in order to respect foreign key constraints
      // 1. Delete staff permissions
      const { data: staffData } = await supabase
        .from('pharmacy_staff')
        .select('id')
        .eq('pharmacy_id', pharmacyId);
      
      if (staffData && staffData.length > 0) {
        const staffIds = staffData.map(s => s.id);
        await supabase
          .from('staff_permissions')
          .delete()
          .in('staff_id', staffIds);
      }

      // 2. Delete related tables
      const tablesToClean = [
        'sales',
        'medications',
        'customers',
        'notifications',
        'audit_logs',
        'pharmacy_staff',
        'branches',
        'prescriptions',
        'suppliers',
        'doctors',
        'reorder_requests',
        'sent_alerts',
        'ai_predictions',
        'pending_transactions',
        'staff_shifts',
        'stock_transfers',
        'pharmacy_custom_features',
        'feature_requests',
        'subscription_payments',
        'shelving_history',
      ];

      for (const table of tablesToClean) {
        await supabase
          .from(table as any)
          .delete()
          .eq('pharmacy_id', pharmacyId);
      }

      // 3. Finally delete the pharmacy
      const { error } = await supabase
        .from('pharmacies')
        .delete()
        .eq('id', pharmacyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pharmacies'] });
      onOpenChange(false);
      setConfirmName('');
      toast({
        title: 'Pharmacy deleted',
        description: 'The pharmacy and all associated data have been permanently deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete pharmacy',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleClose = (open: boolean) => {
    if (!open) {
      setConfirmName('');
    }
    onOpenChange(open);
  };

  const canDelete = confirmName.toLowerCase() === pharmacy?.name.toLowerCase();

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Pharmacy Permanently
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              This action <strong>cannot be undone</strong>. This will permanently delete{' '}
              <strong>{pharmacy?.name}</strong> and remove all associated data including:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>All staff accounts and permissions</li>
              <li>All inventory/medications</li>
              <li>All sales history</li>
              <li>All customers and prescriptions</li>
              <li>All suppliers and reorder requests</li>
              <li>All branches and stock transfers</li>
              <li>All notifications and audit logs</li>
            </ul>
            <div className="pt-2">
              <p className="text-sm font-medium mb-2">
                Type <strong>{pharmacy?.name}</strong> to confirm:
              </p>
              <Input
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder="Enter pharmacy name"
                className="border-destructive/50"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletePharmacyMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (pharmacy && canDelete) {
                deletePharmacyMutation.mutate(pharmacy.id);
              }
            }}
            disabled={!canDelete || deletePharmacyMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deletePharmacyMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Permanently'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
