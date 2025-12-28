import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Zap, Package, Info, Save, Loader2 } from 'lucide-react';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useMedications } from '@/hooks/useMedications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const MarketplaceSettings = () => {
  const { pharmacy } = usePharmacy();
  const { medications, updateMedication } = useMedications();
  const [autoListEnabled, setAutoListEnabled] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-marketplace" />
          Smart Marketplace Listing
        </CardTitle>
        <CardDescription>
          Automatically manage which products appear on the public marketplace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
