import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, AlertTriangle, XCircle, Clock, Plus, ShoppingCart, Upload, Zap, Archive } from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { Medication } from '@/types/medication';
import { Header } from '@/components/Header';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { InventoryCharts } from '@/components/dashboard/InventoryCharts';
import { FinancialSummary } from '@/components/dashboard/FinancialSummary';
import { MedicationsTable } from '@/components/inventory/MedicationsTable';
import { AddMedicationModal } from '@/components/inventory/AddMedicationModal';
import { CSVImportModal } from '@/components/inventory/CSVImportModal';
import { AISearchBar } from '@/components/inventory/AISearchBar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
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

// Bulk unshelve button component
const BulkUnshelveButton = ({ medications }: { medications: Medication[] }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { updateMedication, isExpired } = useMedications();
  const { toast } = useToast();

  const expiredShelved = medications.filter(m => isExpired(m.expiry_date) && m.is_shelved !== false);

  const handleBulkUnshelve = async () => {
    let successCount = 0;
    for (const med of expiredShelved) {
      try {
        await updateMedication.mutateAsync({ id: med.id, is_shelved: false });
        successCount++;
      } catch (error) {
        console.error(`Failed to unshelve ${med.name}:`, error);
      }
    }
    toast({
      title: `✓ ${successCount} expired items unshelved`,
      description: 'Removed from active inventory to prevent accidental sales',
    });
    setDialogOpen(false);
  };

  if (expiredShelved.length === 0) return null;

  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        variant="outline"
        className="gap-2 h-11 border-destructive/50 text-destructive hover:bg-destructive/10"
      >
        <Archive className="h-4 w-4" />
        Unshelve {expiredShelved.length} Expired
      </Button>
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unshelve All Expired Medications?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unshelve <strong>{expiredShelved.length}</strong> expired medications, 
              removing them from active inventory. They won't appear in POS and won't be sold to customers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkUnshelve}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Unshelve All Expired
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const Index = () => {
  const { medications, isLoading, getMetrics, isLowStock } = useMedications();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);

  const metrics = getMetrics();

  // Low stock notifications
  useEffect(() => {
    if (!isLoading && medications.length > 0) {
      const lowStockItems = medications.filter(m => isLowStock(m.current_stock, m.reorder_level));
      if (lowStockItems.length > 0) {
        toast({
          title: `⚠️ Low Stock Alert`,
          description: `${lowStockItems.length} item(s) are below reorder level`,
          variant: 'destructive',
        });
      }
    }
  }, [isLoading]);

  const handleEdit = (medication: Medication) => {
    setEditingMedication(medication);
    setIsModalOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setEditingMedication(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8">
        {/* Hero Section */}
        <section className="mb-10 animate-fade-in">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold font-display tracking-tight mb-2">
                Dashboard <span className="text-gradient">Overview</span>
              </h1>
              <p className="text-muted-foreground max-w-xl">
                Real-time inventory analytics and AI-powered insights to prevent losses and optimize stock levels.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/checkout">
                <Button className="gap-2 bg-gradient-primary hover:opacity-90 shadow-glow-primary btn-glow h-11 px-6">
                  <ShoppingCart className="h-5 w-5" />
                  POS Checkout
                </Button>
              </Link>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary font-medium">AI Active</span>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Metrics */}
        <section className="mb-10">
          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-2xl bg-muted/50" />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Total SKUs"
                value={metrics.totalSKUs}
                icon={<Package className="h-7 w-7" />}
                variant="primary"
                subtitle="Active medications"
                trend={12}
                trendLabel="vs last month"
              />
              <MetricCard
                title="Low Stock"
                value={metrics.lowStockItems}
                icon={<AlertTriangle className="h-7 w-7" />}
                variant="warning"
                subtitle="Below reorder level"
                trend={-8}
                trendLabel="improved"
              />
              <MetricCard
                title="Expired"
                value={metrics.expiredItems}
                icon={<XCircle className="h-7 w-7" />}
                variant="danger"
                subtitle="Require disposal"
              />
              <MetricCard
                title="Expiring Soon"
                value={metrics.expiringWithin30Days}
                icon={<Clock className="h-7 w-7" />}
                variant="success"
                subtitle="Within 30 days"
              />
            </div>
          )}
        </section>

        {/* Financial Summary */}
        {!isLoading && medications.length > 0 && (
          <section className="mb-10 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <FinancialSummary medications={medications} />
          </section>
        )}

        {/* Charts & AI Insights Row */}
        {!isLoading && medications.length > 0 && (
          <section className="grid gap-8 lg:grid-cols-2 mb-10">
            <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
              <InventoryCharts medications={medications} />
            </div>
            <div className="animate-slide-up" style={{ animationDelay: '250ms' }}>
              <AIInsightsPanel medications={medications} />
            </div>
          </section>
        )}

        {/* Inventory Management */}
        <section className="mb-10 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="glass-card rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold font-display">Inventory Management</h2>
                <p className="text-sm text-muted-foreground">Track, manage, and optimize your stock</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {metrics.expiredItems > 0 && (
                  <BulkUnshelveButton medications={medications} />
                )}
                <Button
                  onClick={() => setIsCSVModalOpen(true)}
                  variant="outline"
                  className="gap-2 h-11"
                >
                  <Upload className="h-4 w-4" />
                  Import CSV
                </Button>
                <Button
                  onClick={() => setIsModalOpen(true)}
                  className="gap-2 bg-gradient-primary hover:opacity-90 shadow-glow-primary btn-glow h-11 px-6"
                >
                  <Plus className="h-5 w-5" />
                  Add Medication
                </Button>
              </div>
            </div>

            <div className="mb-6">
              <AISearchBar
                onSearch={setSearchQuery}
                placeholder="Search by name, category, or try 'Which drugs expire next month?'"
              />
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl bg-muted/50" />
                ))}
              </div>
            ) : (
              <MedicationsTable
                medications={medications}
                searchQuery={searchQuery}
                onEdit={handleEdit}
              />
            )}
          </div>
        </section>
      </main>

      <AddMedicationModal
        open={isModalOpen}
        onOpenChange={handleModalClose}
        editingMedication={editingMedication}
      />

      <CSVImportModal
        open={isCSVModalOpen}
        onOpenChange={setIsCSVModalOpen}
      />
    </div>
  );
};

export default Index;