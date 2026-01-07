import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, AlertTriangle, PackagePlus, ClipboardList, FileImage, Zap, Clock, FileSpreadsheet, TrendingDown, Calendar, Download, FileText, ChevronDown, Plus, DollarSign, LayoutGrid, List, Search, Trash2, CheckSquare, Building2, ArrowRightLeft, RefreshCw, Layers } from 'lucide-react';
import { useBranchInventory, BranchMedication } from '@/hooks/useBranchInventory';
import { useMedications } from '@/hooks/useMedications';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { ReceiveStockModal } from '@/components/inventory/ReceiveStockModal';
import { StockCountModal } from '@/components/inventory/StockCountModal';
import { MultiImageInvoiceScanner } from '@/components/inventory/MultiImageInvoiceScanner';
import { AddMedicationModal } from '@/components/inventory/AddMedicationModal';
import { SmartCSVImportModal } from '@/components/inventory/SmartCSVImportModal';
import { BulkPriceUpdateModal } from '@/components/inventory/BulkPriceUpdateModal';
import { MedicationsTable } from '@/components/inventory/MedicationsTable';
import { InventoryGrid } from '@/components/inventory/InventoryGrid';
import { BulkMarketplaceActions } from '@/components/inventory/BulkMarketplaceActions';
import { CategoryMarketplaceToggle } from '@/components/inventory/CategoryMarketplaceToggle';
import { QuickStockUpdateModal } from '@/components/inventory/QuickStockUpdateModal';
import { InternalTransferModal } from '@/components/inventory/InternalTransferModal';
import { BatchExpiryEntryModal } from '@/components/inventory/BatchExpiryEntryModal';
import { ShelfEntryWizard } from '@/components/inventory/ShelfEntryWizard';
import { SimpleInventoryActions } from '@/components/inventory/SimpleInventoryActions';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { differenceInDays, parseISO, format } from 'date-fns';
import { exportInventoryToPDF, exportInventoryToExcel, downloadFile } from '@/utils/reportExporter';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useBranchContext } from '@/contexts/BranchContext';
import { usePlanLimits } from '@/hooks/usePlanLimits';
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

import { MedicationDetailModal } from '@/components/inventory/MedicationDetailModal';

