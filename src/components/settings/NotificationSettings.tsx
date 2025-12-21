import { useState } from 'react';
import { Bell, MessageCircle, Phone, Send, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNotifications } from '@/hooks/useNotifications';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useToast } from '@/hooks/use-toast';

export const NotificationSettings = () => {
  const [open, setOpen] = useState(false);
  const { settings, updateSettings, sendTestNotification, sending } = useNotifications();
  const { pharmacy } = usePharmacy();
  const { toast } = useToast();

  const handleTestNotification = async () => {
    if (!settings.phone) {
      toast({
        title: 'Phone Required',
        description: 'Please enter a phone number first',
        variant: 'destructive',
      });
      return;
    }

    if (!pharmacy?.id) {
      toast({
        title: 'No Pharmacy',
        description: 'Please set up your pharmacy first',
        variant: 'destructive',
      });
      return;
    }

    await sendTestNotification(pharmacy.id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-xl relative">
          <Bell className="h-5 w-5" />
          {settings.enabled && (
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifications
          </DialogTitle>
          <DialogDescription>
            Get SMS or WhatsApp alerts for stock, expiry, and sales
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Master Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label className="font-medium">Enable Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive alerts via SMS/WhatsApp</p>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(enabled) => updateSettings({ enabled })}
            />
          </div>

          {settings.enabled && (
            <>
              {/* Phone Number */}
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    placeholder="+2348012345678"
                    value={settings.phone}
                    onChange={(e) => updateSettings({ phone: e.target.value })}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Include country code (e.g., +234 for Nigeria, +44 for UK)
                </p>
              </div>

              {/* Channel Selection */}
              <div className="space-y-2">
                <Label>Notification Channel</Label>
                <Select
                  value={settings.channel}
                  onValueChange={(value: 'sms' | 'whatsapp') => updateSettings({ channel: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">
                      <span className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-green-500" />
                        WhatsApp
                      </span>
                    </SelectItem>
                    <SelectItem value="sms">
                      <span className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-blue-500" />
                        SMS
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {settings.channel === 'whatsapp' && (
                  <p className="text-xs text-muted-foreground">
                    Make sure you've joined the Twilio WhatsApp sandbox first
                  </p>
                )}
              </div>

              {/* Alert Types */}
              <div className="space-y-3">
                <Label>Alert Types</Label>
                
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">Low Stock Alerts</p>
                    <p className="text-xs text-muted-foreground">When items fall below reorder level</p>
                  </div>
                  <Switch
                    checked={settings.lowStockAlerts}
                    onCheckedChange={(lowStockAlerts) => updateSettings({ lowStockAlerts })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">Expiry Warnings</p>
                    <p className="text-xs text-muted-foreground">Medications expiring within 90 days</p>
                  </div>
                  <Switch
                    checked={settings.expiryWarnings}
                    onCheckedChange={(expiryWarnings) => updateSettings({ expiryWarnings })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">Daily Sales Summary</p>
                    <p className="text-xs text-muted-foreground">End-of-day sales report</p>
                  </div>
                  <Switch
                    checked={settings.dailySummary}
                    onCheckedChange={(dailySummary) => updateSettings({ dailySummary })}
                  />
                </div>
              </div>

              {/* Test Button */}
              <Button
                onClick={handleTestNotification}
                disabled={sending || !settings.phone}
                variant="outline"
                className="w-full"
              >
                {sending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Send Test Notification
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
