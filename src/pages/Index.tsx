import { useState } from 'react';
import { Package, AlertTriangle, XCircle, Clock, Plus, RefreshCw } from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { Medication } from '@/types/medication';
import { Header } from '@/components/Header';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { MedicationsTable } from '@/components/inventory/MedicationsTable';
import { AddMedicationModal } from '@/components/inventory/AddMedicationModal';
import { AISearchBar } from '@/components/inventory/AISearchBar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const { medications, isLoading, getMetrics } = useMedications();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);

  const metrics = getMetrics();

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

      <main className="container mx-auto px-4 py-8">
        {/* Dashboard Metrics */}
        <section className="mb-8">
          <h2 className="mb-6 text-2xl font-bold font-display text-foreground">Dashboard Overview</h2>
          
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Total SKUs"
                value={metrics.totalSKUs}
                icon={<Package className="h-6 w-6" />}
                variant="primary"
                subtitle="Active medications"
              />
              <MetricCard
                title="Low Stock Items"
                value={metrics.lowStockItems}
                icon={<AlertTriangle className="h-6 w-6" />}
                variant="warning"
                subtitle="Below reorder level"
              />
              <MetricCard
                title="Expired Products"
                value={metrics.expiredItems}
                icon={<XCircle className="h-6 w-6" />}
                variant="danger"
                subtitle="Require disposal"
              />
              <MetricCard
                title="Expiring Soon"
                value={metrics.expiringWithin30Days}
                icon={<Clock className="h-6 w-6" />}
                variant="success"
                subtitle="Within 30 days"
              />
            </div>
          )}
        </section>

        {/* AI Insights */}
        <section className="mb-8">
          <AIInsightsPanel medications={medications} />
        </section>

        {/* Inventory Management */}
        <section>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold font-display text-foreground">Inventory Management</h2>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="gap-2 bg-gradient-primary hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add Medication
            </Button>
          </div>

          <div className="mb-6">
            <AISearchBar
              onSearch={setSearchQuery}
              placeholder="Try 'Which drugs expire next month?' or search by name..."
            />
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : (
            <MedicationsTable
              medications={medications}
              searchQuery={searchQuery}
              onEdit={handleEdit}
            />
          )}
        </section>
      </main>

      <AddMedicationModal
        open={isModalOpen}
        onOpenChange={handleModalClose}
        editingMedication={editingMedication}
      />
    </div>
  );
};

export default Index;
