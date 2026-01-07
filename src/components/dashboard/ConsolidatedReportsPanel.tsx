import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBranches } from '@/hooks/useBranches';
import { useSales } from '@/hooks/useSales';
import { useMedications } from '@/hooks/useMedications';
import { useCurrency } from '@/contexts/CurrencyContext';
import { 
  Building2, 
  TrendingUp, 
  Package, 
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Clock
} from 'lucide-react';
import { startOfDay, endOfDay, parseISO, startOfMonth, endOfMonth, subDays, format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { usePharmacy } from '@/hooks/usePharmacy';

export const ConsolidatedReportsPanel = () => {
  const { branches, branchInventory } = useBranches();
  const { sales: allSales } = useSales();
  const { medications } = useMedications();
  const { formatPrice } = useCurrency();
  const { pharmacyId } = usePharmacy();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  // Fetch all sales with branch data for consolidated view
  const { data: branchSales = [] } = useQuery({
    queryKey: ['consolidated-branch-sales', pharmacyId],
    queryFn: async () => {
      if (!pharmacyId) return [];
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          branches (name)
        `)
        .eq('pharmacy_id', pharmacyId)
        .order('sale_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!pharmacyId,
  });

  // Calculate date ranges
  const dateRanges = useMemo(() => {
    const today = new Date();
    return {
      today: { start: startOfDay(today), end: endOfDay(today) },
      week: { start: subDays(startOfDay(today), 7), end: endOfDay(today) },
      month: { start: startOfMonth(today), end: endOfMonth(today) },
    };
  }, []);

  // Consolidated metrics by branch
  const branchMetrics = useMemo(() => {
    if (!branches || branches.length === 0) return [];

    const range = dateRanges[selectedPeriod];

    return branches.map(branch => {
      // Branch-specific sales
      const branchSalesFiltered = branchSales.filter(sale => {
        const saleDate = parseISO(sale.sale_date);
        const matchesBranch = sale.branch_id === branch.id || 
          (branch.is_main_branch && !sale.branch_id);
        return matchesBranch && saleDate >= range.start && saleDate <= range.end;
      });

      const totalRevenue = branchSalesFiltered.reduce((sum, s) => sum + s.total_price, 0);
      const totalTransactions = branchSalesFiltered.length;
      const totalItems = branchSalesFiltered.reduce((sum, s) => sum + s.quantity, 0);
      const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      // Branch inventory stats
      const branchInv = branchInventory?.filter(inv => inv.branch_id === branch.id) || [];
      const totalStock = branchInv.reduce((sum, inv) => sum + inv.current_stock, 0);
      const lowStockItems = branchInv.filter(inv => inv.current_stock <= inv.reorder_level).length;

      // Calculate inventory value
      const inventoryValue = branchInv.reduce((sum, inv) => {
        const med = medications?.find(m => m.id === inv.medication_id);
        if (med) {
          return sum + (inv.current_stock * (med.selling_price || med.unit_price));
        }
        return sum;
      }, 0);

      // Count expiring items
      const expiringItems = medications?.filter(m => {
        const expiryDate = new Date(m.expiry_date);
        const today = new Date();
        const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        return expiryDate > today && expiryDate <= thirtyDaysFromNow;
      }).length || 0;

      return {
        id: branch.id,
        name: branch.name,
        isMainBranch: branch.is_main_branch,
        isActive: branch.is_active,
        totalRevenue,
        totalTransactions,
        totalItems,
        avgTransactionValue,
        totalStock,
        lowStockItems,
        inventoryValue,
        expiringItems,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [branches, branchSales, branchInventory, medications, dateRanges, selectedPeriod]);

  // Overall totals
  const totals = useMemo(() => {
    if (branchMetrics.length === 0) return null;
    
    return {
      totalRevenue: branchMetrics.reduce((sum, b) => sum + b.totalRevenue, 0),
      totalTransactions: branchMetrics.reduce((sum, b) => sum + b.totalTransactions, 0),
      totalItems: branchMetrics.reduce((sum, b) => sum + b.totalItems, 0),
      totalStock: branchMetrics.reduce((sum, b) => sum + b.totalStock, 0),
      totalInventoryValue: branchMetrics.reduce((sum, b) => sum + b.inventoryValue, 0),
      totalLowStock: branchMetrics.reduce((sum, b) => sum + b.lowStockItems, 0),
      totalExpiring: branchMetrics.reduce((sum, b) => sum + b.expiringItems, 0),
      topBranch: branchMetrics[0],
    };
  }, [branchMetrics]);

  if (!branches || branches.length === 0) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Consolidated Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Add branches to see consolidated reports</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Consolidated Reports
            </CardTitle>
            <CardDescription>
              All branches performance at a glance
            </CardDescription>
          </div>
          <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="today" className="text-xs">Today</TabsTrigger>
              <TabsTrigger value="week" className="text-xs">This Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs">This Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Summary */}
        {totals && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-600 mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium">Total Revenue</span>
              </div>
              <p className="text-xl font-bold">{formatPrice(totals.totalRevenue)}</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-xs font-medium">Transactions</span>
              </div>
              <p className="text-xl font-bold">{totals.totalTransactions}</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <Package className="h-4 w-4" />
                <span className="text-xs font-medium">Items Sold</span>
              </div>
              <p className="text-xl font-bold">{totals.totalItems}</p>
            </div>
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-medium">Alerts</span>
              </div>
              <p className="text-xl font-bold">{totals.totalLowStock + totals.totalExpiring}</p>
            </div>
          </div>
        )}

        {/* Top Performer Badge */}
        {totals?.topBranch && totals.topBranch.totalRevenue > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <span className="text-sm">
              <strong>{totals.topBranch.name}</strong> is the top performer with {formatPrice(totals.topBranch.totalRevenue)} in {selectedPeriod === 'today' ? "today's" : selectedPeriod === 'week' ? 'this week\'s' : 'this month\'s'} sales
            </span>
            <Badge className="ml-auto bg-emerald-500 text-white">#1</Badge>
          </div>
        )}

        {/* Branch Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Branch</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">Revenue</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground hidden sm:table-cell">Txns</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground hidden md:table-cell">Avg Value</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground hidden lg:table-cell">Stock</th>
                <th className="text-center py-3 px-2 font-medium text-muted-foreground">Alerts</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">Share</th>
              </tr>
            </thead>
            <tbody>
              {branchMetrics.map((branch, index) => {
                const revenueShare = totals ? (branch.totalRevenue / totals.totalRevenue) * 100 : 0;
                const isTopPerformer = index === 0 && branch.totalRevenue > 0;
                
                return (
                  <tr key={branch.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          isTopPerformer ? 'bg-emerald-500/20' : 'bg-muted'
                        }`}>
                          <Building2 className={`h-4 w-4 ${
                            isTopPerformer ? 'text-emerald-500' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">{branch.name}</p>
                          {branch.isMainBranch && (
                            <Badge variant="outline" className="text-[10px]">HQ</Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-semibold">
                      {formatPrice(branch.totalRevenue)}
                    </td>
                    <td className="py-3 px-2 text-right hidden sm:table-cell">
                      {branch.totalTransactions}
                    </td>
                    <td className="py-3 px-2 text-right hidden md:table-cell text-muted-foreground">
                      {formatPrice(branch.avgTransactionValue)}
                    </td>
                    <td className="py-3 px-2 text-right hidden lg:table-cell">
                      {branch.totalStock.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {(branch.lowStockItems + branch.expiringItems) > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {branch.lowStockItems + branch.expiringItems}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-emerald-500/20 text-emerald-600">
                          ✓
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="font-medium">{revenueShare.toFixed(1)}%</span>
                        {isTopPerformer && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {totals && (
              <tfoot>
                <tr className="bg-muted/50 font-semibold">
                  <td className="py-3 px-2">Total ({branches.length} branches)</td>
                  <td className="py-3 px-2 text-right">{formatPrice(totals.totalRevenue)}</td>
                  <td className="py-3 px-2 text-right hidden sm:table-cell">{totals.totalTransactions}</td>
                  <td className="py-3 px-2 text-right hidden md:table-cell">-</td>
                  <td className="py-3 px-2 text-right hidden lg:table-cell">{totals.totalStock.toLocaleString()}</td>
                  <td className="py-3 px-2 text-center">
                    <Badge variant="destructive">{totals.totalLowStock + totals.totalExpiring}</Badge>
                  </td>
                  <td className="py-3 px-2 text-right">100%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Inventory Value Summary */}
        {totals && (
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <span className="font-medium">Total Inventory Value (All Branches)</span>
              </div>
              <span className="text-xl font-bold">{formatPrice(totals.totalInventoryValue)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
