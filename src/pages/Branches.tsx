import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { useBranches } from '@/hooks/useBranches';
import { useCurrency } from '@/contexts/CurrencyContext';
import { usePermissions } from '@/hooks/usePermissions';
import { usePharmacy } from '@/hooks/usePharmacy';
import { AddBranchModal } from '@/components/branches/AddBranchModal';
import { StockTransferModal } from '@/components/branches/StockTransferModal';
import { AssignBranchManagerModal } from '@/components/branches/AssignBranchManagerModal';
import { BranchInventoryTable } from '@/components/branches/BranchInventoryTable';
import { TransfersTable } from '@/components/branches/TransfersTable';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Building2,
  Plus,
  ArrowLeftRight,
  Package,
  AlertTriangle,
  MapPin,
  Phone,
  MoreVertical,
  Edit,
  Trash2,
  UserCog,
} from 'lucide-react';
import { Branch } from '@/types/branch';

const Branches = () => {
  const { branches, branchInventory, transfers, deleteBranch, isLoading } = useBranches();
  const { formatPrice } = useCurrency();
  const { isOwnerOrManager, hasPermission, userRole } = usePermissions();
  const { pharmacyId } = usePharmacy();
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [assigningManagerBranch, setAssigningManagerBranch] = useState<Branch | null>(null);

  // Fetch medications for main branch stats
  const { data: medications = [] } = useQuery({
    queryKey: ['medications-for-branches', pharmacyId],
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

  // Staff with manage_stock_transfers permission can also transfer stock
  const canTransferStock = isOwnerOrManager || hasPermission('manage_stock_transfers') || hasPermission('view_dashboard');

  // Calculate stats per branch - USE medications table for main branch
  const branchStats = branches.map(branch => {
    if (branch.is_main_branch) {
      // Main branch uses the medications table directly
      const totalStock = medications.reduce((sum, m) => sum + m.current_stock, 0);
      const totalValue = medications.reduce(
        (sum, m) => sum + m.current_stock * (m.selling_price || m.unit_price || 0),
        0
      );
      const lowStockCount = medications.filter(m => m.current_stock <= m.reorder_level && m.current_stock > 0).length;
      return { branch, totalStock, totalValue, lowStockCount, itemCount: medications.length };
    }
    
    // Non-main branches use branch_inventory
    const inventory = branchInventory.filter(inv => inv.branch_id === branch.id);
    const totalStock = inventory.reduce((sum, inv) => sum + inv.current_stock, 0);
    const totalValue = inventory.reduce(
      (sum, inv) => sum + inv.current_stock * (inv.medications?.selling_price || inv.medications?.unit_price || 0),
      0
    );
    const lowStockCount = inventory.filter(inv => inv.current_stock <= inv.reorder_level && inv.current_stock > 0).length;

    return { branch, totalStock, totalValue, lowStockCount, itemCount: inventory.length };
  });

  const pendingTransfers = transfers.filter(t => t.status === 'pending' || t.status === 'in_transit').length;

  return (
    <div className="min-h-screen bg-gradient-dark">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-gradient">Multi-Branch Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage inventory across all pharmacy locations</p>
          </div>
          <div className="flex gap-2">
            {canTransferStock && (
              <Button variant="outline" onClick={() => setShowTransfer(true)} className="gap-2">
                <ArrowLeftRight className="h-4 w-4" />
                Transfer Stock
              </Button>
            )}
            {isOwnerOrManager && (
              <Button onClick={() => setShowAddBranch(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Branch
              </Button>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Branches</p>
                  <p className="text-2xl font-bold">{branches.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Package className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Stock</p>
                  <p className="text-2xl font-bold">
                    {branchStats.reduce((sum, s) => sum + s.totalStock, 0)} units
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock Items</p>
                  <p className="text-2xl font-bold text-warning">
                    {branchStats.reduce((sum, s) => sum + s.lowStockCount, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <ArrowLeftRight className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Transfers</p>
                  <p className="text-2xl font-bold">{pendingTransfers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Branches Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Branches</h2>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading branches...</div>
          ) : branches.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Branches Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first branch to start tracking inventory across locations.
                </p>
                <Button onClick={() => setShowAddBranch(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Branch
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {branchStats.map(({ branch, totalStock, totalValue, lowStockCount, itemCount }) => (
                <Card key={branch.id} className="glass-card overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{branch.name}</CardTitle>
                        {branch.is_main_branch && (
                          <Badge variant="secondary" className="text-xs">Main</Badge>
                        )}
                      </div>
                      {isOwnerOrManager && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => {
                                              setEditingBranch(branch);
                                              setShowAddBranch(true);
                                            }}>
                                              <Edit className="h-4 w-4 mr-2" />
                                              Edit Branch
                                            </DropdownMenuItem>
                                            {userRole === 'owner' && (
                                              <>
                                                <DropdownMenuItem onClick={() => setAssigningManagerBranch(branch)}>
                                                  <UserCog className="h-4 w-4 mr-2" />
                                                  Assign Manager
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                  onClick={() => deleteBranch.mutate(branch.id)}
                                                  className="text-destructive"
                                                >
                                                  <Trash2 className="h-4 w-4 mr-2" />
                                                  Delete
                                                </DropdownMenuItem>
                                              </>
                                            )}
                                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <CardDescription className="flex flex-col gap-1 text-xs">
                      {branch.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {branch.address}
                        </span>
                      )}
                      {branch.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {branch.phone}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Items</p>
                        <p className="font-semibold">{itemCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Stock</p>
                        <p className="font-semibold">{totalStock} units</p>
                      </div>
                      {(isOwnerOrManager || hasPermission('view_financial_data')) && (
                        <div>
                          <p className="text-muted-foreground">Value</p>
                          <p className="font-semibold text-primary">{formatPrice(totalValue)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Low Stock</p>
                        <p className={`font-semibold ${lowStockCount > 0 ? 'text-warning' : ''}`}>
                          {lowStockCount} items
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Tabs for Inventory and Transfers */}
        <Tabs defaultValue="inventory" className="space-y-4">
          <TabsList>
            <TabsTrigger value="inventory">Branch Inventory</TabsTrigger>
            <TabsTrigger value="transfers">
              Stock Transfers
              {pendingTransfers > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {pendingTransfers}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory">
            <BranchInventoryTable />
          </TabsContent>

          <TabsContent value="transfers">
            <TransfersTable />
          </TabsContent>
        </Tabs>
      </main>

      <AddBranchModal
        open={showAddBranch}
        onOpenChange={(open) => {
          setShowAddBranch(open);
          if (!open) setEditingBranch(null);
        }}
        editingBranch={editingBranch}
      />
      <StockTransferModal open={showTransfer} onOpenChange={setShowTransfer} />
      <AssignBranchManagerModal
        open={!!assigningManagerBranch}
        onOpenChange={(open) => {
          if (!open) setAssigningManagerBranch(null);
        }}
        branch={assigningManagerBranch}
      />
    </div>
  );
};

export default Branches;
