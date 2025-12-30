import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Globe, Zap, Package, Info, Save, Loader2, Phone, MessageCircle, MapPin, Check, Navigation } from 'lucide-react';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useMedications } from '@/hooks/useMedications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete';
import { detectMarketplaceZone } from '@/utils/zoneDetector';
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
  const [geocodeData, setGeocodeData] = useState<{
    latitude: number;
    longitude: number;
    formatted_address: string;
    city?: string;
    state?: string;
    country?: string;
  } | null>(null);
  const [detectedZone, setDetectedZone] = useState<{
    zone: string;
    city: string;
    confidence: 'high' | 'medium' | 'low';
  } | null>(null);

  // Load marketplace contact phone, address, and zone
  useEffect(() => {
    if (pharmacy) {
      // TypeScript doesn't know about the new column yet, so we cast
      const phoneValue = (pharmacy as any).marketplace_contact_phone || '';
      const zoneValue = (pharmacy as any).marketplace_zone || '';
      const cityValue = (pharmacy as any).marketplace_city || '';
      setMarketplaceContactPhone(phoneValue);
      setPharmacyAddress(pharmacy.address || '');
      if (zoneValue) {
        setDetectedZone({ zone: zoneValue, city: cityValue, confidence: 'high' });
      }
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

  const handleSaveAddress = async () => {
    if (!pharmacy?.id) return;
    
    setIsSavingAddress(true);
    try {
      // Detect zone from address/coordinates
      const zoneResult = detectMarketplaceZone({
        latitude: geocodeData?.latitude,
        longitude: geocodeData?.longitude,
        address: pharmacyAddress,
        city: geocodeData?.city,
        state: geocodeData?.state,
      });

      const updateData: Record<string, any> = { 
        address: pharmacyAddress || null,
        marketplace_zone: zoneResult.zone,
        marketplace_city: zoneResult.city,
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
      
      setDetectedZone({
        zone: zoneResult.zone,
        city: zoneResult.city,
        confidence: zoneResult.confidence,
      });
      
      toast.success(`Location saved! Your pharmacy will appear in "${zoneResult.zone}" on the marketplace`);
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error('Failed to save address');
    } finally {
      setIsSavingAddress(false);
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
        {/* Marketplace Location Address */}
        <div className="p-4 border rounded-lg space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="pharmacy-address" className="font-medium flex items-center gap-2">
                Pharmacy Location
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>This address determines where your pharmacy appears in location-based searches. Customers can filter by location to find pharmacies near them.</p>
                      <p className="mt-2 text-xs opacity-80">Tip: Use a complete address with city and state for better visibility.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <p className="text-sm text-muted-foreground">
                Your pharmacy's address for marketplace location filtering
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <AddressAutocomplete
              value={pharmacyAddress}
              onChange={(newAddress, geoData) => {
                setPharmacyAddress(newAddress);
                if (geoData) {
                  setGeocodeData(geoData);
                }
              }}
              placeholder="Start typing your pharmacy address..."
            />
            {geocodeData && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                Location verified: {geocodeData.city}, {geocodeData.state}
              </p>
            )}
            
            {/* Detected Zone Display */}
            {detectedZone && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Marketplace Zone:</span>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {detectedZone.zone}
                  </Badge>
                  {detectedZone.confidence === 'high' && (
                    <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Customers filtering by "{detectedZone.zone}" will see your products
                </p>
              </div>
            )}
            
            <Button
              onClick={handleSaveAddress}
              disabled={isSavingAddress}
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
