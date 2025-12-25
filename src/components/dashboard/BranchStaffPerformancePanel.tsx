import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, TrendingUp, Clock, DollarSign, ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react';
import { useShifts } from '@/hooks/useShifts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useBranchContext } from '@/contexts/BranchContext';
import { startOfDay, startOfWeek, startOfMonth, differenceInHours, parseISO } from 'date-fns';

type Period = 'today' | 'week' | 'month';

interface StaffStats {
  staffId: string;
  staffName: string;
  role: string;
  totalSales: number;
  totalTransactions: number;
  hoursWorked: number;
  isActive: boolean;
}

export const BranchStaffPerformancePanel = () => {
  const { allShifts, activeShift } = useShifts();
  const { formatPrice } = useCurrency();
  const { currentBranchId, currentBranchName } = useBranchContext();
  const [period, setPeriod] = useState<Period>('today');
  const [isOpen, setIsOpen] = useState(true);

  const periodStart = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'today': return startOfDay(now);
      case 'week': return startOfWeek(now, { weekStartsOn: 1 });
      case 'month': return startOfMonth(now);
    }
  }, [period]);

  // Filter shifts to only this branch
  const branchShifts = useMemo(() => {
    if (!allShifts || !currentBranchId) return [];

    // Filter by period AND branch
    return allShifts.filter((s) => {
      const clockIn = parseISO(s.clock_in);
      const staffBranchId = (s as any).staff?.branch_id ?? null;
      return clockIn >= periodStart && staffBranchId === currentBranchId;
    });
  }, [allShifts, currentBranchId, periodStart]);

  // Aggregate stats per staff member for this branch
  const staffStats = useMemo(() => {
    const statsMap = new Map<string, StaffStats>();

    branchShifts.forEach(shift => {
      const existing = statsMap.get(shift.staff_id);
      const clockIn = parseISO(shift.clock_in);
      const clockOut = shift.clock_out ? parseISO(shift.clock_out) : new Date();
      const hours = differenceInHours(clockOut, clockIn);
      const isActiveNow = !shift.clock_out;

      if (existing) {
        existing.totalSales += shift.total_sales || 0;
        existing.totalTransactions += shift.total_transactions || 0;
        existing.hoursWorked += hours;
        existing.isActive = existing.isActive || isActiveNow;
      } else {
        const staffName = (shift as any).staff?.profile?.full_name || 'Staff Member';
        const staffRole = (shift as any).staff?.role || 'staff';

        statsMap.set(shift.staff_id, {
          staffId: shift.staff_id,
          staffName,
          role: staffRole,
          totalSales: shift.total_sales || 0,
          totalTransactions: shift.total_transactions || 0,
          hoursWorked: hours,
          isActive: isActiveNow,
        });
      }
    });

    return Array.from(statsMap.values()).sort((a, b) => b.totalSales - a.totalSales);
  }, [branchShifts]);

  // Calculate totals for this branch
  const totals = useMemo(() => {
    return staffStats.reduce((acc, staff) => ({
      sales: acc.sales + staff.totalSales,
      transactions: acc.transactions + staff.totalTransactions,
      hours: acc.hours + staff.hoursWorked,
      activeStaff: acc.activeStaff + (staff.isActive ? 1 : 0),
    }), { sales: 0, transactions: 0, hours: 0, activeStaff: 0 });
  }, [staffStats]);

  if (!currentBranchId) {
    return null;
  }

  return (
    <Card className="glass-card border-border/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Branch Staff Performance
              </CardTitle>
              <CardDescription>
                Staff metrics for {currentBranchName}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {(['today', 'week', 'month'] as Period[]).map(p => (
                  <Button
                    key={p}
                    variant={period === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPeriod(p)}
                    className="text-xs"
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Button>
                ))}
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm text-muted-foreground">Branch Sales</span>
                </div>
                <p className="text-xl font-bold">{formatPrice(totals.sales)}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Transactions</span>
                </div>
                <p className="text-xl font-bold">{totals.transactions}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-muted-foreground">Hours Worked</span>
                </div>
                <p className="text-xl font-bold">{totals.hours}h</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Active Now</span>
                </div>
                <p className="text-xl font-bold">{totals.activeStaff}</p>
              </div>
            </div>

            {/* Staff Table */}
            {staffStats.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Txns</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Avg/Hr</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffStats.map(staff => (
                      <TableRow key={staff.staffId}>
                        <TableCell className="font-medium">{staff.staffName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {staff.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatPrice(staff.totalSales)}</TableCell>
                        <TableCell className="text-right">{staff.totalTransactions}</TableCell>
                        <TableCell className="text-right">{staff.hoursWorked}h</TableCell>
                        <TableCell className="text-right">
                          {staff.hoursWorked > 0 
                            ? formatPrice(staff.totalSales / staff.hoursWorked)
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {staff.isActive ? (
                            <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Off</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No staff activity recorded for this period</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
