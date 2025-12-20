import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => void;
}

export const BarcodeScanner = ({ open, onOpenChange, onScan }: BarcodeScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && containerRef.current) {
      startScanning();
    }

    return () => {
      stopScanning();
    };
  }, [open]);

  const startScanning = async () => {
    if (!containerRef.current) return;

    try {
      setError(null);
      const html5QrCode = new Html5Qrcode('barcode-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 100 },
          aspectRatio: 2.5,
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanning();
          onOpenChange(false);
        },
        () => {
          // Ignore scan errors (no barcode detected yet)
        }
      );
      setIsScanning(true);
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Unable to access camera. Please ensure camera permissions are granted.');
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    scannerRef.current = null;
    setIsScanning(false);
  };

  const handleClose = () => {
    stopScanning();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Camera className="h-5 w-5 text-primary" />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <div
            id="barcode-reader"
            ref={containerRef}
            className="w-full min-h-[200px] rounded-xl overflow-hidden bg-muted/30"
          />
          
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-[250px] h-[100px] border-2 border-primary rounded-lg">
                <ScanLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary animate-pulse" />
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br" />
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl">
              <div className="text-center p-6">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={startScanning} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Position the barcode within the frame to scan
        </p>

        <Button variant="outline" onClick={handleClose} className="gap-2">
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
};
