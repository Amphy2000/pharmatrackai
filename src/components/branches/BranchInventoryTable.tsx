import { useMemo, useState } from 'react';
import { useBranches } from '@/hooks/useBranches';
import { useCurrency } from '@/contexts/CurrencyContext';
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
import { Search, AlertTriangle } from 'lucide-react';

export const BranchInventoryTable = () => {
  const { branches, branchInventory, isLoading } = useBranches();
  const { formatPrice } = useCurrency();
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  const filteredInventory = useMemo(() => {
    let result = [...branchInventory];

    if (selectedBranch !== 'all') {
      result = result.filter(inv => inv.branch_id === selectedBranch);
    }

    if (search) {
      const query = search.toLowerCase();
      result = result.filter(inv =>
        inv.medications?.name.toLowerCase().includes(query) ||
        inv.branches?.name.toLowerCase().includes(query)
      );
    }

    return result;
  }, [branchInventory, selectedBranch, search]);

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
                {branch.name}
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
                const isLowStock = inv.current_stock <= inv.reorder_level;
                const value = inv.current_stock * (inv.medications?.selling_price || inv.medications?.unit_price || 0);

                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      {inv.medications?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>{inv.branches?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {inv.medications?.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={isLowStock ? 'text-destructive font-semibold' : ''}>
                        {inv.current_stock}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(value)}
                    </TableCell>
                    <TableCell>
                      {isLowStock ? (
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
