import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Package, AlertTriangle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBranchInventory } from '@/hooks/useBranchInventory';
import { useDbNotifications } from '@/hooks/useDbNotifications';

export const SimpleDashboard = () => {
  const { getMetrics } = useBranchInventory();
  const { unreadCount } = useDbNotifications();
  const metrics = getMetrics();
  
  const hasCriticalAlerts = metrics.expired > 0 || metrics.lowStock > 5;
  const totalAlerts = metrics.expired + metrics.lowStock + metrics.expiringSoon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Main Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/checkout" className="block">
          <Card className="h-40 group cursor-pointer border-primary/30 hover:border-primary/50 hover:shadow-glow-primary transition-all duration-300 bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="h-full flex flex-col items-center justify-center gap-4 p-6">
              <div className="p-4 rounded-2xl bg-gradient-primary shadow-glow-primary group-hover:scale-110 transition-transform">
                <ShoppingCart className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold font-display">Open POS</h2>
                <p className="text-sm text-muted-foreground">Process customer sales</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/inventory" className="block">
          <Card className="h-40 group cursor-pointer border-secondary/30 hover:border-secondary/50 transition-all duration-300 bg-gradient-to-br from-secondary/10 to-secondary/5">
            <CardContent className="h-full flex flex-col items-center justify-center gap-4 p-6">
              <div className="p-4 rounded-2xl bg-secondary/20 group-hover:scale-110 transition-transform">
                <Package className="h-8 w-8 text-secondary" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold font-display">Manage Stock</h2>
                <p className="text-sm text-muted-foreground">Add or update inventory</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Alert Card - Only shows if there are alerts */}
      {totalAlerts > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className={`${hasCriticalAlerts ? 'border-destructive/50 bg-destructive/5' : 'border-warning/50 bg-warning/5'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${hasCriticalAlerts ? 'bg-destructive/20' : 'bg-warning/20'}`}>
                    <AlertTriangle className={`h-5 w-5 ${hasCriticalAlerts ? 'text-destructive' : 'text-warning'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">Attention Needed</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {metrics.expired > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {metrics.expired} expired
                        </Badge>
                      )}
                      {metrics.lowStock > 0 && (
                        <Badge variant="outline" className="text-xs border-warning text-warning">
                          {metrics.lowStock} low stock
                        </Badge>
                      )}
                      {metrics.expiringSoon > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {metrics.expiringSoon} expiring soon
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Link to="/notifications">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Bell className="h-4 w-4" />
                    View
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* All Clear Message */}
      {totalAlerts === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-success/50 bg-success/5">
            <CardContent className="p-4 text-center">
              <p className="text-success font-medium">✓ All clear! No urgent alerts.</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};
