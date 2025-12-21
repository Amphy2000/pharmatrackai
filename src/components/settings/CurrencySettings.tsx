import { useState } from 'react';
import { Settings, DollarSign, Globe, Zap, Building2, Bell, MessageCircle, Phone, TestTube } from 'lucide-react';
import { useCurrency, CurrencyCode } from '@/contexts/CurrencyContext';
import { useRegionalSettings, CountryCode, POSMode } from '@/contexts/RegionalSettingsContext';
import { useNotifications } from '@/hooks/useNotifications';
import { usePharmacy } from '@/hooks/usePharmacy';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const COUNTRY_OPTIONS: { code: CountryCode; name: string; flag: string }[] = [
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
];

const CURRENCY_OPTIONS: { code: CurrencyCode; name: string; symbol: string }[] = [
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
];

export const CurrencySettings = () => {
  const { currency, exchangeRates, setCurrency, setExchangeRate } = useCurrency();
  const { country, posMode, setCountry, setPOSMode, regulatory } = useRegionalSettings();
  const { settings: notificationSettings, updateSettings: updateNotificationSettings, sendTestNotification, sending } = useNotifications();
  const { pharmacy } = usePharmacy();
  const [open, setOpen] = useState(false);
  const [tempNGNRate, setTempNGNRate] = useState(exchangeRates.NGN.toString());
  const [tempGBPRate, setTempGBPRate] = useState(exchangeRates.GBP.toString());
  const { toast } = useToast();

  const handleTestNotification = async () => {
    if (!notificationSettings.phone) {
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

  const handleSave = () => {
    const ngnRate = parseFloat(tempNGNRate);
    const gbpRate = parseFloat(tempGBPRate);
    
    if (isNaN(ngnRate) || ngnRate <= 0 || isNaN(gbpRate) || gbpRate <= 0) {
      toast({
        title: 'Invalid Exchange Rate',
        description: 'Please enter valid positive numbers',
        variant: 'destructive',
      });
      return;
    }
    
    setExchangeRate('NGN', ngnRate);
    setExchangeRate('GBP', gbpRate);
    
    toast({
      title: 'Settings Saved',
      description: 'Exchange rates and settings have been updated',
    });
    setOpen(false);
  };

  const handleCurrencyChange = (value: CurrencyCode) => {
    setCurrency(value);
    const currencyInfo = CURRENCY_OPTIONS.find(c => c.code === value);
    toast({
      title: 'Currency Changed',
      description: `Display currency set to ${currencyInfo?.name} (${currencyInfo?.symbol})`,
    });
  };

  const handleCountryChange = (value: CountryCode) => {
    setCountry(value);
    const countryInfo = COUNTRY_OPTIONS.find(c => c.code === value);
    toast({
      title: 'Region Changed',
      description: `Region set to ${countryInfo?.name}. Regulatory compliance now uses ${
        value === 'NG' ? 'NAFDAC' : value === 'US' ? 'FDA' : 'MHRA'
      } standards.`,
    });
  };

  const handlePOSModeChange = (mode: POSMode) => {
    setPOSMode(mode);
    toast({
      title: mode === 'simple' ? 'Simple Mode Enabled' : 'Enterprise Mode Enabled',
      description: mode === 'simple' 
        ? 'Customer info and regulatory tracking hidden for faster checkout'
        : 'Full compliance tracking and customer details enabled',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-xl relative">
          <Settings className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure region, currency, and POS mode
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="region" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="region" className="text-xs sm:text-sm">
              <Globe className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Region</span>
            </TabsTrigger>
            <TabsTrigger value="currency" className="text-xs sm:text-sm">
              <DollarSign className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Currency</span>
            </TabsTrigger>
            <TabsTrigger value="mode" className="text-xs sm:text-sm">
              <Zap className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Mode</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs sm:text-sm">
              <Bell className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
          </TabsList>
          {/* Region Tab */}
          <TabsContent value="region" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Country / Region</Label>
              <Select value={country} onValueChange={handleCountryChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_OPTIONS.map(opt => (
                    <SelectItem key={opt.code} value={opt.code}>
                      <span className="flex items-center gap-2">
                        <span className="text-lg">{opt.flag}</span>
                        {opt.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 space-y-2">
              <Label className="text-xs text-muted-foreground">Regulatory Body</Label>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{regulatory.icon}</span>
                <div>
                  <p className="font-medium">{regulatory.abbreviation}</p>
                  <p className="text-xs text-muted-foreground">{regulatory.name}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                License format: <span className="font-mono text-foreground">{regulatory.licenseLabel}</span>
              </p>
            </div>
          </TabsContent>

          {/* Currency Tab */}
          <TabsContent value="currency" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Display Currency</Label>
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map(opt => (
                    <SelectItem key={opt.code} value={opt.code}>
                      <span className="flex items-center gap-2">
                        <span className="font-mono w-4">{opt.symbol}</span>
                        {opt.name} ({opt.code})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Exchange Rates (vs USD)</Label>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm whitespace-nowrap">
                  <span>1 USD =</span>
                </div>
                <Input
                  type="number"
                  value={tempNGNRate}
                  onChange={(e) => setTempNGNRate(e.target.value)}
                  placeholder="1600"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground w-10">NGN</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm whitespace-nowrap">
                  <span>1 USD =</span>
                </div>
                <Input
                  type="number"
                  value={tempGBPRate}
                  onChange={(e) => setTempGBPRate(e.target.value)}
                  placeholder="0.79"
                  step="0.01"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground w-10">GBP</span>
              </div>

              <p className="text-xs text-muted-foreground">
                Set exchange rates for automatic price conversion
              </p>
            </div>

            {/* Preview */}
            <div className="p-4 rounded-xl bg-muted/30 space-y-2">
              <Label className="text-xs text-muted-foreground">Preview ($100 USD)</Label>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center p-2 rounded-lg bg-background/50">
                  <p className="font-mono font-medium">$100.00</p>
                  <p className="text-[10px] text-muted-foreground">USD</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-background/50">
                  <p className="font-mono font-medium">₦{(100 * parseFloat(tempNGNRate || '0')).toLocaleString('en-NG')}</p>
                  <p className="text-[10px] text-muted-foreground">NGN</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-background/50">
                  <p className="font-mono font-medium">£{(100 * parseFloat(tempGBPRate || '0')).toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">GBP</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Mode Tab */}
          <TabsContent value="mode" className="space-y-4 mt-4">
            <div className="space-y-4">
              {/* Simple Mode */}
              <div 
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  posMode === 'simple' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border/50 hover:border-border'
                }`}
                onClick={() => handlePOSModeChange('simple')}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${posMode === 'simple' ? 'bg-primary/20' : 'bg-muted'}`}>
                    <Zap className={`h-5 w-5 ${posMode === 'simple' ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Simple Mode</h4>
                      <Switch checked={posMode === 'simple'} onCheckedChange={() => handlePOSModeChange('simple')} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Fast checkout for small pharmacies. Hides customer info fields and regulatory batch tracking.
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">Quick sales</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">No customer forms</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">Minimal tracking</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enterprise Mode */}
              <div 
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  posMode === 'enterprise' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border/50 hover:border-border'
                }`}
                onClick={() => handlePOSModeChange('enterprise')}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${posMode === 'enterprise' ? 'bg-primary/20' : 'bg-muted'}`}>
                    <Building2 className={`h-5 w-5 ${posMode === 'enterprise' ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Enterprise Mode</h4>
                      <Switch checked={posMode === 'enterprise'} onCheckedChange={() => handlePOSModeChange('enterprise')} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Full compliance for clinics and large pharmacies. Enables {regulatory.abbreviation} tracking and customer details.
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">Full {regulatory.abbreviation} compliance</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">Customer tracking</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">Prescription support</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4 mt-4">
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
                checked={notificationSettings.enabled}
                onCheckedChange={(enabled) => updateNotificationSettings({ enabled })}
              />
            </div>

            {notificationSettings.enabled && (
              <>
                {/* Phone Number */}
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    type="tel"
                    placeholder="+2348012345678"
                    value={notificationSettings.phone}
                    onChange={(e) => updateNotificationSettings({ phone: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Include country code (e.g., +234 for Nigeria, +44 for UK)
                  </p>
                </div>

                {/* Channel Selection */}
                <div className="space-y-2">
                  <Label>Notification Channel</Label>
                  <Select
                    value={notificationSettings.channel}
                    onValueChange={(value: 'sms' | 'whatsapp') => updateNotificationSettings({ channel: value })}
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
                  {notificationSettings.channel === 'whatsapp' && (
                    <p className="text-xs text-muted-foreground">
                      Make sure you've joined the Twilio WhatsApp sandbox first
                    </p>
                  )}
                </div>

                {/* Alert Types */}
                <div className="space-y-2">
                  <Label>Alert Types</Label>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">Low Stock Alerts</p>
                      <p className="text-xs text-muted-foreground">When items fall below reorder level</p>
                    </div>
                    <Switch
                      checked={notificationSettings.lowStockAlerts}
                      onCheckedChange={(lowStockAlerts) => updateNotificationSettings({ lowStockAlerts })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">Expiry Warnings</p>
                      <p className="text-xs text-muted-foreground">Medications expiring within 90 days</p>
                    </div>
                    <Switch
                      checked={notificationSettings.expiryWarnings}
                      onCheckedChange={(expiryWarnings) => updateNotificationSettings({ expiryWarnings })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">Daily Sales Summary</p>
                      <p className="text-xs text-muted-foreground">End-of-day sales report</p>
                    </div>
                    <Switch
                      checked={notificationSettings.dailySummary}
                      onCheckedChange={(dailySummary) => updateNotificationSettings({ dailySummary })}
                    />
                  </div>
                </div>

                {/* Test Button */}
                <Button
                  onClick={handleTestNotification}
                  disabled={sending || !notificationSettings.phone}
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
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-gradient-primary hover:opacity-90">
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
