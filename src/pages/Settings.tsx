import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, Users, Globe, CreditCard, Shield, ImageIcon, ShieldCheck, FileText, RotateCcw, Bell, Clock, Star, Store } from 'lucide-react';
import { StaffManagement } from '@/components/settings/StaffManagement';
import { PermissionsManagement } from '@/components/settings/PermissionsManagement';
import { RegionCurrencySettings } from '@/components/settings/RegionCurrencySettings';
import { SubscriptionManagement } from '@/components/settings/SubscriptionManagement';
import { BrandingSettings } from '@/components/settings/BrandingSettings';
import { PriceShieldSettings } from '@/components/settings/PriceShieldSettings';
import { AlertSettings } from '@/components/settings/AlertSettings';
import { ClockInSecuritySettings } from '@/components/settings/ClockInSecuritySettings';
import { PromotionsManagement } from '@/components/settings/PromotionsManagement';
import { MarketplaceSettings } from '@/components/settings/MarketplaceSettings';
import { usePermissions } from '@/hooks/usePermissions';
import { useSearchParams, Navigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useProductTour } from '@/hooks/useProductTour';
import { ProductTour } from '@/components/ProductTour';

const Settings = () => {
  const { hasPermission, userRole, isLoading } = usePermissions();
  const canManageStaff = hasPermission('manage_staff');
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'general';
  const { resetTour } = useProductTour();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  const isManager = userRole === 'manager';

  // Access rules:
  // - Owner: full settings
  // - Manager: staff-only settings
  if (!isLoading) {
    if (isManager) {
      if (!canManageStaff) return <Navigate to="/manager-dashboard" replace />;
      if (currentTab !== 'staff') return <Navigate to="/manager-dashboard" replace />;
    } else if (userRole !== 'owner') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <ProductTour />
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
          <div className="overflow-x-auto -mx-4 px-4 pb-2">
            <TabsList className="inline-flex w-max sm:w-full sm:flex sm:flex-wrap h-auto gap-1 p-1 min-w-0">
            {!isManager && (
              <>
                <TabsTrigger value="general" className="gap-2 text-xs sm:text-sm">
                  <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">General</span>
                  <span className="xs:hidden">Gen</span>
                </TabsTrigger>
                <TabsTrigger value="branding" className="gap-2 text-xs sm:text-sm">
                  <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Branding</span>
                  <span className="xs:hidden">Brand</span>
                </TabsTrigger>
                <TabsTrigger value="subscription" className="gap-2 text-xs sm:text-sm">
                  <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Subscription</span>
                  <span className="xs:hidden">Sub</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-2 text-xs sm:text-sm">
                  <ShieldCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Price Shield</span>
                  <span className="sm:hidden">Shield</span>
                </TabsTrigger>
              </>
            )}

            {canManageStaff && (
              <TabsTrigger value="staff" className="gap-2 text-xs sm:text-sm">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                Staff
              </TabsTrigger>
            )}

            {!isManager && (
              <>
                <TabsTrigger value="promotions" className="gap-2 text-xs sm:text-sm">
                  <Star className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Promotions</span>
                  <span className="xs:hidden">Promo</span>
                </TabsTrigger>
                <TabsTrigger value="marketplace" className="gap-2 text-xs sm:text-sm">
                  <Store className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Marketplace</span>
                  <span className="xs:hidden">Market</span>
                </TabsTrigger>
                <TabsTrigger value="alerts" className="gap-2 text-xs sm:text-sm">
                  <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                  Alerts
                </TabsTrigger>
                <TabsTrigger value="clockin" className="gap-2 text-xs sm:text-sm">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Clock-In</span>
                  <span className="xs:hidden">Clock</span>
                </TabsTrigger>
                {canManageStaff && (
                  <TabsTrigger value="permissions" className="gap-2 text-xs sm:text-sm">
                    <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Permissions</span>
                    <span className="xs:hidden">Perms</span>
                  </TabsTrigger>
                )}
              </>
            )}
            </TabsList>
          </div>

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

          <TabsContent value="promotions">
            <PromotionsManagement />
          </TabsContent>

          <TabsContent value="marketplace">
            <MarketplaceSettings />
          </TabsContent>

          <TabsContent value="alerts">
            <AlertSettings />
          </TabsContent>

          <TabsContent value="clockin">
            <ClockInSecuritySettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
