import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths, subYears, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Target, Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

type Period = 'today' | 'week' | 'month' | 'year';

interface SalesWithMedication {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sale_date: string;
  medications: {
    unit_price: number;
  } | null;
}

export const SalesAnalytics = () => {
  const { formatPrice } = useCurrency();
  const [period, setPeriod] = useState<Period>('month');

  const getDateRange = (p: Period) => {
    const now = new Date();
    switch (p) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now), prevStart: startOfDay(subDays(now, 1)), prevEnd: endOfDay(subDays(now, 1)) };
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now), prevStart: startOfWeek(subDays(now, 7)), prevEnd: endOfWeek(subDays(now, 7)) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now), prevStart: startOfMonth(subMonths(now, 1)), prevEnd: endOfMonth(subMonths(now, 1)) };
      case 'year':
        return { start: startOfYear(now), end: endOfYear(now), prevStart: startOfYear(subYears(now, 1)), prevEnd: endOfYear(subYears(now, 1)) };
    }
  };

  const dateRange = getDateRange(period);

  // Fetch current period sales
  const { data: currentSales = [], isLoading: loadingCurrent } = useQuery({
    queryKey: ['sales-analytics-current', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id,
          quantity,
          unit_price,
          total_price,
          sale_date,
          medications (unit_price)
        `)
        .gte('sale_date', dateRange.start.toISOString())
        .lte('sale_date', dateRange.end.toISOString());

      if (error) throw error;
      return data as SalesWithMedication[];
    },
  });

  // Fetch previous period sales for comparison
  const { data: previousSales = [], isLoading: loadingPrevious } = useQuery({
    queryKey: ['sales-analytics-previous', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id,
          quantity,
          unit_price,
          total_price,
          sale_date,
          medications (unit_price)
        `)
        .gte('sale_date', dateRange.prevStart.toISOString())
        .lte('sale_date', dateRange.prevEnd.toISOString());

      if (error) throw error;
      return data as SalesWithMedication[];
    },
  });

  const analytics = useMemo(() => {
    // Current period calculations
    const currentRevenue = currentSales.reduce((sum, s) => sum + Number(s.total_price), 0);
    const currentCost = currentSales.reduce((sum, s) => {
      const costPrice = s.medications?.unit_price || s.unit_price * 0.7; // Fallback: assume 30% margin
      return sum + (costPrice * s.quantity);
    }, 0);
    const currentProfit = currentRevenue - currentCost;
    const currentOrders = currentSales.length;
    const currentItems = currentSales.reduce((sum, s) => sum + s.quantity, 0);

    // Previous period calculations
    const previousRevenue = previousSales.reduce((sum, s) => sum + Number(s.total_price), 0);
    const previousCost = previousSales.reduce((sum, s) => {
      const costPrice = s.medications?.unit_price || s.unit_price * 0.7;
      return sum + (costPrice * s.quantity);
    }, 0);
    const previousProfit = previousRevenue - previousCost;
    const previousOrders = previousSales.length;

    // Calculate percentage changes
    const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const profitChange = previousProfit > 0 ? ((currentProfit - previousProfit) / previousProfit) * 100 : 0;
    const ordersChange = previousOrders > 0 ? ((currentOrders - previousOrders) / previousOrders) * 100 : 0;

    // Calculate margin
    const profitMargin = currentRevenue > 0 ? (currentProfit / currentRevenue) * 100 : 0;

    return {
      revenue: currentRevenue,
      profit: currentProfit,
      orders: currentOrders,
      items: currentItems,
      profitMargin,
      revenueChange,
      profitChange,
      ordersChange,
    };
  }, [currentSales, previousSales]);

  const isLoading = loadingCurrent || loadingPrevious;

  const periodLabels: Record<Period, string> = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
  };

  const comparisonLabels: Record<Period, string> = {
    today: 'vs yesterday',
    week: 'vs last week',
    month: 'vs last month',
    year: 'vs last year',
  };

  const TrendIndicator = ({ value, label }: { value: number; label: string }) => (
    <div className={`flex items-center gap-1 text-xs ${value >= 0 ? 'text-success' : 'text-destructive'}`}>
      {value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      <span>{Math.abs(value).toFixed(1)}% {label}</span>
    </div>
  );

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-4 sm:p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg sm:text-xl font-bold font-display">Sales & Profit Analytics</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">Track your pharmacy's financial performance</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              {periodLabels[period]}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setPeriod('today')}>Today</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriod('week')}>This Week</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriod('month')}>This Month</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriod('year')}>This Year</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Revenue Card */}
        <div className="p-3 sm:p-4 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-xs sm:text-sm text-muted-foreground">Revenue</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-primary truncate">{formatPrice(analytics.revenue)}</p>
          <TrendIndicator value={analytics.revenueChange} label={comparisonLabels[period]} />
        </div>

        {/* Profit Card */}
        <div className="p-3 sm:p-4 rounded-xl bg-success/10 border border-success/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-xs sm:text-sm text-muted-foreground">Profit</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-success truncate">{formatPrice(analytics.profit)}</p>
          <TrendIndicator value={analytics.profitChange} label={comparisonLabels[period]} />
        </div>

        {/* Orders Card */}
        <div className="p-3 sm:p-4 rounded-xl bg-secondary/10 border border-secondary/20">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="h-4 w-4 text-secondary-foreground" />
            <span className="text-xs sm:text-sm text-muted-foreground">Orders</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold">{analytics.orders}</p>
          <TrendIndicator value={analytics.ordersChange} label={comparisonLabels[period]} />
        </div>

        {/* Margin Card */}
        <div className="p-3 sm:p-4 rounded-xl bg-warning/10 border border-warning/20">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-warning" />
            <span className="text-xs sm:text-sm text-muted-foreground">Profit Margin</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-warning">{analytics.profitMargin.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">{analytics.items} items sold</p>
        </div>
      </div>
    </div>
  );
};
