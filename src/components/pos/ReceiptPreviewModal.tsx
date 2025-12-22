import { useState, useEffect } from 'react';
import { Printer, X, Download, Loader2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import jsPDF from 'jspdf';

interface ReceiptPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: jsPDF | null;
  receiptNumber: string;
  onPrint: () => void;
}

export const ReceiptPreviewModal = ({
  open,
  onOpenChange,
  receipt,
  receiptNumber,
  onPrint,
}: ReceiptPreviewModalProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (receipt && open) {
      const blob = receipt.output('blob');
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPdfUrl(null);
    }
  }, [receipt, open]);

  const handlePrint = () => {
    if (!receipt) return;

    setIsPrinting(true);

    try {
      const blob = receipt.output('blob');
      const url = URL.createObjectURL(blob);

      // Open PDF in new tab - most reliable cross-browser print solution
      const printWindow = window.open(url, '_blank');
      
      if (printWindow) {
        // Wait for PDF to load then trigger print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            setIsPrinting(false);
          }, 500);
        };
        
        // Cleanup URL after a delay to allow printing
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 60000); // Keep URL valid for 1 minute
      } else {
        // Fallback: download the PDF if popup blocked
        receipt.save(`receipt-${receiptNumber}.pdf`);
        setIsPrinting(false);
      }
    } catch (e) {
      console.error('Print failed:', e);
      setIsPrinting(false);
    }
  };

  const handleDownload = () => {
    if (!receipt) return;
    receipt.save(`receipt-${receiptNumber}.pdf`);
  };

  const handleShare = async () => {
    if (!receipt) return;
    
    try {
      const blob = receipt.output('blob');
      const file = new File([blob], `receipt-${receiptNumber}.pdf`, { type: 'application/pdf' });
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Receipt ${receiptNumber}`,
          text: 'Your pharmacy receipt',
          files: [file],
        });
      } else {
        handleDownload();
      }
    } catch (error) {
      console.error('Share failed:', error);
      handleDownload();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Receipt Preview
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-muted/30 rounded-xl overflow-hidden">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-[400px] sm:h-[500px] border-0"
              title="Receipt Preview"
            />
          ) : (
            <div className="w-full h-[400px] sm:h-[500px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button
            variant="outline"
            onClick={handleShare}
            disabled={!receipt}
            title="Share via WhatsApp"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={!receipt}
          >
            <Download className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button
            onClick={handlePrint}
            disabled={isPrinting || !pdfUrl}
            className="flex-1 bg-gradient-primary hover:opacity-90"
          >
            {isPrinting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Printing...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
