import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShoppingCart, Package, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePharmacy } from '@/hooks/usePharmacy';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useBranchContext } from '@/contexts/BranchContext';

interface ActivityItem {
  id: string;
  type: 'sale' | 'stock' | 'staff';
  title: string;
  description: string;
  timestamp: Date;
  icon: 'cart' | 'package' | 'clock';
}

export const LiveActivityFeed = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const { pharmacy } = usePharmacy();
  const { formatPrice } = useCurrency();
  const { currentBranchId, isMainBranch } = useBranchContext();

  useEffect(() => {
    if (!pharmacy?.id) return;

    const fetchRecentActivity = async () => {
      let salesQuery = supabase
        .from('sales')
        .select('id, total_price, created_at, sold_by_name')
        .eq('pharmacy_id', pharmacy.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Branch isolation: when a branch is selected, show only that branch's activity.
      if (currentBranchId) {
        salesQuery = salesQuery.eq('branch_id', currentBranchId);
      }

      const { data: salesData } = await salesQuery;

      if (salesData) {
        const saleActivities: ActivityItem[] = salesData.map((sale) => ({
          id: `sale-${sale.id}`,
          type: 'sale',
          title: 'New Sale',
          description: `${formatPrice(sale.total_price)} by ${sale.sold_by_name || 'Staff'}`,
          timestamp: new Date(sale.created_at),
          icon: 'cart',
        }));
        setActivities(saleActivities);
      }
    };

    fetchRecentActivity();

    const salesFilter = currentBranchId
      ? `branch_id=eq.${currentBranchId}`
      : `pharmacy_id=eq.${pharmacy.id}`;

    const channel = supabase
      .channel('live-activity-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales', filter: salesFilter },
        (payload) => {
          const newSale = payload.new as any;
          const newActivity: ActivityItem = {
            id: `sale-${newSale.id}`,
            type: 'sale',
            title: 'New Sale',
            description: `${formatPrice(newSale.total_price)} by ${newSale.sold_by_name || 'Staff'}`,
            timestamp: new Date(newSale.created_at),
            icon: 'cart',
          };
          setActivities((prev) => [newActivity, ...prev.slice(0, 4)]);
        }
      );

    // Stock updates: only subscribe to HQ stock changes on the main branch.
    if (!currentBranchId || isMainBranch) {
      channel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'medications', filter: `pharmacy_id=eq.${pharmacy.id}` },
        (payload) => {
          const med = payload.new as any;
          const newActivity: ActivityItem = {
            id: `stock-${med.id}-${Date.now()}`,
            type: 'stock',
            title: 'Stock Updated',
            description: `${med.name} - ${med.current_stock} units`,
            timestamp: new Date(),
            icon: 'package',
          };
          setActivities((prev) => [newActivity, ...prev.slice(0, 4)]);
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pharmacy?.id, currentBranchId, isMainBranch, formatPrice]);

  const getIcon = (icon: string) => {
    switch (icon) {
      case 'cart':
        return <ShoppingCart className="h-3 w-3" />;
      case 'package':
        return <Package className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const displayedActivities = isExpanded ? activities : activities.slice(0, 3);

  return (
    <div className="glass-card rounded-2xl border border-border/50 p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Live Activity</h3>
            <p className="text-xs text-muted-foreground">Real-time updates</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/20">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] font-medium text-success uppercase tracking-wide">Live</span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <Activity className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Waiting for activity...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2.5">
              {displayedActivities.map((activity) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/30"
                >
                  <div className="h-7 w-7 rounded-lg bg-background flex items-center justify-center text-muted-foreground border border-border/50">
                    {getIcon(activity.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground truncate text-sm font-medium">{activity.description}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: false })}
                  </span>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {activities.length > 3 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-3 h-8 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              Show Less <ChevronUp className="h-3 w-3 ml-1" />
            </>
          ) : (
            <>
              Show More ({activities.length - 3} more) <ChevronDown className="h-3 w-3 ml-1" />
            </>
          )}
        </Button>
      )}
    </div>
  );
};
