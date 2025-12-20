import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { 
  Search, 
  Calendar, 
  Download, 
  Receipt, 
  TrendingUp,
  User,
  Pill,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface SaleWithMedication {
  id: string;
  medication_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  customer_name: string | null;
  sale_date: string;
  created_at: string;
  medications: {
    name: string;
    category: string;
  } | null;
}

const SalesHistory = () => {
  const { formatPrice } = useCurrency();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch sales with medication details
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales-history', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('sales')
        .select(`
          id,
          medication_id,
          quantity,
          unit_price,
          total_price,
          customer_name,
          sale_date,
          created_at,
          medications (
            name,
            category
          )
        `)
        .order('sale_date', { ascending: false });

      if (dateRange.from) {
        query = query.gte('sale_date', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte('sale_date', dateRange.to.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SaleWithMedication[];
    },
  });

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set(sales.map(s => s.medications?.category).filter(Boolean));
    return Array.from(cats);
  }, [sales]);

  // Filter and sort sales
  const filteredSales = useMemo(() => {
    let result = [...sales];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(sale => 
        sale.medications?.name.toLowerCase().includes(query) ||
        sale.customer_name?.toLowerCase().includes(query) ||
        sale.id.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(sale => sale.medications?.category === selectedCategory);
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.sale_date).getTime();
      const dateB = new Date(b.sale_date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [sales, searchQuery, selectedCategory, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Summary stats
  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, s) => sum + Number(s.total_price), 0);
    const totalItems = filteredSales.reduce((sum, s) => sum + s.quantity, 0);
    const avgOrderValue = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;
    
    return { totalRevenue, totalItems, avgOrderValue, totalOrders: filteredSales.length };
  }, [filteredSales]);

  // Quick date range presets
  const setDatePreset = (preset: 'today' | 'week' | 'month' | '3months') => {
    const today = new Date();
    switch (preset) {
      case 'today':
        setDateRange({ from: today, to: today });
        break;
      case 'week':
        setDateRange({ from: new Date(today.setDate(today.getDate() - 7)), to: new Date() });
        break;
      case 'month':
        setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
        break;
      case '3months':
        setDateRange({ from: startOfMonth(subMonths(new Date(), 2)), to: endOfMonth(new Date()) });
        break;
    }
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Transaction ID', 'Medication', 'Category', 'Quantity', 'Unit Price', 'Total', 'Customer'];
    const rows = filteredSales.map(sale => [
      format(parseISO(sale.sale_date), 'yyyy-MM-dd HH:mm'),
      sale.id.slice(0, 8),
      sale.medications?.name || 'Unknown',
      sale.medications?.category || 'Unknown',
      sale.quantity,
      sale.unit_price,
      sale.total_price,
      sale.customer_name || 'Walk-in'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-gradient">Sales History</h1>
            <p className="text-muted-foreground mt-1">Track and analyze your pharmacy transactions</p>
          </div>
          <Button onClick={exportToCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold text-primary">{formatPrice(stats.totalRevenue)}</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/10">
                <Receipt className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-xl font-bold">{stats.totalOrders}</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Pill className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Items Sold</p>
                <p className="text-xl font-bold">{stats.totalItems}</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <User className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <p className="text-xl font-bold">{formatPrice(stats.avgOrderValue)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card p-4 rounded-xl mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by medication, customer, or ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>

            {/* Date Range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {dateRange.from && dateRange.to
                    ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`
                    : 'Select date range'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-2 border-b flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setDatePreset('today')}>Today</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDatePreset('week')}>Week</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDatePreset('month')}>Month</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDatePreset('3months')}>3 Months</Button>
                </div>
                <CalendarComponent
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    setDateRange({ from: range?.from, to: range?.to });
                    setCurrentPage(1);
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Sales Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead>Date & Time</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Medication</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Customer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                      Loading sales...
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No sales found for the selected filters
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSales.map((sale) => (
                  <TableRow key={sale.id} className="border-border/50">
                    <TableCell className="font-medium">
                      {format(parseISO(sale.sale_date), 'MMM d, yyyy')}
                      <span className="text-muted-foreground text-xs block">
                        {format(parseISO(sale.sale_date), 'h:mm a')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        #{sale.id.slice(0, 8)}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">{sale.medications?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {sale.medications?.category || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{sale.quantity}</TableCell>
                    <TableCell className="text-right">{formatPrice(sale.unit_price)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatPrice(sale.total_price)}
                    </TableCell>
                    <TableCell>
                      {sale.customer_name || <span className="text-muted-foreground">Walk-in</span>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/50">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredSales.length)} of {filteredSales.length} results
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SalesHistory;
