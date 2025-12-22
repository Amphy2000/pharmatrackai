import { useNavigate } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import { useMedications } from '@/hooks/useMedications';
import { useAuth } from '@/contexts/AuthContext';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useShifts } from '@/hooks/useShifts';
import { usePermissions } from '@/hooks/usePermissions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { 
  Package, 
  AlertTriangle, 
  Clock, 
  XCircle,
  ShoppingCart,
  TrendingUp,
  Loader2,
  Zap,
  Users
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
  const { activeShift } = useShifts();
  const { isOwnerOrManager, userRole, hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { formatPrice } = useCurrency();

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

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-[1600px]">
        {/* Welcome Section */}
        <motion.section 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 sm:mb-10"
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
            <div className="flex flex-wrap items-center gap-3">
              <Button 
                onClick={() => navigate('/checkout')}
                className="gap-2 bg-gradient-primary hover:opacity-90 shadow-glow-primary btn-glow h-11 px-6"
              >
                <ShoppingCart className="h-5 w-5" />
                Open POS
              </Button>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary font-medium">AI Active</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Shift Clock & Quick Actions */}
        <motion.section 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-8 sm:mb-10"
        >
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
            <motion.div variants={itemVariants} className="lg:col-span-1">
              <ShiftClock />
            </motion.div>
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <StaffQuickActions />
            </motion.div>
          </div>
        </motion.section>

        {/* Key Metrics */}
        <motion.section 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-8 sm:mb-10"
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
            className="mb-8 sm:mb-10"
          >
            <StaffPerformancePanel />
          </motion.section>
        )}

        {/* Manager KPIs */}
        {isOwnerOrManager && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-8 sm:mb-10"
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
            className="mb-8 sm:mb-10"
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

        {/* Expiry Discount Engine */}
        {medications.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mb-8 sm:mb-10"
          >
            <ExpiryDiscountEngine />
          </motion.section>
        )}

        {/* Financial Summary - Owner/Manager Only */}
        {isOwnerOrManager && medications.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8 sm:mb-10"
          >
            <FinancialSummary medications={medications} />
          </motion.section>
        )}

        {/* Inventory Charts - Full Width */}
        {medications.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mb-8 sm:mb-10"
          >
            <InventoryCharts medications={medications} />
          </motion.section>
        )}

        {/* Sales Analytics - Full Width for Owner/Manager */}
        {isOwnerOrManager && medications.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.58 }}
            className="mb-8 sm:mb-10"
          >
            <SalesAnalytics />
          </motion.section>
        )}

        {/* AI Insights - Full Width */}
        {medications.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-8 sm:mb-10"
          >
            <AIInsightsPanel medications={medications} />
          </motion.section>
        )}

        {/* NAFDAC Compliance - Full Width */}
        {medications.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.62 }}
            className="mb-8 sm:mb-10"
          >
            <NAFDACCompliancePanel medications={medications} />
          </motion.section>
        )}

        {/* Quick Actions Card */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="font-display">Quick Actions</CardTitle>
              <CardDescription>Navigate to common tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center gap-3 hover:bg-primary/5 hover:border-primary/30 transition-all group"
                  onClick={() => navigate('/checkout')}
                >
                  <ShoppingCart className="h-6 w-6 group-hover:text-primary transition-colors" />
                  <span className="text-sm">Point of Sale</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center gap-3 hover:bg-primary/5 hover:border-primary/30 transition-all group"
                  onClick={() => navigate('/inventory')}
                >
                  <Package className="h-6 w-6 group-hover:text-primary transition-colors" />
                  <span className="text-sm">Manage Stock</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center gap-3 hover:bg-primary/5 hover:border-primary/30 transition-all group"
                  onClick={() => navigate('/sales')}
                >
                  <TrendingUp className="h-6 w-6 group-hover:text-primary transition-colors" />
                  <span className="text-sm">Sales History</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center gap-3 hover:bg-primary/5 hover:border-primary/30 transition-all group"
                  onClick={() => navigate('/customers')}
                >
                  <Users className="h-6 w-6 group-hover:text-primary transition-colors" />
                  <span className="text-sm">Customers</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </main>
    </div>
  );
};

export default Dashboard;
