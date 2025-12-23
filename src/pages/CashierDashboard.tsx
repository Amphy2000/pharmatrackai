import { useNavigate } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useShifts } from '@/hooks/useShifts';
import { useSales } from '@/hooks/useSales';
import { useHeldTransactions } from '@/hooks/useHeldTransactions';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShiftClock } from '@/components/dashboard/ShiftClock';
import { 
  ShoppingCart, 
  Loader2,
  Receipt,
  Clock,
  Package,
  User
} from 'lucide-react';
import { format } from 'date-fns';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.5 } 
  }
};

const CashierDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { pharmacy, isLoading: pharmacyLoading } = usePharmacy();
  const { activeShift } = useShifts();
  const { sales, isLoading: salesLoading } = useSales();
  const { heldTransactions } = useHeldTransactions();

  // Loading state
  if (authLoading || pharmacyLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow-primary">
            <Loader2 className="h-8 w-8 animate-spin text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    navigate('/');
    return null;
  }

  if (!pharmacy) {
    navigate('/onboarding');
    return null;
  }

  // Get today's sales by this user
  const today = new Date().toDateString();
  const todaysSales = sales?.filter(s => 
    new Date(s.sale_date).toDateString() === today && 
    s.sold_by === user.id
  ) || [];

  const todaysTransactionCount = todaysSales.length;
  const todaysItemsSold = todaysSales.reduce((sum, s) => sum + s.quantity, 0);

  // Recent transactions (last 10)
  const recentTransactions = sales
    ?.filter(s => s.sold_by === user.id)
    .slice(0, 10) || [];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-[1200px]">
        {/* Welcome Section */}
        <motion.section 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight mb-1">
                Ready to serve, <span className="text-gradient">{user.user_metadata?.full_name || user.email?.split('@')[0]}</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                {pharmacy.name} • Cashier Station
              </p>
            </div>
            <Button 
              onClick={() => navigate('/checkout')}
              size="lg"
              className="gap-2 bg-gradient-primary hover:opacity-90 shadow-glow-primary btn-glow h-12 px-8"
            >
              <ShoppingCart className="h-5 w-5" />
              Open POS
            </Button>
          </div>
        </motion.section>

        {/* Main Grid */}
        <motion.section 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-6 grid-cols-1 lg:grid-cols-3"
        >
          {/* Left Column - Shift Clock & Quick Stats */}
          <motion.div variants={itemVariants} className="lg:col-span-1 space-y-6">
            <ShiftClock />

            {/* Today's Stats */}
            <Card className="glass-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-display">Today's Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Transactions</p>
                      <p className="text-xl font-bold">{todaysTransactionCount}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/10">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <Package className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Items Sold</p>
                      <p className="text-xl font-bold">{todaysItemsSold}</p>
                    </div>
                  </div>
                </div>
                {heldTransactions.length > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/10">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Held</p>
                        <p className="text-xl font-bold">{heldTransactions.length}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Column - Recent Transactions */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card className="glass-card border-border/50 h-full">
              <CardHeader>
                <CardTitle className="font-display">My Recent Transactions</CardTitle>
                <CardDescription>Your last 10 sales</CardDescription>
              </CardHeader>
              <CardContent>
                {salesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : recentTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No transactions yet today</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate('/checkout')}
                    >
                      Make your first sale
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentTransactions.map((sale) => (
                      <div 
                        key={sale.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Package className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{sale.medication?.name || 'Unknown Item'}</p>
                            <p className="text-xs text-muted-foreground">
                              {sale.customer_name || 'Walk-in'} • Qty: {sale.quantity}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(sale.sale_date), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.section>

        {/* Quick Actions */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="h-16 flex flex-col items-center justify-center gap-1.5 hover:bg-primary/5 hover:border-primary/30 transition-all group"
                  onClick={() => navigate('/checkout')}
                >
                  <ShoppingCart className="h-5 w-5 group-hover:text-primary transition-colors" />
                  <span className="text-xs">New Sale</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 flex flex-col items-center justify-center gap-1.5 hover:bg-primary/5 hover:border-primary/30 transition-all group"
                  onClick={() => navigate('/my-sales')}
                >
                  <Receipt className="h-5 w-5 group-hover:text-primary transition-colors" />
                  <span className="text-xs">My Sales</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 flex flex-col items-center justify-center gap-1.5 hover:bg-primary/5 hover:border-primary/30 transition-all group"
                  onClick={() => navigate('/profile')}
                >
                  <User className="h-5 w-5 group-hover:text-primary transition-colors" />
                  <span className="text-xs">My Profile</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </main>
    </div>
  );
};

export default CashierDashboard;
