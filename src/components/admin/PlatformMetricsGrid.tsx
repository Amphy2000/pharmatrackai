import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrency } from '@/contexts/CurrencyContext';
import { 
  Building2, 
  Users, 
  Package, 
  TrendingUp, 
  CreditCard, 
  CheckCircle,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Calendar,
  Crown,
  Zap,
  Filter
} from 'lucide-react';
import { motion } from 'framer-motion';

interface PharmacyWithMetrics {
  id: string;
  name: string;
  email: string;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
  staff_count: number;
  medication_count: number;
  sales_count: number;
  total_revenue: number;
  customers_count: number;
}

interface SubscriptionPayment {
  id: string;
  pharmacy_id: string;
  plan: string;
  amount: number;
  status: string;
  payment_date: string;
  is_gift?: boolean;
}

interface PlatformMetricsGridProps {
  pharmacies: PharmacyWithMetrics[];
  subscriptionPayments?: SubscriptionPayment[];
  isLoading?: boolean;
}

type TimeFilter = 'all' | 'today' | 'week' | 'month' | 'quarter';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export const PlatformMetricsGrid = ({ pharmacies, subscriptionPayments = [], isLoading }: PlatformMetricsGridProps) => {
  const { formatPrice } = useCurrency();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalPharmacies = pharmacies.length;
    const activeSubscriptions = pharmacies.filter(p => 
      p.subscription_status === 'active' || p.subscription_status === 'trial'
    ).length;
    const expiredSubscriptions = pharmacies.filter(p => 
      p.subscription_status === 'expired' || p.subscription_status === 'cancelled'
    ).length;
    const totalRevenue = pharmacies.reduce((sum, p) => sum + p.total_revenue, 0);
    const totalStaff = pharmacies.reduce((sum, p) => sum + p.staff_count, 0);
    const totalMedications = pharmacies.reduce((sum, p) => sum + p.medication_count, 0);
    const totalSales = pharmacies.reduce((sum, p) => sum + p.sales_count, 0);
    const totalCustomers = pharmacies.reduce((sum, p) => sum + p.customers_count, 0);

    // Plan breakdown
    const starterPlan = pharmacies.filter(p => p.subscription_plan === 'starter').length;
    const proPlan = pharmacies.filter(p => p.subscription_plan === 'pro').length;
    const enterprisePlan = pharmacies.filter(p => p.subscription_plan === 'enterprise').length;

    // Platform revenue from actual subscription payments (successful payments only, excluding gifts)
    const platformRevenue = subscriptionPayments
      .filter(p => (p.status === 'success' || p.status === 'completed') && !p.is_gift)
      .reduce((sum, p) => sum + p.amount, 0);

    // Average metrics
    const avgStaffPerPharmacy = totalPharmacies > 0 ? totalStaff / totalPharmacies : 0;
    const avgRevenuePerPharmacy = totalPharmacies > 0 ? totalRevenue / totalPharmacies : 0;
    const avgSalesPerPharmacy = totalPharmacies > 0 ? totalSales / totalPharmacies : 0;

    // Conversion rate
    const conversionRate = totalPharmacies > 0 
      ? ((proPlan + enterprisePlan) / totalPharmacies) * 100 
      : 0;

    return {
      totalPharmacies,
      activeSubscriptions,
      expiredSubscriptions,
      totalRevenue,
      totalStaff,
      totalMedications,
      totalSales,
      totalCustomers,
      starterPlan,
      proPlan,
      enterprisePlan,
      platformRevenue,
      avgStaffPerPharmacy,
      avgRevenuePerPharmacy,
      avgSalesPerPharmacy,
      conversionRate,
    };
  }, [pharmacies, subscriptionPayments]);

  // Simulated growth indicators (in a real app, compare with previous period)
  const growthIndicators = {
    pharmacies: 12.5,
    revenue: 8.3,
    sales: 15.2,
    staff: 5.1,
  };

  const GrowthIndicator = ({ value }: { value: number }) => {
    if (value > 0) {
      return (
        <span className="inline-flex items-center text-xs text-green-600">
          <ArrowUpRight className="h-3 w-3" />
          {value.toFixed(1)}%
        </span>
      );
    } else if (value < 0) {
      return (
        <span className="inline-flex items-center text-xs text-red-500">
          <ArrowDownRight className="h-3 w-3" />
          {Math.abs(value).toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        0%
      </span>
    );
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Filter Bar */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter by period:</span>
          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
            <SelectTrigger className="w-[130px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Badge variant="outline" className="text-xs">
          <Calendar className="h-3 w-3 mr-1" />
          Last updated: Just now
        </Badge>
      </motion.div>

      {/* Primary Metrics - Large Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pharmacies */}
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
          <CardContent className="pt-5 relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Pharmacies
                </p>
                <p className="text-3xl font-bold mt-1">{metrics.totalPharmacies}</p>
                <div className="mt-2 flex items-center gap-2">
                  <GrowthIndicator value={growthIndicators.pharmacies} />
                  <span className="text-xs text-muted-foreground">vs last month</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Subscriptions */}
        <Card className="bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-green-500/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16" />
          <CardContent className="pt-5 relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Active Subscriptions
                </p>
                <p className="text-3xl font-bold mt-1 text-green-600">{metrics.activeSubscriptions}</p>
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {((metrics.activeSubscriptions / Math.max(metrics.totalPharmacies, 1)) * 100).toFixed(0)}% retention
                  </Badge>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16" />
          <CardContent className="pt-5 relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Pharmacy Revenue
                </p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">{formatPrice(metrics.totalRevenue)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <GrowthIndicator value={growthIndicators.revenue} />
                  <span className="text-xs text-muted-foreground">vs last month</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform Revenue */}
        <Card className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16" />
          <CardContent className="pt-5 relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Platform Revenue
                </p>
                <p className="text-2xl font-bold mt-1 text-amber-600">{formatPrice(metrics.platformRevenue)}</p>
                <div className="mt-2">
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                    Monthly Recurring
                  </Badge>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Secondary Metrics - Medium Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-card/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Staff</p>
                <p className="text-lg font-bold">{metrics.totalStaff}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Package className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Products</p>
                <p className="text-lg font-bold">{metrics.totalMedications}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Sales</p>
                <p className="text-lg font-bold">{metrics.totalSales}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-pink-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Customers</p>
                <p className="text-lg font-bold">{metrics.totalCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-teal-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Conversion</p>
                <p className="text-lg font-bold">{metrics.conversionRate.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Staff</p>
                <p className="text-lg font-bold">{metrics.avgStaffPerPharmacy.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Plan Distribution */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-muted">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Starter Plan</p>
                  <p className="text-xs text-muted-foreground">Free tier users</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{metrics.starterPlan}</p>
                <p className="text-xs text-muted-foreground">
                  {((metrics.starterPlan / Math.max(metrics.totalPharmacies, 1)) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Pro Plan</p>
                  <p className="text-xs text-muted-foreground">Subscription price: ₦50,000/mo</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-violet-600">{metrics.proPlan}</p>
                <p className="text-xs text-muted-foreground">
                  {((metrics.proPlan / Math.max(metrics.totalPharmacies, 1)) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Enterprise</p>
                  <p className="text-xs text-muted-foreground">Subscription price: ₦1,000,000+/mo</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-amber-600">{metrics.enterprisePlan}</p>
                <p className="text-xs text-muted-foreground">
                  {((metrics.enterprisePlan / Math.max(metrics.totalPharmacies, 1)) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};
