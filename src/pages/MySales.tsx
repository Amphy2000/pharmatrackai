import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useSales } from '@/hooks/useSales';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  ArrowLeft,
  Loader2,
  Receipt,
  Package,
  Calendar,
  Download
} from 'lucide-react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MySales = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { pharmacy, isLoading: pharmacyLoading } = usePharmacy();
  const { sales, isLoading: salesLoading } = useSales();
  const [dateFilter, setDateFilter] = useState<string>('today');

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

  // Filter sales by current user
  const mySales = sales?.filter(s => s.sold_by === user.id) || [];

  // Apply date filter
  const now = new Date();
  const filteredSales = mySales.filter(sale => {
    const saleDate = new Date(sale.sale_date);
    switch (dateFilter) {
      case 'today':
        return saleDate >= startOfDay(now) && saleDate <= endOfDay(now);
      case 'week':
        return saleDate >= subDays(now, 7);
      case 'month':
        return saleDate >= subDays(now, 30);
      case 'all':
      default:
        return true;
    }
  });

  // Calculate stats (without showing prices)
  const totalTransactions = filteredSales.length;
  const totalItemsSold = filteredSales.reduce((sum, s) => sum + s.quantity, 0);
  const uniqueCustomers = new Set(filteredSales.filter(s => s.customer_name).map(s => s.customer_name)).size;

  const handleExportCSV = () => {
    const csvContent = [
      ['Date', 'Time', 'Item', 'Quantity', 'Customer'].join(','),
      ...filteredSales.map(sale => [
        format(new Date(sale.sale_date), 'yyyy-MM-dd'),
        format(new Date(sale.sale_date), 'HH:mm'),
        sale.medication?.name || 'Unknown',
        sale.quantity,
        sale.customer_name || 'Walk-in'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-sales-${format(now, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-[1200px]">
        {/* Header */}
        <motion.section 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-display">My Sales History</h1>
              <p className="text-sm text-muted-foreground">View your transaction history</p>
            </div>
          </div>

          {/* Filters & Export */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-40">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </motion.section>

        {/* Stats Cards */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-6"
        >
          <Card className="glass-card border-border/50">
            <CardContent className="pt-4 pb-4 text-center">
              <Receipt className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{totalTransactions}</p>
              <p className="text-xs text-muted-foreground">Transactions</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/50">
            <CardContent className="pt-4 pb-4 text-center">
              <Package className="h-6 w-6 mx-auto mb-2 text-success" />
              <p className="text-2xl font-bold">{totalItemsSold}</p>
              <p className="text-xs text-muted-foreground">Items Sold</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/50">
            <CardContent className="pt-4 pb-4 text-center">
              <Receipt className="h-6 w-6 mx-auto mb-2 text-warning" />
              <p className="text-2xl font-bold">{uniqueCustomers}</p>
              <p className="text-xs text-muted-foreground">Customers</p>
            </CardContent>
          </Card>
        </motion.section>

        {/* Sales Table */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="font-display">Transaction History</CardTitle>
              <CardDescription>
                {dateFilter === 'today' ? "Today's" : dateFilter === 'week' ? 'Last 7 days' : dateFilter === 'month' ? 'Last 30 days' : 'All'} transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {salesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredSales.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No transactions found</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead>Customer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="whitespace-nowrap">
                            <div>
                              <p className="font-medium text-sm">{format(new Date(sale.sale_date), 'MMM d, yyyy')}</p>
                              <p className="text-xs text-muted-foreground">{format(new Date(sale.sale_date), 'h:mm a')}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Package className="h-4 w-4 text-primary" />
                              </div>
                              <span className="font-medium text-sm">{sale.medication?.name || 'Unknown Item'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full bg-muted text-xs font-medium">
                              {sale.quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {sale.customer_name || 'Walk-in'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.section>
      </main>
    </div>
  );
};

export default MySales;
