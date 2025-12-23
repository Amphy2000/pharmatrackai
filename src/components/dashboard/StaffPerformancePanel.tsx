import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, Clock, DollarSign, Calendar, ChevronDown, ChevronUp, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useShifts, StaffShift } from '@/hooks/useShifts';
import { usePermissions } from '@/hooks/usePermissions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format, startOfDay, startOfWeek, startOfMonth, isAfter, differenceInHours, differenceInMinutes } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type Period = 'today' | 'week' | 'month';

interface StaffStats {
  staffId: string;
  staffName: string;
  role: string;
  totalSales: number;
  totalTransactions: number;
  totalHours: number;
  shifts: number;
  avgPerHour: number;
  isCurrentlyActive: boolean;
}

export const StaffPerformancePanel = () => {
  const navigate = useNavigate();
  const { allShifts, isLoadingAllShifts } = useShifts();
  const { isOwnerOrManager } = usePermissions();
  const { formatPrice } = useCurrency();
  const [period, setPeriod] = useState<Period>('today');
  const [isExpanded, setIsExpanded] = useState(true);

  const periodStart = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'today':
        return startOfDay(now);
      case 'week':
        return startOfWeek(now, { weekStartsOn: 1 });
      case 'month':
        return startOfMonth(now);
      default:
        return startOfDay(now);
    }
  }, [period]);

  const filteredShifts = useMemo(() => {
    return allShifts.filter(shift => 
      isAfter(new Date(shift.clock_in), periodStart)
    );
  }, [allShifts, periodStart]);

  const staffStats = useMemo(() => {
    const statsMap = new Map<string, StaffStats>();

    filteredShifts.forEach(shift => {
      const staffId = shift.staff_id;
      const staffName = shift.staff?.profile?.full_name || 'Unknown Staff';
      const role = shift.staff?.role || 'staff';
      
      const existing = statsMap.get(staffId) || {
        staffId,
        staffName,
        role,
        totalSales: 0,
        totalTransactions: 0,
        totalHours: 0,
        shifts: 0,
        avgPerHour: 0,
        isCurrentlyActive: false,
      };

      const clockIn = new Date(shift.clock_in);
      const clockOut = shift.clock_out ? new Date(shift.clock_out) : new Date();
      const hours = differenceInMinutes(clockOut, clockIn) / 60;

      existing.totalSales += shift.total_sales || 0;
      existing.totalTransactions += shift.total_transactions || 0;
      existing.totalHours += hours;
      existing.shifts += 1;
      existing.isCurrentlyActive = existing.isCurrentlyActive || !shift.clock_out;
      existing.avgPerHour = existing.totalHours > 0 
        ? existing.totalSales / existing.totalHours 
        : 0;

      statsMap.set(staffId, existing);
    });

    return Array.from(statsMap.values()).sort((a, b) => b.totalSales - a.totalSales);
  }, [filteredShifts]);

  const totals = useMemo(() => {
    return staffStats.reduce(
      (acc, stat) => ({
        totalSales: acc.totalSales + stat.totalSales,
        totalTransactions: acc.totalTransactions + stat.totalTransactions,
        totalHours: acc.totalHours + stat.totalHours,
        activeStaff: acc.activeStaff + (stat.isCurrentlyActive ? 1 : 0),
      }),
      { totalSales: 0, totalTransactions: 0, totalHours: 0, activeStaff: 0 }
    );
  }, [staffStats]);

  if (!isOwnerOrManager) {
    return null;
  }

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Staff Performance
              <Badge variant="outline" className="ml-2">
                {totals.activeStaff} Active
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8"
                onClick={() => navigate('/shift-history')}
              >
                <History className="h-4 w-4 mr-1" />
                History
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-background/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <DollarSign className="h-3 w-3" />
                  Total Sales
                </div>
                <div className="text-lg font-bold text-green-600">
                  {formatPrice(totals.totalSales)}
                </div>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <TrendingUp className="h-3 w-3" />
                  Transactions
                </div>
                <div className="text-lg font-bold">{totals.totalTransactions}</div>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Clock className="h-3 w-3" />
                  Total Hours
                </div>
                <div className="text-lg font-bold">{formatHours(totals.totalHours)}</div>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Users className="h-3 w-3" />
                  Staff Members
                </div>
                <div className="text-lg font-bold">{staffStats.length}</div>
              </div>
            </div>

            {/* Staff Table */}
            {isLoadingAllShifts ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : staffStats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No shift data for this period
              </div>
            ) : (
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Staff</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Trans.</TableHead>
                      <TableHead className="text-right hidden md:table-cell">Hours</TableHead>
                      <TableHead className="text-right hidden lg:table-cell">Avg/Hour</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffStats.map((stat, index) => (
                      <TableRow key={stat.staffId} className={index === 0 ? 'bg-primary/5' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                              {stat.staffName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium">{stat.staffName}</div>
                              <div className="text-xs text-muted-foreground capitalize">{stat.role}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatPrice(stat.totalSales)}
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell">
                          {stat.totalTransactions}
                        </TableCell>
                        <TableCell className="text-right hidden md:table-cell">
                          {formatHours(stat.totalHours)}
                        </TableCell>
                        <TableCell className="text-right hidden lg:table-cell">
                          {formatPrice(stat.avgPerHour)}/hr
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={stat.isCurrentlyActive ? 'default' : 'secondary'} className="text-xs">
                            {stat.isCurrentlyActive ? 'Active' : 'Off'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
