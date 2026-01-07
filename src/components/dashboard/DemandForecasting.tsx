import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBranchInventory } from '@/hooks/useBranchInventory';
import { useCurrency } from '@/contexts/CurrencyContext';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useSuppliers } from '@/hooks/useSuppliers';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, Package, AlertTriangle, Loader2, FileText } from 'lucide-react';
import { subDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { generatePurchaseOrder, generateOrderNumber } from '@/utils/purchaseOrderGenerator';

interface ForecastItem {
  id: string;
  name: string;
  currentStock: number;
  reorderLevel: number;
  dailyAvg: number;
  monthlyForecast: number;
  daysOfStockLeft: number;
  recommendedReorder: number;
  reorderCost: number;
  velocity: 'high' | 'medium' | 'low';
  supplierId?: string;
  supplierName?: string;
}

export const DemandForecasting = () => {
  const { medications } = useBranchInventory();
  const { formatPrice, currency } = useCurrency();
  const { pharmacyId, pharmacy } = usePharmacy();
  const { suppliers } = useSuppliers();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch sales data separately (branch-scoped because useSales writes branch_id)
  const { currentBranchId } = useBranchInventory();
  const { data: sales = [] } = useQuery({
    queryKey: ['sales-history', pharmacyId, currentBranchId],
    queryFn: async () => {
      if (!pharmacyId) return [];

      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      let query = supabase
        .from('sales')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .gte('sale_date', thirtyDaysAgo)
        .order('sale_date', { ascending: false });

      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!pharmacyId,
  });

  // Aggregate sales by medication
  const salesByMedication: Record<string, { quantity: number; revenue: number; count: number }> = {};
  
  sales.forEach(sale => {
    if (!salesByMedication[sale.medication_id]) {
      salesByMedication[sale.medication_id] = { quantity: 0, revenue: 0, count: 0 };
    }
    salesByMedication[sale.medication_id].quantity += sale.quantity;
    salesByMedication[sale.medication_id].revenue += sale.total_price;
    salesByMedication[sale.medication_id].count += 1;
  });

  // Calculate forecasts with supplier info (branch stock + branch reorder level)
  const forecasts: ForecastItem[] = (medications || [])
    .map((med: any) => {
      const salesData = salesByMedication[med.id] || { quantity: 0, revenue: 0, count: 0 };
      const dailyAvg = salesData.quantity / 30;
      const monthlyForecast = Math.ceil(dailyAvg * 30);

      const currentStock = Number(med.branch_stock ?? med.current_stock ?? 0);
      const reorderLevel = Number(med.branch_reorder_level ?? med.reorder_level ?? 0);

      const daysOfStockLeft = dailyAvg > 0 ? Math.floor(currentStock / dailyAvg) : 999;
      const recommendedReorder = Math.max(0, monthlyForecast - currentStock);
      const reorderCost = recommendedReorder * Number(med.unit_price);

      // Find supplier for this medication
      const supplier = suppliers?.find((s) => s.name === med.supplier);

      const velocity: 'high' | 'medium' | 'low' =
        salesData.quantity > 20 ? 'high' : salesData.quantity > 5 ? 'medium' : 'low';

      return {
        id: med.id,
        name: med.name,
        currentStock,
        reorderLevel,
        dailyAvg: Math.round(dailyAvg * 10) / 10,
        monthlyForecast,
        daysOfStockLeft,
        recommendedReorder,
        reorderCost,
        velocity,
        supplierId: supplier?.id,
        supplierName: med.supplier || 'Unknown Supplier',
      };
    })
    .filter((f) => f.dailyAvg > 0 || f.currentStock < f.reorderLevel)
    .sort((a, b) => a.daysOfStockLeft - b.daysOfStockLeft);

  // Critical items (less than 7 days of stock)
  const criticalItems = forecasts.filter(f => f.daysOfStockLeft < 7 && f.dailyAvg > 0);
  
  // Total reorder value
  const totalReorderValue = forecasts.reduce((sum, f) => sum + f.reorderCost, 0);

  const handleGeneratePO = async () => {
    const itemsToReorder = forecasts.filter(f => f.recommendedReorder > 0);
    
    if (itemsToReorder.length === 0) {
      toast({
        title: "No items to reorder",
        description: "All products are well-stocked based on current demand.",
        variant: "default",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Group items by supplier
      const supplierGroups: Record<string, ForecastItem[]> = {};
      
      itemsToReorder.forEach(item => {
        const supplierKey = item.supplierName || 'Unknown Supplier';
        if (!supplierGroups[supplierKey]) {
          supplierGroups[supplierKey] = [];
        }
        supplierGroups[supplierKey].push(item);
      });

      // Build orders for each supplier
      const orders = Object.entries(supplierGroups).map(([supplierName, items]) => {
        const supplier = suppliers?.find(s => s.name === supplierName);
        
        return {
          supplierName,
          supplierPhone: supplier?.phone || undefined,
          supplierAddress: supplier?.address || undefined,
          items: items.map(item => ({
            medicationName: item.name,
            quantity: item.recommendedReorder,
            unitPrice: item.reorderCost / item.recommendedReorder,
            totalPrice: item.reorderCost,
          })),
          totalAmount: items.reduce((sum, item) => sum + item.reorderCost, 0),
        };
      });

      const orderNumber = generateOrderNumber();
      
      const pdf = await generatePurchaseOrder({
        orders,
        pharmacyName: pharmacy?.name || 'Pharmacy',
        pharmacyPhone: pharmacy?.phone || undefined,
        pharmacyLogoUrl: pharmacy?.logo_url || undefined,
        orderNumber,
        date: new Date(),
        currency: currency as 'USD' | 'NGN' | 'GBP',
      });

      // Open PDF in new window for printing
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(url, '_blank');
      
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }

      toast({
        title: "Purchase Order Generated",
        description: `PO #${orderNumber} created for ${orders.length} supplier(s) with ${itemsToReorder.length} items.`,
      });

    } catch (error) {
      console.error('Error generating PO:', error);
      toast({
        title: "Failed to generate PO",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getVelocityColor = (velocity: string) => {
    switch (velocity) {
      case 'high': return 'bg-success/10 text-success border-success/20';
      case 'medium': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStockStatus = (days: number) => {
    if (days < 7) return { color: 'text-destructive', label: 'Critical' };
    if (days < 14) return { color: 'text-warning', label: 'Low' };
    if (days < 30) return { color: 'text-primary', label: 'OK' };
    return { color: 'text-success', label: 'Good' };
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Brain className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Demand Forecasting</CardTitle>
              <CardDescription>30-day reorder recommendations</CardDescription>
            </div>
          </div>
          {criticalItems.length > 0 && (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {criticalItems.length} critical
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-muted/50">
            <p className="text-sm text-muted-foreground">Products Tracked</p>
            <p className="text-2xl font-bold">{forecasts.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-destructive/10">
            <p className="text-sm text-muted-foreground">Need Reorder</p>
            <p className="text-2xl font-bold text-destructive">{criticalItems.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50">
            <p className="text-sm text-muted-foreground">Reorder Value</p>
            <p className="text-2xl font-bold">{formatPrice(totalReorderValue)}</p>
          </div>
        </div>

        {/* Reorder Recommendations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Recommended Reorders</h4>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleGeneratePO}
              disabled={isGenerating || forecasts.filter(f => f.recommendedReorder > 0).length === 0}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-1" />
                  Generate PO
                </>
              )}
            </Button>
          </div>
          
          {forecasts.slice(0, 8).map((item) => {
            const status = getStockStatus(item.daysOfStockLeft);
            
            return (
              <div 
                key={item.id} 
                className={`flex items-center justify-between p-3 rounded-lg ${
                  item.daysOfStockLeft < 7 ? 'bg-destructive/5 border border-destructive/20' : 'bg-muted/30'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{item.name}</p>
                    <Badge variant="outline" className={getVelocityColor(item.velocity)}>
                      {item.velocity} velocity
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-xs text-muted-foreground">
                      <Package className="h-3 w-3 inline mr-1" />
                      {item.currentStock} in stock
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3 inline mr-1" />
                      {item.dailyAvg}/day avg
                    </p>
                    <p className={`text-xs font-medium ${status.color}`}>
                      {item.daysOfStockLeft < 999 ? `${item.daysOfStockLeft} days left` : 'No recent sales'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {item.recommendedReorder > 0 ? (
                    <>
                      <p className="font-bold text-primary">
                        Order {item.recommendedReorder}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(item.reorderCost)}
                      </p>
                    </>
                  ) : (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                      Well stocked
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {forecasts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Start making sales to see AI-powered demand forecasts</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
