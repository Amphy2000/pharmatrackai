import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Wifi, QrCode, Shield, Check, Printer, RefreshCw } from 'lucide-react';
import { usePharmacy } from '@/hooks/usePharmacy';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateLocationQRCode } from '@/components/shifts/LocationQRScanner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export const ClockInSecuritySettings = () => {
  const { pharmacy, pharmacyId, updatePharmacySettings } = usePharmacy();
  const [wifiName, setWifiName] = useState(pharmacy?.shop_wifi_name || '');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPosterDialog, setShowPosterDialog] = useState(false);

  const requireWifiClockin = pharmacy?.require_wifi_clockin ?? false;
  const shopWifiName = pharmacy?.shop_wifi_name;
  const shopLocationQr = pharmacy?.shop_location_qr;

  const handleCaptureWifi = async () => {
    setIsCapturing(true);
    // Since browsers can't directly read WiFi SSID, prompt user to enter it
    const userWifi = prompt(
      'Enter your Shop WiFi Name:\n\n' +
      '(You can find this in your device\'s WiFi settings. ' +
      'It\'s the name of the network you\'re currently connected to.)'
    );
    
    if (userWifi && userWifi.trim()) {
      setWifiName(userWifi.trim());
      toast.success('WiFi name captured! Click "Save Settings" to apply.');
    }
    setIsCapturing(false);
  };

  const handleSaveSettings = async () => {
    if (!pharmacyId) return;
    
    setIsSaving(true);
    try {
      // Generate QR code if not exists or WiFi name changed
      let qrCode = shopLocationQr;
      if (!qrCode || wifiName !== shopWifiName) {
        qrCode = generateLocationQRCode(pharmacyId, pharmacy?.name || 'Pharmacy');
      }

      const { error } = await supabase
        .from('pharmacies')
        .update({
          shop_wifi_name: wifiName || null,
          shop_location_qr: qrCode,
          require_wifi_clockin: requireWifiClockin,
        })
        .eq('id', pharmacyId);

      if (error) throw error;
      
      toast.success('Clock-in security settings saved!');
    } catch (error: any) {
      toast.error('Failed to save settings: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleRequirement = async (enabled: boolean) => {
    if (!pharmacyId) return;
    
    try {
      // Generate QR code if enabling and none exists
      let qrCode = shopLocationQr;
      if (enabled && !qrCode) {
        qrCode = generateLocationQRCode(pharmacyId, pharmacy?.name || 'Pharmacy');
      }

      const { error } = await supabase
        .from('pharmacies')
        .update({
          require_wifi_clockin: enabled,
          shop_location_qr: qrCode,
        })
        .eq('id', pharmacyId);

      if (error) throw error;
      
      toast.success(enabled ? 'Clock-in verification enabled' : 'Clock-in verification disabled');
    } catch (error: any) {
      toast.error('Failed to update setting: ' + error.message);
    }
  };

  const handleRegenerateQR = async () => {
    if (!pharmacyId) return;
    
    try {
      const newQr = generateLocationQRCode(pharmacyId, pharmacy?.name || 'Pharmacy');
      
      const { error } = await supabase
        .from('pharmacies')
        .update({ shop_location_qr: newQr })
        .eq('id', pharmacyId);

      if (error) throw error;
      
      toast.success('New location QR code generated!');
    } catch (error: any) {
      toast.error('Failed to regenerate QR: ' + error.message);
    }
  };

  const printSecurityPoster = () => {
    if (!shopLocationQr || !pharmacyId) {
      toast.error('Please save settings first to generate QR code');
      return;
    }
    
    // Open print dialog
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print the poster');
      return;
    }

    const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shopLocationQr)}`;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Clock-In Security Poster - ${pharmacy?.name || 'Pharmacy'}</title>
        <style>
          @page { size: A4; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: system-ui, -apple-system, sans-serif;
            width: 210mm;
            height: 297mm;
            padding: 20mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            background: white;
          }
          .header { 
            text-align: center;
            margin-bottom: 30px;
          }
          .pharmacy-name {
            font-size: 28px;
            font-weight: bold;
            color: #1a1a2e;
            margin-bottom: 8px;
          }
          .subtitle {
            font-size: 16px;
            color: #666;
          }
          .qr-container {
            background: #f8f9fa;
            border-radius: 20px;
            padding: 40px;
            margin: 40px 0;
            text-align: center;
            border: 2px dashed #e0e0e0;
          }
          .qr-container img {
            width: 200px;
            height: 200px;
          }
          .qr-label {
            margin-top: 20px;
            font-size: 18px;
            font-weight: 600;
            color: #1a1a2e;
          }
          .instructions {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 16px;
            text-align: center;
            width: 100%;
            max-width: 400px;
          }
          .instructions h2 {
            font-size: 20px;
            margin-bottom: 20px;
          }
          .steps {
            text-align: left;
            font-size: 14px;
            line-height: 2;
          }
          .steps li {
            margin-bottom: 8px;
          }
          .footer {
            margin-top: auto;
            text-align: center;
            font-size: 12px;
            color: #999;
          }
          .wifi-info {
            background: #e8f5e9;
            padding: 15px 25px;
            border-radius: 10px;
            margin-top: 30px;
            font-size: 14px;
          }
          .wifi-name {
            font-weight: bold;
            color: #2e7d32;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="pharmacy-name">${pharmacy?.name || 'Pharmacy'}</div>
          <div class="subtitle">Staff Clock-In Station</div>
        </div>
        
        <div class="qr-container">
          <img src="${qrDataUrl}" alt="Location QR Code" />
          <div class="qr-label">📍 Shop Location QR</div>
        </div>
        
        <div class="instructions">
          <h2>How to Clock In</h2>
          <ol class="steps">
            <li>Open the PharmaT app on your phone</li>
            <li>Go to your Dashboard</li>
            <li>Tap the "Clock In" button</li>
            <li>If prompted, scan this QR code</li>
            <li>Your shift will start automatically</li>
          </ol>
        </div>
        
        ${shopWifiName ? `
        <div class="wifi-info">
          🔒 Connect to <span class="wifi-name">${shopWifiName}</span> for automatic verification
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Powered by PharmaT | Secure Clock-In System</p>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Clock-In Security
        </CardTitle>
        <CardDescription>
          Ensure staff can only clock in when they're at the shop
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Require Location Verification</Label>
            <p className="text-sm text-muted-foreground">
              Staff must be on Shop WiFi or scan the Location QR to clock in
            </p>
          </div>
          <Switch 
            checked={requireWifiClockin} 
            onCheckedChange={handleToggleRequirement}
          />
        </div>

        {requireWifiClockin && (
          <>
            {/* WiFi Setup */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-primary" />
                <Label className="text-base font-medium">Shop WiFi Name</Label>
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={wifiName}
                  onChange={(e) => setWifiName(e.target.value)}
                  placeholder="Enter your shop WiFi name..."
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  onClick={handleCaptureWifi}
                  disabled={isCapturing}
                >
                  {isCapturing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    'Set Current WiFi'
                  )}
                </Button>
              </div>
              
              {shopWifiName && (
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-muted-foreground">Saved WiFi:</span>
                  <Badge variant="secondary">{shopWifiName}</Badge>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                When staff connect to this WiFi, they can clock in automatically. 
                If they're not on this WiFi, they'll need to scan the Location QR.
              </p>
            </div>

            {/* QR Fallback */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-primary" />
                  <Label className="text-base font-medium">Location QR Code</Label>
                </div>
                {shopLocationQr && (
                  <Badge variant="outline" className="text-success border-success">
                    <Check className="h-3 w-3 mr-1" />
                    Generated
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                Print this QR code and display it at your shop. Staff without WiFi access 
                can scan it to verify they're at the location.
              </p>

              <div className="flex gap-2">
                <Button 
                  variant="default" 
                  className="gap-2"
                  onClick={printSecurityPoster}
                  disabled={!shopLocationQr && !wifiName}
                >
                  <Printer className="h-4 w-4" />
                  Print Security Poster
                </Button>
                
                {shopLocationQr && (
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleRegenerateQR}
                    title="Generate new QR code"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Save Button */}
            {wifiName !== shopWifiName && (
              <Button 
                className="w-full" 
                onClick={handleSaveSettings}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