const Inventory = () => {
  // Use branch-specific inventory for display (clean slate for new branches)
  const {
    medications: branchMedications,
    allCatalogMedications,
    isMainBranch: isBranchMain,
    getMetrics,
    error: branchInventoryError,
  } = useBranchInventory();
  // Also get mutations from useMedications for editing
  const { deleteMedication, updateMedication } = useMedications();
  const { isSimpleMode } = useRegionalSettings();
  
  // Use branch-specific meds for all displays (expiry, low stock, etc.)
  // This ensures new branches show 0 items until stock is transferred
  const medications = branchMedications as unknown as Medication[];
  const [showReceiveStockModal, setShowReceiveStockModal] = useState(false);
  const [showStockCountModal, setShowStockCountModal] = useState(false);
  const [showMultiImageScanner, setShowMultiImageScanner] = useState(false);
  const [showCSVImportModal, setShowCSVImportModal] = useState(false);
  const [showAddMedicationModal, setShowAddMedicationModal] = useState(false);
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [showQuickStockModal, setShowQuickStockModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showBatchEntryModal, setShowBatchEntryModal] = useState(false);
  const [showShelfEntryWizard, setShowShelfEntryWizard] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [detailMedication, setDetailMedication] = useState<Medication | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkShelveOpen, setBulkShelveOpen] = useState(false);
  const [bulkUnshelveOpen, setBulkUnshelveOpen] = useState(false);
  // Prefill data for Add Medication from Photo Expiry Scan
  
  const { pharmacy } = usePharmacy();
  const { currency } = useCurrency();
  const { currentBranchName, isMainBranch } = useBranchContext();
  const { plan } = usePlanLimits();

  const filteredMedications = useMemo(() => {
    let result = medications;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(query) ||
        m.category.toLowerCase().includes(query) ||
        m.batch_number.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [medications, searchQuery]);

  // Sort medications to show selected items first
  const sortedMedications = useMemo(() => {
    if (selectedIds.size === 0) return filteredMedications;
    
    return [...filteredMedications].sort((a, b) => {
      const aSelected = selectedIds.has(a.id) ? 0 : 1;
      const bSelected = selectedIds.has(b.id) ? 0 : 1;
      return aSelected - bSelected;
    });
  }, [filteredMedications, selectedIds]);

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
  // Use branch_stock for branch-specific counts (handles both main and non-main branches)
  const branchMetrics = getMetrics();
  const lowStockCount = branchMetrics.lowStock;
  const totalProducts = branchMetrics.totalSKUs;
  
  // Calculate expiring items with more detail - using branch-specific stock
  // Cast to BranchMedication to access branch_stock
  const branchMeds = branchMedications as BranchMedication[];
  
  const expiringItems = branchMeds.filter(m => {
    const expiryDate = parseISO(m.expiry_date);
    const daysToExpiry = differenceInDays(expiryDate, today);
    return daysToExpiry > 0 && daysToExpiry <= 30 && m.branch_stock > 0;
  });
  
  const expiredItems = branchMeds.filter(m => parseISO(m.expiry_date) <= today && m.branch_stock > 0);
  
  const lowStockMedications = branchMeds
    .filter(m => m.branch_stock > 0 && m.branch_stock <= m.branch_reorder_level)
    .slice(0, 10);
  
  // Items expiring soon sorted by urgency - only show items with stock
  const expiryUrgentItems = branchMeds
    .filter(m => m.branch_stock > 0) // Only items with stock in this branch
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
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-3xl font-bold text-gradient">
                {isSimpleMode ? 'Inventory' : 'Inventory Operations'}
              </h1>
              {plan !== 'starter' && (
                <Badge variant="outline" className="gap-1.5 font-normal">
                  <Building2 className="h-3.5 w-3.5" />
                  {currentBranchName}
                  {isMainBranch && <span className="text-primary">(HQ)</span>}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {isSimpleMode 
                ? 'Add and manage your products'
                : isMainBranch 
                  ? 'Central inventory management - stock levels apply to all branches'
                  : `Managing stock for ${currentBranchName}`
              }
            </p>
          </div>
          {!isSimpleMode && (
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
          )}
        </div>

        {/* Simple Mode: Minimal Quick Actions */}
        {isSimpleMode ? (
          <SimpleInventoryActions
            onAddProducts={() => setShowAddMedicationModal(true)}
            onScanInvoice={() => setShowMultiImageScanner(true)}
            onUpdateStock={() => setShowQuickStockModal(true)}
            onShelfEntry={() => setShowShelfEntryWizard(true)}
          />
        ) : null}

        {/* Rapid Stock Entry Section - Only in Enterprise Mode */}
        {!isSimpleMode && (
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
                <Button onClick={() => setShowShelfEntryWizard(true)} variant="default" size="lg" className="gap-2 bg-gradient-primary hover:opacity-90 btn-glow">
                  <Layers className="h-5 w-5" />
                  Shelf Entry
                  <Badge variant="secondary" className="ml-1 text-xs bg-white/20">Fastest</Badge>
                </Button>
                <Button onClick={() => setShowQuickStockModal(true)} variant="secondary" size="lg" className="gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Quick Stock Update
                </Button>
                <Button onClick={() => setShowTransferModal(true)} variant="outline" size="lg" className="gap-2">
                  <ArrowRightLeft className="h-5 w-5" />
                  Transfer Stock
                </Button>
                <Button onClick={() => setShowReceiveStockModal(true)} variant="outline" size="lg" className="gap-2">
                  <PackagePlus className="h-5 w-5" />
                  Receive Stock
                </Button>
                <Button onClick={() => setShowStockCountModal(true)} variant="outline" size="lg" className="gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Stock Count
                </Button>
                <Button onClick={() => setShowCSVImportModal(true)} variant="outline" size="lg" className="gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  CSV Import
                </Button>
                <Button onClick={() => setShowMultiImageScanner(true)} variant="outline" size="lg" className="gap-2">
                  <FileImage className="h-5 w-5" />
                  Scan Invoice
                  <Badge variant="outline" className="ml-1 text-xs bg-gradient-premium text-white border-0">AI</Badge>
                </Button>
                <Button onClick={() => setShowBatchEntryModal(true)} variant="outline" size="lg" className="gap-2">
                  <Layers className="h-5 w-5" />
                  Batch Entry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
                    const stockPercentage = Math.round((medication.branch_stock / medication.branch_reorder_level) * 100);
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
                          <p className="font-bold text-destructive">{medication.branch_stock}</p>
                          <p className="text-xs text-muted-foreground">
                            / {medication.branch_reorder_level}
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
                {selectedIds.size > 0 && (
                  <Badge variant="default" className="bg-primary text-primary-foreground">
                    {selectedIds.size} selected
                  </Badge>
                )}
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
            {selectedIds.size > 0 ? (
              <div className="flex items-center gap-2 mt-3 p-2 bg-primary/5 rounded-lg flex-wrap">
                <Checkbox
                  checked={selectedIds.size === filteredMedications.length}
                  onCheckedChange={selectAll}
                />
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
                <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                  Clear
                </Button>
                <BulkMarketplaceActions 
                  selectedIds={selectedIds} 
                  onComplete={() => {
                    setSelectedIds(new Set());
                  }}
                />
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
            ) : (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-xs text-muted-foreground">Quick Select:</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const expiredIds = medications
                      .filter(m => parseISO(m.expiry_date) <= new Date())
                      .map(m => m.id);
                    setSelectedIds(new Set(expiredIds));
                  }}
                  disabled={expiredItems.length === 0}
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Expired ({expiredItems.length})
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const lowStockIds = medications
                      .filter(m => m.current_stock <= m.reorder_level)
                      .map(m => m.id);
                    setSelectedIds(new Set(lowStockIds));
                  }}
                  disabled={lowStockCount === 0}
                >
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Low Stock ({lowStockCount})
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const expiringIds = medications
                      .filter(m => {
                        const days = differenceInDays(parseISO(m.expiry_date), new Date());
                        return days > 0 && days <= 30;
                      })
                      .map(m => m.id);
                    setSelectedIds(new Set(expiringIds));
                  }}
                  disabled={expiringItems.length === 0}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Expiring Soon ({expiringItems.length})
                </Button>
                <div className="ml-auto">
                  <CategoryMarketplaceToggle 
                    medications={medications} 
                    onUpdate={() => {}} 
                  />
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {viewMode === 'list' ? (
              <MedicationsTable
                medications={sortedMedications}
                searchQuery=""
                onEdit={handleEdit}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
              />
            ) : (
              <InventoryGrid
                medications={sortedMedications}
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
      
      <MultiImageInvoiceScanner
        open={showMultiImageScanner}
        onOpenChange={setShowMultiImageScanner}
      />
      
      <SmartCSVImportModal
        open={showCSVImportModal}
        onOpenChange={setShowCSVImportModal}
      />
      
      <AddMedicationModal
        open={showAddMedicationModal}
        onOpenChange={(open) => {
          setShowAddMedicationModal(open);
          if (!open) {
            setEditingMedication(null);
          }
        }}
        editingMedication={editingMedication}
      />
      
      <BulkPriceUpdateModal
        open={showBulkPriceModal}
        onOpenChange={setShowBulkPriceModal}
      />

      <QuickStockUpdateModal
        open={showQuickStockModal}
        onOpenChange={setShowQuickStockModal}
        medications={medications.map(m => ({
          id: m.id,
          name: m.name,
          shelf_quantity: m.shelf_quantity ?? m.current_stock,
          store_quantity: m.store_quantity ?? 0,
          current_stock: m.current_stock,
          category: m.category
        }))}
      />

      <InternalTransferModal
        open={showTransferModal}
        onOpenChange={setShowTransferModal}
        medications={medications.map(m => ({
          id: m.id,
          name: m.name,
          shelf_quantity: m.shelf_quantity ?? m.current_stock,
          store_quantity: m.store_quantity ?? 0,
          category: m.category
        }))}
      />

      <BatchExpiryEntryModal
        open={showBatchEntryModal}
        onOpenChange={setShowBatchEntryModal}
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

      {/* Medication Detail Modal */}
      <MedicationDetailModal
        medication={detailMedication}
        open={!!detailMedication}
        onOpenChange={(open) => !open && setDetailMedication(null)}
      />

      {/* Shelf Entry Wizard */}
      <ShelfEntryWizard
        open={showShelfEntryWizard}
        onOpenChange={setShowShelfEntryWizard}
      />
    </div>
  );
};

export default Inventory;
