import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, Users, DollarSign } from 'lucide-react';
import { StaffManagement } from '@/components/settings/StaffManagement';
import { CurrencySettings } from '@/components/settings/CurrencySettings';
import { usePermissions } from '@/hooks/usePermissions';

const Settings = () => {
  const { isOwnerOrManager, hasPermission } = usePermissions();
  const canManageStaff = hasPermission('manage_staff');
  const canManageSettings = hasPermission('manage_settings');

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

        <Tabs defaultValue={canManageStaff ? "staff" : "currency"} className="space-y-6">
          <TabsList>
            {canManageStaff && (
              <TabsTrigger value="staff" className="gap-2">
                <Users className="h-4 w-4" />
                Staff
              </TabsTrigger>
            )}
            <TabsTrigger value="currency" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Currency
            </TabsTrigger>
          </TabsList>

          {canManageStaff && (
            <TabsContent value="staff">
              <StaffManagement />
            </TabsContent>
          )}

          <TabsContent value="currency">
            <Card>
              <CardHeader>
                <CardTitle>Currency Settings</CardTitle>
                <CardDescription>
                  Configure your preferred currency for the pharmacy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CurrencySettings />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
