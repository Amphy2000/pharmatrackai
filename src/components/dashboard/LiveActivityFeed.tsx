import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useCurrency } from '@/contexts/CurrencyContext';
import { 
  Activity, 
  ShoppingCart, 
  Package, 
  Users, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ArrowUpDown
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'sale' | 'stock_change' | 'staff_action' | 'low_stock' | 'transfer';
  title: string;
  description: string;
  timestamp: Date;
  icon: React.ReactNode;
  variant: 'default' | 'success' | 'warning' | 'danger';
}

export const LiveActivityFeed = () => {
  const { pharmacy } = usePharmacy();
  const { formatPrice } = useCurrency();
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const addActivity = (activity: Omit<ActivityItem, 'id'>) => {
    setActivities(prev => {
      const newActivity = { ...activity, id: `${Date.now()}-${Math.random()}` };
      const updated = [newActivity, ...prev].slice(0, 50); // Keep last 50
      return updated;
    });
  };

  useEffect(() => {
    if (!pharmacy?.id) return;

    // Subscribe to sales
    const salesChannel = supabase
      .channel('live-sales')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales',
          filter: `pharmacy_id=eq.${pharmacy.id}`
        },
        (payload) => {
          const sale = payload.new as any;
          addActivity({
            type: 'sale',
            title: 'New Sale',
            description: `${sale.quantity}x item sold for ${formatPrice(sale.total_price)}${sale.sold_by_name ? ` by ${sale.sold_by_name}` : ''}`,
            timestamp: new Date(sale.sale_date),
            icon: <ShoppingCart className="h-4 w-4" />,
            variant: 'success'
          });
        }
      )
      .subscribe();

    // Subscribe to medication stock changes
    const medicationsChannel = supabase
      .channel('live-medications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'medications',
          filter: `pharmacy_id=eq.${pharmacy.id}`
        },
        (payload) => {
          const med = payload.new as any;
          const oldMed = payload.old as any;
          
          if (med.current_stock !== oldMed.current_stock) {
            const diff = med.current_stock - oldMed.current_stock;
            addActivity({
              type: 'stock_change',
              title: diff > 0 ? 'Stock Added' : 'Stock Reduced',
              description: `${med.name}: ${diff > 0 ? '+' : ''}${diff} units (now ${med.current_stock})`,
              timestamp: new Date(),
              icon: <Package className="h-4 w-4" />,
              variant: diff > 0 ? 'success' : 'default'
            });

            // Check for low stock
            if (med.current_stock <= med.reorder_level && med.current_stock > 0) {
              addActivity({
                type: 'low_stock',
                title: 'Low Stock Alert',
                description: `${med.name} is running low (${med.current_stock} remaining)`,
                timestamp: new Date(),
                icon: <AlertTriangle className="h-4 w-4" />,
                variant: 'warning'
              });
            }
          }
        }
      )
      .subscribe();

    // Subscribe to staff shifts
    const shiftsChannel = supabase
      .channel('live-shifts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_shifts',
          filter: `pharmacy_id=eq.${pharmacy.id}`
        },
        (payload) => {
          const shift = payload.new as any;
          if (payload.eventType === 'INSERT') {
            addActivity({
              type: 'staff_action',
              title: 'Staff Clocked In',
              description: 'A team member started their shift',
              timestamp: new Date(shift.clock_in),
              icon: <Clock className="h-4 w-4" />,
              variant: 'default'
            });
          } else if (payload.eventType === 'UPDATE' && shift.clock_out) {
            addActivity({
              type: 'staff_action',
              title: 'Staff Clocked Out',
              description: `Shift ended with ${shift.total_transactions || 0} transactions`,
              timestamp: new Date(shift.clock_out),
              icon: <CheckCircle className="h-4 w-4" />,
              variant: 'success'
            });
          }
        }
      )
      .subscribe();

    // Subscribe to stock transfers
    const transfersChannel = supabase
      .channel('live-transfers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_transfers',
          filter: `pharmacy_id=eq.${pharmacy.id}`
        },
        (payload) => {
          const transfer = payload.new as any;
          addActivity({
            type: 'transfer',
            title: `Stock Transfer ${transfer.status === 'completed' ? 'Completed' : 'Initiated'}`,
            description: `${transfer.quantity} units transferred`,
            timestamp: new Date(),
            icon: <ArrowUpDown className="h-4 w-4" />,
            variant: transfer.status === 'completed' ? 'success' : 'default'
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(medicationsChannel);
      supabase.removeChannel(shiftsChannel);
      supabase.removeChannel(transfersChannel);
    };
  }, [pharmacy?.id, formatPrice]);

  const getVariantStyles = (variant: ActivityItem['variant']) => {
    switch (variant) {
      case 'success':
        return 'bg-success/10 text-success border-success/20';
      case 'warning':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'danger':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Card className="glass-card border-border/50 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-primary">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="font-display text-lg">Live Activity</CardTitle>
            <p className="text-xs text-muted-foreground">Real-time updates</p>
          </div>
          <Badge variant="outline" className="ml-auto animate-pulse bg-success/10 text-success border-success/30">
            <span className="h-2 w-2 rounded-full bg-success mr-2 animate-pulse" />
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[300px] pr-4">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Activity className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No activity yet</p>
              <p className="text-xs text-muted-foreground/70">Activity will appear here in real-time</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {activities.map((activity) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className={`flex items-start gap-3 p-3 rounded-lg border ${getVariantStyles(activity.variant)}`}>
                      <div className="flex-shrink-0 mt-0.5">
                        {activity.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.title}</p>
                        <p className="text-xs opacity-80 truncate">{activity.description}</p>
                      </div>
                      <span className="text-[10px] opacity-60 flex-shrink-0">
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
