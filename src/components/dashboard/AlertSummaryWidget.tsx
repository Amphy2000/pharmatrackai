import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Package, Calendar, ArrowRight, Bell } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAlertEngine } from '@/hooks/useAlertEngine';

export const AlertSummaryWidget = () => {
  const { alertCounts } = useAlertEngine();

  const hasAlerts = alertCounts.total > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className={`overflow-hidden ${hasAlerts ? 'border-warning/50 bg-warning/5' : 'border-success/50 bg-success/5'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${hasAlerts ? 'bg-warning/20' : 'bg-success/20'}`}>
                <Bell className={`h-5 w-5 ${hasAlerts ? 'text-warning' : 'text-success'}`} />
              </div>
              <div>
                <p className="font-semibold text-sm">Alert Summary</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {alertCounts.expiry > 0 && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-warning" />
                      {alertCounts.expiry} Expiring
                    </span>
                  )}
                  {alertCounts.lowStock > 0 && (
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3 text-destructive" />
                      {alertCounts.lowStock} Low Stock
                    </span>
                  )}
                  {alertCounts.high > 0 && (
                    <span className="flex items-center gap-1 text-destructive font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      {alertCounts.high} Urgent
                    </span>
                  )}
                  {!hasAlerts && (
                    <span className="text-success">All clear! ✓</span>
                  )}
                </div>
              </div>
            </div>
            
            {hasAlerts && (
              <Link to="/notifications">
                <Button size="sm" variant="ghost" className="gap-1 text-xs">
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
