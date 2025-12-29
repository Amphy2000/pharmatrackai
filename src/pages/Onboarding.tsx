import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete';
import { Building2, Loader2, Check, Award, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useReferralTracking } from '@/hooks/useReferralTracking';

const Onboarding = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { referralCode, partnerInfo, hasValidPartner, setManualReferralCode } = useReferralTracking();

  const [pharmacyName, setPharmacyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [geocodeData, setGeocodeData] = useState<{
    latitude: number;
    longitude: number;
    formatted_address: string;
    city?: string;
    state?: string;
  } | null>(null);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [partnerCode, setPartnerCode] = useState('');

  // Initialize partner code from URL/localStorage
  useEffect(() => {
    if (referralCode) {
      setPartnerCode(referralCode);
    }
  }, [referralCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      // Create pharmacy with partner source
      const { data: pharmacy, error: pharmacyError } = await supabase
        .from('pharmacies')
        .insert({
          name: pharmacyName,
          email: email,
          phone: phone || null,
          address: address || null,
          license_number: licenseNumber || null,
          owner_id: user.id,
          partner_source: partnerCode || null,
        })
        .select()
        .single();

      if (pharmacyError) throw pharmacyError;

      // If there's a valid partner code, record the signup
      if (partnerCode && pharmacy) {
        // Get partner info
        const { data: partner } = await supabase
          .from('referral_partners')
          .select('id, commission_value')
          .eq('partner_code', partnerCode)
          .eq('is_active', true)
          .single();

        if (partner) {
          // Record the referral signup
          await supabase.from('referral_signups').insert({
            partner_id: partner.id,
            pharmacy_id: pharmacy.id,
            partner_code: partnerCode,
            commission_amount: partner.commission_value,
          });

          // Increment successful signups count
          await supabase
            .from('referral_partners')
            .update({ 
              successful_signups: (await supabase
                .from('referral_partners')
                .select('successful_signups')
                .eq('id', partner.id)
                .single()
              ).data?.successful_signups || 0 + 1 
            })
            .eq('id', partner.id);
        }
      }

      if (pharmacyError) throw pharmacyError;

      // Add user as staff with owner role
      const { error: staffError } = await supabase
        .from('pharmacy_staff')
        .insert({
          pharmacy_id: pharmacy.id,
          user_id: user.id,
          role: 'owner',
          is_active: true,
        });

      if (staffError) throw staffError;

      toast({
        title: 'Pharmacy Created!',
        description: 'Your pharmacy has been set up successfully.',
      });

      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Setup Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-elegant">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground">
            <Building2 className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-display">Set Up Your Pharmacy</CardTitle>
          <CardDescription>Enter your pharmacy details to get started</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pharmacy-name">Pharmacy Name *</Label>
              <Input
                id="pharmacy-name"
                type="text"
                placeholder="City Pharmacy"
                value={pharmacyName}
                onChange={(e) => setPharmacyName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pharmacy-email">Business Email *</Label>
              <Input
                id="pharmacy-email"
                type="email"
                placeholder="contact@citypharmacy.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pharmacy-phone">Phone</Label>
                <Input
                  id="pharmacy-phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pharmacy-license">License Number</Label>
                <Input
                  id="pharmacy-license"
                  type="text"
                  placeholder="PH-12345"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pharmacy-address">Address</Label>
              <AddressAutocomplete
                value={address}
                onChange={(newAddress, geoData) => {
                  setAddress(newAddress);
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
            </div>

            {/* Partner/Referral Code Field */}
            <div className="space-y-2">
              <Label htmlFor="partner-code">Partner or Referral Code (optional)</Label>
              <Input
                id="partner-code"
                type="text"
                placeholder="e.g., acpn-lagos"
                value={partnerCode}
                onChange={(e) => {
                  if (!referralCode) {
                    setPartnerCode(e.target.value);
                    if (e.target.value.length >= 3) {
                      setManualReferralCode(e.target.value);
                    }
                  }
                }}
                readOnly={!!referralCode}
                className={referralCode ? 'bg-muted cursor-not-allowed' : ''}
              />
              {hasValidPartner && partnerInfo && (
                <div className="flex items-center gap-2 p-2 bg-success/10 rounded-lg border border-success/20">
                  {partnerInfo.type === 'professional' ? (
                    <Award className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <Users className="h-4 w-4 text-success shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-success">Partner Endorsement Detected</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {partnerInfo.organizationName || partnerInfo.name} — Launch benefits applied
                    </p>
                  </div>
                  <Badge className="bg-success text-success-foreground text-[10px] shrink-0">
                    Active
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full bg-gradient-primary" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Setup
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Onboarding;
