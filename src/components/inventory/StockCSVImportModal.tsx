import { SmartCSVImportModal } from '@/components/inventory/SmartCSVImportModal';

interface StockCSVImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Legacy wrapper: the old "Stock Count CSV Import" modal is now replaced
 * by the Smart Product Import modal to support both new product imports
 * and seamless onboarding. This prevents crashes and unifies the UX.
 */
export const StockCSVImportModal = ({ open, onOpenChange }: StockCSVImportModalProps) => {
  return <SmartCSVImportModal open={open} onOpenChange={onOpenChange} />;
};
