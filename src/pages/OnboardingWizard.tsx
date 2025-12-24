import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRegionalSettings, CountryCode } from '@/contexts/RegionalSettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, 
  Loader2, 
  Globe, 
  Upload, 
  Scan, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  FileSpreadsheet,
  QrCode
} from 'lucide-react';

type Step = 'country' | 'pharmacy' | 'import' | 'scan';

const OnboardingWizard = () => {
  const [currentStep, setCurrentStep] = useState<Step>('country');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { country, setCountry, flagEmoji, countryName } = useRegionalSettings();

  // Pharmacy details
  const [pharmacyName, setPharmacyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  // Import state
  const [importComplete, setImportComplete] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  const steps = [
    { id: 'country', label: 'Region', icon: Globe },
    { id: 'pharmacy', label: 'Pharmacy', icon: Building2 },
    { id: 'import', label: 'Import', icon: Upload },
    { id: 'scan', label: 'First Scan', icon: Scan },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleCreatePharmacy = async () => {
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

      // Send welcome SMS (fire and forget - don't block registration)
      if (phone) {
        try {
          const ownerName = user.user_metadata?.full_name || pharmacyName;
          await supabase.functions.invoke('send-welcome-sms', {
            body: {
              pharmacyId: pharmacy.id,
              ownerName,
              phone,
            },
          });
        } catch (smsError) {
          // Log but don't fail - SMS is not critical
          console.error('Failed to send welcome SMS:', smsError);
        }
      }

      toast({
        title: 'Pharmacy Created!',
        description: 'Your pharmacy has been set up successfully.',
      });

      setCurrentStep('import');
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

  const handleSkipImport = () => {
    setCurrentStep('scan');
  };

  const handleSkipScan = () => {
    navigate('/dashboard');
  };

  const handleComplete = () => {
    navigate('/dashboard');
  };

  const getLicenseLabel = () => {
    switch (country) {
      case 'NG': return 'NAFDAC License Number';
      case 'GB': return 'MHRA Registration Number';
      case 'US': return 'State Pharmacy License';
      default: return 'License Number';
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep;
              const isComplete = currentStepIndex > index;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div 
                    className={`flex items-center justify-center h-10 w-10 rounded-full transition-all ${
                      isComplete 
                        ? 'bg-success text-success-foreground' 
                        : isActive 
                          ? 'bg-gradient-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isComplete ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-1 mx-2 rounded ${
                      isComplete ? 'bg-success' : 'bg-muted'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <Card className="glass-card shadow-elevated">
          {/* Step 1: Country Selection */}
          {currentStep === 'country' && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground">
                  <Globe className="h-8 w-8" />
                </div>
                <CardTitle className="text-2xl font-display">Select Your Region</CardTitle>
                <CardDescription>
                  This sets your currency, compliance requirements, and local regulations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  {(['NG', 'GB', 'US'] as CountryCode[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCountry(c)}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        country === c 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <span className="text-4xl block mb-2">
                        {c === 'NG' ? '🇳🇬' : c === 'GB' ? '🇬🇧' : '🇺🇸'}
                      </span>
                      <p className="font-medium">
                        {c === 'NG' ? 'Nigeria' : c === 'GB' ? 'United Kingdom' : 'United States'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {c === 'NG' ? '₦ NGN' : c === 'GB' ? '£ GBP' : '$ USD'}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-muted/50 space-y-2">
                  <p className="font-medium">{flagEmoji} {countryName} Settings:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• {country === 'NG' ? 'NAFDAC' : country === 'GB' ? 'MHRA' : 'FDA'} Compliance</li>
                    <li>• {country === 'NG' ? 'Nigerian Naira (₦)' : country === 'GB' ? 'British Pound (£)' : 'US Dollar ($)'} pricing</li>
                    <li>• Paystack payment processing (auto-converts for international cards)</li>
                  </ul>
                </div>

                <Button 
                  className="w-full bg-gradient-primary text-primary-foreground h-12"
                  onClick={() => setCurrentStep('pharmacy')}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </>
          )}

          {/* Step 2: Pharmacy Details */}
          {currentStep === 'pharmacy' && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground">
                  <Building2 className="h-8 w-8" />
                </div>
                <CardTitle className="text-2xl font-display">Set Up Your Pharmacy</CardTitle>
                <CardDescription>Enter your pharmacy details to get started</CardDescription>
              </CardHeader>
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
                      placeholder={country === 'NG' ? '+234...' : country === 'GB' ? '+44...' : '+1...'}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pharmacy-license">{getLicenseLabel()}</Label>
                    <Input
                      id="pharmacy-license"
                      type="text"
                      placeholder={country === 'NG' ? 'A4-12345' : country === 'GB' ? 'PL12345/0001' : 'PH-12345'}
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
                    placeholder="123 Main Street, City"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStep('country')}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button 
                    className="flex-1 bg-gradient-primary text-primary-foreground"
                    onClick={handleCreatePharmacy}
                    disabled={isLoading || !pharmacyName || !email}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Pharmacy
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 3: Import Stock */}
          {currentStep === 'import' && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-secondary text-secondary-foreground">
                  <Upload className="h-8 w-8" />
                </div>
                <CardTitle className="text-2xl font-display">Import Your Stock</CardTitle>
                <CardDescription>
                  Upload your existing inventory from Excel or CSV
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div 
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => {
                    // This would open the CSV import modal
                    setImportComplete(true);
                  }}
                >
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="font-medium mb-2">Drop your file here or click to browse</p>
                  <p className="text-sm text-muted-foreground">
                    Supports Excel (.xlsx) and CSV files
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-muted/50">
                  <p className="text-sm font-medium mb-2">Required columns:</p>
                  <p className="text-xs text-muted-foreground">
                    Product Name, Quantity, Unit Price, Expiry Date, Batch Number
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleSkipImport}
                    className="flex-1"
                  >
                    Skip for now
                  </Button>
                  <Button 
                    className="flex-1 bg-gradient-primary text-primary-foreground"
                    onClick={() => setCurrentStep('scan')}
                    disabled={!importComplete}
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 4: First Scan */}
          {currentStep === 'scan' && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-premium text-primary-foreground">
                  <QrCode className="h-8 w-8" />
                </div>
                <CardTitle className="text-2xl font-display">Scan Your First Item</CardTitle>
                <CardDescription>
                  Try scanning a product barcode to see how easy stocking is
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div 
                  className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => setScanComplete(true)}
                >
                  <Scan className="h-16 w-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
                  <p className="font-medium mb-2">Point your camera at a barcode</p>
                  <p className="text-sm text-muted-foreground">
                    Or click here to enter manually
                  </p>
                </div>

                {scanComplete && (
                  <div className="p-4 rounded-xl bg-success/10 border border-success/20 flex items-center gap-3">
                    <Check className="h-5 w-5 text-success" />
                    <p className="text-success font-medium">Great! You've scanned your first item.</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleSkipScan}
                    className="flex-1"
                  >
                    Skip for now
                  </Button>
                  <Button 
                    className="flex-1 bg-gradient-primary text-primary-foreground"
                    onClick={handleComplete}
                  >
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default OnboardingWizard;
