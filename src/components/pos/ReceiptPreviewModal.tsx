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
    if (!pdfUrl) return;

    setIsPrinting(true);

    try {
      // Create a hidden iframe to print the PDF
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden';
      iframe.src = pdfUrl;
      
      document.body.appendChild(iframe);
      
      // Wait for the iframe to load, then print
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            // If direct print fails (cross-origin), open in new tab
            window.open(pdfUrl, '_blank');
          }
          setIsPrinting(false);
          
          // Clean up iframe after printing
          setTimeout(() => {
            try {
              document.body.removeChild(iframe);
            } catch {
              // Ignore if already removed
            }
          }, 5000);
        }, 500);
      };
      
      iframe.onerror = () => {
        // Fallback: open in new tab
        window.open(pdfUrl, '_blank');
        setIsPrinting(false);
        try {
          document.body.removeChild(iframe);
        } catch {
          // Ignore
        }
      };
    } catch (e) {
      console.error('Print failed:', e);
      // Ultimate fallback: download
      if (receipt) {
        receipt.save(`receipt-${receiptNumber}.pdf`);
      }
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
