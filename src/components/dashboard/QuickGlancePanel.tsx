import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ShoppingBag, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useBranchInventory } from '@/hooks/useBranchInventory';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useBranchContext } from '@/contexts/BranchContext';
import { isBefore, parseISO, startOfDay } from 'date-fns';

export const QuickGlancePanel = () => {
  const { formatPrice } = useCurrency();
  const { pharmacyId } = usePharmacy();
  const { currentBranchId } = useBranchContext();
  const { medications } = useBranchInventory();

  // Fetch today's sales (branch-scoped when a branch is selected)
  const { data: todaySales } = useQuery({
    queryKey: ['today-sales-count', pharmacyId, currentBranchId],
    queryFn: async () => {
      if (!pharmacyId) return { totalItems: 0, totalValue: 0, count: 0 };

      const today = startOfDay(new Date()).toISOString();
      let query = supabase
        .from('sales')
        .select('quantity, total_price')
        .eq('pharmacy_id', pharmacyId)
        .gte('sale_date', today);

      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const totalItems = data?.reduce((sum, s) => sum + s.quantity, 0) || 0;
      const totalValue = data?.reduce((sum, s) => sum + Number(s.total_price), 0) || 0;
      return { totalItems, totalValue, count: data?.length || 0 };
    },
    refetchInterval: 30000,
    enabled: !!pharmacyId,
  });

  const metrics = useMemo(() => {
    if (!medications || medications.length === 0) {
      return { expiredValue: 0, expiredCount: 0, lowStockCount: 0 };
    }

    let expiredValue = 0;
    let expiredCount = 0;
    let lowStockCount = 0;

    medications.forEach((med: any) => {
      const stock = med.branch_stock ?? med.current_stock ?? 0;
      const reorder = med.branch_reorder_level ?? med.reorder_level ?? 0;
      const isExpired = isBefore(parseISO(med.expiry_date), new Date());
      const isLowStock = stock <= reorder && stock > 0;

      if (isExpired && !med.is_shelved) {
        expiredValue += stock * Number(med.unit_price);
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
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Unshelved Expired',
      value: metrics.expiredCount,
      subValue: formatPrice(metrics.expiredValue),
      icon: XCircle,
      gradient: 'from-rose-500 to-pink-500',
    },
    {
      label: 'Low Stock',
      value: metrics.lowStockCount,
      subValue: 'non-expired items',
      icon: AlertTriangle,
      gradient: 'from-amber-500 to-orange-500',
    },
  ];

  return (
    <div className="glass-card rounded-2xl border border-border/50 p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Quick Glance</h3>
            <p className="text-xs text-muted-foreground">Today's snapshot</p>
          </div>
        </div>
        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Live</Badge>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col items-center justify-center text-center p-3 rounded-xl bg-muted/30 border border-border/30"
          >
            <div
              className={`h-9 w-9 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-2 shadow-sm`}
            >
              <stat.icon className="h-4 w-4 text-white" />
            </div>
            <p className="text-2xl font-bold tabular-nums leading-none">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground font-medium mt-1">{stat.label}</p>
            <p className="text-[10px] text-muted-foreground/70 truncate max-w-full">{stat.subValue}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

