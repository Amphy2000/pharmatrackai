import { useMemo } from 'react';
import type { Medication } from '@/types/medication';
import { useNavigate } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import { useBranchInventory } from '@/hooks/useBranchInventory';
import { useSales } from '@/hooks/useSales';
import { useAuth } from '@/contexts/AuthContext';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useShifts } from '@/hooks/useShifts';
import { usePermissions } from '@/hooks/usePermissions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useBranchContext } from '@/contexts/BranchContext';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { InventoryCharts } from '@/components/dashboard/InventoryCharts';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { ShiftClock } from '@/components/dashboard/ShiftClock';
import { ExpiryDiscountEngine } from '@/components/dashboard/ExpiryDiscountEngine';
import { QuickGlancePanel } from '@/components/dashboard/QuickGlancePanel';
import { LiveActivityFeed } from '@/components/dashboard/LiveActivityFeed';
import { BranchAlertSummaryWidget } from '@/components/dashboard/BranchAlertSummaryWidget';
import { BranchStaffPerformancePanel } from '@/components/dashboard/BranchStaffPerformancePanel';
import { BranchManagerKPIPanel } from '@/components/dashboard/BranchManagerKPIPanel';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { 
  Package, 
  AlertTriangle, 
  Clock, 
  XCircle,
  ShoppingCart,
  TrendingUp,
  Loader2,
  Users,
  DollarSign,
  BarChart3,
  Home,
  Building2
} from 'lucide-react';

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

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { pharmacy, isLoading: pharmacyLoading } = usePharmacy();
  const { medications: branchMedications, getMetrics } = useBranchInventory();
  const { sales } = useSales();
  const { activeShift } = useShifts();
  const { userRole, isLoading: permissionsLoading } = usePermissions();
  const { formatPrice } = useCurrency();
  const { currentBranchName, currentBranchId, userAssignedBranchId } = useBranchContext();

  // Map branch medications to include current_stock for compatibility with components expecting Medication[]
  const compatibleMedications = useMemo((): Medication[] => {
    return branchMedications.map(m => ({
      ...m,
      current_stock: m.branch_stock,
    } as Medication));
  }, [branchMedications]);

  // Filter sales to only this branch
  const branchSales = useMemo(() => {
    if (!sales || !currentBranchId) return [];
    return sales.filter(s => s.branch_id === currentBranchId);
  }, [sales, currentBranchId]);

  // Calculate today's sales from branch-specific sales only
  const todaysSales = useMemo(() => {
    if (!branchSales || branchSales.length === 0) return 0;
    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);
    
    return branchSales
      .filter(sale => {
        const saleDate = parseISO(sale.sale_date);
        return saleDate >= dayStart && saleDate <= dayEnd;
      })
      .reduce((sum, sale) => sum + sale.total_price, 0);
  }, [branchSales]);

  // Calculate branch inventory value
  const totalInventoryValue = useMemo(() => {
    return branchMedications?.reduce((sum, med) => {
      return sum + (med.branch_stock * med.unit_price);
    }, 0) || 0;
  }, [branchMedications]);

  // Calculate protected value (expiring soon inventory) - branch-specific only
  const protectedValue = useMemo(() => {
    return branchMedications?.reduce((sum, med) => {
      const expiryDate = new Date(med.expiry_date);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 30 && med.branch_stock > 0) {
        return sum + (med.branch_stock * med.unit_price);
      }
      return sum;
    }, 0) || 0;
  }, [branchMedications]);

  const branchMetrics = getMetrics();

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
          <p className="text-muted-foreground">Loading your branch...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    navigate('/');
    return null;
  }

  if (!pharmacy) {
    navigate('/onboarding');
    return null;
  }

  // Redirect owner to main dashboard
  if (userRole === 'owner') {
    navigate('/dashboard', { replace: true });
    return null;
  }

  // Redirect staff to their dashboard
  if (userRole === 'staff') {
    navigate('/staff-dashboard', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-[1600px]">
        {/* Welcome Section - Branch Focused */}
        <motion.section 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold font-display tracking-tight mb-2">
                <span className="text-gradient">{currentBranchName}</span> Dashboard
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Welcome, <span className="text-foreground font-medium">{user.user_metadata?.full_name || 'Manager'}</span> — Here's your branch overview.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary font-medium">Branch Manager</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Dashboard Tabs */}
        <Tabs defaultValue="simple" className="w-full">
          <TabsList className="mb-6 bg-muted/50 p-1">
            <TabsTrigger value="simple" className="gap-2 data-[state=active]:bg-background">
              <Home className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2 data-[state=active]:bg-background">
              <BarChart3 className="h-4 w-4" />
              Branch Analytics
            </TabsTrigger>
          </TabsList>

          {/* Simple Mode - Overview */}
          <TabsContent value="simple" className="space-y-6">
            {/* Quick Actions */}
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
                  Point of Sale
                </Button>
                <Button
                  onClick={() => navigate('/inventory')}
                  variant="outline"
                  className="h-32 sm:h-40 flex flex-col items-center justify-center gap-4 border-2 border-primary/30 hover:bg-primary/5 hover:border-primary/50 text-lg sm:text-xl font-semibold group"
                >
                  <Package className="h-10 w-10 sm:h-14 sm:w-14 text-primary group-hover:scale-110 transition-transform" />
                  Branch Stock
                </Button>
              </div>
            </motion.section>

            {/* Branch-Specific Metrics */}
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
                        <p className="text-sm text-muted-foreground mb-1">Today's Branch Sales</p>
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
                        <Package className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Branch Inventory Value</p>
                        <p className="text-2xl sm:text-3xl font-bold font-display">{formatPrice(totalInventoryValue)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.section>

            {/* Branch Alert Summary */}
            <BranchAlertSummaryWidget />

            {/* AI Insights for Branch */}
            {branchMedications.length > 0 && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <AIInsightsPanel medications={compatibleMedications} />
              </motion.section>
            )}

            {/* Expiry Discount Engine */}
            {branchMedications.length > 0 && (
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
                  <span className="text-sm">Branch Sales</span>
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
                  onClick={() => navigate('/shifts')}
                >
                  <Clock className="h-5 w-5 group-hover:text-primary transition-colors" />
                  <span className="text-sm">Shift History</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary/30 transition-all group"
                  onClick={() => navigate('/settings')}
                >
                  <Building2 className="h-5 w-5 group-hover:text-primary transition-colors" />
                  <span className="text-sm">Staff</span>
                </Button>
              </div>
            </motion.section>
          </TabsContent>

          {/* Analytics Tab - Branch Only */}
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

            {/* Branch Key Metrics */}
            <motion.section 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
                <motion.div variants={itemVariants}>
                  <MetricCard
                    title="Branch SKUs"
                    value={branchMetrics.totalSKUs}
                    icon={<Package className="h-5 w-5 sm:h-7 sm:w-7" />}
                    variant="primary"
                    subtitle={`In ${currentBranchName}`}
                  />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <MetricCard
                    title="Low Stock"
                    value={branchMetrics.lowStock}
                    icon={<AlertTriangle className="h-5 w-5 sm:h-7 sm:w-7" />}
                    variant="warning"
                    subtitle="Below reorder level"
                  />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <MetricCard
                    title="Expired"
                    value={branchMetrics.expired}
                    icon={<XCircle className="h-5 w-5 sm:h-7 sm:w-7" />}
                    variant="danger"
                    subtitle="Require disposal"
                  />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <MetricCard
                    title="Expiring Soon"
                    value={branchMetrics.expiringSoon}
                    icon={<Clock className="h-5 w-5 sm:h-7 sm:w-7" />}
                    variant="success"
                    subtitle="Within 30 days"
                  />
                </motion.div>
              </div>
            </motion.section>

            {/* Branch Staff Performance - Only staff under this manager */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <BranchStaffPerformancePanel />
            </motion.section>

            {/* Branch KPIs */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <BranchManagerKPIPanel />
            </motion.section>

            {/* Inventory Charts - Branch specific */}
            {branchMedications.length > 0 && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
              >
                <InventoryCharts medications={compatibleMedications} />
              </motion.section>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ManagerDashboard;
