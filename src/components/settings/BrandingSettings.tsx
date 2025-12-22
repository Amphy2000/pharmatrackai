import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, Image, Loader2, Printer, User } from 'lucide-react';

export const BrandingSettings = () => {
  const { pharmacy, pharmacyId, isLoading: isLoadingPharmacy, updatePharmacySettings } = usePharmacy();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pharmacistName, setPharmacistName] = useState('');

  // Initialize pharmacist name from pharmacy data
  useState(() => {
    if ((pharmacy as any)?.pharmacist_in_charge) {
      setPharmacistName((pharmacy as any).pharmacist_in_charge);
    }
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (PNG, JPG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 500KB)
    if (file.size > 500 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 500KB',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.id || !pharmacyId) {
      toast({
        title: 'Error',
        description: 'Unable to identify user or pharmacy',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Delete old logo if exists
      if (pharmacy?.logo_url) {
        const oldPath = `${user.id}/logo`;
        await supabase.storage.from('pharmacy-logos').remove([oldPath]);
      }

      // Upload new logo
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/logo.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('pharmacy-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('pharmacy-logos')
        .getPublicUrl(filePath);

      // Update pharmacy record
      const { error: updateError } = await supabase
        .from('pharmacies')
        .update({ logo_url: urlData.publicUrl })
        .eq('id', pharmacyId);

      if (updateError) throw updateError;

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['pharmacy-details'] });

      toast({
        title: 'Logo uploaded',
        description: 'Your pharmacy logo has been updated successfully.',
      });
    } catch (error: any) {
      console.error('Logo upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload logo',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteLogo = async () => {
    if (!user?.id || !pharmacyId) return;

    setIsDeleting(true);

    try {
      // Remove from storage
      const { data: files } = await supabase.storage
        .from('pharmacy-logos')
        .list(user.id);
      
      if (files && files.length > 0) {
        const filesToDelete = files.map(f => `${user.id}/${f.name}`);
        await supabase.storage.from('pharmacy-logos').remove(filesToDelete);
      }

      // Update pharmacy record
      const { error: updateError } = await supabase
        .from('pharmacies')
        .update({ logo_url: null })
        .eq('id', pharmacyId);

      if (updateError) throw updateError;

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['pharmacy-details'] });

      toast({
        title: 'Logo removed',
        description: 'Your pharmacy logo has been removed.',
      });
    } catch (error: any) {
      console.error('Logo delete error:', error);
      toast({
        title: 'Delete failed',
        description: error.message || 'Failed to remove logo',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogoOnPrintToggle = async (enabled: boolean) => {
    try {
      await updatePharmacySettings.mutateAsync({ enable_logo_on_print: enabled });
      toast({
        title: enabled ? 'Logo enabled on receipts' : 'Logo disabled on receipts',
        description: enabled 
          ? 'Your logo will appear on printed receipts.' 
          : 'Printed receipts will use text-only header. Digital receipts still show logo.',
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update setting',
        variant: 'destructive',
      });
    }
  };

  const handlePharmacistNameSave = async () => {
    try {
      await updatePharmacySettings.mutateAsync({ pharmacist_in_charge: pharmacistName || null });
      toast({
        title: 'Pharmacist name saved',
        description: 'The Pharmacist in Charge name will appear on receipts.',
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to save pharmacist name',
        variant: 'destructive',
      });
    }
  };

  if (isLoadingPharmacy) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const enableLogoOnPrint = (pharmacy as any)?.enable_logo_on_print !== false;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Pharmacy Logo
          </CardTitle>
          <CardDescription>
            Upload your pharmacy logo to display on receipts, purchase orders, and reports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Preview */}
          <div className="flex items-center gap-6">
            <div className="relative h-24 w-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/30 overflow-hidden">
              {pharmacy?.logo_url ? (
                <img 
                  src={pharmacy.logo_url} 
                  alt="Pharmacy logo" 
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <Image className="h-10 w-10 text-muted-foreground/50" />
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {pharmacy?.logo_url ? 'Change Logo' : 'Upload Logo'}
                    </>
                  )}
                </Button>
                
                {pharmacy?.logo_url && (
                  <Button
                    variant="outline"
                    onClick={handleDeleteLogo}
                    disabled={isDeleting}
                    className="text-destructive hover:text-destructive"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground">
                Recommended: 200x200px, PNG or JPG, max 500KB
              </p>
            </div>
          </div>

          {/* Hidden file input */}
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Print Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Receipt Printing Settings
          </CardTitle>
          <CardDescription>
            Configure how receipts are printed on thermal printers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo on Print Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="logo-on-print">Show Logo on Printed Receipts</Label>
              <p className="text-xs text-muted-foreground">
                When disabled, receipts use text-only header to save paper. Digital receipts (PDF/WhatsApp) still show logo.
              </p>
            </div>
            <Switch
              id="logo-on-print"
              checked={enableLogoOnPrint}
              onCheckedChange={handleLogoOnPrintToggle}
              disabled={updatePharmacySettings.isPending}
            />
          </div>

        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="font-medium text-sm mb-2">Where your branding appears:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Customer receipts (printed & digital)</li>
            <li>• Purchase orders</li>
            <li>• Exported reports (PDF)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
