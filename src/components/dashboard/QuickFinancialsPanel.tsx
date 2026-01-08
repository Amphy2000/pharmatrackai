import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Calendar, Wallet, ShoppingBag } from 'lucide-react';
import { useSales } from '@/hooks/useSales';
import { useCurrency } from '@/contexts/CurrencyContext';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface FinancialMetric {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  subtitle?: string;
}

export const QuickFinancialsPanel = () => {
  const { sales, isLoading } = useSales();
  const { formatPrice } = useCurrency();

  const financials = useMemo(() => {
    if (!sales || sales.length === 0) {
      return {
        todaySales: 0,
        todayProfit: 0,
        weekRevenue: 0,
        monthRevenue: 0,
        todayOrders: 0,
      };
    }

    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    let todaySales = 0;
    let todayProfit = 0;
    let todayOrders = new Set<string>();
    let weekRevenue = 0;
    let monthRevenue = 0;

    sales.forEach(sale => {
      const saleDate = parseISO(sale.sale_date);
      
      // Today's calculations
      if (saleDate >= dayStart && saleDate <= dayEnd) {
        todaySales += sale.total_price;
        // Estimate profit as 25% margin if cost not available
        const costPrice = sale.unit_price * 0.75;
        todayProfit += sale.total_price - (costPrice * sale.quantity);
        if (sale.receipt_id) todayOrders.add(sale.receipt_id);
      }
      
      // Week's calculations
      if (saleDate >= weekStart && saleDate <= weekEnd) {
        weekRevenue += sale.total_price;
      }
      
      // Month's calculations
      if (saleDate >= monthStart && saleDate <= monthEnd) {
        monthRevenue += sale.total_price;
      }
    });

    return {
      todaySales,
      todayProfit: Math.max(0, todayProfit),
      weekRevenue,
      monthRevenue,
      todayOrders: todayOrders.size,
    };
  }, [sales]);

  const metrics: FinancialMetric[] = [
    {
      label: "Today's Revenue",
      value: financials.todaySales,
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      subtitle: `${financials.todayOrders} orders`,
    },
    {
      label: "Today's Profit",
      value: financials.todayProfit,
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      subtitle: 'Est. margin',
    },
    {
      label: "This Week",
      value: financials.weekRevenue,
      icon: Calendar,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: "This Month",
      value: financials.monthRevenue,
      icon: Wallet,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="glass-card p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="glass-card p-4 sm:p-6 rounded-2xl"
    >
      <div className="flex items-center gap-2 mb-4">
        <ShoppingBag className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold font-display">Your Money</h3>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            className={cn(
              'p-4 rounded-xl border border-border/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-md',
              metric.bgColor
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <metric.icon className={cn('h-4 w-4', metric.color)} />
              <span className="text-xs text-muted-foreground truncate">{metric.label}</span>
            </div>
            <p className={cn('text-xl sm:text-2xl font-bold font-display truncate', metric.color)}>
              {formatPrice(metric.value)}
            </p>
            {metric.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{metric.subtitle}</p>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
