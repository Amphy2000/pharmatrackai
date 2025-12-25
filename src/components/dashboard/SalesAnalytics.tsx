import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { usePharmacy } from '@/hooks/usePharmacy';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths, subYears, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Target, Calendar, ChevronDown, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { BranchFilter } from './BranchFilter';

type Period = 'today' | 'week' | 'month' | 'year';

interface SalesWithMedication {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sale_date: string;
  branch_id?: string | null;
  medications: {
    unit_price: number;
  } | null;
}

export const SalesAnalytics = () => {
  const { formatPrice } = useCurrency();
  const { pharmacyId } = usePharmacy();
  const { toast } = useToast();
  const [period, setPeriod] = useState<Period>('month');
  const [branchFilter, setBranchFilter] = useState<string>('all');

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
    queryKey: ['sales-analytics-current', period, branchFilter, pharmacyId],
    queryFn: async () => {
      if (!pharmacyId) return [];
      
      let query = supabase
        .from('sales')
        .select(`
          id,
          quantity,
          unit_price,
          total_price,
          sale_date,
          medications (unit_price)
        `)
        .eq('pharmacy_id', pharmacyId)
        .gte('sale_date', dateRange.start.toISOString())
        .lte('sale_date', dateRange.end.toISOString());

      // Note: Sales don't have branch_id yet, but this prepares for future enhancement
      // When sales get branch_id, uncomment:
      // if (branchFilter !== 'all') {
      //   query = query.eq('branch_id', branchFilter);
      // }

      const { data, error } = await query;
      if (error) throw error;
      return data as SalesWithMedication[];
    },
    enabled: !!pharmacyId,
  });

  // Fetch previous period sales for comparison
  const { data: previousSales = [], isLoading: loadingPrevious } = useQuery({
    queryKey: ['sales-analytics-previous', period, branchFilter, pharmacyId],
    queryFn: async () => {
      if (!pharmacyId) return [];
      
      let query = supabase
        .from('sales')
        .select(`
          id,
          quantity,
          unit_price,
          total_price,
          sale_date,
          medications (unit_price)
        `)
        .eq('pharmacy_id', pharmacyId)
        .gte('sale_date', dateRange.prevStart.toISOString())
        .lte('sale_date', dateRange.prevEnd.toISOString());

      const { data, error } = await query;
      if (error) throw error;
      return data as SalesWithMedication[];
    },
    enabled: !!pharmacyId,
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

  const exportToCSV = () => {
    const dateRange = getDateRange(period);
    const headers = ['Metric', 'Value', 'Change', 'Period'];
    const rows = [
      ['Revenue', analytics.revenue.toFixed(2), `${analytics.revenueChange.toFixed(1)}%`, periodLabels[period]],
      ['Profit', analytics.profit.toFixed(2), `${analytics.profitChange.toFixed(1)}%`, periodLabels[period]],
      ['Orders', analytics.orders.toString(), `${analytics.ordersChange.toFixed(1)}%`, periodLabels[period]],
      ['Profit Margin', `${analytics.profitMargin.toFixed(1)}%`, '-', periodLabels[period]],
      ['Items Sold', analytics.items.toString(), '-', periodLabels[period]],
    ];

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-analytics-${period}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Export Complete',
      description: `Sales analytics for ${periodLabels[period].toLowerCase()} exported successfully.`,
    });
  };

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-bold font-display truncate">Sales & Profit Analytics</h3>
          <p className="text-xs text-muted-foreground">Track your pharmacy's financial performance</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <BranchFilter value={branchFilter} onChange={setBranchFilter} showLabel={false} />
          <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-1.5 h-8 px-2.5">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 px-2.5">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-xs">{periodLabels[period]}</span>
                <ChevronDown className="h-3 w-3" />
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
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Revenue Card */}
        <div className="p-4 sm:p-5 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Revenue</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-primary mb-1">{formatPrice(analytics.revenue)}</p>
          <TrendIndicator value={analytics.revenueChange} label={comparisonLabels[period]} />
        </div>

        {/* Profit Card */}
        <div className="p-4 sm:p-5 rounded-xl bg-success/10 border border-success/20">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-success" />
            <span className="text-sm text-muted-foreground">Profit</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-success mb-1">{formatPrice(analytics.profit)}</p>
          <TrendIndicator value={analytics.profitChange} label={comparisonLabels[period]} />
        </div>

        {/* Orders Card */}
        <div className="p-4 sm:p-5 rounded-xl bg-secondary/10 border border-secondary/20">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="h-5 w-5 text-secondary-foreground" />
            <span className="text-sm text-muted-foreground">Orders</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold mb-1">{analytics.orders}</p>
          <TrendIndicator value={analytics.ordersChange} label={comparisonLabels[period]} />
        </div>

        {/* Margin Card */}
        <div className="p-4 sm:p-5 rounded-xl bg-warning/10 border border-warning/20">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-warning" />
            <span className="text-sm text-muted-foreground">Profit Margin</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-warning mb-1">{analytics.profitMargin.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">{analytics.items} items sold</p>
        </div>
      </div>
    </div>
  );
};
