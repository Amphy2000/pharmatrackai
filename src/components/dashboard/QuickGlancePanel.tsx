import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ShoppingBag, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useMedications } from '@/hooks/useMedications';
import { isBefore, parseISO, startOfDay } from 'date-fns';

export const QuickGlancePanel = () => {
  const { formatPrice } = useCurrency();
  const { medications } = useMedications();

  // Fetch today's sales
  const { data: todaySales } = useQuery({
    queryKey: ['today-sales-count'],
    queryFn: async () => {
      const today = startOfDay(new Date()).toISOString();
      const { data, error } = await supabase
        .from('sales')
        .select('quantity, total_price')
        .gte('sale_date', today);
      
      if (error) throw error;
      
      const totalItems = data?.reduce((sum, s) => sum + s.quantity, 0) || 0;
      const totalValue = data?.reduce((sum, s) => sum + Number(s.total_price), 0) || 0;
      return { totalItems, totalValue, count: data?.length || 0 };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate expired stock value and low stock alerts from medications
  const metrics = useMemo(() => {
    if (!medications || medications.length === 0) {
      return { expiredValue: 0, expiredCount: 0, lowStockCount: 0 };
    }

    let expiredValue = 0;
    let expiredCount = 0;
    let lowStockCount = 0;

    medications.forEach((med) => {
      const isExpired = isBefore(parseISO(med.expiry_date), new Date());
      const isLowStock = med.current_stock <= med.reorder_level && med.current_stock > 0;
      
      if (isExpired && !med.is_shelved) {
        // Unshelved expired stock
        expiredValue += med.current_stock * med.unit_price;
        expiredCount++;
      }
      
      if (isLowStock && !isExpired) {
        lowStockCount++;
      }
    });

    return { expiredValue, expiredCount, lowStockCount };
  }, [medications]);

  const stats = [
    {
      label: 'Sold Today',
      value: todaySales?.totalItems || 0,
      subValue: formatPrice(todaySales?.totalValue || 0),
      icon: ShoppingBag,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Unshelved Expired',
      value: metrics.expiredCount,
      subValue: formatPrice(metrics.expiredValue),
      icon: XCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      label: 'Low Stock',
      value: metrics.lowStockCount,
      subValue: 'non-expired items',
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Quick Glance
          <Badge variant="secondary" className="text-[10px] ml-2">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <div className={`inline-flex items-center justify-center h-10 w-10 rounded-xl ${stat.bgColor} mb-2`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
              <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">{stat.subValue}</p>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
