import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDemo } from '@/contexts/DemoContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Logo } from '@/components/Logo';
import {
  Package,
  AlertTriangle,
  Clock,
  XCircle,
  ShoppingCart,
  TrendingUp,
  Zap,
  Users,
  Shield,
  Bell,
  DollarSign,
  BarChart3,
  Home,
  Building2,
  ArrowRight,
  Sparkles,
  Brain,
  FileUp,
  Check,
  LogIn,
  Truck,
  PieChart,
  Activity,
  Loader2,
} from 'lucide-react';

const DemoDashboard = () => {
  const navigate = useNavigate();
  const {
    isDemoMode,
    disableDemoMode,
    demoPharmacy,
    demoMedications,
    demoSales,
    demoCustomers,
    demoSuppliers,
    demoStaff,
    demoBranches,
    demoMetrics,
    demoUser,
  } = useDemo();

  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  // If not in demo mode, redirect to landing
  if (!isDemoMode) {
    navigate('/');
    return null;
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleExitDemo = () => {
    disableDemoMode();
    navigate('/');
  };

  const handleStartTrial = () => {
    disableDemoMode();
    navigate('/auth?tab=signup');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="sm" linkTo="/" />
              <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
                <Sparkles className="h-3 w-3 mr-1" />
                Demo Mode
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleExitDemo}>
                Exit Demo
              </Button>
              <Button 
                size="sm" 
                className="bg-gradient-primary hover:opacity-90 shadow-glow-primary"
                onClick={handleStartTrial}
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Demo Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-b border-border/40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Welcome to PharmaTrack Demo</p>
                <p className="text-sm text-muted-foreground">Explore all features with sample pharmacy data</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-background">
                <Building2 className="h-3 w-3 mr-1" />
                3 Branches
              </Badge>
              <Badge variant="outline" className="bg-background">
                <Package className="h-3 w-3 mr-1" />
                {demoMedications.length} Products
              </Badge>
              <Badge variant="outline" className="bg-background">
                <Users className="h-3 w-3 mr-1" />
                {demoStaff.length} Staff
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-[1600px]">
        {/* Welcome Section */}
        <motion.section 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold font-display tracking-tight mb-2">
                Welcome, <span className="text-gradient">{demoUser.full_name}</span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Here's what's happening at <span className="text-foreground font-medium">{demoPharmacy.name}</span> today.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted border border-border">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Main Branch (VI)</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary font-medium">AI Active</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Dashboard Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6 bg-muted/50 p-1 flex-wrap h-auto">
            <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-background">
              <Home className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2 data-[state=active]:bg-background">
              <Package className="h-4 w-4" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="sales" className="gap-2 data-[state=active]:bg-background">
              <TrendingUp className="h-4 w-4" />
              Sales
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-2 data-[state=active]:bg-background">
              <Users className="h-4 w-4" />
              Staff
            </TabsTrigger>
            <TabsTrigger value="ai-features" className="gap-2 data-[state=active]:bg-background">
              <Brain className="h-4 w-4" />
              AI Features
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Giant Quick Actions */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <Button
                  className="h-32 sm:h-40 flex flex-col items-center justify-center gap-4 bg-gradient-primary hover:opacity-90 shadow-glow-primary btn-glow text-lg sm:text-xl font-semibold"
                  onClick={() => setActiveFeature('pos')}
                >
                  <ShoppingCart className="h-10 w-10 sm:h-14 sm:w-14" />
                  Open Point of Sale
                </Button>
                <Button
                  variant="outline"
                  className="h-32 sm:h-40 flex flex-col items-center justify-center gap-4 border-2 border-primary/30 hover:bg-primary/5 hover:border-primary/50 text-lg sm:text-xl font-semibold group"
                  onClick={() => setActiveFeature('inventory')}
                >
                  <Package className="h-10 w-10 sm:h-14 sm:w-14 text-primary group-hover:scale-110 transition-transform" />
                  Manage Stock
                </Button>
              </div>
            </motion.section>

            {/* Key Metrics */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <Card className="glass-card border-border/50 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
                  <CardContent className="pt-6 relative">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                        <DollarSign className="h-7 w-7 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Today's Sales</p>
                        <p className="text-2xl sm:text-3xl font-bold font-display">{formatPrice(demoMetrics.todaySales)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-border/50 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                  <CardContent className="pt-6 relative">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                        <Shield className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Protected Value</p>
                        <p className="text-2xl sm:text-3xl font-bold font-display">{formatPrice(demoMetrics.protectedValue)}</p>
                        <p className="text-xs text-muted-foreground">Expiry & theft prevention</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-border/50 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
                  <CardContent className="pt-6 relative">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                        <Package className="h-7 w-7 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Total Products</p>
                        <p className="text-2xl sm:text-3xl font-bold font-display">{demoMedications.length}</p>
                        <p className="text-xs text-muted-foreground">{demoMetrics.totalStock} units in stock</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-border/50 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
                  <CardContent className="pt-6 relative">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                        <BarChart3 className="h-7 w-7 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Month Sales</p>
                        <p className="text-2xl sm:text-3xl font-bold font-display">{formatPrice(demoMetrics.monthSales)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.section>

            {/* Alert Summary */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    <CardTitle>Alert Summary</CardTitle>
                  </div>
                  <CardDescription>Items requiring your attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                      <XCircle className="h-8 w-8 text-destructive" />
                      <div>
                        <p className="text-2xl font-bold">{demoMetrics.expired}</p>
                        <p className="text-sm text-muted-foreground">Expired Items</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-warning/10 border border-warning/20">
                      <Clock className="h-8 w-8 text-warning" />
                      <div>
                        <p className="text-2xl font-bold">{demoMetrics.expiringSoon}</p>
                        <p className="text-sm text-muted-foreground">Expiring Soon</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                      <AlertTriangle className="h-8 w-8 text-orange-500" />
                      <div>
                        <p className="text-2xl font-bold">{demoMetrics.lowStock}</p>
                        <p className="text-sm text-muted-foreground">Low Stock</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.section>

            {/* Branch Performance */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle>Branch Performance</CardTitle>
                  </div>
                  <CardDescription>Multi-branch management overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {demoBranches.map((branch, index) => (
                      <div key={branch.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${branch.is_main_branch ? 'bg-primary/20' : 'bg-muted'}`}>
                            <Building2 className={`h-5 w-5 ${branch.is_main_branch ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <p className="font-medium">{branch.name}</p>
                            <p className="text-sm text-muted-foreground">{branch.address}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatPrice(Math.floor(demoMetrics.monthSales / (index + 1)))}</p>
                          <p className="text-sm text-muted-foreground">This month</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <CardTitle>Inventory Management</CardTitle>
                  </div>
                  <Badge variant="outline">
                    {demoMedications.length} Products
                  </Badge>
                </div>
                <CardDescription>Complete inventory with AI-powered insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {demoMedications.map((med) => {
                        const expiryDate = new Date(med.expiry_date);
                        const daysUntil = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        let status = 'good';
                        if (daysUntil < 0) status = 'expired';
                        else if (daysUntil <= 30) status = 'expiring';
                        else if (med.current_stock <= med.reorder_level) status = 'low';

                        return (
                          <TableRow key={med.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{med.name}</p>
                                <p className="text-xs text-muted-foreground">{med.batch_number}</p>
                              </div>
                            </TableCell>
                            <TableCell>{med.category}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span>{med.current_stock}</span>
                                {med.current_stock <= med.reorder_level && (
                                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{formatPrice(med.selling_price)}</TableCell>
                            <TableCell>{expiryDate.toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge
                                variant={status === 'good' ? 'default' : status === 'expired' ? 'destructive' : 'secondary'}
                                className={
                                  status === 'good' ? 'bg-success/20 text-success' :
                                  status === 'expiring' ? 'bg-warning/20 text-warning' :
                                  status === 'low' ? 'bg-orange-500/20 text-orange-500' : ''
                                }
                              >
                                {status === 'good' ? 'In Stock' : 
                                 status === 'expired' ? 'Expired' : 
                                 status === 'expiring' ? 'Expiring Soon' : 'Low Stock'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Today</p>
                    <p className="text-3xl font-bold text-gradient">{formatPrice(demoMetrics.todaySales)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">This Week</p>
                    <p className="text-3xl font-bold text-gradient">{formatPrice(demoMetrics.weekSales)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">This Month</p>
                    <p className="text-3xl font-bold text-gradient">{formatPrice(demoMetrics.monthSales)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-card border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <CardTitle>Recent Sales</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Staff</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {demoSales.slice(0, 10).map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">{sale.medication_name}</TableCell>
                          <TableCell>{sale.customer_name}</TableCell>
                          <TableCell className="text-right">{sale.quantity}</TableCell>
                          <TableCell className="text-right">{formatPrice(sale.total_price)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{sale.payment_method}</Badge>
                          </TableCell>
                          <TableCell>{sale.sold_by_name}</TableCell>
                          <TableCell>{new Date(sale.sale_date).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff" className="space-y-6">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle>Staff Performance</CardTitle>
                </div>
                <CardDescription>Track staff sales and accountability</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {demoStaff.map((staff) => (
                    <div key={staff.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold ${
                          staff.role === 'owner' ? 'bg-primary/20 text-primary' :
                          staff.role === 'manager' ? 'bg-blue-500/20 text-blue-500' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {staff.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{staff.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{staff.role} • {staff.branch}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatPrice(staff.total_sales)}</p>
                        <p className="text-sm text-muted-foreground">{staff.transactions} transactions</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Features Tab */}
          <TabsContent value="ai-features" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* AI Invoice Scanner */}
              <Card className="glass-card border-border/50 overflow-hidden group hover:border-primary/30 transition-all cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <FileUp className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>AI Invoice Scanner</CardTitle>
                      <CardDescription>Snap & stock 50+ items in 10 seconds</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                    <Check className="h-5 w-5 text-success" />
                    <div>
                      <p className="font-medium">12 Invoices Scanned</p>
                      <p className="text-sm text-muted-foreground">2.5 hours saved this month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Expiry Discount Engine */}
              <Card className="glass-card border-border/50 overflow-hidden group hover:border-primary/30 transition-all cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-warning/20 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-warning" />
                    </div>
                    <div>
                      <CardTitle>Expiry Discount Engine</CardTitle>
                      <CardDescription>AI-powered discount recommendations</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                    <Shield className="h-5 w-5 text-success" />
                    <div>
                      <p className="font-medium">{formatPrice(demoMetrics.protectedValue)} Protected</p>
                      <p className="text-sm text-muted-foreground">From expiry waste</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Demand Forecasting */}
              <Card className="glass-card border-border/50 overflow-hidden group hover:border-primary/30 transition-all cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <Brain className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle>Demand Forecasting</CardTitle>
                      <CardDescription>Predict stock needs before stockout</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">92% Accuracy</p>
                      <p className="text-sm text-muted-foreground">Last 30 days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Drug Interaction Checker */}
              <Card className="glass-card border-border/50 overflow-hidden group hover:border-primary/30 transition-all cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-destructive/20 flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <CardTitle>Drug Interaction Alerts</CardTitle>
                      <CardDescription>Patient safety at checkout</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                    <Shield className="h-5 w-5 text-success" />
                    <div>
                      <p className="font-medium">24 Interactions Flagged</p>
                      <p className="text-sm text-muted-foreground">This month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* NAFDAC Compliance */}
            <Card className="glass-card border-border/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-success/20 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <CardTitle>NAFDAC Compliance Dashboard</CardTitle>
                    <CardDescription>Audit-ready compliance reports at your fingertips</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-center">
                    <p className="text-3xl font-bold text-success">100%</p>
                    <p className="text-sm text-muted-foreground">Products Registered</p>
                  </div>
                  <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-center">
                    <p className="text-3xl font-bold text-success">{demoMedications.length}</p>
                    <p className="text-sm text-muted-foreground">Batch Numbers Tracked</p>
                  </div>
                  <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-center">
                    <p className="text-3xl font-bold text-success">1</p>
                    <p className="text-sm text-muted-foreground">Controlled Drug Logged</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CTA Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <Card className="bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 border-primary/30">
            <CardContent className="py-8">
              <div className="text-center max-w-2xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-bold font-display mb-4">
                  Ready to Transform Your Pharmacy?
                </h2>
                <p className="text-muted-foreground mb-6">
                  Start your 7-day free trial and experience the power of AI-driven pharmacy management.
                  No credit card required.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button 
                    size="lg" 
                    className="bg-gradient-primary hover:opacity-90 shadow-glow-primary text-lg px-8"
                    onClick={handleStartTrial}
                  >
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button variant="outline" size="lg" onClick={handleExitDemo}>
                    Exit Demo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </main>
    </div>
  );
};

export default DemoDashboard;
