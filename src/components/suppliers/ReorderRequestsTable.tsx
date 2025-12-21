import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { ReorderRequest } from '@/types/supplier';
import { format } from 'date-fns';

const statusColors: Record<ReorderRequest['status'], string> = {
  pending: 'bg-yellow-500/20 text-yellow-500',
  approved: 'bg-blue-500/20 text-blue-500',
  ordered: 'bg-purple-500/20 text-purple-500',
  shipped: 'bg-orange-500/20 text-orange-500',
  delivered: 'bg-green-500/20 text-green-500',
  cancelled: 'bg-red-500/20 text-red-500',
};

export const ReorderRequestsTable = () => {
  const { reorderRequests, updateReorderStatus, isLoading } = useSuppliers();
  const { formatPrice } = useCurrency();

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading reorder requests...</div>;
  }

  if (reorderRequests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No reorder requests yet. Create one from low-stock items.
      </div>
    );
  }

  const handleStatusChange = (id: string, status: ReorderRequest['status']) => {
    updateReorderStatus.mutate({ id, status });
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Medication</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Expected</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reorderRequests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="text-sm">
                {format(new Date(request.created_at), 'MMM d, yyyy')}
              </TableCell>
              <TableCell className="font-medium">{request.suppliers?.name || '-'}</TableCell>
              <TableCell>{request.medications?.name || 'General Order'}</TableCell>
              <TableCell>{request.quantity}</TableCell>
              <TableCell>{formatPrice(request.total_amount)}</TableCell>
              <TableCell>
                {request.expected_delivery 
                  ? format(new Date(request.expected_delivery), 'MMM d')
                  : '-'
                }
              </TableCell>
              <TableCell>
                <Badge className={statusColors[request.status]}>
                  {request.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Select
                  value={request.status}
                  onValueChange={(value) => handleStatusChange(request.id, value as ReorderRequest['status'])}
                  disabled={request.status === 'delivered' || request.status === 'cancelled'}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="ordered">Ordered</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
