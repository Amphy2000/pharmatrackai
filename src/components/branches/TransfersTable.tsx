import { useBranches } from '@/hooks/useBranches';
import { format, parseISO } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ArrowRight, Check, X, Truck } from 'lucide-react';

export const TransfersTable = () => {
  const { transfers, updateTransferStatus, isLoading } = useBranches();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Pending</Badge>;
      case 'in_transit':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">In Transit</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading transfers...</div>;
  }

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Date</TableHead>
            <TableHead>Medication</TableHead>
            <TableHead>Route</TableHead>
            <TableHead className="text-center">Qty</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No transfers yet
              </TableCell>
            </TableRow>
          ) : (
            transfers.map(transfer => (
              <TableRow key={transfer.id}>
                <TableCell className="text-sm">
                  {format(parseISO(transfer.created_at), 'MMM d, yyyy')}
                  <span className="block text-xs text-muted-foreground">
                    {format(parseISO(transfer.created_at), 'h:mm a')}
                  </span>
                </TableCell>
                <TableCell className="font-medium">
                  {transfer.medications?.name || 'Unknown'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm">
                    <span>{transfer.from_branch?.name}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span>{transfer.to_branch?.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center font-medium">
                  {transfer.quantity}
                </TableCell>
                <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                <TableCell className="text-right">
                  {(transfer.status === 'pending' || transfer.status === 'in_transit') && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {transfer.status === 'pending' && (
                          <>
                            <DropdownMenuItem
                              onClick={() => updateTransferStatus.mutate({ id: transfer.id, status: 'in_transit' })}
                            >
                              <Truck className="h-4 w-4 mr-2" />
                              Mark In Transit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateTransferStatus.mutate({ id: transfer.id, status: 'cancelled' })}
                              className="text-destructive"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                          </>
                        )}
                        {transfer.status === 'in_transit' && (
                          <DropdownMenuItem
                            onClick={() => updateTransferStatus.mutate({ id: transfer.id, status: 'completed' })}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Mark Completed
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
