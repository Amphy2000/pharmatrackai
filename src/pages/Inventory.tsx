import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, AlertTriangle, PackagePlus, ClipboardList, FileImage, Zap, Clock, FileSpreadsheet, TrendingDown, Calendar, Download, FileText, ChevronDown, Plus, DollarSign, LayoutGrid, List, Search, Trash2, CheckSquare } from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { ReceiveStockModal } from '@/components/inventory/ReceiveStockModal';
import { StockCountModal } from '@/components/inventory/StockCountModal';
import { InvoiceScannerModal } from '@/components/inventory/InvoiceScannerModal';
import { AddMedicationModal } from '@/components/inventory/AddMedicationModal';
import { StockCSVImportModal } from '@/components/inventory/StockCSVImportModal';
import { BulkPriceUpdateModal } from '@/components/inventory/BulkPriceUpdateModal';
import { MedicationsTable } from '@/components/inventory/MedicationsTable';
import { InventoryGrid } from '@/components/inventory/InventoryGrid';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { differenceInDays, parseISO, format } from 'date-fns';
import { exportInventoryToPDF, exportInventoryToExcel, downloadFile } from '@/utils/reportExporter';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';
import { Medication } from '@/types/medication';
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

const Inventory = () => {
  const { medications, deleteMedication, updateMedication } = useMedications();
  const [showReceiveStockModal, setShowReceiveStockModal] = useState(false);
  const [showStockCountModal, setShowStockCountModal] = useState(false);
  const [showInvoiceScannerModal, setShowInvoiceScannerModal] = useState(false);
  const [showCSVImportModal, setShowCSVImportModal] = useState(false);
  const [showAddMedicationModal, setShowAddMedicationModal] = useState(false);
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkShelveOpen, setBulkShelveOpen] = useState(false);
  const [bulkUnshelveOpen, setBulkUnshelveOpen] = useState(false);
  const { pharmacy } = usePharmacy();
  const { currency } = useCurrency();

  const filteredMedications = useMemo(() => {
    if (!searchQuery) return medications;
    const query = searchQuery.toLowerCase();
    return medications.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.category.toLowerCase().includes(query) ||
      m.batch_number.toLowerCase().includes(query)
    );
  }, [medications, searchQuery]);

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredMedications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMedications.map(m => m.id)));
    }
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteMedication.mutateAsync(id);
    }
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
    toast.success(`Deleted ${selectedIds.size} items`);
  };

  const handleBulkShelve = async () => {
    for (const id of selectedIds) {
      await updateMedication.mutateAsync({ id, is_shelved: true });
    }
    setSelectedIds(new Set());
    setBulkShelveOpen(false);
    toast.success(`Shelved ${selectedIds.size} items`);
  };

  const handleBulkUnshelve = async () => {
    for (const id of selectedIds) {
      await updateMedication.mutateAsync({ id, is_shelved: false });
    }
    setSelectedIds(new Set());
    setBulkUnshelveOpen(false);
    toast.success(`Unshelved ${selectedIds.size} items`);
  };

  const handleEdit = (medication: Medication) => {
    setEditingMedication(medication);
    setShowAddMedicationModal(true);
  };

  const handleExportPDF = () => {
    if (medications.length === 0) {
      toast.error('No inventory data to export');
      return;
    }
    const doc = exportInventoryToPDF(
      medications.map(m => ({
        ...m,
        selling_price: m.selling_price ?? m.unit_price
      })),
      pharmacy?.name || 'Pharmacy',
      currency as 'USD' | 'NGN' | 'GBP' | 'EUR'
    );
    doc.save(`inventory-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF report downloaded');
  };

  const handleExportExcel = () => {
    if (medications.length === 0) {
      toast.error('No inventory data to export');
      return;
    }
    const csv = exportInventoryToExcel(
      medications.map(m => ({
        ...m,
        selling_price: m.selling_price ?? m.unit_price
      })),
      currency as 'USD' | 'NGN' | 'GBP' | 'EUR'
    );
    downloadFile(csv, `inventory-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast.success('Excel report downloaded');
  };

  const today = new Date();
  const lowStockCount = medications.filter(m => m.current_stock <= m.reorder_level).length;
  const totalProducts = medications.length;
  
  // Calculate expiring items with more detail
  const expiringItems = medications.filter(m => {
    const expiryDate = parseISO(m.expiry_date);
    const daysToExpiry = differenceInDays(expiryDate, today);
    return daysToExpiry > 0 && daysToExpiry <= 30;
  });
  
  const expiredItems = medications.filter(m => parseISO(m.expiry_date) <= today);
  
  const lowStockMedications = medications
    .filter(m => m.current_stock <= m.reorder_level)
    .slice(0, 10);
  
  // Items expiring soon sorted by urgency
  const expiryUrgentItems = medications
    .map(m => ({
      ...m,
      daysToExpiry: differenceInDays(parseISO(m.expiry_date), today)
    }))
    .filter(m => m.daysToExpiry > 0 && m.daysToExpiry <= 90)
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry)
    .slice(0, 8);

  const getExpiryColor = (days: number) => {
    if (days <= 7) return 'destructive';
    if (days <= 30) return 'warning';
    return 'secondary';
  };

  const getExpiryProgress = (days: number) => {
    if (days <= 0) return 100;
    if (days >= 90) return 0;
    return Math.round(100 - (days / 90) * 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-gradient">
              Inventory Operations
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage stock receiving, counting, and inventory tasks
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={() => setShowBulkPriceModal(true)} variant="outline" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Bulk Pricing
            </Button>
            <Button onClick={() => setShowAddMedicationModal(true)} className="gap-2 bg-gradient-primary hover:opacity-90 btn-glow">
              <Plus className="h-4 w-4" />
              Add New Medication
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export Report
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Export as Excel (CSV)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Rapid Stock Entry Section */}
        <Card className="mb-8 border-primary/20 glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-gradient-primary">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              Rapid Stock Entry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Fast inventory management tools to save time during stocking
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setShowReceiveStockModal(true)} variant="default" size="lg" className="gap-2 btn-glow">
                <PackagePlus className="h-5 w-5" />
                Receive Stock
                <Badge variant="secondary" className="ml-1 text-xs">Scan</Badge>
              </Button>
              <Button onClick={() => setShowStockCountModal(true)} variant="secondary" size="lg" className="gap-2">
                <ClipboardList className="h-5 w-5" />
                Stock Count
                <Badge variant="outline" className="ml-1 text-xs">Quick</Badge>
              </Button>
              <Button onClick={() => setShowCSVImportModal(true)} variant="outline" size="lg" className="gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                CSV Import
                <Badge variant="outline" className="ml-1 text-xs">Bulk</Badge>
              </Button>
              <Button onClick={() => setShowInvoiceScannerModal(true)} variant="outline" size="lg" className="gap-2">
                <FileImage className="h-5 w-5" />
                Scan Invoice
                <Badge variant="outline" className="ml-1 text-xs bg-gradient-premium text-white border-0">AI</Badge>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="metric-card group">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="metric-card-icon bg-destructive/20 group-hover:shadow-glow-danger">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-bold">{lowStockCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="metric-card group">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="metric-card-icon bg-warning/20 group-hover:shadow-glow-warning">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expiring (30d)</p>
                  <p className="text-2xl font-bold">{expiringItems.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="metric-card group">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="metric-card-icon bg-destructive/20 group-hover:shadow-glow-danger">
                  <TrendingDown className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expired</p>
                  <p className="text-2xl font-bold">{expiredItems.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="metric-card group">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="metric-card-icon bg-success/20 group-hover:shadow-glow-success">
                  <Package className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total SKUs</p>
                  <p className="text-2xl font-bold">{totalProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expiry Timeline */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-warning" />
                Expiry Timeline
                <Badge variant="outline" className="ml-auto">FEFO Tracking</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expiryUrgentItems.length === 0 ? (
                <div className="text-center py-8">
                  <div className="p-4 rounded-full bg-success/10 inline-block mb-3">
                    <Package className="h-8 w-8 text-success" />
                  </div>
                  <p className="text-muted-foreground">No items expiring within 90 days</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expiryUrgentItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getExpiryColor(item.daysToExpiry) as any} className="text-xs">
                            {item.daysToExpiry <= 7 ? 'Critical' : item.daysToExpiry <= 30 ? 'Soon' : 'Upcoming'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Batch: {item.batch_number}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-bold ${item.daysToExpiry <= 7 ? 'text-destructive' : item.daysToExpiry <= 30 ? 'text-warning' : 'text-muted-foreground'}`}>
                          {item.daysToExpiry}d
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(item.expiry_date), 'MMM d')}
                        </p>
                      </div>
                      <div className="w-16">
                        <Progress 
                          value={getExpiryProgress(item.daysToExpiry)} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockMedications.length === 0 ? (
                <div className="text-center py-8">
                  <div className="p-4 rounded-full bg-success/10 inline-block mb-3">
                    <Package className="h-8 w-8 text-success" />
                  </div>
                  <p className="text-muted-foreground">All items are well stocked!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lowStockMedications.map((medication) => {
                    const stockPercentage = Math.round((medication.current_stock / medication.reorder_level) * 100);
                    return (
                      <div
                        key={medication.id}
                        className="flex items-center gap-4 p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{medication.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {medication.category} • Batch: {medication.batch_number}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-destructive">{medication.current_stock}</p>
                          <p className="text-xs text-muted-foreground">
                            / {medication.reorder_level}
                          </p>
                        </div>
                        <div className="w-16">
                          <Progress 
                            value={Math.min(stockPercentage, 100)} 
                            className="h-2"
                          />
                        </div>
                      </div>
                    );
                  })}
                  {lowStockCount > 10 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      And {lowStockCount - 10} more items...
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Inventory List/Grid Section */}
        <Card className="glass-card mt-6">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-primary" />
                Product Inventory
                <Badge variant="secondary">{filteredMedications.length} items</Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                {/* View Toggle */}
                <div className="flex border rounded-lg overflow-hidden">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none h-9 px-3"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none h-9 px-3"
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 mt-3 p-2 bg-primary/5 rounded-lg flex-wrap">
                <Checkbox
                  checked={selectedIds.size === filteredMedications.length}
                  onCheckedChange={selectAll}
                />
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
                <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                  Clear
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setBulkShelveOpen(true)}>
                  <CheckSquare className="h-3 w-3 mr-1" />
                  Shelve
                </Button>
                <Button variant="outline" size="sm" onClick={() => setBulkUnshelveOpen(true)}>
                  <Package className="h-3 w-3 mr-1" />
                  Unshelve
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {viewMode === 'list' ? (
              <MedicationsTable
                medications={filteredMedications}
                searchQuery=""
                onEdit={handleEdit}
              />
            ) : (
              <InventoryGrid
                medications={filteredMedications}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onEdit={handleEdit}
              />
            )}
          </CardContent>
        </Card>
      </main>
      
      <ReceiveStockModal
        open={showReceiveStockModal}
        onOpenChange={setShowReceiveStockModal}
      />
      
      <StockCountModal
        open={showStockCountModal}
        onOpenChange={setShowStockCountModal}
      />
      
      <InvoiceScannerModal
        open={showInvoiceScannerModal}
        onOpenChange={setShowInvoiceScannerModal}
      />
      
      <StockCSVImportModal
        open={showCSVImportModal}
        onOpenChange={setShowCSVImportModal}
      />
      
      <AddMedicationModal
        open={showAddMedicationModal}
        onOpenChange={(open) => {
          setShowAddMedicationModal(open);
          if (!open) setEditingMedication(null);
        }}
        editingMedication={editingMedication}
      />
      
      <BulkPriceUpdateModal
        open={showBulkPriceModal}
        onOpenChange={setShowBulkPriceModal}
      />

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} items?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Selected medications will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Shelve Dialog */}
      <AlertDialog open={bulkShelveOpen} onOpenChange={setBulkShelveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Shelve {selectedIds.size} items?</AlertDialogTitle>
            <AlertDialogDescription>
              Selected medications will be marked as shelved and available for sale.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkShelve}>Shelve All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Unshelve Dialog */}
      <AlertDialog open={bulkUnshelveOpen} onOpenChange={setBulkUnshelveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unshelve {selectedIds.size} items?</AlertDialogTitle>
            <AlertDialogDescription>
              Selected medications will be marked as unshelved (e.g., expired or returned stock).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkUnshelve}>Unshelve All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Inventory;
