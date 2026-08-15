import { IntelligentDataImportModal } from '@/components/import/IntelligentDataImportModal';

interface SmartCSVImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEntityType?: 'medication' | 'customer' | 'doctor';
}

export const SmartCSVImportModal = ({ 
  open, 
  onOpenChange, 
  defaultEntityType = 'medication' 
}: SmartCSVImportModalProps) => {
  return (
    <IntelligentDataImportModal
      open={open}
      onOpenChange={onOpenChange}
      defaultEntityType={defaultEntityType}
    />
  );
};
