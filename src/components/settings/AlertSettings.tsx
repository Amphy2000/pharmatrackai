import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAlerts } from '@/hooks/useAlerts';
import { useMedications } from '@/hooks/useMedications';
import { usePharmacy } from '@/hooks/usePharmacy';
import { Bell, MessageCircle, Phone, Send, Loader2, CheckCircle, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, isBefore } from 'date-fns';

const ALERT_SETTINGS_KEY = 'pharmatrack_alert_settings';

export const AlertSettings = () => {
  const { pharmacy } = usePharmacy();
  const [phone, setPhone] = useState('');
  const [useWhatsApp, setUseWhatsApp] = useState(false); // Default to SMS
  const [lowStockEnabled, setLowStockEnabled] = useState(true);
  const [expiryEnabled, setExpiryEnabled] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const { sendLowStockAlert, sendExpiryAlert, sendAlert, isSending } = useAlerts();
  const { medications } = useMedications();

  // Load saved settings
  useEffect(() => {
    if (pharmacy?.id) {
      const savedSettings = localStorage.getItem(`${ALERT_SETTINGS_KEY}_${pharmacy.id}`);
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          setPhone(settings.phone || '');
          setUseWhatsApp(settings.useWhatsApp || false);
          setLowStockEnabled(settings.lowStockEnabled ?? true);
          setExpiryEnabled(settings.expiryEnabled ?? true);
          setIsSaved(true);
        } catch (e) {
          console.error('Failed to parse saved alert settings');
        }
      }
    }
  }, [pharmacy?.id]);

  const lowStockItems = medications?.filter(m => m.current_stock <= m.reorder_level) || [];
  const expiringItems = medications?.filter(m => {
    const expiryDate = new Date(m.expiry_date);
    return isBefore(expiryDate, addDays(new Date(), 30));
  }) || [];

  const handleSaveSettings = () => {
    if (!pharmacy?.id) {
      toast.error('Pharmacy not found');
      return;
    }

    if (!phone) {
      toast.error('Please enter a phone number');
      return;
    }

    const settings = {
      phone,
      useWhatsApp,
      lowStockEnabled,
      expiryEnabled,
    };

    localStorage.setItem(`${ALERT_SETTINGS_KEY}_${pharmacy.id}`, JSON.stringify(settings));
    setIsSaved(true);
    toast.success('Alert settings saved!');
  };

  const handleSendTestAlert = async () => {
    if (!phone) {
      toast.error('Please enter and save a phone number first');
      return;
    }

    const channel = useWhatsApp ? 'whatsapp' : 'sms';
    
    const result = await sendAlert({
      alertType: 'custom',
      message: 'This is a test alert from PharmaTrack. Your alerts are working correctly!',
      recipientPhone: phone,
      channel,
    });

    if (!result.success) {
      if (useWhatsApp) {
        toast.error('WhatsApp not configured. Try SMS instead, or set up Twilio WhatsApp Sandbox.');
      }
    }
  };

  const handleSendLowStockAlerts = async () => {
    if (!phone) {
      toast.error('Please enter and save a phone number first');
      return;
    }

    if (lowStockItems.length === 0) {
      toast.info('No low stock items to alert');
      return;
    }

    const channel = useWhatsApp ? 'whatsapp' : 'sms';
    await sendLowStockAlert(
      lowStockItems.map(m => ({ name: m.name, stock: m.current_stock })),
      phone,
      channel
    );
  };

  const handleSendExpiryAlerts = async () => {
    if (!phone) {
      toast.error('Please enter and save a phone number first');
      return;
    }

    if (expiringItems.length === 0) {
      toast.info('No expiring items to alert');
      return;
    }

    const channel = useWhatsApp ? 'whatsapp' : 'sms';
    await sendExpiryAlert(
      expiringItems.map(m => ({ 
        name: m.name, 
        expiryDate: format(new Date(m.expiry_date), 'MMM dd, yyyy') 
      })),
      phone,
      channel
    );
  };

  // Mark as unsaved when settings change
  useEffect(() => {
    setIsSaved(false);
  }, [phone, useWhatsApp, lowStockEnabled, expiryEnabled]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="glass-card border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="font-display">SMS & WhatsApp Alerts</CardTitle>
              <CardDescription>Get instant notifications for critical inventory events</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Phone Number Input */}
          <div className="space-y-2">
            <Label htmlFor="phone">Alert Phone Number</Label>
            <div className="flex gap-2">
              <Input
                id="phone"
                type="tel"
                placeholder="+234 XXX XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleSaveSettings}
                variant={isSaved ? "outline" : "default"}
                className="gap-2"
                disabled={!phone}
              >
                {isSaved ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-success" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Include country code (e.g., +234 for Nigeria). Click Save to store your number.
            </p>
          </div>

          {/* Channel Selection */}
          <div className="space-y-3">
            <Label>Message Channel</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setUseWhatsApp(false)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  !useWhatsApp 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border/50 hover:border-border'
                }`}
              >
                <Phone className={`h-6 w-6 mx-auto mb-2 ${!useWhatsApp ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className={`font-medium text-sm ${!useWhatsApp ? 'text-primary' : ''}`}>SMS</p>
                <p className="text-[10px] text-muted-foreground mt-1">Recommended</p>
              </button>
              <button
                onClick={() => setUseWhatsApp(true)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  useWhatsApp 
                    ? 'border-green-500 bg-green-500/5' 
                    : 'border-border/50 hover:border-border'
                }`}
              >
                <MessageCircle className={`h-6 w-6 mx-auto mb-2 ${useWhatsApp ? 'text-green-500' : 'text-muted-foreground'}`} />
                <p className={`font-medium text-sm ${useWhatsApp ? 'text-green-600' : ''}`}>WhatsApp</p>
                <p className="text-[10px] text-muted-foreground mt-1">Requires setup</p>
              </button>
            </div>
            
            {useWhatsApp && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
                <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                <p className="text-xs text-warning">
                  WhatsApp requires Twilio WhatsApp Business API setup. If you haven't configured this, use SMS instead.
                </p>
              </div>
            )}
          </div>

          {/* Alert Types */}
          <div className="space-y-3">
            <Label>Alert Types</Label>
            
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                  {lowStockItems.length}
                </Badge>
                <span className="text-sm">Low Stock Alerts</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={lowStockEnabled}
                  onCheckedChange={setLowStockEnabled}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendLowStockAlerts}
                  disabled={isSending || !phone || lowStockItems.length === 0}
                  className="gap-1"
                >
                  {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  Send
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                  {expiringItems.length}
                </Badge>
                <span className="text-sm">Expiry Alerts (30 days)</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={expiryEnabled}
                  onCheckedChange={setExpiryEnabled}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendExpiryAlerts}
                  disabled={isSending || !phone || expiringItems.length === 0}
                  className="gap-1"
                >
                  {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  Send
                </Button>
              </div>
            </div>
          </div>

          {/* Test Alert Button */}
          <div className="pt-4 border-t border-border/50">
            <Button
              onClick={handleSendTestAlert}
              disabled={isSending || !phone}
              className="w-full gap-2"
              variant="outline"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Send Test {useWhatsApp ? 'WhatsApp' : 'SMS'}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Sends a test message to verify your {useWhatsApp ? 'WhatsApp' : 'SMS'} setup
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
