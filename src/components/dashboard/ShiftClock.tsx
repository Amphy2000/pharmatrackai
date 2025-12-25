import { useState, useEffect, useCallback, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, LogIn, LogOut, Timer, DollarSign, History, Wifi, WifiOff, Lock, QrCode, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useShifts } from '@/hooks/useShifts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { usePharmacy } from '@/hooks/usePharmacy';
import { format, formatDistanceToNow } from 'date-fns';
import { QRScannerModal } from '@/components/shifts/QRScannerModal';
import { motion, AnimatePresence } from 'framer-motion';

export const ShiftClock = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();
  const { activeShift, clockIn, clockOut, isLoadingActiveShift } = useShifts();
  const { formatPrice } = useCurrency();
  const { pharmacy, pharmacyId } = usePharmacy();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isQRVerified, setIsQRVerified] = useState(false);
  const [detectedWifi, setDetectedWifi] = useState<string | null>(null);
  const [isWifiMatched, setIsWifiMatched] = useState(false);

  // Get security settings from pharmacy
  const requireWifiClockin = pharmacy?.require_wifi_clockin ?? false;
  const shopWifiName = pharmacy?.shop_wifi_name;
  const shopLocationQr = pharmacy?.shop_location_qr;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate WiFi detection (in real PWA/native, this would use actual network APIs)
  useEffect(() => {
    if (!requireWifiClockin || !shopWifiName) {
      setIsWifiMatched(true);
      return;
    }

    // Check if we're online (basic connectivity check)
    const checkWifi = () => {
      if (navigator.onLine) {
        // In a real implementation with native capabilities, we'd check actual SSID
        // For web, we'll show as "Connected" and let user verify via QR if needed
        setDetectedWifi('Connected Network');
        // For demo purposes, we'll use a simulated match
        // In production, this would need native app capabilities
        setIsWifiMatched(false); // Default to false, requiring QR scan for web
      } else {
        setDetectedWifi(null);
        setIsWifiMatched(false);
      }
    };

    checkWifi();
    window.addEventListener('online', checkWifi);
    window.addEventListener('offline', checkWifi);

    return () => {
      window.removeEventListener('online', checkWifi);
      window.removeEventListener('offline', checkWifi);
    };
  }, [requireWifiClockin, shopWifiName]);

  const canClockIn = !requireWifiClockin || isWifiMatched || isQRVerified;

  const handleClockIn = useCallback(() => {
    const method = isQRVerified ? 'qr' : (isWifiMatched ? 'wifi' : 'standard');
    clockIn.mutate({
      wifiName: detectedWifi || undefined,
      method,
      isVerified: isWifiMatched || isQRVerified,
    });
  }, [clockIn, isQRVerified, isWifiMatched, detectedWifi]);

  const handleClockOut = () => {
    if (activeShift) {
      clockOut.mutate(activeShift.id);
    }
  };

  const handleQRSuccess = () => {
    setIsQRVerified(true);
    setShowQRScanner(false);
  };

  const getShiftDuration = () => {
    if (!activeShift) return null;
    return formatDistanceToNow(new Date(activeShift.clock_in));
  };

  if (isLoadingActiveShift) {
    return (
      <div className="glass-card rounded-2xl border border-border/50 p-5 h-full flex flex-col">
        <div className="animate-pulse flex items-center gap-3">
          <div className="h-10 w-10 bg-muted rounded-xl" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-5 h-full flex flex-col ${
      activeShift 
        ? 'glass-card border-primary/30 bg-primary/5' 
        : 'glass-card border-border/50'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-lg ${
            activeShift 
              ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
              : 'bg-gradient-to-br from-slate-500 to-slate-600'
          }`}>
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Shift Status</h3>
            <p className="text-xs text-muted-foreground">
              {activeShift ? 'Currently working' : 'Not clocked in'}
            </p>
          </div>
        </div>
        <Badge variant={activeShift ? 'default' : 'secondary'} className={
          activeShift ? 'bg-success text-success-foreground' : ''
        }>
          {activeShift ? 'On Shift' : 'Off Shift'}
        </Badge>
      </div>

      <div className="text-center mb-4">
        <div className="text-3xl font-mono font-bold tracking-tight">
          {format(currentTime, 'HH:mm:ss')}
        </div>
      </div>

      {activeShift ? (
        <div className="flex-1 flex flex-col">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-background/50 rounded-xl p-3 text-center border border-border/30">
              <Timer className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm font-semibold">{getShiftDuration()}</div>
              <div className="text-[10px] text-muted-foreground">Duration</div>
            </div>
            <div className="bg-background/50 rounded-xl p-3 text-center border border-border/30">
              <DollarSign className="h-4 w-4 mx-auto mb-1 text-success" />
              <div className="text-sm font-semibold text-success">
                {formatPrice(activeShift.total_sales || 0)}
              </div>
              <div className="text-[10px] text-muted-foreground">Sales</div>
            </div>
          </div>
          <div className="flex gap-2 mt-auto">
            <Button 
              onClick={handleClockOut} 
              variant="destructive" 
              className="flex-1"
              disabled={clockOut.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {clockOut.isPending ? 'Clocking Out...' : 'Clock Out'}
            </Button>
            <Button 
              onClick={() => navigate('/shift-history')} 
              variant="outline"
              size="icon"
              title="View Shift History"
            >
              <History className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-end">
          {/* WiFi Status Display */}
          {requireWifiClockin && (
            <div className="mb-4 space-y-2">
              <AnimatePresence mode="wait">
                {isWifiMatched || isQRVerified ? (
                  <motion.div
                    key="verified"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center justify-center gap-2 text-sm text-success bg-success/10 rounded-lg p-2 border border-success/30"
                  >
                    <Check className="h-4 w-4" />
                    <span>
                      {isQRVerified ? 'Location verified via QR' : `Connected to: ${shopWifiName}`}
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="not-verified"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2 border border-border/50">
                      <WifiOff className="h-4 w-4" />
                      <span>
                        {detectedWifi 
                          ? `Connected to: ${detectedWifi}` 
                          : 'Not connected to WiFi'}
                      </span>
                    </div>
                    <p className="text-xs text-center text-amber-600 dark:text-amber-400">
                      Please connect to <strong>{shopWifiName}</strong> or scan the Location QR to clock in
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {!requireWifiClockin && (
            <p className="text-sm text-muted-foreground text-center mb-4">
              Clock in to start tracking your shift sales
            </p>
          )}

          <div className="flex gap-2">
            {canClockIn ? (
              <motion.div
                className="flex-1"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Button 
                  onClick={handleClockIn} 
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white"
                  disabled={clockIn.isPending}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {clockIn.isPending ? 'Clocking In...' : 'Clock In'}
                </Button>
              </motion.div>
            ) : (
              <Button 
                variant="secondary"
                className="flex-1 cursor-not-allowed opacity-70"
                disabled
              >
                <Lock className="h-4 w-4 mr-2" />
                Clock In Locked
              </Button>
            )}
            
            {/* QR Scan Button */}
            {requireWifiClockin && !isWifiMatched && !isQRVerified && shopLocationQr && (
              <Button 
                onClick={() => setShowQRScanner(true)}
                variant="outline"
                className="gap-2"
              >
                <QrCode className="h-4 w-4" />
                Scan QR
              </Button>
            )}
            
            <Button 
              onClick={() => navigate('/shift-history')} 
              variant="outline"
              size="icon"
              title="View Shift History"
            >
              <History className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {pharmacyId && (
        <QRScannerModal
          open={showQRScanner}
          onOpenChange={setShowQRScanner}
          pharmacyId={pharmacyId}
          onSuccess={handleQRSuccess}
        />
      )}
    </div>
  );
});

ShiftClock.displayName = 'ShiftClock';
