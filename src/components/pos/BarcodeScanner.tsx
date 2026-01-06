import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => void;
}

/**
 * Simplified barcode scanner - matches the working CustomerBarcodeScanner on Explore page.
 * Uses facingMode: 'environment' which auto-detects the back camera on any device.
 */
export const BarcodeScanner = ({ open, onOpenChange, onScan }: BarcodeScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Also listen for hardware USB/Bluetooth barcode scanners
  useBarcodeScanner({
    onScan: (barcode) => {
      if (open) {
        onScan(barcode);
        onOpenChange(false);
      }
    },
    enabled: open,
    captureInInputs: true,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanning = async () => {
    setError(null);
    
    try {
      const scanner = new Html5Qrcode('pos-barcode-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanning();
          onOpenChange(false);
        },
        () => {} // Ignore scan failures (no barcode in frame yet)
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Camera access denied. Please allow camera access or use a USB/Bluetooth barcode scanner.');
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setIsScanning(false);
  };

  const handleOpenChange = async (isOpen: boolean) => {
    if (isOpen) {
      onOpenChange(true);
      // Small delay to ensure DOM is ready
      setTimeout(() => startScanning(), 100);
    } else {
      await stopScanning();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Scan Product Barcode
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          <div
            id="pos-barcode-reader"
            className="w-full aspect-[4/3] bg-muted rounded-lg overflow-hidden"
          />
          
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-32 border-2 border-primary rounded-lg relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-l-4 border-t-4 border-primary rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-r-4 border-t-4 border-primary rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-l-4 border-b-4 border-primary rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-r-4 border-b-4 border-primary rounded-br" />
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary/50 animate-pulse" />
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/90 rounded-lg">
              <div className="text-center p-4">
                <Camera className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-destructive mb-3">{error}</p>
                <Button onClick={() => startScanning()} variant="outline" size="sm">
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground text-center">
          Point your camera at the product barcode
        </p>
        
        <Button
          variant="outline"
          onClick={() => handleOpenChange(false)}
          className="w-full"
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          You can also scan using a USB/Bluetooth barcode scanner
        </p>
      </DialogContent>
    </Dialog>
  );
};
