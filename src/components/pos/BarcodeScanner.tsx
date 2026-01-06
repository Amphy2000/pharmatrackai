import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, ScanLine, Smartphone, Monitor, RefreshCw } from 'lucide-react';
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

export const BarcodeScanner = ({ open, onOpenChange, onScan }: BarcodeScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [requiresTapToStart, setRequiresTapToStart] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-detect hardware barcode scanner input (USB/Bluetooth “keyboard wedge”)
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

  useEffect(() => {
    // Detect if mobile device (many mobile browsers require a user gesture before opening the camera)
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    setIsMobile(mobile);
    setRequiresTapToStart(mobile);
  }, []);

  useEffect(() => {
    if (open && containerRef.current) {
      setError(null);
      setIsStarting(false);
      // Reset to “tap to start” on mobile each time the modal opens
      setRequiresTapToStart(isMobile);
      getCameras();
    }

    return () => {
      stopScanning();
    };
  }, [open, isMobile]);

  const getCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      const list = devices.map((d) => ({ id: d.id, label: d.label }));
      setCameras(list);

      if (devices.length === 0) {
        setSelectedCamera(null);
        setError('No camera detected on this device. You can still scan with a USB/Bluetooth barcode scanner.');
        return;
      }

      // Auto-select: prefer back camera on mobile, first available otherwise
      const backCamera = devices.find((d) => {
        const label = (d.label || '').toLowerCase();
        return label.includes('back') || label.includes('rear') || label.includes('environment');
      });

      // When labels are empty (common before permission), mobile “back camera” is often the last device.
      const fallbackId = isMobile ? devices[devices.length - 1].id : devices[0].id;
      setSelectedCamera(backCamera?.id || fallbackId);
    } catch (err) {
      console.error('Error getting cameras:', err);
      setError('Camera access is unavailable. You can still scan with a USB/Bluetooth barcode scanner.');
    }
  };

  useEffect(() => {
    if (!open) return;
    if (!selectedCamera) return;

    // Desktop: start automatically.
    // Mobile: require a tap to start (avoids iOS/Safari “user gesture required” issues).
    if (requiresTapToStart) return;

    startScanning(selectedCamera);
  }, [selectedCamera, open, requiresTapToStart]);

  const startScanning = async (cameraId: string) => {
    if (!containerRef.current) return;

    // Stop existing scanner first
    setIsStarting(true);
    setRequiresTapToStart(false);
    await stopScanning();

    try {
      setError(null);
      const html5QrCode = new Html5Qrcode('barcode-reader');
      scannerRef.current = html5QrCode;

      const formats = [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.CODABAR,
      ];

      // Types for html5-qrcode vary across versions; use a permissive config object.
      const config: any = {
        fps: 10,
        qrbox: { width: 250, height: 100 },
        aspectRatio: isMobile ? 1.5 : 2.5,
        formatsToSupport: formats,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      };

      await html5QrCode.start(
        cameraId,
        config,
        (decodedText) => {
          onScan(decodedText);
          stopScanning();
          onOpenChange(false);
        },
        () => {}
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Tap “Start Camera Scan” and allow camera access.'
          : 'Unable to access camera. Please grant camera permissions and try again.';
      setError(msg);
      setIsScanning(false);
      setRequiresTapToStart(true);
    } finally {
      setIsStarting(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        // Ignore errors when stopping
      }
    }
    scannerRef.current = null;
    setIsScanning(false);
  };

  const handleClose = () => {
    stopScanning();
    onOpenChange(false);
  };

  const switchCamera = () => {
    if (cameras.length > 1) {
      const currentIndex = cameras.findIndex(c => c.id === selectedCamera);
      const nextIndex = (currentIndex + 1) % cameras.length;
      setSelectedCamera(cameras[nextIndex].id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Camera className="h-5 w-5 text-primary" />
            Scan Barcode
            {isMobile ? (
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Monitor className="h-4 w-4 text-muted-foreground" />
            )}
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
                <Button onClick={() => selectedCamera && startScanning(selectedCamera)} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground text-center">
            {requiresTapToStart
              ? 'Tap “Start Camera Scan”, then align the barcode in the frame.'
              : 'Align the barcode in the frame to scan.'}
          </p>

          <div className="flex gap-2">
            {requiresTapToStart && selectedCamera && (
              <Button
                onClick={() => startScanning(selectedCamera)}
                className="flex-1 gap-2"
                disabled={isStarting}
              >
                {isStarting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/60 border-t-primary-foreground" />
                    Starting…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Start Camera Scan
                  </span>
                )}
              </Button>
            )}

            {cameras.length > 1 && (
              <Button variant="outline" onClick={switchCamera} className="flex-1 gap-2">
                <RefreshCw className="h-4 w-4" />
                Switch Camera
              </Button>
            )}

            <Button variant="outline" onClick={handleClose} className="flex-1 gap-2">
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            You can also scan using a USB/Bluetooth barcode scanner.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
