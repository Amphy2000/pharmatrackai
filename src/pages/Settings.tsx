import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, Users, Globe, CreditCard, Shield, ImageIcon, ShieldCheck, FileText, RotateCcw } from 'lucide-react';
import { StaffManagement } from '@/components/settings/StaffManagement';
import { PermissionsManagement } from '@/components/settings/PermissionsManagement';
import { RegionCurrencySettings } from '@/components/settings/RegionCurrencySettings';
import { SubscriptionManagement } from '@/components/settings/SubscriptionManagement';
import { BrandingSettings } from '@/components/settings/BrandingSettings';
import { PriceShieldSettings } from '@/components/settings/PriceShieldSettings';
import { usePermissions } from '@/hooks/usePermissions';
import { useSearchParams, Navigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useProductTour } from '@/hooks/useProductTour';

const Settings = () => {
  const { hasPermission, userRole, isLoading } = usePermissions();
  const canManageStaff = hasPermission('manage_staff');
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'general';
  const { resetTour } = useProductTour();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  // Only owners can access settings page
  if (!isLoading && userRole !== 'owner') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-primary flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your pharmacy settings, staff, and billing
          </p>
        </div>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="general" className="gap-2">
              <Globe className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="branding" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="subscription" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Subscription
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              Price Shield
            </TabsTrigger>
            {canManageStaff && (
              <TabsTrigger value="staff" className="gap-2">
                <Users className="h-4 w-4" />
                Staff
              </TabsTrigger>
            )}
            {canManageStaff && (
              <TabsTrigger value="permissions" className="gap-2">
                <Shield className="h-4 w-4" />
                Permissions
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="general">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure region, currency, and POS mode
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RegionCurrencySettings />
              </CardContent>
            </Card>
            
            {/* Product Tour Restart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Product Tour
                </CardTitle>
                <CardDescription>
                  Restart the interactive guide to learn about all features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  onClick={resetTour}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restart Product Tour
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding">
            <BrandingSettings />
          </TabsContent>

          <TabsContent value="subscription">
            <SubscriptionManagement />
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Price Shield & Anti-Theft</CardTitle>
                <CardDescription>
                  Protect your pharmacy from unauthorized price changes and configure auto-margin settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PriceShieldSettings />
                
                {/* Link to Audit Log */}
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Audit Log
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        View all security events, price change attempts, and staff actions
                      </p>
                    </div>
                    <Button variant="outline" asChild>
                      <Link to="/audit-log">View Audit Log</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {canManageStaff && (
            <TabsContent value="staff">
              <StaffManagement />
            </TabsContent>
          )}

          {canManageStaff && (
            <TabsContent value="permissions">
              <PermissionsManagement />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
