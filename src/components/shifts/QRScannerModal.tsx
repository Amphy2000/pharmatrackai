import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Camera, X, Check, AlertCircle } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { validateLocationQRCode } from './LocationQRScanner';

interface QRScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pharmacyId: string;
  onSuccess: () => void;
}

export const QRScannerModal = ({ open, onOpenChange, pharmacyId, onSuccess }: QRScannerModalProps) => {
  const [scanResult, setScanResult] = useState<{ isValid: boolean; message: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (!open) {
      setScanResult(null);
      setIsScanning(false);
      return;
    }

    // Small delay to ensure the DOM element exists
    const timer = setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          // Validate the QR code
          const result = validateLocationQRCode(decodedText, pharmacyId);
          setScanResult(result);
          setIsScanning(false);
          
          if (result.isValid) {
            // Auto-close and trigger success after short delay
            setTimeout(() => {
              scanner.clear();
              onSuccess();
              onOpenChange(false);
            }, 1500);
          }
          
          scanner.clear();
        },
        (error) => {
          // Scan error - usually just means no QR detected yet
          setIsScanning(true);
        }
      );

      return () => {
        scanner.clear().catch(() => {});
      };
    }, 100);

    return () => clearTimeout(timer);
  }, [open, pharmacyId, onSuccess, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Scan Location QR
          </DialogTitle>
          <DialogDescription>
            Point your camera at the Shop Location QR code to verify your location
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {/* Scanner Container */}
          <div 
            id="qr-reader" 
            className="w-full rounded-lg overflow-hidden bg-muted"
            style={{ minHeight: '300px' }}
          />

          {/* Result Feedback */}
          {scanResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg w-full ${
              scanResult.isValid 
                ? 'bg-success/10 text-success border border-success/30' 
                : 'bg-destructive/10 text-destructive border border-destructive/30'
            }`}>
              {scanResult.isValid ? (
                <Check className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span className="font-medium">{scanResult.message}</span>
            </div>
          )}

          {/* Instructions */}
          {isScanning && !scanResult && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Camera className="h-4 w-4 animate-pulse" />
              <span>Looking for QR code...</span>
            </div>
          )}

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
