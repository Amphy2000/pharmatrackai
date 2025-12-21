import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Building2,
  Users,
  Package,
  TrendingUp,
  DollarSign,
  Activity,
  Settings,
  Plus,
  Loader2,
  Shield,
  Crown,
  Clock,
  AlertCircle,
  CheckCircle,
  Search,
  BarChart3,
  Database,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';

interface PharmacyWithMetrics {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
  owner_id: string;
  // Metrics
  staff_count: number;
  medication_count: number;
  sales_count: number;
  total_revenue: number;
  customers_count: number;
}

interface CustomFeature {
  id: string;
  pharmacy_id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
  is_enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const AdminDashboard = () => {
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPharmacy, setSelectedPharmacy] = useState<PharmacyWithMetrics | null>(null);
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [newFeature, setNewFeature] = useState({
    feature_key: '',
    feature_name: '',
    description: '',
  });

  // Fetch all pharmacies with metrics
  const { data: pharmacies = [], isLoading: loadingPharmacies } = useQuery({
    queryKey: ['admin-pharmacies'],
    queryFn: async () => {
      // Fetch pharmacies
      const { data: pharmaciesData, error: pharmaciesError } = await supabase
        .from('pharmacies')
        .select('*')
        .order('created_at', { ascending: false });

      if (pharmaciesError) throw pharmaciesError;

      // Fetch metrics for each pharmacy
      const pharmaciesWithMetrics: PharmacyWithMetrics[] = await Promise.all(
        (pharmaciesData || []).map(async (pharmacy) => {
          // Staff count
          const { count: staffCount } = await supabase
            .from('pharmacy_staff')
            .select('*', { count: 'exact', head: true })
            .eq('pharmacy_id', pharmacy.id)
            .eq('is_active', true);

          // Medication count
          const { count: medicationCount } = await supabase
            .from('medications')
            .select('*', { count: 'exact', head: true })
            .eq('pharmacy_id', pharmacy.id);

          // Sales count and revenue
          const { data: salesData } = await supabase
            .from('sales')
            .select('total_price')
            .eq('pharmacy_id', pharmacy.id);

          const totalRevenue = salesData?.reduce((sum, sale) => sum + sale.total_price, 0) || 0;

          // Customers count
          const { count: customersCount } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true })
            .eq('pharmacy_id', pharmacy.id);

          return {
            ...pharmacy,
            staff_count: staffCount || 0,
            medication_count: medicationCount || 0,
            sales_count: salesData?.length || 0,
            total_revenue: totalRevenue,
            customers_count: customersCount || 0,
          };
        })
      );

      return pharmaciesWithMetrics;
    },
  });

  // Fetch custom features for selected pharmacy
  const { data: customFeatures = [], isLoading: loadingFeatures } = useQuery({
    queryKey: ['pharmacy-features', selectedPharmacy?.id],
    queryFn: async () => {
      if (!selectedPharmacy) return [];

      const { data, error } = await supabase
        .from('pharmacy_custom_features')
        .select('*')
        .eq('pharmacy_id', selectedPharmacy.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CustomFeature[];
    },
    enabled: !!selectedPharmacy,
  });

  // Add custom feature
  const addFeatureMutation = useMutation({
    mutationFn: async (feature: { pharmacy_id: string; feature_key: string; feature_name: string; description: string }) => {
      const { data, error } = await supabase
        .from('pharmacy_custom_features')
        .insert([feature])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-features'] });
      setFeatureDialogOpen(false);
      setNewFeature({ feature_key: '', feature_name: '', description: '' });
      toast({ title: 'Feature added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add feature', description: error.message, variant: 'destructive' });
    },
  });

  // Toggle feature
  const toggleFeatureMutation = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { data, error } = await supabase
        .from('pharmacy_custom_features')
        .update({ is_enabled })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-features'] });
    },
  });

  // Platform metrics
  const totalPharmacies = pharmacies.length;
  const activeSubscriptions = pharmacies.filter(p => p.subscription_status === 'active' || p.subscription_status === 'trial').length;
  const totalRevenue = pharmacies.reduce((sum, p) => sum + p.total_revenue, 0);
  const totalStaff = pharmacies.reduce((sum, p) => sum + p.staff_count, 0);
  const totalMedications = pharmacies.reduce((sum, p) => sum + p.medication_count, 0);
  const totalSales = pharmacies.reduce((sum, p) => sum + p.sales_count, 0);

  const filteredPharmacies = pharmacies.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success/10 text-success border-success/20">Active</Badge>;
      case 'trial':
        return <Badge className="bg-primary/10 text-primary border-primary/20">Trial</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'enterprise':
        return <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0"><Crown className="h-3 w-3 mr-1" />Enterprise</Badge>;
      case 'pro':
        return <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0"><Zap className="h-3 w-3 mr-1" />Pro</Badge>;
      default:
        return <Badge variant="outline">Starter</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Admin Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm">Platform-wide metrics & pharmacy management</p>
          </div>
        </div>

        {/* Platform Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Pharmacies</p>
                  <p className="text-2xl font-bold">{totalPharmacies}</p>
                </div>
                <Building2 className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Active Subs</p>
                  <p className="text-2xl font-bold text-success">{activeSubscriptions}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-success opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Staff</p>
                  <p className="text-2xl font-bold">{totalStaff}</p>
                </div>
                <Users className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Products</p>
                  <p className="text-2xl font-bold">{totalMedications}</p>
                </div>
                <Package className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold">{totalSales}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-xl font-bold text-success">{formatPrice(totalRevenue)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-success opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="pharmacies" className="space-y-6">
          <TabsList className="glass-card p-1">
            <TabsTrigger value="pharmacies" className="gap-2">
              <Building2 className="h-4 w-4" />
              Pharmacies
            </TabsTrigger>
            <TabsTrigger value="features" className="gap-2" disabled={!selectedPharmacy}>
              <Settings className="h-4 w-4" />
              Custom Features
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pharmacies" className="space-y-4">
            {/* Search */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pharmacies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Pharmacies Table */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">All Pharmacies</CardTitle>
                <CardDescription>Click a pharmacy to manage custom features</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPharmacies ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pharmacy</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Staff</TableHead>
                          <TableHead className="text-center">Products</TableHead>
                          <TableHead className="text-center">Sales</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead>Joined</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPharmacies.map((pharmacy) => (
                          <TableRow
                            key={pharmacy.id}
                            className={`cursor-pointer transition-colors ${selectedPharmacy?.id === pharmacy.id ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                            onClick={() => setSelectedPharmacy(pharmacy)}
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium">{pharmacy.name}</p>
                                <p className="text-xs text-muted-foreground">{pharmacy.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>{getPlanBadge(pharmacy.subscription_plan)}</TableCell>
                            <TableCell>{getStatusBadge(pharmacy.subscription_status)}</TableCell>
                            <TableCell className="text-center">{pharmacy.staff_count}</TableCell>
                            <TableCell className="text-center">{pharmacy.medication_count}</TableCell>
                            <TableCell className="text-center">{pharmacy.sales_count}</TableCell>
                            <TableCell className="text-right font-medium">{formatPrice(pharmacy.total_revenue)}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(pharmacy.created_at), 'MMM dd, yyyy')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            {selectedPharmacy ? (
              <>
                {/* Selected Pharmacy Info */}
                <Card className="glass-card border-primary/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{selectedPharmacy.name}</CardTitle>
                          <CardDescription>{selectedPharmacy.email}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getPlanBadge(selectedPharmacy.subscription_plan)}
                        {getStatusBadge(selectedPharmacy.subscription_status)}
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Custom Features */}
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Custom Features</CardTitle>
                        <CardDescription>Manage pharmacy-specific features and configurations</CardDescription>
                      </div>
                      <Button onClick={() => setFeatureDialogOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Feature
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingFeatures ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : customFeatures.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No custom features configured</p>
                        <p className="text-sm">Add features specific to this pharmacy's needs</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {customFeatures.map((feature) => (
                          <div
                            key={feature.id}
                            className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{feature.feature_name}</p>
                                <Badge variant="outline" className="text-xs">
                                  {feature.feature_key}
                                </Badge>
                              </div>
                              {feature.description && (
                                <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                              )}
                            </div>
                            <Switch
                              checked={feature.is_enabled}
                              onCheckedChange={(checked) =>
                                toggleFeatureMutation.mutate({ id: feature.id, is_enabled: checked })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="glass-card">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select a pharmacy from the Pharmacies tab to manage features</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Feature Dialog */}
      <Dialog open={featureDialogOpen} onOpenChange={setFeatureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Feature</DialogTitle>
            <DialogDescription>
              Create a new custom feature for {selectedPharmacy?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Feature Key</label>
              <Input
                placeholder="e.g., custom_reports, sms_alerts"
                value={newFeature.feature_key}
                onChange={(e) => setNewFeature({ ...newFeature, feature_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              />
              <p className="text-xs text-muted-foreground mt-1">Unique identifier (snake_case)</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Feature Name</label>
              <Input
                placeholder="e.g., Custom Reports, SMS Alerts"
                value={newFeature.feature_name}
                onChange={(e) => setNewFeature({ ...newFeature, feature_name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                placeholder="Describe what this feature does..."
                value={newFeature.description}
                onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeatureDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedPharmacy && newFeature.feature_key && newFeature.feature_name) {
                  addFeatureMutation.mutate({
                    pharmacy_id: selectedPharmacy.id,
                    feature_key: newFeature.feature_key,
                    feature_name: newFeature.feature_name,
                    description: newFeature.description,
                  });
                }
              }}
              disabled={!newFeature.feature_key || !newFeature.feature_name || addFeatureMutation.isPending}
            >
              {addFeatureMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Feature'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
