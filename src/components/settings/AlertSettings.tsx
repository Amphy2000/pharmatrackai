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
import { useSales } from '@/hooks/useSales';
import { 
  Bell, MessageCircle, Phone, Send, Loader2, CheckCircle, Save, 
  AlertCircle, Zap, Clock, TrendingUp, Shield, Sparkles 
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, isBefore, differenceInDays } from 'date-fns';

const ALERT_SETTINGS_KEY = 'pharmatrack_alert_settings';

export const AlertSettings = () => {
  const { pharmacy } = usePharmacy();
  const [phone, setPhone] = useState('');
  const [useWhatsApp, setUseWhatsApp] = useState(false);
  const [lowStockEnabled, setLowStockEnabled] = useState(true);
  const [expiryEnabled, setExpiryEnabled] = useState(true);
  const [dailySummaryEnabled, setDailySummaryEnabled] = useState(true);
  const [autoAlertsEnabled, setAutoAlertsEnabled] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [lastAlertSent, setLastAlertSent] = useState<string | null>(null);
  const { sendLowStockAlert, sendExpiryAlert, sendExpiredAlert, sendDailySummary, sendAlert, isSending } = useAlerts();
  const { medications } = useMedications();
  const { sales } = useSales();

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
          setDailySummaryEnabled(settings.dailySummaryEnabled ?? true);
          setAutoAlertsEnabled(settings.autoAlertsEnabled ?? false);
          setLastAlertSent(settings.lastAlertSent || null);
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
    return isBefore(expiryDate, addDays(new Date(), 30)) && !isBefore(expiryDate, new Date());
  }) || [];
  const expiredItems = medications?.filter(m => isBefore(new Date(m.expiry_date), new Date())) || [];
  
  const totalAtRiskValue = expiringItems.reduce((sum, m) => 
    sum + (m.selling_price || m.unit_price) * m.current_stock, 0
  );

  const handleSaveSettings = () => {
    if (!pharmacy?.id) {
      toast.error('Pharmacy not found');
      return;
    }

    if (!phone) {
      toast.error('Please enter a phone number');
      return;
    }

    // Validate Nigerian phone number
    const cleanPhone = phone.replace(/\s+/g, '').replace(/^[+]/, '');
    if (!cleanPhone.match(/^(234|0)\d{10}$/)) {
      toast.error('Please enter a valid Nigerian phone number');
      return;
    }

    const settings = {
      phone,
      useWhatsApp,
      lowStockEnabled,
      expiryEnabled,
      dailySummaryEnabled,
      autoAlertsEnabled,
      lastAlertSent,
    };

    localStorage.setItem(`${ALERT_SETTINGS_KEY}_${pharmacy.id}`, JSON.stringify(settings));
    setIsSaved(true);
    toast.success('Alert settings saved! 🎉', {
      description: autoAlertsEnabled ? 'Automated alerts are now active' : undefined,
    });
  };

  const handleSendTestAlert = async () => {
    if (!phone) {
      toast.error('Please enter and save a phone number first');
      return;
    }

    const channel = useWhatsApp ? 'whatsapp' : 'sms';
    
    await sendAlert({
      alertType: 'custom',
      message: `✅ PharmaTrack Test Alert

Your notification system is working perfectly!

You will receive:
• Low stock alerts
• Expiry warnings  
• Daily summaries

Stay profitable! 💰`,
      recipientPhone: phone,
      channel,
    });
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
    const items = lowStockItems.map(m => ({ 
      name: m.name, 
      stock: m.current_stock,
      reorderLevel: m.reorder_level,
    }));

    await sendLowStockAlert(items, phone, channel);
    updateLastAlertSent();
  };

  const handleSendExpiryAlerts = async () => {
    if (!phone) {
      toast.error('Please enter and save a phone number first');
      return;
    }

    if (expiringItems.length === 0 && expiredItems.length === 0) {
      toast.info('No expiring items to alert');
      return;
    }

    const channel = useWhatsApp ? 'whatsapp' : 'sms';

    // Send expired alerts first (urgent)
    if (expiredItems.length > 0) {
      const items = expiredItems.map(m => ({ 
        name: m.name,
        value: (m.selling_price || m.unit_price) * m.current_stock,
      }));
      await sendExpiredAlert(items, phone, channel);
    }

    // Then send expiring soon alerts
    if (expiringItems.length > 0) {
      const items = expiringItems.map(m => ({ 
        name: m.name, 
        expiryDate: format(new Date(m.expiry_date), 'MMM dd, yyyy'),
        value: (m.selling_price || m.unit_price) * m.current_stock,
        daysLeft: differenceInDays(new Date(m.expiry_date), new Date()),
      }));
      await sendExpiryAlert(items, phone, channel);
    }

    updateLastAlertSent();
  };

  const handleSendDailySummary = async () => {
    if (!phone) {
      toast.error('Please enter and save a phone number first');
      return;
    }

    const channel = useWhatsApp ? 'whatsapp' : 'sms';
    const today = new Date().toISOString().split('T')[0];
    const todaySalesData = sales?.filter(s => s.sale_date.startsWith(today)) || [];
    const todayTotal = todaySalesData.reduce((sum, s) => sum + s.total_price, 0);

    await sendDailySummary(
      {
        todaySales: todayTotal,
        expiringCount: expiringItems.length,
        lowStockCount: lowStockItems.length,
        protectedValue: totalAtRiskValue,
      },
      phone,
      channel
    );
    updateLastAlertSent();
  };

  const updateLastAlertSent = () => {
    const now = new Date().toISOString();
    setLastAlertSent(now);
    if (pharmacy?.id) {
      const savedSettings = localStorage.getItem(`${ALERT_SETTINGS_KEY}_${pharmacy.id}`);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        settings.lastAlertSent = now;
        localStorage.setItem(`${ALERT_SETTINGS_KEY}_${pharmacy.id}`, JSON.stringify(settings));
      }
    }
  };

  // Mark as unsaved when settings change
  useEffect(() => {
    setIsSaved(false);
  }, [phone, useWhatsApp, lowStockEnabled, expiryEnabled, dailySummaryEnabled, autoAlertsEnabled]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Hero Card */}
      <Card className="glass-card border-border/50 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <CardHeader className="relative">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="font-display text-xl flex items-center gap-2">
                Smart Alert System
                <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                  Powered by Termii
                </Badge>
              </CardTitle>
              <CardDescription>Never miss critical inventory events - get instant SMS/WhatsApp alerts</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          {/* Stats Preview */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-background/50 rounded-xl p-3 border border-border/30 text-center">
              <div className="text-2xl font-bold text-warning">{lowStockItems.length}</div>
              <div className="text-xs text-muted-foreground">Low Stock</div>
            </div>
            <div className="bg-background/50 rounded-xl p-3 border border-border/30 text-center">
              <div className="text-2xl font-bold text-destructive">{expiringItems.length + expiredItems.length}</div>
              <div className="text-xs text-muted-foreground">Expiring</div>
            </div>
            <div className="bg-background/50 rounded-xl p-3 border border-border/30 text-center">
              <div className="text-lg font-bold text-primary">₦{(totalAtRiskValue / 1000).toFixed(0)}k</div>
              <div className="text-xs text-muted-foreground">At Risk</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Card */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Phone className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="font-display">Alert Configuration</CardTitle>
              <CardDescription>Set up your notification preferences</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Phone Number Input */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Your Phone Number
            </Label>
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
              Nigerian format: 08012345678 or +2348012345678
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
                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/20' 
                    : 'border-border/50 hover:border-border'
                }`}
              >
                <Phone className={`h-6 w-6 mx-auto mb-2 ${!useWhatsApp ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className={`font-medium text-sm ${!useWhatsApp ? 'text-primary' : ''}`}>SMS</p>
                <p className="text-[10px] text-muted-foreground mt-1">Works everywhere</p>
              </button>
              <button
                onClick={() => setUseWhatsApp(true)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  useWhatsApp 
                    ? 'border-green-500 bg-green-500/5 shadow-lg shadow-green-500/20' 
                    : 'border-border/50 hover:border-border'
                }`}
              >
                <MessageCircle className={`h-6 w-6 mx-auto mb-2 ${useWhatsApp ? 'text-green-500' : 'text-muted-foreground'}`} />
                <p className={`font-medium text-sm ${useWhatsApp ? 'text-green-600' : ''}`}>WhatsApp</p>
                <p className="text-[10px] text-muted-foreground mt-1">Rich messages</p>
              </button>
            </div>
          </div>

          {/* Alert Types */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alert Types
            </Label>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-warning/20 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Low Stock Alerts</p>
                    <p className="text-xs text-muted-foreground">{lowStockItems.length} items need attention</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
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

              <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Expiry Alerts</p>
                    <p className="text-xs text-muted-foreground">{expiringItems.length + expiredItems.length} items expiring/expired</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={expiryEnabled}
                    onCheckedChange={setExpiryEnabled}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSendExpiryAlerts}
                    disabled={isSending || !phone || (expiringItems.length === 0 && expiredItems.length === 0)}
                    className="gap-1"
                  >
                    {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    Send
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Daily Summary</p>
                    <p className="text-xs text-muted-foreground">Sales & inventory overview</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={dailySummaryEnabled}
                    onCheckedChange={setDailySummaryEnabled}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSendDailySummary}
                    disabled={isSending || !phone}
                    className="gap-1"
                  >
                    {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Auto Alerts Toggle */}
          <div className="p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Automatic Daily Alerts</p>
                  <p className="text-xs text-muted-foreground">Receive alerts every morning at 8 AM</p>
                </div>
              </div>
              <Switch
                checked={autoAlertsEnabled}
                onCheckedChange={setAutoAlertsEnabled}
              />
            </div>
            {autoAlertsEnabled && (
              <div className="mt-3 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">
                  ✅ You will receive automated alerts for critical items daily.
                  {lastAlertSent && (
                    <span className="block mt-1">
                      Last alert sent: {format(new Date(lastAlertSent), 'MMM dd, h:mm a')}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Test Alert Button */}
          <div className="pt-4 border-t border-border/50">
            <Button
              onClick={handleSendTestAlert}
              disabled={isSending || !phone}
              className="w-full gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
              size="lg"
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle className="h-5 w-5" />
              )}
              Send Test {useWhatsApp ? 'WhatsApp' : 'SMS'}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Verify your setup is working correctly
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="glass-card border-border/50 bg-gradient-to-br from-amber-500/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="font-medium text-sm">How it works</p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                <li>• Messages are sent via Termii (Nigeria's #1 SMS provider)</li>
                <li>• WhatsApp messages require your number to be registered</li>
                <li>• Automated alerts check your inventory daily at 8 AM</li>
                <li>• You'll only receive alerts for enabled categories</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
