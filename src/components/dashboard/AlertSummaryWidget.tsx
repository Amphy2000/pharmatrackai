import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Package, Calendar, ArrowRight, Bell, TrendingDown, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAlertEngine } from '@/hooks/useAlertEngine';
import { useDbNotifications } from '@/hooks/useDbNotifications';
import { useCurrency } from '@/contexts/CurrencyContext';

export const AlertSummaryWidget = () => {
  const { alertCounts, alerts } = useAlertEngine();
  const { unreadCount } = useDbNotifications();
  const { formatPrice } = useCurrency();

  // Calculate total value at risk from expiry alerts
  const totalValueAtRisk = alerts
    .filter(a => a.type === 'expiry')
    .reduce((sum, a) => sum + (a.valueAtRisk || 0), 0);

  const hasAlerts = alertCounts.total > 0;
  const hasCritical = alertCounts.high > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className={`overflow-hidden ${hasCritical ? 'border-destructive/50 bg-destructive/5' : hasAlerts ? 'border-warning/50 bg-warning/5' : 'border-success/50 bg-success/5'}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${hasCritical ? 'bg-destructive/20' : hasAlerts ? 'bg-warning/20' : 'bg-success/20'}`}>
                <Bell className={`h-5 w-5 ${hasCritical ? 'text-destructive' : hasAlerts ? 'text-warning' : 'text-success'}`} />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-sm flex items-center gap-2">
                  Pending Alerts
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </p>
                
                {hasAlerts ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-4 text-xs">
                      {alertCounts.expiry > 0 && (
                        <span className="flex items-center gap-1 text-warning">
                          <Calendar className="h-3.5 w-3.5" />
                          <span className="font-medium">{alertCounts.expiry}</span> Expiring
                        </span>
                      )}
                      {alertCounts.lowStock > 0 && (
                        <span className="flex items-center gap-1 text-destructive">
                          <TrendingDown className="h-3.5 w-3.5" />
                          <span className="font-medium">{alertCounts.lowStock}</span> Low Stock
                        </span>
                      )}
                    </div>
                    
                    {totalValueAtRisk > 0 && (
                      <div className="flex items-center gap-1.5 text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-md w-fit">
                        <DollarSign className="h-3.5 w-3.5" />
                        <span className="font-semibold">Value at Risk: {formatPrice(totalValueAtRisk)}</span>
                      </div>
                    )}

                    {hasCritical && (
                      <p className="text-xs text-destructive font-medium flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {alertCounts.high} urgent items need attention!
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-success flex items-center gap-1">
                    All clear! ✓ No pending alerts
                  </span>
                )}
              </div>
            </div>
            
            {hasAlerts && (
              <Link to="/notifications">
                <Button size="sm" variant="ghost" className="gap-1 text-xs shrink-0">
                  View All
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
