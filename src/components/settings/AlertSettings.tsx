import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAlerts } from '@/hooks/useAlerts';
import { useMedications } from '@/hooks/useMedications';
import { Bell, MessageCircle, Phone, Send, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, isBefore } from 'date-fns';

export const AlertSettings = () => {
  const [phone, setPhone] = useState('');
  const [useWhatsApp, setUseWhatsApp] = useState(true);
  const [lowStockEnabled, setLowStockEnabled] = useState(true);
  const [expiryEnabled, setExpiryEnabled] = useState(true);
  const { sendLowStockAlert, sendExpiryAlert, isSending } = useAlerts();
  const { medications } = useMedications();

  const lowStockItems = medications?.filter(m => m.current_stock <= m.reorder_level) || [];
  const expiringItems = medications?.filter(m => {
    const expiryDate = new Date(m.expiry_date);
    return isBefore(expiryDate, addDays(new Date(), 30));
  }) || [];

  const handleSendTestAlert = async () => {
    if (!phone) {
      toast.error('Please enter a phone number');
      return;
    }

    const channel = useWhatsApp ? 'whatsapp' : 'sms';
    
    // Send a test alert
    const result = await sendLowStockAlert(
      [{ name: 'Test Product', stock: 5 }],
      phone,
      channel
    );

    if (result.success) {
      toast.success('Test alert sent! Check your phone.');
    }
  };

  const handleSendLowStockAlerts = async () => {
    if (!phone) {
      toast.error('Please enter a phone number');
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
      toast.error('Please enter a phone number');
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
            </div>
            <p className="text-xs text-muted-foreground">
              Include country code (e.g., +234 for Nigeria)
            </p>
          </div>

          {/* Channel Selection */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
            <div className="flex items-center gap-3">
              {useWhatsApp ? (
                <MessageCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Phone className="h-5 w-5 text-primary" />
              )}
              <div>
                <p className="font-medium">{useWhatsApp ? 'WhatsApp' : 'SMS'}</p>
                <p className="text-xs text-muted-foreground">
                  {useWhatsApp ? 'Free with internet connection' : 'Standard SMS rates apply'}
                </p>
              </div>
            </div>
            <Switch
              checked={useWhatsApp}
              onCheckedChange={setUseWhatsApp}
            />
          </div>

          {/* Alert Types */}
          <div className="space-y-3">
            <Label>Alert Types</Label>
            
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
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
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
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
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
              Send Test Alert
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Sends a test message to verify your setup
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
