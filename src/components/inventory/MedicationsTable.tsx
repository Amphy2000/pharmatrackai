import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Edit2, Trash2, MoreHorizontal, Package, ChevronDown, ChevronUp, Archive, ArchiveRestore, Filter, Link2Off, Hash, Loader2, Printer, Globe, GlobeLock, Star, StarOff } from 'lucide-react';
import { Medication } from '@/types/medication';
import { BarcodeLabelPrinter } from './BarcodeLabelPrinter';
import { FeatureDurationSelect } from './FeatureDurationSelect';
import { useMedications } from '@/hooks/useMedications';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  DropdownMenuSeparator,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MedicationsTableProps {
  medications: Medication[];
  searchQuery: string;
  onEdit: (medication: Medication) => void;
}

const ITEMS_PER_PAGE = 10;

export const MedicationsTable = ({ medications, searchQuery, onEdit }: MedicationsTableProps) => {
  const { deleteMedication, updateMedication, isExpired, isLowStock, isExpiringSoon } = useMedications();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [medicationToDelete, setMedicationToDelete] = useState<Medication | null>(null);
  const [shelvingDialogOpen, setShelvingDialogOpen] = useState(false);
  const [medicationToShelve, setMedicationToShelve] = useState<Medication | null>(null);
  const [shelvingAction, setShelvingAction] = useState<'shelve' | 'unshelve'>('unshelve');
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<'all' | 'shelved' | 'unshelved' | 'expired' | 'low-stock' | 'no-barcode'>('all');
  const [generatingCodeFor, setGeneratingCodeFor] = useState<string | null>(null);
  const [printLabelMedication, setPrintLabelMedication] = useState<Medication | null>(null);
  const [featureMedication, setFeatureMedication] = useState<Medication | null>(null);

  const filteredMedications = useMemo(() => {
    let filtered = medications.filter((med) => {
      const query = searchQuery.toLowerCase().trim();
      
      // Handle special keywords for status-based filtering
      if (query === 'expired') {
        return isExpired(med.expiry_date);
      }
      if (query === 'expiring' || query === 'expiring soon') {
        return isExpiringSoon(med.expiry_date);
      }
      if (query === 'low stock' || query === 'low' || query === 'reorder') {
        return isLowStock(med.current_stock, med.reorder_level);
      }
      if (query === 'in stock' || query === 'available') {
        return !isExpired(med.expiry_date) && !isLowStock(med.current_stock, med.reorder_level);
      }
      if (query === 'unshelved' || query === 'off shelf') {
        return med.is_shelved === false;
      }
      
      // Regular text search
      return (
        med.name.toLowerCase().includes(query) ||
        med.category.toLowerCase().includes(query) ||
        med.batch_number.toLowerCase().includes(query) ||
        (med.supplier && med.supplier.toLowerCase().includes(query))
      );
    });

    // Apply filter status
    if (filterStatus === 'shelved') {
      filtered = filtered.filter(m => m.is_shelved !== false);
    } else if (filterStatus === 'unshelved') {
      filtered = filtered.filter(m => m.is_shelved === false);
    } else if (filterStatus === 'expired') {
      filtered = filtered.filter(m => isExpired(m.expiry_date));
    } else if (filterStatus === 'low-stock') {
      filtered = filtered.filter(m => isLowStock(m.current_stock, m.reorder_level));
    } else if (filterStatus === 'no-barcode') {
      filtered = filtered.filter(m => !m.barcode_id);
    }

    return filtered;
  }, [medications, searchQuery, filterStatus, isExpired, isExpiringSoon, isLowStock]);

  const totalPages = Math.ceil(filteredMedications.length / ITEMS_PER_PAGE);
  const paginatedMedications = filteredMedications.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Count by status
  const statusCounts = useMemo(() => ({
    total: medications.length,
    shelved: medications.filter(m => m.is_shelved !== false).length,
    unshelved: medications.filter(m => m.is_shelved === false).length,
    expired: medications.filter(m => isExpired(m.expiry_date)).length,
    lowStock: medications.filter(m => isLowStock(m.current_stock, m.reorder_level)).length,
    noBarcode: medications.filter(m => !m.barcode_id).length,
  }), [medications, isExpired, isLowStock]);

  // Generate internal barcode
  const handleGenerateInternalCode = async (medication: Medication) => {
    setGeneratingCodeFor(medication.id);
    try {
      const { data, error } = await supabase.rpc('generate_internal_barcode');
      if (error) throw error;
      
      await updateMedication.mutateAsync({
        id: medication.id,
        barcode_id: data as string,
      });

      toast({
        title: 'Internal Code Generated',
        description: `Code "${data}" assigned to ${medication.name}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate internal code',
        variant: 'destructive',
      });
    } finally {
      setGeneratingCodeFor(null);
    }
  };

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

  const handleShelving = (medication: Medication, action: 'shelve' | 'unshelve') => {
    setMedicationToShelve(medication);
    setShelvingAction(action);
    setShelvingDialogOpen(true);
  };

  const confirmShelving = () => {
    if (medicationToShelve) {
      updateMedication.mutate({
        id: medicationToShelve.id,
        is_shelved: shelvingAction === 'shelve',
      });
    }
    setShelvingDialogOpen(false);
    setMedicationToShelve(null);
  };

  const getRowClass = (medication: Medication) => {
    if (medication.is_shelved === false) return 'bg-muted/30 opacity-70';
    if (isExpired(medication.expiry_date)) return 'row-expired';
    if (isLowStock(medication.current_stock, medication.reorder_level)) return 'row-low-stock';
    return '';
  };

  const getStatusBadge = (medication: Medication) => {
    if (medication.is_shelved === false) {
      return <Badge variant="outline" className="text-xs border-muted-foreground/50">Unshelved</Badge>;
    }
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

  if (filteredMedications.length === 0 && searchQuery === '' && filterStatus === 'all') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium text-foreground">No medications found</h3>
        <p className="text-sm text-muted-foreground">
          Add your first medication to get started
        </p>
      </div>
    );
  }

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          {/* Header with toggle and filters */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span className="font-semibold">
                  Inventory ({filteredMedications.length} items)
                </span>
              </Button>
            </CollapsibleTrigger>
            
            <div className="flex items-center gap-2">
              {/* Status counts */}
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground mr-4">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-success"></span>
                  {statusCounts.shelved} shelved
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground"></span>
                  {statusCounts.unshelved} unshelved
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-destructive"></span>
                  {statusCounts.expired} expired
                </span>
                {statusCounts.noBarcode > 0 && (
                  <span className="flex items-center gap-1">
                    <Link2Off className="w-3 h-3 text-amber-500" />
                    {statusCounts.noBarcode} no barcode
                  </span>
                )}
              </div>
              
              {/* Filter dropdown */}
              <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v as typeof filterStatus); setCurrentPage(1); }}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="shelved">Shelved Only</SelectItem>
                  <SelectItem value="unshelved">Unshelved</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="no-barcode">No Barcode</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <CollapsibleContent>
            {filteredMedications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="mb-4 h-10 w-10 text-muted-foreground opacity-50" />
                <h3 className="text-base font-medium text-foreground">No medications match your filters</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="font-semibold">Batch No.</TableHead>
                      <TableHead className="font-semibold text-right">Stock</TableHead>
                      <TableHead className="font-semibold text-right">Reorder</TableHead>
                      <TableHead className="font-semibold">Expiry</TableHead>
                      <TableHead className="font-semibold text-right">Price</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMedications.map((medication) => (
                      <TableRow
                        key={medication.id}
                        className={cn('transition-colors', getRowClass(medication))}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {medication.name}
                            {medication.is_shelved === false && (
                              <Archive className="h-3 w-3 text-muted-foreground" />
                            )}
                            {!medication.barcode_id && (
                              <Link2Off className="h-3 w-3 text-amber-500" />
                            )}
                          </div>
                        </TableCell>
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
                          {formatPrice(Number(medication.unit_price))}
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
                              {!medication.barcode_id && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleGenerateInternalCode(medication)}
                                    disabled={generatingCodeFor === medication.id}
                                  >
                                    {generatingCodeFor === medication.id ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <Hash className="mr-2 h-4 w-4" />
                                    )}
                                    Generate Internal Code
                                  </DropdownMenuItem>
                                </>
                              )}
                              {medication.barcode_id && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setPrintLabelMedication(medication)}>
                                    <Printer className="mr-2 h-4 w-4" />
                                    Print Barcode Label
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              {/* Marketplace Toggle */}
                              <DropdownMenuItem 
                                onClick={async () => {
                                  await updateMedication.mutateAsync({
                                    id: medication.id,
                                    is_public: !medication.is_public,
                                  });
                                  toast({
                                    title: medication.is_public ? "Removed from Marketplace" : "Listed on Marketplace",
                                    description: medication.is_public 
                                      ? "Product is no longer visible publicly" 
                                      : "Product is now visible on the public marketplace",
                                  });
                                }}
                                className={medication.is_public ? "text-marketplace" : ""}
                              >
                                {medication.is_public ? (
                                  <>
                                    <Globe className="mr-2 h-4 w-4" />
                                    Listed on Marketplace
                                  </>
                                ) : (
                                  <>
                                    <GlobeLock className="mr-2 h-4 w-4" />
                                    List on Marketplace
                                  </>
                                )}
                              </DropdownMenuItem>
                              {/* Feature Product Toggle */}
                              {medication.is_featured ? (
                                <DropdownMenuItem 
                                  onClick={async () => {
                                    await updateMedication.mutateAsync({
                                      id: medication.id,
                                      is_featured: false,
                                      featured_until: null,
                                    });
                                    toast({
                                      title: "Removed from Spotlight",
                                      description: "Product is no longer featured in the marketplace",
                                    });
                                  }}
                                  className="text-marketplace"
                                >
                                  <StarOff className="mr-2 h-4 w-4" />
                                  Remove from Spotlight
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  onClick={() => setFeatureMedication(medication)}
                                  className="text-marketplace"
                                >
                                  <Star className="mr-2 h-4 w-4" />
                                  Feature in Spotlight
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {medication.is_shelved === false ? (
                                <DropdownMenuItem onClick={() => handleShelving(medication, 'shelve')}>
                                  <ArchiveRestore className="mr-2 h-4 w-4" />
                                  Reshelve
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  onClick={() => handleShelving(medication, 'unshelve')}
                                  className="text-amber-600 focus:text-amber-600"
                                >
                                  <Archive className="mr-2 h-4 w-4" />
                                  Unshelve
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredMedications.length)} of {filteredMedications.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Delete Dialog */}
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

      {/* Shelving Dialog */}
      <AlertDialog open={shelvingDialogOpen} onOpenChange={setShelvingDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {shelvingAction === 'shelve' ? 'Reshelve Medication' : 'Unshelve Medication'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {shelvingAction === 'shelve' ? (
                <>
                  Return <strong>{medicationToShelve?.name}</strong> to the shelf? This will make it available for sale again.
                </>
              ) : (
                <>
                  Remove <strong>{medicationToShelve?.name}</strong> from the shelf? 
                  {isExpired(medicationToShelve?.expiry_date || '') && ' This item is expired and should be disposed of.'}
                  {medicationToShelve?.current_stock === 0 && ' This item is out of stock.'}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmShelving}
              className={shelvingAction === 'unshelve' ? 'bg-amber-600 hover:bg-amber-700' : ''}
            >
              {shelvingAction === 'shelve' ? 'Reshelve' : 'Unshelve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Barcode Label Printer Modal */}
      <BarcodeLabelPrinter
        medication={printLabelMedication}
        open={!!printLabelMedication}
        onOpenChange={(open) => !open && setPrintLabelMedication(null)}
      />

      {/* Feature Duration Select Modal */}
      <FeatureDurationSelect
        medicationId={featureMedication?.id || ''}
        medicationName={featureMedication?.name || ''}
        open={!!featureMedication}
        onOpenChange={(open) => !open && setFeatureMedication(null)}
      />
    </>
  );
};