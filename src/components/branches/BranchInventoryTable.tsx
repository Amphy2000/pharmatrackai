import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBranches } from '@/hooks/useBranches';
import { useCurrency } from '@/contexts/CurrencyContext';
import { usePharmacy } from '@/hooks/usePharmacy';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, AlertTriangle, Building2 } from 'lucide-react';

interface InventoryItem {
  id: string;
  medication_id: string;
  medication_name: string;
  category: string;
  branch_id: string;
  branch_name: string;
  is_main_branch: boolean;
  current_stock: number;
  reorder_level: number;
  selling_price: number;
  unit_price: number;
}

export const BranchInventoryTable = () => {
  const { branches, branchInventory, isLoading } = useBranches();
  const { formatPrice } = useCurrency();
  const { pharmacyId } = usePharmacy();
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  // Fetch medications for main branch
  const { data: medications = [] } = useQuery({
    queryKey: ['medications-for-branch-table', pharmacyId],
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

  // Find main branch
  const mainBranch = branches.find(b => b.is_main_branch);

  // Combine main branch medications with branch_inventory
  const allInventory = useMemo<InventoryItem[]>(() => {
    const items: InventoryItem[] = [];

    // Add main branch medications
    if (mainBranch) {
      medications.forEach(med => {
        items.push({
          id: `main-${med.id}`,
          medication_id: med.id,
          medication_name: med.name,
          category: med.category,
          branch_id: mainBranch.id,
          branch_name: mainBranch.name,
          is_main_branch: true,
          current_stock: med.current_stock,
          reorder_level: med.reorder_level,
          selling_price: med.selling_price || 0,
          unit_price: med.unit_price,
        });
      });
    }

    // Add other branches inventory
    branchInventory.forEach(inv => {
      // Skip if this is a main branch entry (already handled above)
      const branch = branches.find(b => b.id === inv.branch_id);
      if (branch?.is_main_branch) return;

      items.push({
        id: inv.id,
        medication_id: inv.medication_id,
        medication_name: inv.medications?.name || 'Unknown',
        category: inv.medications?.category || 'Unknown',
        branch_id: inv.branch_id,
        branch_name: inv.branches?.name || 'Unknown',
        is_main_branch: false,
        current_stock: inv.current_stock,
        reorder_level: inv.reorder_level,
        selling_price: inv.medications?.selling_price || 0,
        unit_price: inv.medications?.unit_price || 0,
      });
    });

    return items;
  }, [medications, branchInventory, branches, mainBranch]);

  const filteredInventory = useMemo(() => {
    let result = [...allInventory];

    if (selectedBranch !== 'all') {
      result = result.filter(inv => inv.branch_id === selectedBranch);
    }

    if (search) {
      const query = search.toLowerCase();
      result = result.filter(inv =>
        inv.medication_name.toLowerCase().includes(query) ||
        inv.branch_name.toLowerCase().includes(query) ||
        inv.category.toLowerCase().includes(query)
      );
    }

    // Sort by branch name, then medication name
    result.sort((a, b) => {
      if (a.is_main_branch && !b.is_main_branch) return -1;
      if (!a.is_main_branch && b.is_main_branch) return 1;
      const branchCompare = a.branch_name.localeCompare(b.branch_name);
      if (branchCompare !== 0) return branchCompare;
      return a.medication_name.localeCompare(b.medication_name);
    });

    return result;
  }, [allInventory, selectedBranch, search]);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading inventory...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search medications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
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
      </div>

      <div className="rounded-xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Medication</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-center">Stock</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No inventory found
                </TableCell>
              </TableRow>
            ) : (
              filteredInventory.map(inv => {
                const isLowStock = inv.current_stock <= inv.reorder_level && inv.current_stock > 0;
                const isOutOfStock = inv.current_stock === 0;
                const value = inv.current_stock * (inv.selling_price || inv.unit_price);

                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      {inv.medication_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span>{inv.branch_name}</span>
                        {inv.is_main_branch && (
                          <Badge variant="outline" className="text-xs">HQ</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {inv.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={isLowStock || isOutOfStock ? 'text-destructive font-semibold' : ''}>
                        {inv.current_stock}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(value)}
                    </TableCell>
                    <TableCell>
                      {isOutOfStock ? (
                        <Badge variant="destructive" className="gap-1">
                          Out of Stock
                        </Badge>
                      ) : isLowStock ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="secondary">In Stock</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
