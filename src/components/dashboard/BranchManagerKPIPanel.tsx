import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingUp, ShoppingCart, Target, Package, AlertTriangle } from 'lucide-react';
import { useSales } from '@/hooks/useSales';
import { useBranchInventory } from '@/hooks/useBranchInventory';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useBranchContext } from '@/contexts/BranchContext';
import { startOfDay, subDays, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export const BranchManagerKPIPanel = () => {
  const { sales } = useSales();
  const { medications, getMetrics } = useBranchInventory();
  const { formatPrice } = useCurrency();
  const { currentBranchId, currentBranchName } = useBranchContext();

  // Filter sales to current branch only
  const branchSales = useMemo(() => {
    if (!sales || !currentBranchId) return [];
    return sales.filter(s => s.branch_id === currentBranchId);
  }, [sales, currentBranchId]);

  // Calculate KPIs for this branch
  const kpis = useMemo(() => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const yesterdayStart = startOfDay(subDays(today, 1));
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const monthStart = startOfMonth(today);

    // Today's revenue
    const todayRevenue = branchSales
      .filter(s => parseISO(s.sale_date) >= todayStart)
      .reduce((sum, s) => sum + s.total_price, 0);

    // Yesterday's revenue for comparison
    const yesterdayRevenue = branchSales
      .filter(s => {
        const date = parseISO(s.sale_date);
        return date >= yesterdayStart && date < todayStart;
      })
      .reduce((sum, s) => sum + s.total_price, 0);

    // Week revenue
    const weekRevenue = branchSales
      .filter(s => parseISO(s.sale_date) >= weekStart)
      .reduce((sum, s) => sum + s.total_price, 0);

    // Month revenue
    const monthRevenue = branchSales
      .filter(s => parseISO(s.sale_date) >= monthStart)
      .reduce((sum, s) => sum + s.total_price, 0);

    // Today's transactions
    const todayTransactions = branchSales.filter(s => parseISO(s.sale_date) >= todayStart).length;

    // Average basket
    const avgBasket = todayTransactions > 0 ? todayRevenue / todayTransactions : 0;

    // Revenue change
    const revenueChange = yesterdayRevenue > 0 
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
      : todayRevenue > 0 ? 100 : 0;

    return {
      todayRevenue,
      yesterdayRevenue,
      weekRevenue,
      monthRevenue,
      todayTransactions,
      avgBasket,
      revenueChange,
    };
  }, [branchSales]);

  const branchMetrics = getMetrics();

  // Targets (could be made configurable per branch)
  const dailyTarget = 50000;
  const weeklyTarget = 300000;
  const monthlyTarget = 1200000;

  if (!currentBranchId) {
    return null;
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Branch Performance KPIs
        </CardTitle>
        <CardDescription>
          Key metrics for {currentBranchName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Revenue */}
          <div className="p-4 rounded-xl border bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <span className={`text-sm font-medium ${kpis.revenueChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {kpis.revenueChange >= 0 ? '+' : ''}{kpis.revenueChange.toFixed(1)}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Today's Revenue</p>
            <p className="text-2xl font-bold">{formatPrice(kpis.todayRevenue)}</p>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Target: {formatPrice(dailyTarget)}</span>
                <span>{Math.min(100, (kpis.todayRevenue / dailyTarget) * 100).toFixed(0)}%</span>
              </div>
              <Progress value={Math.min(100, (kpis.todayRevenue / dailyTarget) * 100)} className="h-1.5" />
            </div>
          </div>

          {/* Weekly Revenue */}
          <div className="p-4 rounded-xl border bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">This Week</p>
            <p className="text-2xl font-bold">{formatPrice(kpis.weekRevenue)}</p>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Target: {formatPrice(weeklyTarget)}</span>
                <span>{Math.min(100, (kpis.weekRevenue / weeklyTarget) * 100).toFixed(0)}%</span>
              </div>
              <Progress value={Math.min(100, (kpis.weekRevenue / weeklyTarget) * 100)} className="h-1.5" />
            </div>
          </div>

          {/* Today's Transactions */}
          <div className="p-4 rounded-xl border bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-purple-500" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Transactions Today</p>
            <p className="text-2xl font-bold">{kpis.todayTransactions}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Avg basket: {formatPrice(kpis.avgBasket)}
            </p>
          </div>

          {/* Stock Alerts */}
          <div className="p-4 rounded-xl border bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Stock Alerts</p>
            <p className="text-2xl font-bold">{branchMetrics.lowStock + branchMetrics.expired + branchMetrics.expiringSoon}</p>
            <div className="flex gap-2 mt-2 text-xs">
              <span className="text-amber-500">{branchMetrics.lowStock} low</span>
              <span className="text-red-500">{branchMetrics.expired} expired</span>
              <span className="text-orange-500">{branchMetrics.expiringSoon} expiring</span>
            </div>
          </div>
        </div>

        {/* Monthly Progress */}
        <div className="mt-6 p-4 rounded-xl border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-medium">Monthly Revenue Progress</p>
              <p className="text-sm text-muted-foreground">{currentBranchName}</p>
            </div>
            <p className="text-lg font-bold">{formatPrice(kpis.monthRevenue)}</p>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Target: {formatPrice(monthlyTarget)}</span>
            <span>{Math.min(100, (kpis.monthRevenue / monthlyTarget) * 100).toFixed(1)}% achieved</span>
          </div>
          <Progress value={Math.min(100, (kpis.monthRevenue / monthlyTarget) * 100)} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
};
