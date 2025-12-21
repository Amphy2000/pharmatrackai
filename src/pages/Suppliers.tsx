import { useState } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Users, AlertTriangle, ShoppingCart, PackagePlus, ClipboardList, FileImage, Zap } from 'lucide-react';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useMedications } from '@/hooks/useMedications';
import { SuppliersTable } from '@/components/suppliers/SuppliersTable';
import { LowStockAlerts } from '@/components/suppliers/LowStockAlerts';
import { QuickReorderModal } from '@/components/suppliers/QuickReorderModal';
import { BulkReorderModal } from '@/components/suppliers/BulkReorderModal';
import { ReceiveStockModal } from '@/components/inventory/ReceiveStockModal';
import { StockCountModal } from '@/components/inventory/StockCountModal';
import { InvoiceScannerModal } from '@/components/inventory/InvoiceScannerModal';
import type { Medication } from '@/types/medication';

const Suppliers = () => {
  const { suppliers } = useSuppliers();
  const { medications } = useMedications();
  const [reorderMedication, setReorderMedication] = useState<Medication | null>(null);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [showBulkReorderModal, setShowBulkReorderModal] = useState(false);
  const [showReceiveStockModal, setShowReceiveStockModal] = useState(false);
  const [showStockCountModal, setShowStockCountModal] = useState(false);
  const [showInvoiceScannerModal, setShowInvoiceScannerModal] = useState(false);

  const activeSuppliers = suppliers.filter(s => s.is_active).length;
  const lowStockCount = medications.filter(m => m.current_stock <= m.reorder_level).length;
  const totalProducts = medications.length;

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
              Suppliers & Restocking
            </h1>
            <p className="text-muted-foreground mt-1">
              View suppliers, compare prices, and manage inventory
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setShowBulkReorderModal(true)} variant="default">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Bulk Reorder
            </Button>
            <Button onClick={() => setShowReorderModal(true)} variant="outline">
              <Package className="h-4 w-4 mr-2" />
              Quick Order
            </Button>
          </div>
        </div>

        {/* Rapid Stock Entry Section */}
        <Card className="mb-8 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-primary" />
              Rapid Stock Entry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Fast inventory management tools to save time during stocking
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setShowReceiveStockModal(true)} variant="default" size="lg" className="gap-2">
                <PackagePlus className="h-5 w-5" />
                Receive Stock
                <span className="text-xs opacity-70 ml-1">Rapid Scan</span>
              </Button>
              <Button onClick={() => setShowStockCountModal(true)} variant="secondary" size="lg" className="gap-2">
                <ClipboardList className="h-5 w-5" />
                Stock Count
                <span className="text-xs opacity-70 ml-1">Quick Entry</span>
              </Button>
              <Button onClick={() => setShowInvoiceScannerModal(true)} variant="outline" size="lg" className="gap-2">
                <FileImage className="h-5 w-5" />
                Scan Invoice
                <span className="text-xs opacity-70 ml-1">AI Powered</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
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
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <Package className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold">{totalProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Your Suppliers</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Suppliers are added when stocking medications
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <SuppliersTable />
              </CardContent>
            </Card>
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
    </div>
  );
};

export default Suppliers;
