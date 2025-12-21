import { useState } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Truck, Users, AlertTriangle, ShoppingCart } from 'lucide-react';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useMedications } from '@/hooks/useMedications';
import { SuppliersTable } from '@/components/suppliers/SuppliersTable';
import { ReorderRequestsTable } from '@/components/suppliers/ReorderRequestsTable';
import { LowStockAlerts } from '@/components/suppliers/LowStockAlerts';
import { QuickReorderModal } from '@/components/suppliers/QuickReorderModal';
import { BulkReorderModal } from '@/components/suppliers/BulkReorderModal';
import type { Medication } from '@/types/medication';

const Suppliers = () => {
  const { suppliers, reorderRequests, isLoading } = useSuppliers();
  const { medications } = useMedications();
  const [reorderMedication, setReorderMedication] = useState<Medication | null>(null);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [showBulkReorderModal, setShowBulkReorderModal] = useState(false);

  const activeSuppliers = suppliers.filter(s => s.is_active).length;
  const pendingOrders = reorderRequests.filter(r => 
    ['pending', 'approved', 'ordered', 'shipped'].includes(r.status)
  ).length;
  const lowStockCount = medications.filter(m => m.current_stock <= m.reorder_level).length;

  const handleReorder = (medication: Medication) => {
    setReorderMedication(medication);
    setShowReorderModal(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-primary">
              Supplier Management
            </h1>
            <p className="text-muted-foreground mt-1">
              View suppliers and reorder stock with best price suggestions
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowBulkReorderModal(true)} variant="default">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Bulk Reorder
            </Button>
            <Button onClick={() => setShowReorderModal(true)} variant="outline">
              <Package className="h-4 w-4 mr-2" />
              Quick Reorder
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Suppliers</p>
                  <p className="text-2xl font-bold">{suppliers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Suppliers</p>
                  <p className="text-2xl font-bold">{activeSuppliers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/10">
                  <Truck className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Orders</p>
                  <p className="text-2xl font-bold">{pendingOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock Items</p>
                  <p className="text-2xl font-bold">{lowStockCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="suppliers" className="space-y-4">
              <TabsList>
                <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
                <TabsTrigger value="orders">Reorder Requests</TabsTrigger>
              </TabsList>
              
              <TabsContent value="suppliers">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Your Suppliers</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Add suppliers when stocking medications
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <SuppliersTable />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="orders">
                <Card>
                  <CardHeader>
                    <CardTitle>Reorder Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ReorderRequestsTable />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          <div>
            <LowStockAlerts 
              onReorder={handleReorder} 
              onBulkReorder={() => setShowBulkReorderModal(true)}
            />
          </div>
        </div>
      </main>
      
      <QuickReorderModal
        open={showReorderModal}
        onOpenChange={setShowReorderModal}
        medication={reorderMedication}
      />
      
      <BulkReorderModal
        open={showBulkReorderModal}
        onOpenChange={setShowBulkReorderModal}
      />
    </div>
  );
};

export default Suppliers;