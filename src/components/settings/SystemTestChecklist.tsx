import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  ShoppingCart,
  Package,
  Calendar,
  DollarSign,
  Users,
  Building2,
  RefreshCw,
  FileText,
  Shield
} from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { useSales } from '@/hooks/useSales';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useCurrency } from '@/contexts/CurrencyContext';

interface TestItem {
  id: string;
  label: string;
  description: string;
  autoCheck?: () => boolean;
}

interface TestCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: TestItem[];
}

const CHECKLIST_STORAGE_KEY = 'pharmatrack_test_checklist';

export const SystemTestChecklist = () => {
  const { medications, getMetrics } = useMedications();
  const { sales } = useSales();
  const { pharmacy } = usePharmacy();
  const { formatPrice } = useCurrency();
  
  const [completedTests, setCompletedTests] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(CHECKLIST_STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['sales']));

  // Save to localStorage whenever completed tests change
  useEffect(() => {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify([...completedTests]));
  }, [completedTests]);

  const testCategories: TestCategory[] = [
    {
      id: 'sales',
      title: 'Sales & Checkout',
      icon: <ShoppingCart className="h-4 w-4" />,
      items: [
        {
          id: 'sale_single',
          label: 'Complete a single item sale',
          description: 'Add one item to cart, complete checkout, verify receipt prints correctly',
        },
        {
          id: 'sale_multiple',
          label: 'Complete a multi-item sale',
          description: 'Add 3+ items, verify total calculation, complete sale',
        },
        {
          id: 'sale_max_stock',
          label: 'Test max stock limit',
          description: 'Try to add more items than available stock - should be prevented',
        },
        {
          id: 'sale_price_fallback',
          label: 'Verify price fallback',
          description: 'Sell item with selling_price set, then one without (uses unit_price)',
        },
        {
          id: 'sale_hold_resume',
          label: 'Hold and resume transaction',
          description: 'Hold a sale, start new one, resume held sale',
        },
        {
          id: 'sale_invoice',
          label: 'Generate credit invoice',
          description: 'Create invoice, verify barcode/short code, complete at payment terminal',
        },
      ],
    },
    {
      id: 'inventory',
      title: 'Inventory & Stock',
      icon: <Package className="h-4 w-4" />,
      items: [
        {
          id: 'inv_add',
          label: 'Add new medication',
          description: 'Add medication with all fields, verify it appears in inventory',
          autoCheck: () => medications.length > 0,
        },
        {
          id: 'inv_edit',
          label: 'Edit medication details',
          description: 'Update price, stock, expiry - verify changes save correctly',
        },
        {
          id: 'inv_stock_deduct',
          label: 'Verify stock deduction after sale',
          description: 'Note stock before sale, sell items, verify stock decreased correctly',
        },
        {
          id: 'inv_low_stock',
          label: 'Low stock alert triggers',
          description: 'Set reorder level, reduce stock below it, verify alert appears',
          autoCheck: () => getMetrics().lowStockItems > 0,
        },
        {
          id: 'inv_receive',
          label: 'Receive new stock',
          description: 'Use receive stock feature, verify stock increases',
        },
        {
          id: 'inv_barcode',
          label: 'Barcode scanning works',
          description: 'Scan barcode at checkout, verify correct item added to cart',
        },
      ],
    },
    {
      id: 'expiry',
      title: 'Expiry Management',
      icon: <Calendar className="h-4 w-4" />,
      items: [
        {
          id: 'exp_detection',
          label: 'Expired items detected',
          description: 'Add expired item, verify it shows as expired in alerts',
          autoCheck: () => getMetrics().expiredItems > 0,
        },
        {
          id: 'exp_soon',
          label: 'Expiring soon detection',
          description: 'Add item expiring in 15 days, verify "expiring soon" alert',
          autoCheck: () => getMetrics().expiringWithin30Days > 0,
        },
        {
          id: 'exp_block_sale',
          label: 'Expired items blocked from sale',
          description: 'Try to sell expired item - should show warning and prevent',
        },
        {
          id: 'exp_fefo',
          label: 'FEFO suggestion works',
          description: 'With multiple batches, verify oldest expiry suggested first',
        },
      ],
    },
    {
      id: 'financial',
      title: 'Financial Accuracy',
      icon: <DollarSign className="h-4 w-4" />,
      items: [
        {
          id: 'fin_total',
          label: 'Cart total calculation',
          description: 'Add items manually, verify total matches (price × qty summed)',
        },
        {
          id: 'fin_inventory_value',
          label: 'Inventory value calculation',
          description: 'Check dashboard inventory value matches manual calculation',
          autoCheck: () => medications.length > 0,
        },
        {
          id: 'fin_daily_sales',
          label: 'Daily sales total',
          description: 'Make sales, verify daily total on dashboard matches sum',
          autoCheck: () => sales.length > 0,
        },
        {
          id: 'fin_profit_margin',
          label: 'Profit margin calculation',
          description: 'Verify profit = selling_price - unit_price is correct',
        },
        {
          id: 'fin_receipt',
          label: 'Receipt matches transaction',
          description: 'Compare printed receipt total with sale record in history',
        },
      ],
    },
    {
      id: 'users',
      title: 'Staff & Shifts',
      icon: <Users className="h-4 w-4" />,
      items: [
        {
          id: 'staff_add',
          label: 'Add staff member',
          description: 'Create new staff account, verify they can log in',
        },
        {
          id: 'staff_clockin',
          label: 'Clock in/out works',
          description: 'Clock in, make sales, clock out - verify shift stats',
        },
        {
          id: 'staff_permissions',
          label: 'Permission restrictions work',
          description: 'Staff can\'t access owner-only features (settings, delete)',
        },
        {
          id: 'staff_sales_track',
          label: 'Sales attributed correctly',
          description: 'Make sale, verify "sold by" shows correct staff name',
        },
      ],
    },
    {
      id: 'branches',
      title: 'Branch Operations',
      icon: <Building2 className="h-4 w-4" />,
      items: [
        {
          id: 'branch_create',
          label: 'Create new branch',
          description: 'Add branch, assign manager, verify isolation',
        },
        {
          id: 'branch_transfer',
          label: 'Stock transfer works',
          description: 'Transfer stock HQ→Branch, verify both inventories update',
        },
        {
          id: 'branch_isolation',
          label: 'Branch data isolation',
          description: 'Branch staff only see their branch sales/inventory',
        },
        {
          id: 'branch_switch',
          label: 'Branch switching works',
          description: 'Switch between branches, verify correct data loads',
        },
      ],
    },
    {
      id: 'reports',
      title: 'Reports & Export',
      icon: <FileText className="h-4 w-4" />,
      items: [
        {
          id: 'report_sales',
          label: 'Sales history export',
          description: 'Export sales to CSV, verify data matches dashboard',
        },
        {
          id: 'report_inventory',
          label: 'Inventory export',
          description: 'Export inventory list, verify all items included',
        },
        {
          id: 'report_expiry',
          label: 'NAFDAC expiry report',
          description: 'Generate expiry report, verify accurate data',
        },
        {
          id: 'report_stock_count',
          label: 'Stock count sheet',
          description: 'Generate count sheet, perform count, import results',
        },
      ],
    },
    {
      id: 'reliability',
      title: 'Reliability & Edge Cases',
      icon: <Shield className="h-4 w-4" />,
      items: [
        {
          id: 'rel_concurrent',
          label: 'Concurrent user handling',
          description: 'Two users sell same item - no negative stock, error shown',
        },
        {
          id: 'rel_offline',
          label: 'Offline mode works',
          description: 'Disconnect internet, make sale, reconnect, verify sync',
        },
        {
          id: 'rel_zero_stock',
          label: 'Zero stock handling',
          description: 'Item at 0 stock cannot be added to cart',
        },
        {
          id: 'rel_data_persist',
          label: 'Data persists after refresh',
          description: 'Refresh page, verify all data still present',
        },
        {
          id: 'rel_error_recovery',
          label: 'Error recovery',
          description: 'Simulate network error during sale, verify graceful handling',
        },
      ],
    },
  ];

  const toggleTest = (testId: string) => {
    setCompletedTests(prev => {
      const next = new Set(prev);
      if (next.has(testId)) {
        next.delete(testId);
      } else {
        next.add(testId);
      }
      return next;
    });
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const totalTests = testCategories.reduce((sum, cat) => sum + cat.items.length, 0);
  const completedCount = completedTests.size;
  const progressPercent = Math.round((completedCount / totalTests) * 100);

  const resetChecklist = () => {
    setCompletedTests(new Set());
    localStorage.removeItem(CHECKLIST_STORAGE_KEY);
  };

  const getCategoryProgress = (category: TestCategory) => {
    const completed = category.items.filter(item => completedTests.has(item.id)).length;
    return { completed, total: category.items.length };
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Production Readiness Checklist
            </CardTitle>
            <CardDescription>
              Complete all tests before deploying to a live pharmacy
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={resetChecklist}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{completedCount} of {totalTests} tests completed</span>
            <Badge variant={progressPercent === 100 ? 'default' : 'secondary'}>
              {progressPercent}%
            </Badge>
          </div>
          <Progress value={progressPercent} className="h-2" />
          {progressPercent === 100 && (
            <p className="text-sm text-success flex items-center gap-2 mt-2">
              <CheckCircle2 className="h-4 w-4" />
              All tests passed! Your system is ready for production.
            </p>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {testCategories.map(category => {
          const { completed, total } = getCategoryProgress(category);
          const isExpanded = expandedCategories.has(category.id);
          const isComplete = completed === total;
          
          return (
            <Collapsible key={category.id} open={isExpanded} onOpenChange={() => toggleCategory(category.id)}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between h-auto py-3 px-4 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isComplete ? 'bg-success/10 text-success' : 'bg-muted'}`}>
                      {category.icon}
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{category.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {completed}/{total} completed
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isComplete && <CheckCircle2 className="h-4 w-4 text-success" />}
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="pl-4 pr-2 pb-2">
                <div className="space-y-2 mt-2">
                  {category.items.map(item => {
                    const isChecked = completedTests.has(item.id);
                    const autoChecked = item.autoCheck?.();
                    
                    return (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                          isChecked ? 'bg-success/5 border-success/20' : 'bg-muted/30 border-border/50'
                        }`}
                      >
                        <Checkbox
                          id={item.id}
                          checked={isChecked}
                          onCheckedChange={() => toggleTest(item.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={item.id}
                            className={`text-sm font-medium cursor-pointer ${isChecked ? 'line-through text-muted-foreground' : ''}`}
                          >
                            {item.label}
                          </label>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                          {autoChecked && !isChecked && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Auto-detected as ready
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
};
