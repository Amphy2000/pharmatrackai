import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import { useMedications } from '@/hooks/useMedications';
import { useSales } from '@/hooks/useSales';
import { useAuth } from '@/contexts/AuthContext';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useShifts } from '@/hooks/useShifts';
import { usePermissions } from '@/hooks/usePermissions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { InventoryCharts } from '@/components/dashboard/InventoryCharts';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { NAFDACCompliancePanel } from '@/components/dashboard/NAFDACCompliancePanel';
import { FinancialSummary } from '@/components/dashboard/FinancialSummary';
import { SalesAnalytics } from '@/components/dashboard/SalesAnalytics';
import { ManagerKPIPanel } from '@/components/dashboard/ManagerKPIPanel';
import { StaffQuickActions } from '@/components/dashboard/StaffQuickActions';
import { ShiftClock } from '@/components/dashboard/ShiftClock';
import { StaffPerformancePanel } from '@/components/dashboard/StaffPerformancePanel';
import { ProfitMarginAnalyzer } from '@/components/dashboard/ProfitMarginAnalyzer';
import { DemandForecasting } from '@/components/dashboard/DemandForecasting';
import { ExpiryDiscountEngine } from '@/components/dashboard/ExpiryDiscountEngine';
import { QuickGlancePanel } from '@/components/dashboard/QuickGlancePanel';
import { ROIDashboard } from '@/components/dashboard/ROIDashboard';
import { LiveActivityFeed } from '@/components/dashboard/LiveActivityFeed';
import { ProductTour } from '@/components/ProductTour';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import { AlertSummaryWidget } from '@/components/dashboard/AlertSummaryWidget';
import { BranchComparisonPanel } from '@/components/dashboard/BranchComparisonPanel';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { 
  Package, 
  AlertTriangle, 
  Clock, 
  XCircle,
  ShoppingCart,
  TrendingUp,
  Loader2,
  Zap,
  Users,
  Shield,
  Bell,
  DollarSign,
  BarChart3,
  Home
} from 'lucide-react';

