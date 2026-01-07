import { useState, useCallback, useRef, useEffect } from 'react';
import { ScanBarcode, Hash, Loader2 } from 'lucide-react';
import { Medication } from '@/types/medication';
import { useMedications } from '@/hooks/useMedications';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { BarcodeScanner } from './BarcodeScanner';

interface LinkBarcodeModalProps {
  medication: Medication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinked?: () => void;
}

export const LinkBarcodeModal = ({ 
  medication, 
  open, 
  onOpenChange,
  onLinked 
}: LinkBarcodeModalProps) => {
  const { updateMedication } = useMedications();
  const { toast } = useToast();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-detect hardware barcode scanner
  useBarcodeScanner({
    onScan: (barcode) => {
      if (open && medication) {
        handleLinkBarcode(barcode);
      }
    },
    enabled: open && !scannerOpen,
  });

  // Focus input when modal opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleLinkBarcode = useCallback(async (barcode: string) => {
    if (!medication || !barcode.trim()) return;

    setIsLinking(true);
    try {
      await updateMedication.mutateAsync({
        id: medication.id,
        barcode_id: barcode.trim(),
      });

      toast({
        title: 'Barcode Linked',
        description: `"${barcode}" is now linked to ${medication.name}`,
      });

      onLinked?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to link barcode',
        variant: 'destructive',
      });
    } finally {
      setIsLinking(false);
      setScannerOpen(false);
    }
  }, [medication, updateMedication, toast, onLinked, onOpenChange]);

  const handleGenerateInternalCode = async () => {
    if (!medication) return;

    setIsGenerating(true);
    try {
      // Call database function to generate unique internal code
      const { data, error } = await supabase.rpc('generate_internal_barcode');
      
      if (error) throw error;
      
      const internalCode = data as string;
      
      await updateMedication.mutateAsync({
        id: medication.id,
        barcode_id: internalCode,
      });

      toast({
        title: 'Internal Code Generated',
        description: `Code "${internalCode}" assigned to ${medication.name}`,
      });

      onLinked?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate internal code',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCameraScan = (barcode: string) => {
    handleLinkBarcode(barcode);
  };

  const handleManualSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const barcode = formData.get('barcode') as string;
    if (barcode) {
      handleLinkBarcode(barcode);
    }
  };

  if (!medication) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanBarcode className="h-5 w-5 text-primary" />
              Link Barcode
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{medication.name}</span> doesn't have a barcode yet. Scan it once to link for future sales.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Scan instruction */}
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
              <p className="text-sm text-primary font-medium">
                New stock detected. Please scan the barcode once to link it.
              </p>
            </div>

            {/* Manual barcode input */}
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                name="barcode"
                placeholder="Type or scan barcode..."
                className="flex-1"
                disabled={isLinking}
              />
              <Button type="submit" disabled={isLinking}>
                {isLinking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Link'}
              </Button>
            </form>

            {/* Camera scanner button */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setScannerOpen(true)}
              disabled={isLinking}
            >
              <ScanBarcode className="h-4 w-4" />
              Open Camera Scanner
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  No physical barcode?
                </span>
              </div>
            </div>

            {/* Generate internal code */}
            <Button
              variant="secondary"
              className="w-full gap-2"
              onClick={handleGenerateInternalCode}
              disabled={isGenerating || isLinking}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Hash className="h-4 w-4" />
              )}
              Generate Internal Code (e.g., #1024)
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Internal codes can be typed into the POS search bar
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <BarcodeScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleCameraScan}
      />
    </>
  );
};
