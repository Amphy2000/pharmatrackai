import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Zap, Package, Info, Save, Loader2, Phone, MessageCircle, MapPin, Check, Navigation, EyeOff } from 'lucide-react';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useMedications } from '@/hooks/useMedications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete';
import { NIGERIAN_CITY_NEIGHBORHOODS, getNeighborhoodNames } from '@/data/kadunaNighborhoods';

// Supported cities for marketplace
const SUPPORTED_CITIES = Object.keys(NIGERIAN_CITY_NEIGHBORHOODS).map(city => ({
  value: city,
  label: city.charAt(0).toUpperCase() + city.slice(1).replace('-', ' ')
}));

export const MarketplaceSettings = () => {
  const { pharmacy, updatePharmacySettings } = usePharmacy();
  const { medications, updateMedication } = useMedications();
  const [autoListEnabled, setAutoListEnabled] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [marketplaceContactPhone, setMarketplaceContactPhone] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [pharmacyAddress, setPharmacyAddress] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [hideMarketplacePrices, setHideMarketplacePrices] = useState(false);
  const [isSavingPriceHide, setIsSavingPriceHide] = useState(false);
  const [geocodeData, setGeocodeData] = useState<{
    latitude: number;
    longitude: number;
    formatted_address: string;
    city?: string;
    state?: string;
    country?: string;
  } | null>(null);

  // Get zones for selected city
  const availableZones = selectedCity ? getNeighborhoodNames(selectedCity) : [];

  // Load marketplace contact phone, address, zone, and price hide setting
  useEffect(() => {
    if (pharmacy) {
      const phoneValue = (pharmacy as any).marketplace_contact_phone || '';
      const zoneValue = (pharmacy as any).marketplace_zone || '';
      const cityValue = (pharmacy as any).marketplace_city || '';
      const hidePrices = (pharmacy as any).hide_marketplace_prices || false;
      setMarketplaceContactPhone(phoneValue);
      setPharmacyAddress(pharmacy.address || '');
      setSelectedCity(cityValue);
      setSelectedZone(zoneValue);
      setHideMarketplacePrices(hidePrices);
    }
  }, [pharmacy]);

  // Load the current auto-list setting from pharmacy metadata
  useEffect(() => {
    if (pharmacy) {
      // Check if auto_list_marketplace is enabled in custom features
      loadAutoListSetting();
    }
  }, [pharmacy?.id]);

  const loadAutoListSetting = async () => {
    if (!pharmacy?.id) return;
    
    const { data } = await supabase
      .from('pharmacy_custom_features')
      .select('*')
      .eq('pharmacy_id', pharmacy.id)
      .eq('feature_key', 'auto_list_marketplace')
      .maybeSingle();
    
    if (data) {
      setAutoListEnabled(data.is_enabled);
    }
  };

  const handleSaveAutoList = async () => {
    if (!pharmacy?.id) return;
    
    setIsSaving(true);
    try {
      // Upsert the setting
      const { error } = await supabase
        .from('pharmacy_custom_features')
        .upsert({
          pharmacy_id: pharmacy.id,
          feature_key: 'auto_list_marketplace',
          feature_name: 'Auto-List on Marketplace',
          description: 'Automatically list drugs if quantity > 5 and not controlled',
          is_enabled: autoListEnabled,
          config: { min_quantity: 5 },
        }, {
          onConflict: 'pharmacy_id,feature_key'
        });

      if (error) throw error;
      
      toast.success('Auto-list setting saved');
    } catch (error) {
      console.error('Error saving auto-list setting:', error);
      toast.error('Failed to save setting');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyAutoList = async () => {
    if (!pharmacy?.id) return;
    
    setIsApplying(true);
    try {
      // Find all medications that meet the criteria:
      // - quantity > 5
      // - not controlled substance
      // - not already public
      const eligibleMeds = medications.filter(m => 
        m.current_stock > 5 && 
        !m.is_controlled && 
        !m.is_public &&
        m.is_shelved !== false
      );

      if (eligibleMeds.length === 0) {
        toast.info('No eligible medications to list');
        return;
      }

      // Update all eligible medications
      let successCount = 0;
      for (const med of eligibleMeds) {
        const { error } = await supabase
          .from('medications')
          .update({ is_public: true })
          .eq('id', med.id);
        
        if (!error) successCount++;
      }

      toast.success(`Listed ${successCount} medications on marketplace`);
    } catch (error) {
      console.error('Error applying auto-list:', error);
      toast.error('Failed to apply auto-list');
    } finally {
      setIsApplying(false);
    }
  };

  // Count eligible medications
  const eligibleCount = medications.filter(m => 
    m.current_stock > 5 && 
    !m.is_controlled && 
    !m.is_public &&
    m.is_shelved !== false
  ).length;

  const publicCount = medications.filter(m => m.is_public).length;

  const handleSaveContactPhone = async () => {
    if (!pharmacy?.id) return;
    
    setIsSavingContact(true);
    try {
      const { error } = await supabase
        .from('pharmacies')
        .update({ marketplace_contact_phone: marketplaceContactPhone || null } as any)
        .eq('id', pharmacy.id);

      if (error) throw error;
      toast.success('Marketplace contact phone saved');
    } catch (error) {
      console.error('Error saving contact phone:', error);
      toast.error('Failed to save contact phone');
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!pharmacy?.id) return;
    
    if (!selectedCity || !selectedZone) {
      toast.error('Please select both city and zone');
      return;
    }
    
    setIsSavingAddress(true);
    try {
      const updateData: Record<string, any> = { 
        address: pharmacyAddress || null,
        marketplace_zone: selectedZone,
        marketplace_city: selectedCity,
      };

      // Also save coordinates if available
      if (geocodeData?.latitude && geocodeData?.longitude) {
        updateData.marketplace_lat = geocodeData.latitude;
        updateData.marketplace_lon = geocodeData.longitude;
      }

      const { error } = await supabase
        .from('pharmacies')
        .update(updateData)
        .eq('id', pharmacy.id);

      if (error) throw error;
      
      toast.success(`Location saved! Your pharmacy will appear in "${selectedZone}" on the marketplace`);
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Failed to save location');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSavePriceHide = async () => {
    if (!pharmacy?.id) return;
    
    setIsSavingPriceHide(true);
    try {
      const { error } = await supabase
        .from('pharmacies')
        .update({ hide_marketplace_prices: hideMarketplacePrices } as any)
        .eq('id', pharmacy.id);

      if (error) throw error;
      toast.success(hideMarketplacePrices 
        ? 'Prices are now hidden on marketplace' 
        : 'Prices are now visible on marketplace'
      );
    } catch (error) {
      console.error('Error saving price hide setting:', error);
      toast.error('Failed to save setting');
    } finally {
      setIsSavingPriceHide(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-marketplace" />
          Marketplace Settings
        </CardTitle>
        <CardDescription>
          Configure how your pharmacy appears on the public marketplace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Marketplace Location - City & Zone Selection */}
        <div className="p-4 border rounded-lg space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="font-medium flex items-center gap-2">
                Pharmacy Location
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Select your city and zone/area. This determines where your pharmacy appears in location-based searches.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <p className="text-sm text-muted-foreground">
                Select your city and major area for marketplace location filtering
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* City Selection */}
            <div className="space-y-2">
              <Label htmlFor="city-select">City</Label>
              <Select value={selectedCity} onValueChange={(value) => {
                setSelectedCity(value);
                setSelectedZone(''); // Reset zone when city changes
              }}>
                <SelectTrigger id="city-select">
                  <SelectValue placeholder="Select your city" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CITIES.map(city => (
                    <SelectItem key={city.value} value={city.value}>
                      {city.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Zone Selection - Only show after city is selected */}
            {selectedCity && (
              <div className="space-y-2">
                <Label htmlFor="zone-select">Major Area / Zone</Label>
                <Select value={selectedZone} onValueChange={setSelectedZone}>
                  <SelectTrigger id="zone-select">
                    <SelectValue placeholder="Select your zone/area" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableZones.map(zone => (
                      <SelectItem key={zone} value={zone}>
                        {zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Full Address (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="pharmacy-address">Full Address (Optional)</Label>
              <AddressAutocomplete
                value={pharmacyAddress}
                onChange={(newAddress, geoData) => {
                  setPharmacyAddress(newAddress);
                  if (geoData) {
                    setGeocodeData(geoData);
                  }
                }}
                placeholder="Enter your full street address..."
              />
              {geocodeData && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Check className="h-3 w-3 text-green-500" />
                  Address verified: {geocodeData.formatted_address}
                </p>
              )}
            </div>

            {/* Selected Zone Display */}
            {selectedCity && selectedZone && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Marketplace Zone:</span>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {selectedZone}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {SUPPORTED_CITIES.find(c => c.value === selectedCity)?.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Customers filtering by "{selectedZone}" will see your products
                </p>
              </div>
            )}
            
            <Button
              onClick={handleSaveLocation}
              disabled={isSavingAddress || !selectedCity || !selectedZone}
              className="gap-2"
            >
              {isSavingAddress ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Location
            </Button>
          </div>
        </div>

        {/* Hide All Prices Toggle */}
        <div className="p-4 border rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <EyeOff className="h-5 w-5 text-orange-600" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hide-prices" className="font-medium flex items-center gap-2">
                  Hide All Prices on Marketplace
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>When enabled, all your product prices will be hidden on the marketplace. Customers will see "Contact for price" instead.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show "Contact for price" instead of actual prices for all products
                </p>
              </div>
            </div>
            <Switch
              id="hide-prices"
              checked={hideMarketplacePrices}
              onCheckedChange={setHideMarketplacePrices}
            />
          </div>
          
          <Button
            onClick={handleSavePriceHide}
            disabled={isSavingPriceHide}
            size="sm"
            className="gap-2"
          >
            {isSavingPriceHide ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Price Setting
          </Button>
        </div>

        {/* Marketplace Contact Phone */}
        <div className="p-4 border rounded-lg space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <MessageCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="marketplace-phone" className="font-medium flex items-center gap-2">
                Marketplace Contact Phone (WhatsApp)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>This is the phone number customers will contact when they click "Order via WhatsApp" on the marketplace. If not set, your pharmacy's default phone will be used.</p>
                      <p className="mt-2 text-xs opacity-80">Tip: Use your office/front desk number instead of your personal number.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <p className="text-sm text-muted-foreground">
                The phone number customers will use to order via WhatsApp (separate from your alert number)
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="marketplace-phone"
                placeholder="e.g., 08012345678 (Office/Front Desk)"
                value={marketplaceContactPhone}
                onChange={(e) => setMarketplaceContactPhone(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={handleSaveContactPhone}
              disabled={isSavingContact}
              className="gap-2"
            >
              {isSavingContact ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </Button>
          </div>
          
          {!marketplaceContactPhone && pharmacy?.phone && (
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              Currently using default pharmacy phone: <strong>{pharmacy.phone}</strong>
            </p>
          )}
        </div>

        {/* Current Stats */}
        <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-sm">
              <strong>{publicCount}</strong> listed publicly
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-marketplace" />
            <span className="text-sm">
              <strong>{eligibleCount}</strong> eligible for auto-list
            </span>
          </div>
        </div>

        {/* Auto-List Setting */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-marketplace/10">
              <Zap className="h-5 w-5 text-marketplace" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="auto-list" className="font-medium flex items-center gap-2">
                Auto-List Eligible Products
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>When enabled, new products added with quantity &gt; 5 and not marked as "Controlled Substance" will automatically be listed on the marketplace.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically list drugs if quantity &gt; 5 and not a Controlled Substance
              </p>
            </div>
          </div>
          <Switch
            id="auto-list"
            checked={autoListEnabled}
            onCheckedChange={setAutoListEnabled}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={handleSaveAutoList}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Setting
          </Button>
          
          <Button
            variant="outline"
            onClick={handleApplyAutoList}
            disabled={isApplying || eligibleCount === 0}
            className="gap-2"
          >
            {isApplying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Apply to {eligibleCount} Eligible Items Now
          </Button>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-muted/30 rounded-lg border border-muted">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            How Auto-Listing Works
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Products with stock quantity greater than 5</li>
            <li>Not marked as "Controlled Substance"</li>
            <li>Currently shelved (not unshelved/archived)</li>
            <li>Will be automatically visible on the public marketplace</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
