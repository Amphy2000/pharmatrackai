import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Calendar, ArrowRight, Bell, TrendingDown, DollarSign, Building2, XCircle, Clock } from 'lucide-react';
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDbNotifications } from '@/hooks/useDbNotifications';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useBranchContext } from '@/contexts/BranchContext';
import { useBranchInventory } from '@/hooks/useBranchInventory';

export const BranchAlertSummaryWidget = () => {
  const { unreadCount } = useDbNotifications();
  const { formatPrice } = useCurrency();
  const { currentBranchName } = useBranchContext();
  const { medications, getMetrics } = useBranchInventory();

  const metrics = getMetrics();

  const hasAlerts = (metrics.expired || 0) + (metrics.lowStock || 0) + (metrics.expiringSoon || 0) > 0;
  const hasCritical = (metrics.expired || 0) > 0;

  const totalValueAtRisk = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    return (medications || []).reduce((sum, med) => {
      const stock = (med as any).branch_stock ?? 0;
      if (stock <= 0) return sum;

      const expiry = new Date((med as any).expiry_date);
      if (expiry <= thirtyDaysFromNow) {
        const price = (med as any).selling_price || (med as any).unit_price;
        return sum + stock * price;
      }

      return sum;
    }, 0);
  }, [medications]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card
        className={`overflow-hidden ${
          hasCritical
            ? 'border-destructive/50 bg-destructive/5'
            : hasAlerts
              ? 'border-warning/50 bg-warning/5'
              : 'border-success/50 bg-success/5'
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg ${
                  hasCritical ? 'bg-destructive/20' : hasAlerts ? 'bg-warning/20' : 'bg-success/20'
                }`}
              >
                <Bell
                  className={`h-5 w-5 ${
                    hasCritical ? 'text-destructive' : hasAlerts ? 'text-warning' : 'text-success'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-sm">Branch Alerts</p>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Building2 className="h-2.5 w-2.5" />
                    {currentBranchName || 'Main Branch'}
                  </Badge>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {hasAlerts ? (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      {(metrics.expired || 0) > 0 && (
                        <span className="flex items-center gap-1 text-destructive">
                          <XCircle className="h-3.5 w-3.5" />
                          <span className="font-medium">{metrics.expired}</span> Expired
                        </span>
                      )}
                      {(metrics.expiringSoon || 0) > 0 && (
                        <span className="flex items-center gap-1 text-warning">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="font-medium">{metrics.expiringSoon}</span> Expiring Soon
                        </span>
                      )}
                      {(metrics.lowStock || 0) > 0 && (
                        <span className="flex items-center gap-1 text-destructive">
                          <TrendingDown className="h-3.5 w-3.5" />
                          <span className="font-medium">{metrics.lowStock}</span> Low Stock
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
                        Urgent items need attention.
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-success flex items-center gap-1">All clear! ✓ No pending alerts</span>
                )}
              </div>
            </div>

            {hasAlerts && (
              <Link to="/inventory">
                <Button size="sm" variant="ghost" className="gap-1 text-xs shrink-0">
                  View Stock
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
