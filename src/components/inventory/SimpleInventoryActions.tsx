import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  FileImage,
  RefreshCw,
  Package,
  Layers
} from 'lucide-react';

interface SimpleInventoryActionsProps {
  onAddProducts: () => void;
  onScanInvoice: () => void;
  onUpdateStock: () => void;
  onShelfEntry: () => void;
}

export const SimpleInventoryActions = ({
  onAddProducts,
  onScanInvoice,
  onUpdateStock,
  onShelfEntry,
}: SimpleInventoryActionsProps) => {
  return (
    <Card className="border-primary/20 glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg bg-gradient-primary">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Choose how you want to add or update your inventory
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button
            onClick={onShelfEntry}
            variant="default"
            size="lg"
            className="h-24 flex-col gap-2 bg-gradient-primary hover:opacity-90 btn-glow"
          >
            <Layers className="h-6 w-6" />
            <span className="text-sm font-medium">Shelf Entry</span>
            <Badge variant="secondary" className="text-[10px] bg-white/20">Fastest</Badge>
          </Button>

          <Button
            id="tour-invoice-scanner"
            onClick={onScanInvoice}
            variant="outline"
            size="lg"
            className="h-24 flex-col gap-2"
          >
            <FileImage className="h-6 w-6" />
            <span className="text-sm font-medium">Scan Invoice</span>
            <Badge variant="outline" className="text-[10px] bg-gradient-premium text-white border-0">AI</Badge>
          </Button>

          <Button
            onClick={onUpdateStock}
            variant="outline"
            size="lg"
            className="h-24 flex-col gap-2"
          >
            <RefreshCw className="h-6 w-6" />
            <span className="text-sm font-medium">Update Stock</span>
          </Button>

          <Button
            id="tour-add-product"
            onClick={onAddProducts}
            variant="outline"
            size="lg"
            className="h-24 flex-col gap-2"
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm font-medium">Add Product</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
