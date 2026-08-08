import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import { useMedications } from '@/hooks/useMedications';
import { useBranchInventory } from '@/hooks/useBranchInventory';
import { useSales } from '@/hooks/useSales';
import { useAuth } from '@/contexts/AuthContext';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePermissions } from '@/hooks/usePermissions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useBranchContext } from '@/contexts/BranchContext';
import { useAutopilotEngine } from '@/hooks/useAutopilotEngine';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { DailyBriefingCard } from '@/components/dashboard/DailyBriefingCard';
import { TodaysPrioritiesSection } from '@/components/dashboard/TodaysPrioritiesSection';
import { FinancialSummary } from '@/components/dashboard/FinancialSummary';
import { SalesAnalytics } from '@/components/dashboard/SalesAnalytics';
import { ManagerKPIPanel } from '@/components/dashboard/ManagerKPIPanel';
import { InventoryCharts } from '@/components/dashboard/InventoryCharts';
import { BranchLockedOverlay } from '@/components/branches/BranchLockedOverlay';
import { PendingQuickItemsPanel } from '@/components/inventory/PendingQuickItemsPanel';
import { PurchaseOrderDraftCard } from '@/components/dashboard/PurchaseOrderDraftCard';
import { StockoutForecastCard } from '@/components/dashboard/StockoutForecastCard';
import { ClearanceQueueCard } from '@/components/dashboard/ClearanceQueueCard';
import { DailyClosingReportCard } from '@/components/dashboard/DailyClosingReportCard';
import { ProductTour } from '@/components/ProductTour';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import {
  Package,
  AlertTriangle,
  Clock,
  XCircle,
  ShoppingCart,
  TrendingUp,
  Loader2,
  DollarSign,
  BarChart3,
  Home,
  Settings,
  Users,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { pharmacy, isLoading: pharmacyLoading } = usePharmacy();
  const { displayName } = useUserProfile();
  const { medications, isLoading: medsLoading } = useMedications();
  const { medications: branchMedications, getMetrics: getBranchMetrics } = useBranchInventory();
  const { sales } = useSales();
  const { isOwnerOrManager, userRole, hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { formatPrice } = useCurrency();
  const { currentBranchName, isBranchLocked, activeBranchesLimit, currentBranchPosition } = useBranchContext();
  const { dailyBriefing, todaysPriorities, purchaseDraft, clearanceQueue, closingReport, stockoutForecast, recordActionClick } = useAutopilotEngine();

  // ── Financial summary from sales ─────────────────────────────────────────
  const financials = useMemo(() => {
    if (!sales?.length) return { todaySales: 0, todayProfit: 0, weekRevenue: 0, monthRevenue: 0, todayOrders: 0 };
    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    let todaySales = 0, todayProfit = 0, weekRevenue = 0, monthRevenue = 0;
    const todayOrderIds = new Set<string>();

    sales.forEach(sale => {
      const d = parseISO(sale.sale_date);
      if (d >= dayStart && d <= dayEnd) {
        todaySales += sale.total_price;
        todayProfit += sale.total_price - (sale.unit_price * 0.75 * sale.quantity);
        if (sale.receipt_id) todayOrderIds.add(sale.receipt_id);
      }
      if (d >= weekStart) weekRevenue += sale.total_price;
      if (d >= monthStart && d <= monthEnd) monthRevenue += sale.total_price;
    });

    return {
      todaySales,
      todayProfit: Math.max(0, todayProfit),
      weekRevenue,
      monthRevenue,
      todayOrders: todayOrderIds.size,
    };
  }, [sales]);

  // ── Loading / auth guards ─────────────────────────────────────────────────
  if (authLoading || pharmacyLoading || permissionsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow-primary">
            <Loader2 className="h-8 w-8 animate-spin text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading your pharmacy...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) { navigate('/'); return null; }
  if (!pharmacy) { navigate('/onboarding'); return null; }

  // Role routing
  if (userRole === 'staff' && !hasPermission('view_dashboard')) { navigate('/cashier-dashboard', { replace: true }); return null; }
  if (userRole === 'staff' && hasPermission('view_dashboard')) { navigate('/staff-dashboard', { replace: true }); return null; }
  if (userRole === 'manager') { navigate('/manager-dashboard', { replace: true }); return null; }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {isBranchLocked && (
        <BranchLockedOverlay
          branchName={currentBranchName}
          currentLimit={activeBranchesLimit}
          branchPosition={currentBranchPosition}
        />
      )}
      <ProductTour />
      <PWAInstallPrompt />
      <Header />

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-[1400px]">

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <Tabs defaultValue="home" className="w-full">
          <TabsList className="mb-6 bg-muted/50 p-1">
            <TabsTrigger value="home" className="gap-2 data-[state=active]:bg-background">
              <Home className="h-4 w-4" /> Home
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2 data-[state=active]:bg-background">
              <BarChart3 className="h-4 w-4" /> Analytics
            </TabsTrigger>
          </TabsList>

          {/* ════════════════════════════════════════════════════════════
              HOME TAB
          ════════════════════════════════════════════════════════════ */}
          <TabsContent value="home" className="space-y-6">

            {/* 1. HERO: Financial Performance */}
            <motion.section variants={containerVariants} initial="hidden" animate="visible">
              {/* Primary metric: full-width revenue hero */}
              <motion.div variants={itemVariants}>
                <Card className="relative overflow-hidden border border-border/80 bg-card shadow-sm">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-l-xl" />
                  <CardContent className="p-6 pl-7">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Today's Revenue</span>
                        </div>
                        <p className="text-4xl sm:text-5xl font-extrabold font-display text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
                          {formatPrice(financials.todaySales)}
                        </p>
                        <p className="text-sm font-medium text-muted-foreground mt-2.5">
                          <span className="text-foreground font-bold">{financials.todayOrders}</span> orders completed today
                        </p>
                      </div>

                      <div className="sm:text-right shrink-0">
                        <div className="inline-block px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Est. Today's Profit</p>
                          <p className="text-2xl font-extrabold text-primary tabular-nums">{formatPrice(financials.todayProfit)}</p>
                          <p className="text-[11px] font-medium text-muted-foreground">~25% profit margin</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Secondary: Week & Month */}
              <motion.div variants={itemVariants} className="mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative px-5 py-4 rounded-xl bg-card border border-border/80 shadow-sm overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-xl" />
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">This Week</p>
                    <p className="text-2xl font-bold text-foreground tabular-nums">{formatPrice(financials.weekRevenue)}</p>
                  </div>
                  <div className="relative px-5 py-4 rounded-xl bg-card border border-border/80 shadow-sm overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 rounded-l-xl" />
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">This Month</p>
                    <p className="text-2xl font-bold text-foreground tabular-nums">{formatPrice(financials.monthRevenue)}</p>
                  </div>
                </div>
              </motion.div>
            </motion.section>

            {/* 2. Autopilot Executive Briefing */}
            <motion.section
              id="tour-ai-insights"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Section divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-md bg-indigo-500/20 flex items-center justify-center">
                    <Zap className="h-3 w-3 text-indigo-400" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">Autopilot Engine</span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-indigo-500/30 to-transparent" />
              </div>
              <DailyBriefingCard
                briefing={dailyBriefing}
                userName={displayName}
                onRecordAction={recordActionClick}
              />
            </motion.section>

            {/* 3. Smart Purchase Order Draft (Phase 2.1 - Sleek & Collapsible) */}
            <motion.section
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <PurchaseOrderDraftCard
                draft={purchaseDraft}
                onRecordAction={recordActionClick}
              />
            </motion.section>

            {/* 4. Predictive Stockout Prevention (Phase 2.5 - Forward-looking velocity forecast) */}
            <motion.section
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.11 }}
            >
              <StockoutForecastCard
                forecast={stockoutForecast}
                onRecordAction={recordActionClick}
              />
            </motion.section>

            {/* 5. Automatic Clearance Queue (Phase 2.2 - Sleek & Collapsible) */}
            <motion.section
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
            >
              <ClearanceQueueCard
                queue={clearanceQueue}
                onRecordAction={recordActionClick}
              />
            </motion.section>

            {/* 6. Automatic Daily Closing Report (Phase 2.4 - Sleek & Collapsible) */}
            <motion.section
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.14 }}
            >
              <DailyClosingReportCard
                report={closingReport}
                onRecordAction={recordActionClick}
              />
            </motion.section>

            {/* 4. Primary Action CTA Buttons */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  id="tour-pos-link"
                  onClick={() => {
                    recordActionClick('/checkout');
                    navigate('/checkout');
                  }}
                  className="h-24 sm:h-28 flex flex-col items-center justify-center gap-1.5 bg-gradient-primary hover:opacity-90 shadow-glow-primary btn-glow text-lg font-semibold"
                >
                  <ShoppingCart className="h-8 w-8 sm:h-9 sm:w-9" />
                  Open Point of Sale
                </Button>
                <Button
                  onClick={() => {
                    recordActionClick('/inventory');
                    navigate('/inventory');
                  }}
                  variant="outline"
                  className="h-24 sm:h-28 flex flex-col items-center justify-center gap-1.5 border-2 border-primary/30 hover:bg-primary/5 hover:border-primary/50 text-lg font-semibold group"
                >
                  <Package className="h-8 w-8 sm:h-9 sm:w-9 text-primary group-hover:scale-110 transition-transform" />
                  Manage Inventory
                </Button>
              </div>
            </motion.section>

            {/* 5. Today's Priorities (Ranked 0-100 Score) */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <TodaysPrioritiesSection
                priorities={todaysPriorities}
                onRecordAction={recordActionClick}
              />
            </motion.section>

            {/* 6. Autopilot Business Insights (Capital at Risk & Slow Movers) */}
            {medications.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <AIInsightsPanel medications={medications} />
              </motion.section>
            )}

            {/* 7. Pending quick-add items */}
            {isOwnerOrManager && (
              <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <PendingQuickItemsPanel />
              </motion.section>
            )}

            {/* 8. Quick Nav */}
            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="h-16 flex flex-col items-center justify-center gap-1.5 hover:bg-primary/5 hover:border-primary/30 transition-all group"
                  onClick={() => {
                    recordActionClick('/sales');
                    navigate('/sales');
                  }}
                >
                  <TrendingUp className="h-4 w-4 group-hover:text-primary transition-colors" />
                  <span className="text-xs">Sales</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 flex flex-col items-center justify-center gap-1.5 hover:bg-primary/5 hover:border-primary/30 transition-all group"
                  onClick={() => {
                    recordActionClick('/customers');
                    navigate('/customers');
                  }}
                >
                  <Users className="h-4 w-4 group-hover:text-primary transition-colors" />
                  <span className="text-xs">Customers</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 flex flex-col items-center justify-center gap-1.5 hover:bg-primary/5 hover:border-primary/30 transition-all group"
                  onClick={() => {
                    recordActionClick('/settings');
                    navigate('/settings');
                  }}
                >
                  <Settings className="h-4 w-4 group-hover:text-primary transition-colors" />
                  <span className="text-xs">Settings</span>
                </Button>
              </div>
            </motion.section>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════
              ANALYTICS TAB
          ════════════════════════════════════════════════════════════ */}
          <TabsContent value="analytics" className="space-y-6">

            {isOwnerOrManager && medications.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <SalesAnalytics />
              </motion.section>
            )}

            {isOwnerOrManager && medications.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <FinancialSummary medications={medications} />
              </motion.section>
            )}

            {isOwnerOrManager && (
              <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <ManagerKPIPanel />
              </motion.section>
            )}

            {medications.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <InventoryCharts medications={medications} />
              </motion.section>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
