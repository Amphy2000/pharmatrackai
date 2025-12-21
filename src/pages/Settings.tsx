import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, Users, Globe, CreditCard } from 'lucide-react';
import { StaffManagement } from '@/components/settings/StaffManagement';
import { RegionCurrencySettings } from '@/components/settings/RegionCurrencySettings';
import { SubscriptionManagement } from '@/components/settings/SubscriptionManagement';
import { usePermissions } from '@/hooks/usePermissions';
import { useSearchParams } from 'react-router-dom';

const Settings = () => {
  const { hasPermission } = usePermissions();
  const canManageStaff = hasPermission('manage_staff');
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'general';

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
            Manage your pharmacy settings and staff
          </p>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="general" className="gap-2">
              <Globe className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="subscription" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Subscription
            </TabsTrigger>
            {canManageStaff && (
              <TabsTrigger value="staff" className="gap-2">
                <Users className="h-4 w-4" />
                Staff
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="general">
            <Card>
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
          </TabsContent>

          <TabsContent value="subscription">
            <SubscriptionManagement />
          </TabsContent>

          {canManageStaff && (
            <TabsContent value="staff">
              <StaffManagement />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
