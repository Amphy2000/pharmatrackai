import { useState, useEffect } from 'react';
import { Printer, X, Download, Loader2 } from 'lucide-react';
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

  const handlePrint = async () => {
    if (!receipt) return;
    
    setIsPrinting(true);
    
    try {
      // Use data URL approach to avoid cross-origin issues
      const pdfDataUri = receipt.output('datauristring');
      
      // Create a new window with the PDF embedded
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Print Receipt</title>
              <style>
                body { margin: 0; padding: 0; }
                iframe { width: 100%; height: 100vh; border: none; }
                @media print {
                  body { margin: 0; }
                  iframe { width: 100%; height: auto; }
                }
              </style>
            </head>
            <body>
              <iframe src="${pdfDataUri}" onload="setTimeout(function() { window.print(); }, 500);"></iframe>
            </body>
          </html>
        `);
        printWindow.document.close();
        
        // Close the window after a delay to allow printing
        setTimeout(() => {
          setIsPrinting(false);
          onPrint();
        }, 2000);
      } else {
        // Fallback: just download the PDF
        receipt.save(`receipt-${receiptNumber}.pdf`);
        setIsPrinting(false);
        onPrint();
      }
    } catch (error) {
      console.error('Print failed:', error);
      // Fallback to download
      receipt.save(`receipt-${receiptNumber}.pdf`);
      setIsPrinting(false);
      onPrint();
    }
  };

  const handleDownload = () => {
    if (!receipt) return;
    receipt.save(`receipt-${receiptNumber}.pdf`);
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
            onClick={handleDownload}
            disabled={!receipt}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
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
