import { useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useSales } from '@/hooks/useSales';
import { useMedications } from '@/hooks/useMedications';
import { startOfDay, subDays, parseISO, isToday, isYesterday } from 'date-fns';

interface ManagerKPI {
  title: string;
  value: string;
  change: number;
  target?: string;
  progress?: number;
  icon: React.ReactNode;
  variant: 'success' | 'warning' | 'primary' | 'secondary';
}

export const ManagerKPIPanel = () => {
  const { formatPrice } = useCurrency();
  const { sales, isLoading: salesLoading } = useSales();
  const { medications } = useMedications();
  
  const kpis = useMemo(() => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const yesterdayStart = startOfDay(subDays(today, 1));
    
    // Calculate today's sales
    const todaySales = sales.filter(sale => {
      const saleDate = parseISO(sale.sale_date);
      return isToday(saleDate);
    });
    
    // Calculate yesterday's sales for comparison
    const yesterdaySales = sales.filter(sale => {
      const saleDate = parseISO(sale.sale_date);
      return isYesterday(saleDate);
    });
    
    // Today's revenue
    const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total_price, 0);
    const yesterdayRevenue = yesterdaySales.reduce((sum, sale) => sum + sale.total_price, 0);
    const revenueChange = yesterdayRevenue > 0 
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
      : 0;
    
    // Calculate gross margin (selling price - cost price) / selling price
    let totalCost = 0;
    let totalRevenue = 0;
    
    todaySales.forEach(sale => {
      totalRevenue += sale.total_price;
      // Find the medication to get cost price
      const med = medications.find(m => m.id === sale.medication_id);
      if (med) {
        totalCost += med.unit_price * sale.quantity;
      }
    });
    
    const grossMargin = totalRevenue > 0 
      ? ((totalRevenue - totalCost) / totalRevenue) * 100 
      : 0;
    
    // Yesterday's margin for comparison
    let yesterdayTotalCost = 0;
    let yesterdayTotalRevenue = 0;
    
    yesterdaySales.forEach(sale => {
      yesterdayTotalRevenue += sale.total_price;
      const med = medications.find(m => m.id === sale.medication_id);
      if (med) {
        yesterdayTotalCost += med.unit_price * sale.quantity;
      }
    });
    
    const yesterdayMargin = yesterdayTotalRevenue > 0 
      ? ((yesterdayTotalRevenue - yesterdayTotalCost) / yesterdayTotalRevenue) * 100 
      : 0;
    
    const marginChange = grossMargin - yesterdayMargin;
    
    // Number of transactions (unique receipt IDs)
    const uniqueReceipts = new Set(todaySales.map(s => s.receipt_id?.split('-')[0]));
    const todayTransactions = uniqueReceipts.size;
    
    const yesterdayUniqueReceipts = new Set(yesterdaySales.map(s => s.receipt_id?.split('-')[0]));
    const yesterdayTransactions = yesterdayUniqueReceipts.size;
    
    const transactionChange = yesterdayTransactions > 0 
      ? ((todayTransactions - yesterdayTransactions) / yesterdayTransactions) * 100 
      : 0;
    
    // Average basket value
    const avgBasket = todayTransactions > 0 
      ? todayRevenue / todayTransactions 
      : 0;
    
    const yesterdayAvgBasket = yesterdayTransactions > 0 
      ? yesterdayRevenue / yesterdayTransactions 
      : 0;
    
    const basketChange = yesterdayAvgBasket > 0 
      ? ((avgBasket - yesterdayAvgBasket) / yesterdayAvgBasket) * 100 
      : 0;
    
    // Set a reasonable daily target (can be made configurable later)
    const dailyTarget = 150000; // Default target
    const revenueProgress = dailyTarget > 0 
      ? Math.min(100, (todayRevenue / dailyTarget) * 100) 
      : 0;
    
    const marginTarget = 35; // Target 35% margin
    const marginProgress = Math.min(100, (grossMargin / marginTarget) * 100);

    return [
      {
        title: "Today's Revenue",
        value: formatPrice(todayRevenue),
        change: Math.round(revenueChange * 10) / 10,
        target: formatPrice(dailyTarget),
        progress: Math.round(revenueProgress),
        icon: <DollarSign className="h-5 w-5" />,
        variant: 'success' as const,
      },
      {
        title: 'Gross Margin',
        value: `${grossMargin.toFixed(1)}%`,
        change: Math.round(marginChange * 10) / 10,
        target: `${marginTarget}%`,
        progress: Math.round(marginProgress),
        icon: <TrendingUp className="h-5 w-5" />,
        variant: 'primary' as const,
      },
      {
        title: 'Transactions',
        value: todayTransactions.toString(),
        change: Math.round(transactionChange * 10) / 10,
        icon: <ShoppingBag className="h-5 w-5" />,
        variant: 'secondary' as const,
      },
      {
        title: 'Avg. Basket',
        value: formatPrice(avgBasket),
        change: Math.round(basketChange * 10) / 10,
        icon: <Target className="h-5 w-5" />,
        variant: basketChange >= 0 ? 'success' as const : 'warning' as const,
      },
    ];
  }, [sales, medications, formatPrice]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-secondary">
            <BarChart3 className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display">Business Performance</h2>
            <p className="text-sm text-muted-foreground">Real-time KPIs and targets</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-success/10 text-success border-success/30">
          <span className="w-2 h-2 rounded-full bg-success mr-2 animate-pulse" />
          Live
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="metric-card group">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div 
                  className={`p-2.5 rounded-xl ${
                    kpi.variant === 'success'
                      ? 'bg-success/20 text-success'
                      : kpi.variant === 'warning'
                      ? 'bg-warning/20 text-warning'
                      : kpi.variant === 'primary'
                      ? 'bg-primary/20 text-primary'
                      : 'bg-secondary/20 text-secondary'
                  }`}
                >
                  {kpi.icon}
                </div>
                <div 
                  className={`flex items-center gap-1 text-xs font-medium ${
                    kpi.change >= 0 ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {kpi.change >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(kpi.change)}%
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{kpi.title}</p>
                <p className="text-xl font-bold tabular-nums">{kpi.value}</p>
              </div>
              
              {kpi.progress !== undefined && (
                <div className="mt-3 space-y-1">
                  <Progress value={kpi.progress} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    Target: {kpi.target}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
