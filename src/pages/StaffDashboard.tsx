import { useNavigate } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import { useMedications } from '@/hooks/useMedications';
import { useAuth } from '@/contexts/AuthContext';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useShifts } from '@/hooks/useShifts';
import { usePermissions } from '@/hooks/usePermissions';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ShiftClock } from '@/components/dashboard/ShiftClock';
import { StaffQuickActions } from '@/components/dashboard/StaffQuickActions';
import { ExpiryDiscountEngine } from '@/components/dashboard/ExpiryDiscountEngine';
import { QuickGlancePanel } from '@/components/dashboard/QuickGlancePanel';
import { AlertSummaryWidget } from '@/components/dashboard/AlertSummaryWidget';
import { LiveActivityFeed } from '@/components/dashboard/LiveActivityFeed';
import { 
  Package, 
  AlertTriangle, 
  Clock, 
  XCircle,
  ShoppingCart,
  Loader2,
  Users,
  PackageSearch,
  Zap
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

const StaffDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { pharmacy, isLoading: pharmacyLoading } = usePharmacy();
  const { medications, getMetrics } = useMedications();
  const { activeShift } = useShifts();
  const { hasPermission } = usePermissions();

  // Loading state
  if (authLoading || pharmacyLoading) {
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
          <p className="text-muted-foreground">Loading your dashboard...</p>
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

  const metrics = getMetrics();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-[1400px]">
        {/* Welcome Section with AI Badge */}
        <motion.section 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight mb-1">
                  Welcome back, <span className="text-gradient">{user.user_metadata?.full_name || user.email?.split('@')[0]}</span>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Here's what needs your attention at <span className="font-medium text-foreground">{pharmacy.name}</span>
                </p>
              </div>
              {/* AI Active Badge */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 backdrop-blur-sm">
                <Zap className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-sm text-primary font-medium">AI Active</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button 
                onClick={() => navigate('/checkout')}
                className="gap-2 bg-gradient-primary hover:opacity-90 shadow-glow-primary btn-glow h-11 px-6"
              >
                <ShoppingCart className="h-5 w-5" />
                Open POS
              </Button>
            </div>
          </div>
        </motion.section>

        {/* Quick Glance & Live Activity Row */}
        <motion.section 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-8"
        >
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <QuickGlancePanel />
            </motion.div>
            <motion.div variants={itemVariants} className="lg:col-span-1">
              <LiveActivityFeed />
            </motion.div>
          </div>
        </motion.section>

        {/* Alert Summary Widget */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <AlertSummaryWidget />
        </motion.section>

        {/* Shift Clock & Quick Actions */}
        <motion.section 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-8"
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

        {/* Key Metrics - Clinical Focus */}
        <motion.section 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-8"
        >
          <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
            <motion.div variants={itemVariants}>
              <MetricCard
                title="Total SKUs"
                value={metrics.totalSKUs}
                icon={<Package className="h-5 w-5 sm:h-7 sm:w-7" />}
                variant="primary"
                subtitle="Active medications"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <MetricCard
                title="Low Stock"
                value={metrics.lowStockItems}
                icon={<AlertTriangle className="h-5 w-5 sm:h-7 sm:w-7" />}
                variant="warning"
                subtitle="Need reordering"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <MetricCard
                title="Expired"
                value={metrics.expiredItems}
                icon={<XCircle className="h-5 w-5 sm:h-7 sm:w-7" />}
                variant="danger"
                subtitle="Remove from shelf"
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

        {/* Expiry Discount Engine */}
        {medications.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <ExpiryDiscountEngine />
          </motion.section>
        )}

        {/* Quick Actions */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass-card border-border/50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            <CardHeader className="relative">
              <CardTitle className="font-display">Quick Actions</CardTitle>
              <CardDescription>Navigate to common tasks</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center gap-3 hover:bg-primary/10 hover:border-primary/40 hover:shadow-glow-primary/20 transition-all group relative overflow-hidden"
                  onClick={() => navigate('/checkout')}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <ShoppingCart className="h-6 w-6 group-hover:text-primary group-hover:scale-110 transition-all" />
                  <span className="text-sm font-medium relative z-10">Point of Sale</span>
                </Button>
                {hasPermission('access_inventory') && (
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col items-center justify-center gap-3 hover:bg-primary/10 hover:border-primary/40 hover:shadow-glow-primary/20 transition-all group relative overflow-hidden"
                    onClick={() => navigate('/inventory')}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <PackageSearch className="h-6 w-6 group-hover:text-primary group-hover:scale-110 transition-all" />
                    <span className="text-sm font-medium relative z-10">Inventory</span>
                  </Button>
                )}
                {hasPermission('access_customers') && (
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col items-center justify-center gap-3 hover:bg-primary/10 hover:border-primary/40 hover:shadow-glow-primary/20 transition-all group relative overflow-hidden"
                    onClick={() => navigate('/customers')}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Users className="h-6 w-6 group-hover:text-primary group-hover:scale-110 transition-all" />
                    <span className="text-sm font-medium relative z-10">Customers</span>
                  </Button>
                )}
                {(hasPermission('view_own_sales') || hasPermission('view_reports')) && (
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col items-center justify-center gap-3 hover:bg-primary/10 hover:border-primary/40 hover:shadow-glow-primary/20 transition-all group relative overflow-hidden"
                    onClick={() => navigate('/my-sales')}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Clock className="h-6 w-6 group-hover:text-primary group-hover:scale-110 transition-all" />
                    <span className="text-sm font-medium relative z-10">My Sales</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </main>
    </div>
  );
};

export default StaffDashboard;
