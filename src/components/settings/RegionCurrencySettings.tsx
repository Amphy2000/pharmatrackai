import { useState } from 'react';
import { DollarSign, Globe, Zap, Building2 } from 'lucide-react';
import { useCurrency, CurrencyCode } from '@/contexts/CurrencyContext';
import { useRegionalSettings, CountryCode, POSMode } from '@/contexts/RegionalSettingsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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

export const RegionCurrencySettings = () => {
  const { currency, exchangeRates, setCurrency, setExchangeRate } = useCurrency();
  const { country, posMode, setCountry, setPOSMode, regulatory } = useRegionalSettings();
  const [tempNGNRate, setTempNGNRate] = useState(exchangeRates.NGN.toString());
  const [tempGBPRate, setTempGBPRate] = useState(exchangeRates.GBP.toString());
  const { toast } = useToast();

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
    <Tabs defaultValue="region" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
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

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} className="bg-gradient-primary hover:opacity-90">
            Save Exchange Rates
          </Button>
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
                  Simplified dashboard with fewer buttons. Perfect for beginners or technophobic users.
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-success">Beginner-friendly</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">Fewer buttons</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">Quick actions only</span>
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
                  Full-featured dashboard with all analytics, AI insights, and advanced tools.
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">All features</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">Analytics & Reports</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">AI Insights</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
};