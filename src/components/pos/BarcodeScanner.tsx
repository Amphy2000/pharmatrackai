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
        (scannerRef.current as any).clear?.();
      }
    };
  }, []);

  // IMPORTANT: Dialog's onOpenChange does NOT fire when a controlled `open` prop changes.
  // So we start/stop the camera scanner based on `open` (same behavior as Explore page).
  useEffect(() => {
    if (!open) {
      stopScanning().catch(() => {});
      setError(null);
      return;
    }

    // Delay to ensure portal content + target div exist
    const t = window.setTimeout(() => {
      startScanning();
    }, 150);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startScanning = async () => {
    setError(null);

    // Guard: avoid double start
    if (scannerRef.current) return;

    try {
      // Radix Dialog content mounts via portal; the container can be missing for a tick.
      if (!document.getElementById('pos-barcode-reader')) {
        window.setTimeout(() => {
          if (open) startScanning();
        }, 50);
        return;
      }

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
          stopScanning().catch(() => {});
          onOpenChange(false);
        },
        () => {} // Ignore scan failures (no barcode in frame yet)
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Camera could not start. Please allow camera access and try again.');
      setIsScanning(false);
      scannerRef.current = null;
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        (scannerRef.current as any).clear?.();
        scannerRef.current = null;
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setIsScanning(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    // Let parent control state
    onOpenChange(nextOpen);

    // If user closes via overlay/esc, stop camera immediately
    if (!nextOpen) {
      stopScanning().catch(() => {});
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

      </DialogContent>
    </Dialog>
  );
};
