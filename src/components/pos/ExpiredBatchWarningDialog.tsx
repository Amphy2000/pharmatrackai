import { AlertTriangle, XCircle } from 'lucide-react';
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
import { motion } from 'framer-motion';

interface ExpiredBatchWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicationName: string;
  expiryDate: string;
  onConfirmRemove: () => void;
}

export const ExpiredBatchWarningDialog = ({
  open,
  onOpenChange,
  medicationName,
  expiryDate,
  onConfirmRemove,
}: ExpiredBatchWarningDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md border-destructive/50">
        <AlertDialogHeader>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center"
          >
            <XCircle className="h-10 w-10 text-destructive animate-pulse" />
          </motion.div>
          <AlertDialogTitle className="text-center text-xl text-destructive">
            ⚠️ EXPIRED BATCH - DO NOT SELL!
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-3">
            <p className="text-base font-medium text-foreground">
              {medicationName}
            </p>
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <p className="text-sm text-destructive font-semibold">
                This batch expired on: {new Date(expiryDate).toLocaleDateString()}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Selling expired medication is illegal and dangerous. 
              Remove this item from the cart immediately.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={onConfirmRemove}
            className="w-full bg-destructive hover:bg-destructive/90"
          >
            Remove from Cart
          </AlertDialogAction>
          <AlertDialogCancel className="w-full mt-0">
            Close Warning
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
