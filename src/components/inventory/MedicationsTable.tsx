import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Edit2, Trash2, MoreHorizontal, Package } from 'lucide-react';
import { Medication } from '@/types/medication';
import { useMedications } from '@/hooks/useMedications';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MedicationsTableProps {
  medications: Medication[];
  searchQuery: string;
  onEdit: (medication: Medication) => void;
}

export const MedicationsTable = ({ medications, searchQuery, onEdit }: MedicationsTableProps) => {
  const { deleteMedication, isExpired, isLowStock, isExpiringSoon } = useMedications();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [medicationToDelete, setMedicationToDelete] = useState<Medication | null>(null);

  const filteredMedications = medications.filter((med) => {
    const query = searchQuery.toLowerCase();
    return (
      med.name.toLowerCase().includes(query) ||
      med.category.toLowerCase().includes(query) ||
      med.batch_number.toLowerCase().includes(query)
    );
  });

  const handleDelete = (medication: Medication) => {
    setMedicationToDelete(medication);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (medicationToDelete) {
      deleteMedication.mutate(medicationToDelete.id);
    }
    setDeleteDialogOpen(false);
    setMedicationToDelete(null);
  };

  const getRowClass = (medication: Medication) => {
    if (isExpired(medication.expiry_date)) return 'row-expired';
    if (isLowStock(medication.current_stock, medication.reorder_level)) return 'row-low-stock';
    return '';
  };

  const getStatusBadge = (medication: Medication) => {
    if (isExpired(medication.expiry_date)) {
      return <Badge variant="destructive" className="text-xs">Expired</Badge>;
    }
    if (isExpiringSoon(medication.expiry_date)) {
      return <Badge className="bg-amber-warning text-amber-warning-foreground text-xs">Expiring Soon</Badge>;
    }
    if (isLowStock(medication.current_stock, medication.reorder_level)) {
      return <Badge className="bg-amber-warning text-amber-warning-foreground text-xs">Low Stock</Badge>;
    }
    return <Badge className="bg-success text-success-foreground text-xs">In Stock</Badge>;
  };

  if (filteredMedications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium text-foreground">No medications found</h3>
        <p className="text-sm text-muted-foreground">
          {searchQuery ? 'Try adjusting your search query' : 'Add your first medication to get started'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Batch No.</TableHead>
              <TableHead className="font-semibold text-right">Stock</TableHead>
              <TableHead className="font-semibold text-right">Reorder Level</TableHead>
              <TableHead className="font-semibold">Expiry Date</TableHead>
              <TableHead className="font-semibold text-right">Unit Price</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMedications.map((medication) => (
              <TableRow
                key={medication.id}
                className={cn('transition-colors', getRowClass(medication))}
              >
                <TableCell className="font-medium">{medication.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    {medication.category}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{medication.batch_number}</TableCell>
                <TableCell className="text-right tabular-nums">{medication.current_stock}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {medication.reorder_level}
                </TableCell>
                <TableCell>{format(parseISO(medication.expiry_date), 'MMM dd, yyyy')}</TableCell>
                <TableCell className="text-right tabular-nums">
                  ${Number(medication.unit_price).toFixed(2)}
                </TableCell>
                <TableCell>{getStatusBadge(medication)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(medication)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(medication)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Medication</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{medicationToDelete?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
