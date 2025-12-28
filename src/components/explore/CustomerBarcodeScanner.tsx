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
import { useToast } from '@/hooks/use-toast';

interface CustomerBarcodeScannerProps {
  onScan: (barcode: string) => void;
}

export const CustomerBarcodeScanner = ({ onScan }: CustomerBarcodeScannerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      const scanner = new Html5Qrcode('customer-barcode-reader');
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
          setIsOpen(false);
          toast({
            title: 'Barcode scanned',
            description: `Searching for: ${decodedText}`,
          });
        },
        () => {} // Ignore scan failures
      );

      setIsScanning(true);
    } catch (error) {
      console.error('Error starting scanner:', error);
      toast({
        title: 'Camera access denied',
        description: 'Please allow camera access to scan barcodes',
        variant: 'destructive',
      });
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

  const handleOpenChange = async (open: boolean) => {
    if (open) {
      setIsOpen(true);
      setTimeout(() => startScanning(), 100);
    } else {
      await stopScanning();
      setIsOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        onClick={() => handleOpenChange(true)}
        className="bg-white/90 text-marketplace border-0 hover:bg-white font-semibold gap-2"
      >
        <Camera className="h-5 w-5" />
        Scan Barcode
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" />
              Scan Product Barcode
            </DialogTitle>
          </DialogHeader>
          
          <div className="relative">
            <div
              id="customer-barcode-reader"
              className="w-full aspect-[4/3] bg-muted rounded-lg overflow-hidden"
            />
            
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-32 border-2 border-marketplace rounded-lg relative">
                  <div className="absolute top-0 left-0 w-4 h-4 border-l-4 border-t-4 border-marketplace rounded-tl" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-r-4 border-t-4 border-marketplace rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-l-4 border-b-4 border-marketplace rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-r-4 border-b-4 border-marketplace rounded-br" />
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-marketplace/50 animate-pulse" />
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
    </>
  );
};