// Animation variants with proper typing
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.5 } 
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { pharmacy, isLoading: pharmacyLoading } = usePharmacy();
  const { medications, isLoading: medsLoading, getMetrics } = useMedications();
  const { sales } = useSales();
  const { activeShift } = useShifts();
  const { isOwnerOrManager, userRole, hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { formatPrice } = useCurrency();

  // Fetch audit log count for ROI dashboard (price change attempts)
  const { data: auditLogCount = 0 } = useQuery({
    queryKey: ['audit-log-count', pharmacy?.id],
    queryFn: async () => {
      if (!pharmacy?.id) return 0;
      const { count, error } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('pharmacy_id', pharmacy.id)
        .eq('action', 'price_change_blocked');
      if (error) return 0;
      return count || 0;
    },
    enabled: !!pharmacy?.id,
  });

  // Calculate today's sales from real data
  const todaysSales = useMemo(() => {
    if (!sales || sales.length === 0) return 0;
    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);
    
    return sales
      .filter(sale => {
        const saleDate = parseISO(sale.sale_date);
        return saleDate >= dayStart && saleDate <= dayEnd;
      })
      .reduce((sum, sale) => sum + sale.total_price, 0);
  }, [sales]);

  // Count invoices scanned from audit logs
  const { data: invoicesScanned = 0 } = useQuery({
    queryKey: ['invoices-scanned', pharmacy?.id],
    queryFn: async () => {
      if (!pharmacy?.id) return 0;
      const { count, error } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('pharmacy_id', pharmacy.id)
        .eq('action', 'invoice_scanned');
      if (error) return 0;
      return count || 0;
    },
    enabled: !!pharmacy?.id,
  });

  // Loading state
  if (authLoading || pharmacyLoading || permissionsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow-primary">
            <Loader2 className="h-8 w-8 animate-spin text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading your pharmacy...</p>
        </motion.div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    navigate('/');
    return null;
  }

  // Redirect to onboarding if no pharmacy
  if (!pharmacy) {
    navigate('/onboarding');
    return null;
  }

  // Role-based dashboard routing
  // Cashier (staff with no view_dashboard permission) → CashierDashboard
  if (userRole === 'staff' && !hasPermission('view_dashboard')) {
    navigate('/cashier-dashboard', { replace: true });
    return null;
  }

  // Staff with view_dashboard permission (Pharmacist, Inventory Clerk) → StaffDashboard
  if (userRole === 'staff' && hasPermission('view_dashboard')) {
    navigate('/staff-dashboard', { replace: true });
    return null;
  }

  // Owner and Manager get the full dashboard (continue rendering below)
  const metrics = getMetrics();

  // Calculate total inventory value
  const totalInventoryValue = medications?.reduce((sum, med) => {
    return sum + (med.current_stock * med.unit_price);
  }, 0) || 0;

  // Calculate protected value (expired + expiring soon inventory value)
  const protectedValue = medications?.reduce((sum, med) => {
    const expiryDate = new Date(med.expiry_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 30) {
      return sum + (med.current_stock * med.unit_price);
    }
    return sum;
  }, 0) || 0;

  // Calculate pending alerts count
  const pendingAlerts = (metrics.lowStockItems || 0) + (metrics.expiredItems || 0) + (metrics.expiringWithin30Days || 0);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <ProductTour />
      <PWAInstallPrompt />
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-[1600px]">
        {/* Welcome Section */}
        <motion.section 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold font-display tracking-tight mb-2">
                Welcome back, <span className="text-gradient">{user.user_metadata?.full_name || user.email?.split('@')[0]}</span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Here's what's happening at <span className="text-foreground font-medium">{pharmacy.name}</span> today.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary font-medium">AI Active</span>
            </div>
          </div>
        </motion.section>

        {/* Dashboard Tabs - Simple Mode Default */}
        <Tabs defaultValue="simple" className="w-full">
          <TabsList className="mb-6 bg-muted/50 p-1">
            <TabsTrigger value="simple" className="gap-2 data-[state=active]:bg-background">
              <Home className="h-4 w-4" />
              Simple View
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2 data-[state=active]:bg-background">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Simple Mode - Default View */}
          <TabsContent value="simple" className="space-y-6">
            {/* Giant Quick Actions - Most Prominent */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <Button
                  onClick={() => navigate('/checkout')}
                  className="h-32 sm:h-40 flex flex-col items-center justify-center gap-4 bg-gradient-primary hover:opacity-90 shadow-glow-primary btn-glow text-lg sm:text-xl font-semibold"
                >
                  <ShoppingCart className="h-10 w-10 sm:h-14 sm:w-14" />
                  Open Point of Sale
                </Button>
                <Button
                  onClick={() => navigate('/inventory')}
                  variant="outline"
                  className="h-32 sm:h-40 flex flex-col items-center justify-center gap-4 border-2 border-primary/30 hover:bg-primary/5 hover:border-primary/50 text-lg sm:text-xl font-semibold group"
                >
                  <Package className="h-10 w-10 sm:h-14 sm:w-14 text-primary group-hover:scale-110 transition-transform" />
                  Manage Stock
                </Button>
              </div>
            </motion.section>

            {/* Key Metrics - Today's Sales, Protected Value */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <Card className="glass-card border-border/50 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
                  <CardContent className="pt-6 relative">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                        <DollarSign className="h-7 w-7 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Today's Sales</p>
                        <p className="text-2xl sm:text-3xl font-bold font-display">{formatPrice(todaysSales)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-border/50 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                  <CardContent className="pt-6 relative">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                        <Shield className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Protected Value</p>
                        <p className="text-2xl sm:text-3xl font-bold font-display">{formatPrice(protectedValue)}</p>
                        <p className="text-xs text-muted-foreground">Expiry & theft prevention</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </motion.section>

            {/* Alert Summary Widget */}
            <AlertSummaryWidget />

            {/* Money Saver Summary - ROI Dashboard */}
            {isOwnerOrManager && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <ROIDashboard invoicesScanned={invoicesScanned} auditLogCount={auditLogCount} />
              </motion.section>
            )}

            {/* AI Business Insights - Text-based, easy to understand */}
            {medications.length > 0 && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <AIInsightsPanel medications={medications} />
              </motion.section>
            )}

            {/* Expiry Discount Engine */}
            {medications.length > 0 && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <ExpiryDiscountEngine />
              </motion.section>
            )}

            {/* Secondary Quick Actions */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary/30 transition-all group"
                  onClick={() => navigate('/sales')}
                >
                  <TrendingUp className="h-5 w-5 group-hover:text-primary transition-colors" />
                  <span className="text-sm">Sales History</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary/30 transition-all group"
                  onClick={() => navigate('/customers')}
                >
                  <Users className="h-5 w-5 group-hover:text-primary transition-colors" />
                  <span className="text-sm">Customers</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary/30 transition-all group"
                  onClick={() => navigate('/suppliers')}
                >
                  <Package className="h-5 w-5 group-hover:text-primary transition-colors" />
                  <span className="text-sm">Suppliers</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary/30 transition-all group"
                  onClick={() => navigate('/settings')}
                >
                  <Zap className="h-5 w-5 group-hover:text-primary transition-colors" />
                  <span className="text-sm">Settings</span>
                </Button>
              </div>
            </motion.section>
          </TabsContent>

          {/* Analytics Tab - All Complex Charts */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Quick Glance, Shift Clock & Live Activity */}
            <motion.section 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3 auto-rows-fr">
                <motion.div variants={itemVariants} className="min-h-[280px]">
                  <QuickGlancePanel />
                </motion.div>
                <motion.div variants={itemVariants} className="min-h-[280px]">
                  <ShiftClock />
                </motion.div>
                <motion.div variants={itemVariants} className="min-h-[280px]">
                  <LiveActivityFeed />
                </motion.div>
              </div>
            </motion.section>

            {/* Staff Quick Actions */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <StaffQuickActions />
            </motion.section>

            {/* Key Metrics */}
            <motion.section 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
                <motion.div variants={itemVariants}>
                  <MetricCard
                    title="Total SKUs"
                    value={metrics.totalSKUs}
                    icon={<Package className="h-5 w-5 sm:h-7 sm:w-7" />}
                    variant="primary"
                    subtitle="Active medications"
                    trend={12}
                    trendLabel="vs last month"
                  />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <MetricCard
                    title="Low Stock"
                    value={metrics.lowStockItems}
                    icon={<AlertTriangle className="h-5 w-5 sm:h-7 sm:w-7" />}
                    variant="warning"
                    subtitle="Below reorder level"
                    trend={-8}
                    trendLabel="improved"
                  />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <MetricCard
                    title="Expired"
                    value={metrics.expiredItems}
                    icon={<XCircle className="h-5 w-5 sm:h-7 sm:w-7" />}
                    variant="danger"
                    subtitle="Require disposal"
                  />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <MetricCard
                    title="Expiring Soon"
                    value={metrics.expiringWithin30Days}
                    icon={<Clock className="h-5 w-5 sm:h-7 sm:w-7" />}
                    variant="success"
                    subtitle="Within 30 days"
                  />
                </motion.div>
              </div>
            </motion.section>

            {/* Staff Performance - Owner/Manager Only */}
            {isOwnerOrManager && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <StaffPerformancePanel />
              </motion.section>
            )}

            {/* Branch Comparison - Owner/Manager Only */}
            {isOwnerOrManager && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32 }}
              >
                <BranchComparisonPanel />
              </motion.section>
            )}

            {/* Manager KPIs */}
            {isOwnerOrManager && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <ManagerKPIPanel />
              </motion.section>
            )}

            {/* Business Intelligence Section */}
            {isOwnerOrManager && medications.length > 0 && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-primary">
                    <TrendingUp className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold font-display">Business Intelligence</h2>
                    <p className="text-sm text-muted-foreground">AI-powered insights for smarter decisions</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <ProfitMarginAnalyzer />
                  <DemandForecasting />
                </div>
              </motion.section>
            )}

            {/* Financial Summary - Owner/Manager Only */}
            {isOwnerOrManager && medications.length > 0 && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <FinancialSummary medications={medications} />
              </motion.section>
            )}

            {/* Inventory Charts */}
            {medications.length > 0 && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
              >
                <InventoryCharts medications={medications} />
              </motion.section>
            )}

            {/* Sales Analytics */}
            {isOwnerOrManager && medications.length > 0 && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.58 }}
              >
                <SalesAnalytics />
              </motion.section>
            )}

            {/* NAFDAC Compliance */}
            {medications.length > 0 && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.62 }}
              >
                <NAFDACCompliancePanel medications={medications} />
              </motion.section>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
