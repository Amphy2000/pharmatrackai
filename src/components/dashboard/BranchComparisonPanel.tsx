import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useBranches } from '@/hooks/useBranches';
import { useSales } from '@/hooks/useSales';
import { useCurrency } from '@/contexts/CurrencyContext';
import { 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  Minus
} from 'lucide-react';
import { startOfDay, endOfDay, parseISO, startOfMonth, endOfMonth } from 'date-fns';

export const BranchComparisonPanel = () => {
  const { branches, branchInventory, isLoading: isLoadingBranches } = useBranches();
  const { sales } = useSales();
  const { formatPrice } = useCurrency();

  const branchMetrics = useMemo(() => {
    if (!branches || branches.length === 0) return [];

    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    return branches.map(branch => {
      // Calculate branch inventory stats
      const branchInv = branchInventory?.filter(inv => inv.branch_id === branch.id) || [];
      const totalStock = branchInv.reduce((sum, inv) => sum + inv.current_stock, 0);
      const lowStockItems = branchInv.filter(inv => inv.current_stock <= inv.reorder_level).length;

      // Filter sales by branch_id - use real data
      const branchSales = sales?.filter(sale => {
        // Match branch_id or for main branch, include sales with no branch_id
        return sale.branch_id === branch.id || 
          (branch.is_main_branch && !sale.branch_id);
      }) || [];

      const todaySales = branchSales
        .filter(sale => {
          const saleDate = parseISO(sale.sale_date);
          return saleDate >= dayStart && saleDate <= dayEnd;
        })
        .reduce((sum, sale) => sum + sale.total_price, 0);

      const monthSales = branchSales
        .filter(sale => {
          const saleDate = parseISO(sale.sale_date);
          return saleDate >= monthStart && saleDate <= monthEnd;
        })
        .reduce((sum, sale) => sum + sale.total_price, 0);

      const totalTransactions = branchSales
        .filter(sale => {
          const saleDate = parseISO(sale.sale_date);
          return saleDate >= dayStart && saleDate <= dayEnd;
        }).length;

      return {
        id: branch.id,
        name: branch.name,
        isMainBranch: branch.is_main_branch,
        isActive: branch.is_active,
        totalStock,
        lowStockItems,
        todaySales,
        monthSales,
        totalTransactions,
      };
    });
  }, [branches, branchInventory, sales]);

  // Calculate totals and best performer
  const totals = useMemo(() => {
    if (branchMetrics.length === 0) return null;
    
    const totalSales = branchMetrics.reduce((sum, b) => sum + b.todaySales, 0);
    const totalStock = branchMetrics.reduce((sum, b) => sum + b.totalStock, 0);
    const bestPerformer = branchMetrics.reduce((best, curr) => 
      curr.todaySales > best.todaySales ? curr : best, branchMetrics[0]);
    
    return { totalSales, totalStock, bestPerformer };
  }, [branchMetrics]);

  if (isLoadingBranches) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading branch comparison...
        </CardContent>
      </Card>
    );
  }

  if (!branches || branches.length <= 1) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Branch Comparison
          </CardTitle>
          <CardDescription>
            Add more branches to compare performance across locations
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>You need at least 2 branches to compare performance</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Branch Comparison
            </CardTitle>
            <CardDescription>
              Side-by-side performance metrics for all locations
            </CardDescription>
          </div>
          {totals?.bestPerformer && (
            <Badge variant="default" className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
              <TrendingUp className="h-3 w-3 mr-1" />
              Top: {totals.bestPerformer.name}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Row */}
        {totals && (
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Daily Sales</p>
              <p className="text-xl font-bold">{formatPrice(totals.totalSales)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Combined Stock</p>
              <p className="text-xl font-bold">{totals.totalStock.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Active Branches</p>
              <p className="text-xl font-bold">{branches.filter(b => b.is_active).length}</p>
            </div>
          </div>
        )}

        {/* Branch Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branchMetrics.map((branch, index) => {
            const salesShare = totals ? (branch.todaySales / totals.totalSales) * 100 : 0;
            const isTopPerformer = totals?.bestPerformer?.id === branch.id;
            
            return (
              <div 
                key={branch.id}
                className={`p-4 rounded-lg border ${
                  isTopPerformer 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : 'bg-card border-border'
                } ${!branch.isActive ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      isTopPerformer ? 'bg-emerald-500/20' : 'bg-primary/10'
                    }`}>
                      <Building2 className={`h-4 w-4 ${
                        isTopPerformer ? 'text-emerald-500' : 'text-primary'
                      }`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{branch.name}</h4>
                      {branch.isMainBranch && (
                        <Badge variant="outline" className="text-xs">Main</Badge>
                      )}
                    </div>
                  </div>
                  {isTopPerformer && (
                    <Badge className="bg-emerald-500 text-white text-xs">
                      #1
                    </Badge>
                  )}
                </div>

                {/* Sales Metric */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                      Today's Sales
                    </div>
                    <span className="font-semibold">{formatPrice(branch.todaySales)}</span>
                  </div>

                  {/* Sales share progress */}
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Sales Share</span>
                      <span>{salesShare.toFixed(1)}%</span>
                    </div>
                    <Progress value={salesShare} className="h-1.5" />
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1.5">
                      <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs">{branch.totalTransactions} txns</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs">{branch.totalStock} items</span>
                    </div>
                  </div>

                  {/* Low Stock Warning */}
                  {branch.lowStockItems > 0 && (
                    <div className="flex items-center gap-1.5 text-amber-500 text-xs">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {branch.lowStockItems} low stock items
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Monthly Comparison Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium text-muted-foreground">Branch</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Month Sales</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Daily Avg</th>
                <th className="text-center py-2 font-medium text-muted-foreground">Trend</th>
              </tr>
            </thead>
            <tbody>
              {branchMetrics.map(branch => {
                const dailyAvg = branch.monthSales / new Date().getDate();
                const trend = branch.todaySales > dailyAvg ? 'up' : branch.todaySales < dailyAvg ? 'down' : 'neutral';
                
                return (
                  <tr key={branch.id} className="border-b border-border/50">
                    <td className="py-2 font-medium">{branch.name}</td>
                    <td className="py-2 text-right">{formatPrice(branch.monthSales)}</td>
                    <td className="py-2 text-right text-muted-foreground">{formatPrice(dailyAvg)}</td>
                    <td className="py-2 text-center">
                      {trend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-500 mx-auto" />}
                      {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500 mx-auto" />}
                      {trend === 'neutral' && <Minus className="h-4 w-4 text-muted-foreground mx-auto" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};