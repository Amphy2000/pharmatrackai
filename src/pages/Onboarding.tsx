import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Building2, Loader2 } from 'lucide-react';

const Onboarding = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [pharmacyName, setPharmacyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      // Create pharmacy
      const { data: pharmacy, error: pharmacyError } = await supabase
        .from('pharmacies')
        .insert({
          name: pharmacyName,
          email: email,
          phone: phone || null,
          address: address || null,
          license_number: licenseNumber || null,
          owner_id: user.id,
        })
        .select()
        .single();

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
              <Input
                id="pharmacy-address"
                type="text"
                placeholder="123 Main Street, City, Country"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
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
