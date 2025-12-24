import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Lock, Eye, EyeOff, AlertTriangle, Check, Percent, Loader2 } from 'lucide-react';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const PriceShieldSettings = () => {
  const { pharmacy, updatePharmacySettings } = usePharmacy();
  const { toast } = useToast();
  
  const [priceLockEnabled, setPriceLockEnabled] = useState(false);
  const [defaultMargin, setDefaultMargin] = useState(20);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPin, setIsSavingPin] = useState(false);

  // Sync state when pharmacy data loads
  useEffect(() => {
    if (pharmacy) {
      setPriceLockEnabled((pharmacy as any)?.price_lock_enabled || false);
      setDefaultMargin((pharmacy as any)?.default_margin_percent || 20);
    }
  }, [pharmacy]);

  const hasExistingPin = !!(pharmacy as any)?.admin_pin_hash;
  const pharmacyId = pharmacy?.id;

  const handleSetPin = async () => {
    if (!pharmacyId) {
      toast({
        title: 'Error',
        description: 'Pharmacy not found',
        variant: 'destructive',
      });
      return;
    }

    if (newPin !== confirmPin) {
      toast({
        title: 'PIN mismatch',
        description: 'The PINs you entered do not match',
        variant: 'destructive',
      });
      return;
    }

    if (newPin.length < 4 || newPin.length > 6) {
      toast({
        title: 'Invalid PIN',
        description: 'PIN must be 4-6 digits',
        variant: 'destructive',
      });
      return;
    }

    if (!/^\d+$/.test(newPin)) {
      toast({
        title: 'Invalid PIN',
        description: 'PIN must contain only numbers',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingPin(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-admin-pin', {
        body: {
          pharmacyId,
          pin: newPin,
          action: 'set'
        }
      });

      if (error) {
        console.error('Error setting PIN:', error);
        toast({
          title: 'Error',
          description: 'Failed to set PIN. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      if (data.valid) {
        toast({
          title: 'PIN Set',
          description: 'Admin PIN has been securely configured',
        });
        setNewPin('');
        setConfirmPin('');
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to set PIN',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('PIN setting exception:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while setting the PIN',
        variant: 'destructive',
      });
    } finally {
      setIsSavingPin(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);

    try {
      const updates: any = {
        price_lock_enabled: priceLockEnabled,
        default_margin_percent: defaultMargin,
      };

      await updatePharmacySettings.mutateAsync(updates);

      toast({
        title: 'Settings saved',
        description: 'Price Shield and margin settings updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Price Shield Toggle */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Price Shield (Anti-Theft)</CardTitle>
                <CardDescription>Lock prices to prevent unauthorized changes</CardDescription>
              </div>
            </div>
            <Switch
              checked={priceLockEnabled}
              onCheckedChange={setPriceLockEnabled}
            />
          </div>
        </CardHeader>
        <CardContent>
          {priceLockEnabled && (
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-warning">When enabled:</p>
                  <ul className="text-muted-foreground mt-1 space-y-1">
                    <li>• Staff cannot change prices at checkout</li>
                    <li>• Admin PIN required for any price override</li>
                    <li>• All price changes are logged in audit trail</li>
                  </ul>
                </div>
              </div>

              {/* Admin PIN Setup */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  {hasExistingPin ? 'Change Admin PIN' : 'Set Admin PIN'}
                </Label>
                
                <div className="grid gap-3">
                  <div className="relative">
                    <Input
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="Enter 4-6 digit PIN"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowPin(!showPin)}
                    >
                      {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  <Input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="Confirm PIN"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                {hasExistingPin && (
                  <Badge variant="outline" className="text-success border-success/30">
                    <Check className="h-3 w-3 mr-1" />
                    PIN already configured (securely hashed)
                  </Badge>
                )}

                {newPin.length >= 4 && confirmPin.length >= 4 && (
                  <Button 
                    onClick={handleSetPin} 
                    disabled={isSavingPin || newPin !== confirmPin}
                    variant="secondary"
                    size="sm"
                  >
                    {isSavingPin ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Setting PIN...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        {hasExistingPin ? 'Update PIN' : 'Set PIN'}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-Margin Settings */}
      <Card className="border-secondary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-secondary/20 flex items-center justify-center">
              <Percent className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <CardTitle className="text-lg">Auto-Margin Calculator</CardTitle>
              <CardDescription>Default profit margin for invoice scanning</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Default Profit Margin (%)</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min={0}
                  max={200}
                  value={defaultMargin}
                  onChange={(e) => setDefaultMargin(parseInt(e.target.value) || 0)}
                  className="w-24"
                />
                <span className="text-muted-foreground">%</span>
                <Badge variant="secondary">
                  Cost ₦1,000 → Sell ₦{Math.round(1000 * (1 + defaultMargin / 100)).toLocaleString()}
                </Badge>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              When scanning invoices, selling prices will be auto-calculated using this margin. 
              You can adjust individual items during review.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button 
        onClick={handleSaveSettings} 
        disabled={isSaving}
        className="w-full"
      >
        {isSaving ? 'Saving...' : 'Save Price Shield Settings'}
      </Button>
    </div>
  );
};
