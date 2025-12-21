import { useNavigate } from 'react-router-dom';
import { useMedications } from '@/hooks/useMedications';
import { useAuth } from '@/contexts/AuthContext';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useShifts } from '@/hooks/useShifts';
import { usePermissions } from '@/hooks/usePermissions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { InventoryCharts } from '@/components/dashboard/InventoryCharts';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { NAFDACCompliancePanel } from '@/components/dashboard/NAFDACCompliancePanel';
import { FinancialSummary } from '@/components/dashboard/FinancialSummary';
import { SalesAnalytics } from '@/components/dashboard/SalesAnalytics';
import { ManagerKPIPanel } from '@/components/dashboard/ManagerKPIPanel';
import { StaffQuickActions } from '@/components/dashboard/StaffQuickActions';
import { ShiftClock } from '@/components/dashboard/ShiftClock';
import { StaffPerformancePanel } from '@/components/dashboard/StaffPerformancePanel';
import { ProfitMarginAnalyzer } from '@/components/dashboard/ProfitMarginAnalyzer';
import { DemandForecasting } from '@/components/dashboard/DemandForecasting';
import { ExpiryDiscountEngine } from '@/components/dashboard/ExpiryDiscountEngine';
import { 
  Package, 
  AlertTriangle, 
  Calendar, 
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Loader2
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { pharmacy, isLoading: pharmacyLoading } = usePharmacy();
  const { medications, isLoading: medsLoading, getMetrics, isExpired, isLowStock, isExpiringSoon } = useMedications();
  const { activeShift } = useShifts();
  const { isOwnerOrManager } = usePermissions();
  const { formatPrice } = useCurrency();

  // Loading state
  if (authLoading || pharmacyLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your pharmacy...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    navigate('/auth');
    return null;
  }

  // Redirect to onboarding if no pharmacy
  if (!pharmacy) {
    navigate('/onboarding');
    return null;
  }

  const metrics = getMetrics();

  // Calculate total inventory value
  const totalInventoryValue = medications?.reduce((sum, med) => {
    return sum + (med.current_stock * med.unit_price);
  }, 0) || 0;

  // Get critical alerts
  const expiredItems = medications?.filter(med => isExpired(med.expiry_date)) || [];
  const lowStockItems = medications?.filter(med => isLowStock(med.current_stock, med.reorder_level)) || [];
  const expiringSoonItems = medications?.filter(med => isExpiringSoon(med.expiry_date) && !isExpired(med.expiry_date)) || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">
            Welcome back, {user.email?.split('@')[0]}
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening at {pharmacy.name} today.
          </p>
        </div>

        {/* Shift Clock for Staff */}
        <div className="mb-8">
          <ShiftClock />
        </div>

        {/* Quick Actions for Staff */}
        <StaffQuickActions />

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Products"
            value={metrics.totalSKUs}
            icon={<Package className="h-5 w-5" />}
            trend={0}
          />
          <MetricCard
            title="Low Stock Items"
            value={metrics.lowStockItems}
            icon={<AlertTriangle className="h-5 w-5" />}
            variant={metrics.lowStockItems > 0 ? 'warning' : 'default'}
          />
          <MetricCard
            title="Expiring Soon"
            value={metrics.expiringWithin30Days}
            icon={<Calendar className="h-5 w-5" />}
            variant={metrics.expiringWithin30Days > 0 ? 'warning' : 'default'}
          />
          <MetricCard
            title="Inventory Value"
            value={formatPrice(totalInventoryValue)}
            icon={<DollarSign className="h-5 w-5" />}
          />
        </div>

        {/* Manager KPIs */}
        {isOwnerOrManager && <ManagerKPIPanel />}

        {/* Staff Performance Panel */}
        {isOwnerOrManager && <StaffPerformancePanel />}

        {/* Business Intelligence Section */}
        {isOwnerOrManager && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ProfitMarginAnalyzer />
            <DemandForecasting />
          </div>
        )}

        {/* Expiry Discount Engine */}
        <ExpiryDiscountEngine />

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <InventoryCharts medications={medications} />
          <SalesAnalytics />
        </div>

        {/* AI Insights and Compliance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AIInsightsPanel medications={medications} />
          <NAFDACCompliancePanel medications={medications} />
        </div>

        {/* Financial Summary */}
        <FinancialSummary medications={medications} />

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for your pharmacy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2"
                onClick={() => navigate('/checkout')}
              >
                <ShoppingCart className="h-6 w-6" />
                <span>Point of Sale</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2"
                onClick={() => navigate('/inventory')}
              >
                <Package className="h-6 w-6" />
                <span>Manage Stock</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2"
                onClick={() => navigate('/sales')}
              >
                <TrendingUp className="h-6 w-6" />
                <span>Sales History</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2"
                onClick={() => navigate('/customers')}
              >
                <Package className="h-6 w-6" />
                <span>Customers</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
