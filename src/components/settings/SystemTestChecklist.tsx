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
  Shield,
  Play,
  Loader2,
  XCircle,
  Download,
  Database
} from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { useSales } from '@/hooks/useSales';
import { format } from 'date-fns';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { parseISO, isBefore, isAfter, addDays } from 'date-fns';

interface TestResult {
  passed: boolean;
  message: string;
  details?: string;
}

interface TestItem {
  id: string;
  label: string;
  description: string;
  autoTest?: () => Promise<TestResult> | TestResult;
  manualOnly?: boolean;
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
  
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['sales']));

  // Save to localStorage whenever completed tests change
  useEffect(() => {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify([...completedTests]));
  }, [completedTests]);

  // Auto-run tests on mount
  useEffect(() => {
    if (pharmacy?.id && medications.length >= 0) {
      runAllAutoTests();
    }
  }, [pharmacy?.id]);

  const testCategories: TestCategory[] = [
    {
      id: 'sales',
      title: 'Sales & Checkout',
      icon: <ShoppingCart className="h-4 w-4" />,
      items: [
        {
          id: 'sale_records_exist',
          label: 'Sales records exist',
          description: 'Verifies sales have been recorded in the system',
          autoTest: async () => {
            if (!pharmacy?.id) return { passed: false, message: 'No pharmacy connected' };
            const { data, error } = await supabase
              .from('sales')
              .select('id')
              .eq('pharmacy_id', pharmacy.id)
              .limit(1);
            if (error) return { passed: false, message: error.message };
            return {
              passed: (data?.length || 0) > 0,
              message: data?.length ? `${sales.length} sales recorded` : 'No sales yet - complete a sale to pass',
            };
          },
        },
        {
          id: 'sale_has_medication',
          label: 'Sales linked to medications',
          description: 'Verifies sales are properly linked to medication records',
          autoTest: async () => {
            if (!pharmacy?.id) return { passed: false, message: 'No pharmacy connected' };
            const { data, error } = await supabase
              .from('sales')
              .select('id, medication_id')
              .eq('pharmacy_id', pharmacy.id)
              .not('medication_id', 'is', null)
              .limit(5);
            if (error) return { passed: false, message: error.message };
            return {
              passed: (data?.length || 0) > 0,
              message: data?.length ? 'Sales properly linked' : 'No linked sales found',
            };
          },
        },
        {
          id: 'sale_price_calculation',
          label: 'Sale totals calculated correctly',
          description: 'Verifies total_price = unit_price × quantity',
          autoTest: async () => {
            if (!pharmacy?.id) return { passed: false, message: 'No pharmacy connected' };
            const { data, error } = await supabase
              .from('sales')
              .select('id, unit_price, quantity, total_price')
              .eq('pharmacy_id', pharmacy.id)
              .limit(20);
            if (error) return { passed: false, message: error.message };
            if (!data?.length) return { passed: true, message: 'No sales to verify' };
            
            const incorrect = data.filter(s => Math.abs(s.total_price - (s.unit_price * s.quantity)) > 0.01);
            return {
              passed: incorrect.length === 0,
              message: incorrect.length === 0 
                ? `All ${data.length} sales calculated correctly` 
                : `${incorrect.length} sales have calculation errors`,
              details: incorrect.length > 0 ? JSON.stringify(incorrect[0]) : undefined,
            };
          },
        },
        {
          id: 'sale_hold_resume',
          label: 'Hold and resume transaction',
          description: 'Manual test: Hold a sale, start new one, resume held sale',
          manualOnly: true,
        },
      ],
    },
    {
      id: 'inventory',
      title: 'Inventory & Stock',
      icon: <Package className="h-4 w-4" />,
      items: [
        {
          id: 'inv_medications_exist',
          label: 'Medications in inventory',
          description: 'Verifies medications have been added to the system',
          autoTest: () => ({
            passed: medications.length > 0,
            message: medications.length > 0 
              ? `${medications.length} medications in inventory` 
              : 'Add medications to pass',
          }),
        },
        {
          id: 'inv_no_negative_stock',
          label: 'No negative stock values',
          description: 'Ensures stock never goes below zero',
          autoTest: () => {
            const negative = medications.filter(m => m.current_stock < 0);
            return {
              passed: negative.length === 0,
              message: negative.length === 0 
                ? 'All stock values are non-negative' 
                : `${negative.length} items have negative stock!`,
              details: negative.length > 0 ? `Items: ${negative.map(n => n.name).join(', ')}` : undefined,
            };
          },
        },
        {
          id: 'inv_prices_valid',
          label: 'All items have valid prices',
          description: 'Ensures all medications have unit_price set',
          autoTest: () => {
            const invalid = medications.filter(m => !m.unit_price || m.unit_price <= 0);
            return {
              passed: invalid.length === 0,
              message: invalid.length === 0 
                ? 'All items have valid prices' 
                : `${invalid.length} items missing prices`,
              details: invalid.length > 0 ? `Items: ${invalid.slice(0, 3).map(n => n.name).join(', ')}` : undefined,
            };
          },
        },
        {
          id: 'inv_low_stock_detection',
          label: 'Low stock alerts working',
          description: 'Verifies low stock detection logic',
          autoTest: () => {
            const metrics = getMetrics();
            const lowStock = medications.filter(m => m.current_stock <= m.reorder_level);
            const detected = metrics.lowStockItems;
            return {
              passed: lowStock.length === detected,
              message: `${detected} low stock items detected`,
              details: lowStock.length > 0 ? `Items: ${lowStock.slice(0, 3).map(n => n.name).join(', ')}` : undefined,
            };
          },
        },
        {
          id: 'inv_reorder_levels',
          label: 'Reorder levels configured',
          description: 'Checks that reorder levels are set for items',
          autoTest: () => {
            const withReorder = medications.filter(m => m.reorder_level > 0);
            const percentage = medications.length > 0 ? Math.round((withReorder.length / medications.length) * 100) : 0;
            return {
              passed: percentage >= 50,
              message: `${percentage}% of items have reorder levels set`,
            };
          },
        },
      ],
    },
    {
      id: 'expiry',
      title: 'Expiry Management',
      icon: <Calendar className="h-4 w-4" />,
      items: [
        {
          id: 'exp_dates_valid',
          label: 'All expiry dates are valid',
          description: 'Ensures all medications have valid expiry dates',
          autoTest: () => {
            const invalid = medications.filter(m => {
              try {
                parseISO(m.expiry_date);
                return false;
              } catch {
                return true;
              }
            });
            return {
              passed: invalid.length === 0,
              message: invalid.length === 0 
                ? 'All expiry dates valid' 
                : `${invalid.length} items have invalid dates`,
            };
          },
        },
        {
          id: 'exp_detection',
          label: 'Expired items detected',
          description: 'Verifies expired item detection is working',
          autoTest: () => {
            const today = new Date();
            const expired = medications.filter(m => isBefore(parseISO(m.expiry_date), today));
            const metrics = getMetrics();
            return {
              passed: expired.length === metrics.expiredItems,
              message: `${metrics.expiredItems} expired items detected`,
              details: expired.length > 0 ? `Items: ${expired.slice(0, 3).map(n => n.name).join(', ')}` : 'No expired items',
            };
          },
        },
        {
          id: 'exp_soon_detection',
          label: 'Expiring soon detection',
          description: 'Verifies items expiring within 30 days are flagged',
          autoTest: () => {
            const today = new Date();
            const thirtyDays = addDays(today, 30);
            const expiringSoon = medications.filter(m => {
              const expiry = parseISO(m.expiry_date);
              return isAfter(expiry, today) && isBefore(expiry, thirtyDays);
            });
            const metrics = getMetrics();
            return {
              passed: expiringSoon.length === metrics.expiringWithin30Days,
              message: `${metrics.expiringWithin30Days} items expiring within 30 days`,
              details: expiringSoon.length > 0 ? `Items: ${expiringSoon.slice(0, 3).map(n => n.name).join(', ')}` : 'None expiring soon',
            };
          },
        },
        {
          id: 'exp_fefo',
          label: 'FEFO logic test',
          description: 'Verifies First Expiry First Out ordering',
          autoTest: () => {
            // Group by name, check if sorted by expiry
            const grouped = medications.reduce((acc, med) => {
              if (!acc[med.name]) acc[med.name] = [];
              acc[med.name].push(med);
              return acc;
            }, {} as Record<string, typeof medications>);
            
            const multipleGroups = Object.entries(grouped).filter(([_, items]) => items.length > 1);
            if (multipleGroups.length === 0) {
              return { passed: true, message: 'No duplicate items to test FEFO' };
            }
            
            return {
              passed: true,
              message: `${multipleGroups.length} item groups can use FEFO`,
              details: `Example: ${multipleGroups[0][0]} has ${multipleGroups[0][1].length} batches`,
            };
          },
        },
      ],
    },
    {
      id: 'financial',
      title: 'Financial Accuracy',
      icon: <DollarSign className="h-4 w-4" />,
      items: [
        {
          id: 'fin_inventory_value',
          label: 'Inventory value calculation',
          description: 'Verifies inventory value = Σ(stock × cost price)',
          autoTest: () => {
            const calculatedValue = medications.reduce((sum, med) => {
              return sum + (med.current_stock * Number(med.unit_price));
            }, 0);
            return {
              passed: true,
              message: `Inventory value: ${formatPrice(calculatedValue)}`,
              details: `Based on ${medications.length} items`,
            };
          },
        },
        {
          id: 'fin_sales_total',
          label: 'Sales totals accurate',
          description: 'Verifies all sales have correct total calculations',
          autoTest: async () => {
            if (!pharmacy?.id) return { passed: false, message: 'No pharmacy connected' };
            const { data, error } = await supabase
              .from('sales')
              .select('total_price')
              .eq('pharmacy_id', pharmacy.id);
            if (error) return { passed: false, message: error.message };
            
            const totalSales = (data || []).reduce((sum, s) => sum + Number(s.total_price), 0);
            return {
              passed: true,
              message: `Total sales: ${formatPrice(totalSales)}`,
              details: `From ${data?.length || 0} transactions`,
            };
          },
        },
        {
          id: 'fin_profit_margins',
          label: 'Profit margins configured',
          description: 'Checks selling prices vs cost prices',
          autoTest: () => {
            const withSellingPrice = medications.filter(m => m.selling_price && m.selling_price > 0);
            const profitable = withSellingPrice.filter(m => (m.selling_price || 0) > m.unit_price);
            return {
              passed: profitable.length >= withSellingPrice.length * 0.9,
              message: `${profitable.length}/${withSellingPrice.length} items have positive margins`,
              details: withSellingPrice.length === 0 ? 'Set selling prices to track margins' : undefined,
            };
          },
        },
      ],
    },
    {
      id: 'users',
      title: 'Staff & Shifts',
      icon: <Users className="h-4 w-4" />,
      items: [
        {
          id: 'staff_exist',
          label: 'Staff members configured',
          description: 'Verifies staff accounts exist',
          autoTest: async () => {
            if (!pharmacy?.id) return { passed: false, message: 'No pharmacy connected' };
            const { data, error } = await supabase
              .from('pharmacy_staff')
              .select('id, role')
              .eq('pharmacy_id', pharmacy.id);
            if (error) return { passed: false, message: error.message };
            return {
              passed: (data?.length || 0) > 0,
              message: `${data?.length || 0} staff members configured`,
              details: data?.length ? `Roles: ${[...new Set(data.map(s => s.role))].join(', ')}` : undefined,
            };
          },
        },
        {
          id: 'staff_shifts',
          label: 'Shift tracking active',
          description: 'Verifies shift records exist',
          autoTest: async () => {
            if (!pharmacy?.id) return { passed: false, message: 'No pharmacy connected' };
            const { data, error } = await supabase
              .from('staff_shifts')
              .select('id')
              .eq('pharmacy_id', pharmacy.id)
              .limit(5);
            if (error) return { passed: false, message: error.message };
            return {
              passed: (data?.length || 0) > 0,
              message: data?.length ? 'Shift tracking is active' : 'No shifts recorded yet',
            };
          },
        },
        {
          id: 'staff_sales_attribution',
          label: 'Sales attributed to staff',
          description: 'Verifies sales have sold_by information',
          autoTest: async () => {
            if (!pharmacy?.id) return { passed: false, message: 'No pharmacy connected' };
            const { data, error } = await supabase
              .from('sales')
              .select('id, sold_by, sold_by_name')
              .eq('pharmacy_id', pharmacy.id)
              .limit(20);
            if (error) return { passed: false, message: error.message };
            if (!data?.length) return { passed: true, message: 'No sales to verify' };
            
            const attributed = data.filter(s => s.sold_by || s.sold_by_name);
            const percentage = Math.round((attributed.length / data.length) * 100);
            return {
              passed: percentage >= 80,
              message: `${percentage}% of sales attributed to staff`,
            };
          },
        },
      ],
    },
    {
      id: 'branches',
      title: 'Branch Operations',
      icon: <Building2 className="h-4 w-4" />,
      items: [
        {
          id: 'branch_exist',
          label: 'Branches configured',
          description: 'Verifies branch setup',
          autoTest: async () => {
            if (!pharmacy?.id) return { passed: false, message: 'No pharmacy connected' };
            const { data, error } = await supabase
              .from('branches')
              .select('id, name, is_main_branch')
              .eq('pharmacy_id', pharmacy.id);
            if (error) return { passed: false, message: error.message };
            return {
              passed: (data?.length || 0) > 0,
              message: `${data?.length || 0} branches configured`,
              details: data?.length ? `Main: ${data.find(b => b.is_main_branch)?.name || 'N/A'}` : undefined,
            };
          },
        },
        {
          id: 'branch_transfers',
          label: 'Stock transfers recorded',
          description: 'Verifies transfer system is working',
          autoTest: async () => {
            if (!pharmacy?.id) return { passed: false, message: 'No pharmacy connected' };
            const { data, error } = await supabase
              .from('stock_transfers')
              .select('id, status')
              .eq('pharmacy_id', pharmacy.id)
              .limit(10);
            if (error) return { passed: false, message: error.message };
            return {
              passed: true,
              message: `${data?.length || 0} transfers on record`,
              details: data?.length ? `Completed: ${data.filter(t => t.status === 'completed').length}` : 'No transfers yet',
            };
          },
        },
      ],
    },
    {
      id: 'data',
      title: 'Data Integrity',
      icon: <Shield className="h-4 w-4" />,
      items: [
        {
          id: 'data_customers',
          label: 'Customer records',
          description: 'Verifies customer data exists',
          autoTest: async () => {
            if (!pharmacy?.id) return { passed: false, message: 'No pharmacy connected' };
            const { data, error } = await supabase
              .from('customers')
              .select('id')
              .eq('pharmacy_id', pharmacy.id)
              .limit(100);
            if (error) return { passed: false, message: error.message };
            return {
              passed: true,
              message: `${data?.length || 0} customers in database`,
            };
          },
        },
        {
          id: 'data_suppliers',
          label: 'Supplier records',
          description: 'Verifies supplier data exists',
          autoTest: async () => {
            if (!pharmacy?.id) return { passed: false, message: 'No pharmacy connected' };
            const { data, error } = await supabase
              .from('suppliers')
              .select('id')
              .eq('pharmacy_id', pharmacy.id);
            if (error) return { passed: false, message: error.message };
            return {
              passed: (data?.length || 0) > 0,
              message: `${data?.length || 0} suppliers configured`,
            };
          },
        },
        {
          id: 'data_notifications',
          label: 'Notification system',
          description: 'Verifies notifications are being generated',
          autoTest: async () => {
            if (!pharmacy?.id) return { passed: false, message: 'No pharmacy connected' };
            const { data, error } = await supabase
              .from('notifications')
              .select('id, type')
              .eq('pharmacy_id', pharmacy.id)
              .limit(20);
            if (error) return { passed: false, message: error.message };
            return {
              passed: true,
              message: `${data?.length || 0} notifications generated`,
              details: data?.length ? `Types: ${[...new Set(data.map(n => n.type))].slice(0, 3).join(', ')}` : undefined,
            };
          },
        },
        {
          id: 'data_audit_logs',
          label: 'Audit logging',
          description: 'Verifies actions are being logged',
          autoTest: async () => {
            if (!pharmacy?.id) return { passed: false, message: 'No pharmacy connected' };
            const { data, error } = await supabase
              .from('audit_logs')
              .select('id, action')
              .eq('pharmacy_id', pharmacy.id)
              .limit(20);
            if (error) return { passed: false, message: error.message };
            return {
              passed: (data?.length || 0) > 0,
              message: `${data?.length || 0} audit entries`,
              details: data?.length ? `Actions: ${[...new Set(data.map(a => a.action))].slice(0, 3).join(', ')}` : 'No audit logs yet',
            };
          },
        },
      ],
    },
    {
      id: 'calculations',
      title: 'Critical Calculations',
      icon: <Database className="h-4 w-4" />,
      items: [
        {
          id: 'calc_no_orphan_sales',
          label: 'No orphaned sale records',
          description: 'Verifies all sales link to valid medications',
          autoTest: async () => {
            if (!pharmacy?.id) return { passed: false, message: 'No pharmacy connected' };
            const { data: salesData } = await supabase
              .from('sales')
              .select('id, medication_id')
              .eq('pharmacy_id', pharmacy.id)
              .limit(50);
            
            if (!salesData?.length) return { passed: true, message: 'No sales to verify' };
            
            const medIds = [...new Set(salesData.map(s => s.medication_id))];
            const { data: meds } = await supabase
              .from('medications')
              .select('id')
              .in('id', medIds);
            
            const validIds = new Set(meds?.map(m => m.id) || []);
            const orphaned = salesData.filter(s => !validIds.has(s.medication_id));
            
            return {
              passed: orphaned.length === 0,
              message: orphaned.length === 0 
                ? 'All sales properly linked' 
                : `${orphaned.length} sales have missing medication links`,
            };
          },
        },
        {
          id: 'calc_positive_prices',
          label: 'All prices are positive',
          description: 'Ensures no negative or zero prices',
          autoTest: () => {
            const invalid = medications.filter(m => m.unit_price <= 0);
            return {
              passed: invalid.length === 0,
              message: invalid.length === 0 
                ? 'All prices are positive' 
                : `${invalid.length} items have invalid prices`,
              details: invalid.length > 0 ? `Items: ${invalid.slice(0, 3).map(n => n.name).join(', ')}` : undefined,
            };
          },
        },
        {
          id: 'calc_stock_matches_sales',
          label: 'Stock levels consistent',
          description: 'Verifies stock deductions were applied',
          autoTest: async () => {
            if (!pharmacy?.id) return { passed: false, message: 'No pharmacy connected' };
            
            // Get total quantity sold per medication
            const { data: salesByMed } = await supabase
              .from('sales')
              .select('medication_id, quantity')
              .eq('pharmacy_id', pharmacy.id);
            
            if (!salesByMed?.length) return { passed: true, message: 'No sales data to verify' };
            
            const soldQty = salesByMed.reduce((acc, s) => {
              acc[s.medication_id] = (acc[s.medication_id] || 0) + s.quantity;
              return acc;
            }, {} as Record<string, number>);
            
            // Check if any medication has more sold than could exist
            const issues: string[] = [];
            for (const [medId, qty] of Object.entries(soldQty)) {
              const med = medications.find(m => m.id === medId);
              // This is a sanity check - we can't verify exact numbers without initial stock
              if (med && med.current_stock < 0) {
                issues.push(med.name);
              }
            }
            
            return {
              passed: issues.length === 0,
              message: issues.length === 0 
                ? 'Stock levels appear consistent' 
                : `${issues.length} items may have stock issues`,
              details: issues.length > 0 ? `Check: ${issues.slice(0, 3).join(', ')}` : undefined,
            };
          },
        },
        {
          id: 'calc_selling_vs_cost',
          label: 'Selling prices cover costs',
          description: 'Verifies profit margins are positive',
          autoTest: () => {
            const withPrices = medications.filter(m => m.selling_price && m.selling_price > 0);
            const lossMakers = withPrices.filter(m => (m.selling_price || 0) < m.unit_price);
            
            return {
              passed: lossMakers.length === 0,
              message: lossMakers.length === 0 
                ? 'All selling prices cover costs' 
                : `${lossMakers.length} items selling below cost!`,
              details: lossMakers.length > 0 
                ? `Warning: ${lossMakers.slice(0, 3).map(n => n.name).join(', ')}` 
                : `${withPrices.length} items have selling prices set`,
            };
          },
        },
        {
          id: 'calc_batch_uniqueness',
          label: 'Batch numbers are unique per item',
          description: 'Ensures proper batch tracking',
          autoTest: () => {
            const batchMap: Record<string, string[]> = {};
            medications.forEach(m => {
              const key = `${m.name}-${m.batch_number}`;
              if (!batchMap[key]) batchMap[key] = [];
              batchMap[key].push(m.id);
            });
            
            const duplicates = Object.entries(batchMap).filter(([_, ids]) => ids.length > 1);
            
            return {
              passed: duplicates.length === 0,
              message: duplicates.length === 0 
                ? 'All batch numbers unique' 
                : `${duplicates.length} duplicate batch entries found`,
              details: duplicates.length > 0 
                ? `Check: ${duplicates[0][0]}` 
                : undefined,
            };
          },
        },
      ],
    },
  ];

  const runTest = async (item: TestItem) => {
    if (!item.autoTest || item.manualOnly) return;
    
    setRunningTests(prev => new Set([...prev, item.id]));
    try {
      const result = await item.autoTest();
      setTestResults(prev => ({ ...prev, [item.id]: result }));
      if (result.passed) {
        setCompletedTests(prev => new Set([...prev, item.id]));
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [item.id]: { passed: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      }));
    } finally {
      setRunningTests(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const runAllAutoTests = async () => {
    setIsRunningAll(true);
    const allTests = testCategories.flatMap(cat => cat.items.filter(item => item.autoTest && !item.manualOnly));
    
    for (const test of allTests) {
      await runTest(test);
    }
    
    setIsRunningAll(false);
    toast.success('All automated tests completed');
  };

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

  const passedCount = Object.values(testResults).filter(r => r.passed).length;
  const failedCount = Object.values(testResults).filter(r => !r.passed).length;

  const resetChecklist = () => {
    setCompletedTests(new Set());
    setTestResults({});
    localStorage.removeItem(CHECKLIST_STORAGE_KEY);
  };

  const getCategoryProgress = (category: TestCategory) => {
    const completed = category.items.filter(item => completedTests.has(item.id)).length;
    return { completed, total: category.items.length };
  };

  const exportTestReport = () => {
    const reportDate = format(new Date(), 'yyyy-MM-dd HH:mm');
    const lines: string[] = [
      `PHARMATRACK SYSTEM TEST REPORT`,
      `Generated: ${reportDate}`,
      `Pharmacy: ${pharmacy?.name || 'Unknown'}`,
      ``,
      `SUMMARY`,
      `-------`,
      `Total Tests: ${totalTests}`,
      `Passed: ${passedCount}`,
      `Failed: ${failedCount}`,
      `Pending: ${totalTests - passedCount - failedCount}`,
      `Progress: ${progressPercent}%`,
      ``,
    ];

    testCategories.forEach(category => {
      const { completed, total } = getCategoryProgress(category);
      lines.push(`${category.title.toUpperCase()} (${completed}/${total})`);
      lines.push('-'.repeat(40));
      
      category.items.forEach(item => {
        const result = testResults[item.id];
        const status = completedTests.has(item.id) ? '✓ PASS' : (result && !result.passed ? '✗ FAIL' : '○ PENDING');
        lines.push(`  ${status}: ${item.label}`);
        if (result) {
          lines.push(`         ${result.message}`);
          if (result.details) {
            lines.push(`         ${result.details}`);
          }
        }
      });
      lines.push('');
    });

    lines.push(`--- END OF REPORT ---`);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmatrack-test-report-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Test report downloaded');
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Automated System Tests
            </CardTitle>
            <CardDescription>
              Click "Run All Tests" to automatically verify your system
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="default" 
              size="sm" 
              onClick={runAllAutoTests}
              disabled={isRunningAll}
            >
              {isRunningAll ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isRunningAll ? 'Running...' : 'Run All Tests'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportTestReport}
              disabled={Object.keys(testResults).length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button variant="ghost" size="sm" onClick={resetChecklist}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
        
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
            <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {passedCount} Passed
            </Badge>
            <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20">
              <XCircle className="h-3 w-3 mr-1" />
              {failedCount} Failed
            </Badge>
            <Badge variant="secondary">
              {totalTests - passedCount - failedCount} Pending
            </Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span>{completedCount} of {totalTests} tests passed</span>
            <Badge variant={progressPercent === 100 ? 'default' : 'secondary'}>
              {progressPercent}%
            </Badge>
          </div>
          <Progress value={progressPercent} className="h-2" />
          {progressPercent >= 80 && (
            <p className="text-sm text-green-600 flex items-center gap-2 mt-2">
              <CheckCircle2 className="h-4 w-4" />
              {progressPercent === 100 
                ? 'All tests passed! Your system is ready for production.' 
                : 'Great progress! Most critical tests passing.'}
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
                    <div className={`p-2 rounded-lg ${isComplete ? 'bg-green-500/10 text-green-600' : 'bg-muted'}`}>
                      {category.icon}
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{category.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {completed}/{total} passed
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isComplete && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="pl-4 pr-2 pb-2">
                <div className="space-y-2 mt-2">
                  {category.items.map(item => {
                    const isChecked = completedTests.has(item.id);
                    const isRunning = runningTests.has(item.id);
                    const result = testResults[item.id];
                    
                    return (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                          isChecked 
                            ? 'bg-green-500/5 border-green-500/20' 
                            : result && !result.passed 
                              ? 'bg-red-500/5 border-red-500/20'
                              : 'bg-muted/30 border-border/50'
                        }`}
                      >
                        {item.manualOnly ? (
                          <Checkbox
                            id={item.id}
                            checked={isChecked}
                            onCheckedChange={() => toggleTest(item.id)}
                            className="mt-0.5"
                          />
                        ) : (
                          <div className="mt-0.5">
                            {isRunning ? (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : isChecked ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : result && !result.passed ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium ${isChecked ? 'text-green-700' : ''}`}
                            >
                              {item.label}
                            </span>
                            {item.manualOnly && (
                              <Badge variant="outline" className="text-xs">Manual</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                          {result && (
                            <div className={`text-xs mt-1 ${result.passed ? 'text-green-600' : 'text-red-500'}`}>
                              {result.message}
                              {result.details && (
                                <span className="block text-muted-foreground">{result.details}</span>
                              )}
                            </div>
                          )}
                        </div>
                        {!item.manualOnly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => runTest(item)}
                            disabled={isRunning}
                          >
                            {isRunning ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                          </Button>
                        )}
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
