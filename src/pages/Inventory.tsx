import { useState } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, AlertTriangle, PackagePlus, ClipboardList, FileImage, Zap, Clock } from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { ReceiveStockModal } from '@/components/inventory/ReceiveStockModal';
import { StockCountModal } from '@/components/inventory/StockCountModal';
import { InvoiceScannerModal } from '@/components/inventory/InvoiceScannerModal';

const Inventory = () => {
  const { medications } = useMedications();
  const [showReceiveStockModal, setShowReceiveStockModal] = useState(false);
  const [showStockCountModal, setShowStockCountModal] = useState(false);
  const [showInvoiceScannerModal, setShowInvoiceScannerModal] = useState(false);

  const lowStockCount = medications.filter(m => m.current_stock <= m.reorder_level).length;
  const totalProducts = medications.length;
  const expiringSoon = medications.filter(m => {
    const expiryDate = new Date(m.expiry_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow && expiryDate > new Date();
  }).length;

  const lowStockMedications = medications
    .filter(m => m.current_stock <= m.reorder_level)
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-primary">
              Inventory Operations
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage stock receiving, counting, and inventory tasks
            </p>
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
                <div className="p-3 rounded-full bg-warning/10">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expiring Soon</p>
                  <p className="text-2xl font-bold">{expiringSoon}</p>
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

        {/* Low Stock Alerts - View Only */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockMedications.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                All items are well stocked!
              </p>
            ) : (
              <div className="space-y-3">
                {lowStockMedications.map((medication) => (
                  <div
                    key={medication.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30"
                  >
                    <div>
                      <p className="font-medium">{medication.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {medication.category} • Batch: {medication.batch_number}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-destructive">{medication.current_stock} left</p>
                      <p className="text-xs text-muted-foreground">
                        Reorder at: {medication.reorder_level}
                      </p>
                    </div>
                  </div>
                ))}
                {lowStockCount > 10 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    And {lowStockCount - 10} more items...
                  </p>
                )}
              </div>
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
    </div>
  );
};

export default Inventory;
