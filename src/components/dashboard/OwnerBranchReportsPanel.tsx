import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useBranches } from '@/hooks/useBranches';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  XCircle, 
  Clock,
  DollarSign,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import { parseISO, startOfDay, endOfDay, subDays, format } from 'date-fns';

interface BranchSummary {
  branchId: string;
  branchName: string;
  isMainBranch: boolean;
  todaysSales: number;
  totalStock: number;
  lowStock: number;
  expired: number;
  expiringSoon: number;
  valueAtRisk: number;
}

export const OwnerBranchReportsPanel = () => {
  const { pharmacyId } = usePharmacy();
  const { branches } = useBranches();
  const { formatPrice } = useCurrency();
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7');

  // Fetch all sales data
  const { data: allSales = [] } = useQuery({
    queryKey: ['all-branch-sales', pharmacyId, dateRange],
    queryFn: async () => {
      if (!pharmacyId) return [];
      const startDate = subDays(new Date(), parseInt(dateRange));
      const { data, error } = await supabase
        .from('sales')
        .select('*, branches(name)')
        .eq('pharmacy_id', pharmacyId)
        .gte('sale_date', startDate.toISOString())
        .order('sale_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!pharmacyId,
  });

  // Fetch all medications for main branch
  const { data: allMedications = [] } = useQuery({
    queryKey: ['all-medications', pharmacyId],
    queryFn: async () => {
      if (!pharmacyId) return [];
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('pharmacy_id', pharmacyId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!pharmacyId,
  });

  // Fetch all branch inventory
  const { data: allBranchInventory = [] } = useQuery({
    queryKey: ['all-branch-inventory', pharmacyId],
    queryFn: async () => {
      if (!pharmacyId) return [];
      const branchIds = branches.map(b => b.id);
      if (branchIds.length === 0) return [];
      const { data, error } = await supabase
        .from('branch_inventory')
        .select('*, medications(*)')
        .in('branch_id', branchIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!pharmacyId && branches.length > 0,
  });

  // Calculate branch summaries
  const branchSummaries: BranchSummary[] = useMemo(() => {
    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    return branches.map(branch => {
      const branchId = branch.id;
      const isMainBranch = branch.is_main_branch;

      // Get sales for this branch
      const branchSales = allSales.filter(s => s.branch_id === branchId);
      const todaysSales = branchSales
        .filter(s => {
          const saleDate = parseISO(s.sale_date);
          return saleDate >= dayStart && saleDate <= dayEnd;
        })
        .reduce((sum, s) => sum + s.total_price, 0);

      // Get inventory for this branch
      let branchMeds: any[] = [];
      if (isMainBranch) {
        branchMeds = allMedications.map(m => ({
          ...m,
          stock: m.current_stock,
          reorderLevel: m.reorder_level,
        }));
      } else {
        branchMeds = allBranchInventory
          .filter(inv => inv.branch_id === branchId)
          .map(inv => ({
            ...inv.medications,
            stock: inv.current_stock,
            reorderLevel: inv.reorder_level,
          }));
      }

      const totalStock = branchMeds.reduce((sum, m) => sum + (m.stock || 0), 0);
      const lowStock = branchMeds.filter(m => m.stock > 0 && m.stock <= (m.reorderLevel || 10)).length;
      const expired = branchMeds.filter(m => m.stock > 0 && new Date(m.expiry_date) < today).length;
      const expiringSoon = branchMeds.filter(m => {
        if (!m.expiry_date || m.stock === 0) return false;
        const expiryDate = new Date(m.expiry_date);
        const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        return expiryDate > today && expiryDate <= thirtyDaysFromNow;
      }).length;

      const valueAtRisk = branchMeds
        .filter(m => {
          if (!m.expiry_date || m.stock === 0) return false;
          const expiryDate = new Date(m.expiry_date);
          const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
          return expiryDate <= thirtyDaysFromNow;
        })
        .reduce((sum, m) => sum + (m.stock || 0) * (m.selling_price || m.unit_price || 0), 0);

      return {
        branchId,
        branchName: branch.name,
        isMainBranch,
        todaysSales,
        totalStock,
        lowStock,
        expired,
        expiringSoon,
        valueAtRisk,
      };
    });
  }, [branches, allSales, allMedications, allBranchInventory]);

  // Filter summaries based on selection
  const displayedSummaries = useMemo(() => {
    if (selectedBranch === 'all') return branchSummaries;
    return branchSummaries.filter(b => b.branchId === selectedBranch);
  }, [branchSummaries, selectedBranch]);

  // Consolidated totals
  const consolidatedTotals = useMemo(() => {
    return displayedSummaries.reduce(
      (acc, b) => ({
        totalSales: acc.totalSales + b.todaysSales,
        totalStock: acc.totalStock + b.totalStock,
        totalLowStock: acc.totalLowStock + b.lowStock,
        totalExpired: acc.totalExpired + b.expired,
        totalExpiringSoon: acc.totalExpiringSoon + b.expiringSoon,
        totalValueAtRisk: acc.totalValueAtRisk + b.valueAtRisk,
      }),
      { totalSales: 0, totalStock: 0, totalLowStock: 0, totalExpired: 0, totalExpiringSoon: 0, totalValueAtRisk: 0 }
    );
  }, [displayedSummaries]);

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Multi-Branch Reports
            </CardTitle>
            <CardDescription>Consolidated view across all locations</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name} {branch.is_main_branch && '(HQ)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Today</SelectItem>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
                <SelectItem value="90">90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Consolidated Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Today's Sales</span>
            </div>
            <p className="text-lg font-bold">{formatPrice(consolidatedTotals.totalSales)}</p>
          </div>
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Total Stock</span>
            </div>
            <p className="text-lg font-bold">{consolidatedTotals.totalStock.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Low Stock</span>
            </div>
            <p className="text-lg font-bold">{consolidatedTotals.totalLowStock}</p>
          </div>
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Expired</span>
            </div>
            <p className="text-lg font-bold">{consolidatedTotals.totalExpired}</p>
          </div>
          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Expiring Soon</span>
            </div>
            <p className="text-lg font-bold">{consolidatedTotals.totalExpiringSoon}</p>
          </div>
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Value at Risk</span>
            </div>
            <p className="text-lg font-bold">{formatPrice(consolidatedTotals.totalValueAtRisk)}</p>
          </div>
        </div>

        {/* Branch-by-Branch Breakdown */}
        {selectedBranch === 'all' && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Branch Breakdown</h4>
            <div className="grid gap-3">
              {branchSummaries.map(branch => (
                <div 
                  key={branch.branchId}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{branch.branchName}</p>
                        {branch.isMainBranch && (
                          <Badge variant="outline" className="text-xs">HQ</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {branch.totalStock.toLocaleString()} units in stock
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium text-emerald-600">{formatPrice(branch.todaysSales)}</p>
                      <p className="text-xs text-muted-foreground">Today</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {branch.expired > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {branch.expired} expired
                        </Badge>
                      )}
                      {branch.lowStock > 0 && (
                        <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-700">
                          {branch.lowStock} low
                        </Badge>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setSelectedBranch(branch.branchId)}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed view for single branch */}
        {selectedBranch !== 'all' && displayedSummaries.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">
                Detailed View: {displayedSummaries[0].branchName}
              </h4>
              <Button variant="outline" size="sm" onClick={() => setSelectedBranch('all')}>
                View All Branches
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Total Revenue ({dateRange} days)</p>
                <p className="text-xl font-bold">{formatPrice(
                  allSales
                    .filter(s => s.branch_id === selectedBranch)
                    .reduce((sum, s) => sum + s.total_price, 0)
                )}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Transactions</p>
                <p className="text-xl font-bold">
                  {allSales.filter(s => s.branch_id === selectedBranch).length}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Avg Transaction</p>
                <p className="text-xl font-bold">
                  {formatPrice(
                    allSales.filter(s => s.branch_id === selectedBranch).length > 0
                      ? allSales
                          .filter(s => s.branch_id === selectedBranch)
                          .reduce((sum, s) => sum + s.total_price, 0) /
                        allSales.filter(s => s.branch_id === selectedBranch).length
                      : 0
                  )}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Inventory Value</p>
                <p className="text-xl font-bold">
                  {formatPrice(
                    (displayedSummaries[0]?.totalStock || 0) * 500 // Approximate average price
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
