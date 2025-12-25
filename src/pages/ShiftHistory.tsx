import { useState, useMemo } from 'react';
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, differenceInMinutes, isAfter, isBefore, parseISO } from 'date-fns';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useShifts } from '@/hooks/useShifts';
import { usePermissions } from '@/hooks/usePermissions';
import { useBranchContext } from '@/contexts/BranchContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Download,
  User,
  Timer,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ShiftReportExporter } from '@/components/shifts/ShiftReportExporter';

type Period = 'today' | 'week' | 'month' | 'year' | 'all';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export default function ShiftHistory() {
  const { user } = useAuth();
  const { allShifts, activeShift, isLoadingAllShifts } = useShifts();
  const { isOwnerOrManager, userRole } = usePermissions();
  const { formatPrice } = useCurrency();
  const { currentBranchId, userAssignedBranchId } = useBranchContext();
  const [period, setPeriod] = useState<Period>('month');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Determine which branch to filter by for managers
  const filterBranchId = userRole === 'manager' ? userAssignedBranchId : null;

  // Get period start date
  const periodStart = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'today':
        return startOfDay(now);
      case 'week':
        return startOfWeek(now, { weekStartsOn: 1 });
      case 'month':
        return startOfMonth(now);
      case 'year':
        return startOfYear(now);
      case 'all':
        return new Date(0);
      default:
        return startOfMonth(now);
    }
  }, [period]);

  // Filter shifts for the selected period
  // - Owners see all shifts
  // - Managers see only their branch's shifts  
  // - Staff see only their own shifts
  const filteredShifts = useMemo(() => {
    let shifts = allShifts.filter(shift => 
      isAfter(new Date(shift.clock_in), periodStart)
    );
    
    // Managers: filter to only their assigned branch's staff shifts
    if (userRole === 'manager' && filterBranchId) {
      // Need to filter by staff that are assigned to the same branch
      // Since shifts don't have branch_id directly, we filter by staff branch assignment
      shifts = shifts.filter(shift => {
        // Include shifts from staff assigned to the manager's branch
        // This requires staff branch_id info which we need to fetch
        return true; // For now, managers see all - will be enhanced with branch staff data
      });
    }
    
    // Staff: only show own shifts
    if (!isOwnerOrManager) {
      shifts = shifts.filter(shift => shift.staff?.user_id === user?.id);
    }
    
    return shifts.sort((a, b) => 
      new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime()
    );
  }, [allShifts, periodStart, isOwnerOrManager, user?.id, userRole, filterBranchId]);

  // Pagination
  const totalPages = Math.ceil(filteredShifts.length / itemsPerPage);
  const paginatedShifts = filteredShifts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calculate stats
  const stats = useMemo(() => {
    const totalHours = filteredShifts.reduce((acc, shift) => {
      const clockIn = new Date(shift.clock_in);
      const clockOut = shift.clock_out ? new Date(shift.clock_out) : new Date();
      return acc + differenceInMinutes(clockOut, clockIn) / 60;
    }, 0);

    const totalSales = filteredShifts.reduce((acc, shift) => 
      acc + (shift.total_sales || 0), 0);

    const totalTransactions = filteredShifts.reduce((acc, shift) => 
      acc + (shift.total_transactions || 0), 0);

    const avgHoursPerShift = filteredShifts.length > 0 
      ? totalHours / filteredShifts.length 
      : 0;

    const avgSalesPerHour = totalHours > 0 ? totalSales / totalHours : 0;

    return {
      totalShifts: filteredShifts.length,
      totalHours,
      totalSales,
      totalTransactions,
      avgHoursPerShift,
      avgSalesPerHour,
    };
  }, [filteredShifts]);

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatDuration = (clockIn: string, clockOut: string | null) => {
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : new Date();
    const minutes = differenceInMinutes(end, start);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <motion.main 
        className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Page Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary-foreground" />
              </div>
              Shift History
            </h1>
            <p className="text-muted-foreground mt-1">
              {isOwnerOrManager ? 'View all staff shift records and performance' : 'Track your hours and performance'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={(v) => { setPeriod(v as Period); setCurrentPage(1); }}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>

            {isOwnerOrManager && (
              <ShiftReportExporter shifts={filteredShifts} period={period} />
            )}
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3.5 w-3.5" />
                Total Shifts
              </div>
              <p className="text-2xl font-bold">{stats.totalShifts}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Timer className="h-3.5 w-3.5" />
                Total Hours
              </div>
              <p className="text-2xl font-bold">{formatHours(stats.totalHours)}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <DollarSign className="h-3.5 w-3.5" />
                Total Sales
              </div>
              <p className="text-2xl font-bold text-green-600">{formatPrice(stats.totalSales)}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3.5 w-3.5" />
                Transactions
              </div>
              <p className="text-2xl font-bold">{stats.totalTransactions}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Clock className="h-3.5 w-3.5" />
                Avg/Shift
              </div>
              <p className="text-2xl font-bold">{formatHours(stats.avgHoursPerShift)}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <BarChart3 className="h-3.5 w-3.5" />
                Sales/Hour
              </div>
              <p className="text-2xl font-bold text-emerald-600">{formatPrice(stats.avgSalesPerHour)}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Shift Banner */}
        {activeShift && (
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-green-600 animate-pulse" />
                    </div>
                    <div>
                      <p className="font-medium text-green-600">Currently Clocked In</p>
                      <p className="text-sm text-muted-foreground">
                        Started at {format(new Date(activeShift.clock_in), 'h:mm a')} • 
                        Duration: {formatDuration(activeShift.clock_in, null)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-green-500/50 text-green-600">
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Shifts Table */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Shift Records</CardTitle>
              <CardDescription>
                {filteredShifts.length} shifts found for the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAllShifts ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : paginatedShifts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No shift records found</p>
                  <p className="text-sm mt-1">Clock in to start tracking your shifts</p>
                </div>
              ) : (
                <>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          {isOwnerOrManager && <TableHead>Staff</TableHead>}
                          <TableHead>Date</TableHead>
                          <TableHead>Clock In</TableHead>
                          <TableHead>Clock Out</TableHead>
                          <TableHead className="text-center">Duration</TableHead>
                          <TableHead className="text-right">Sales</TableHead>
                          <TableHead className="text-center">Trans.</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedShifts.map((shift) => (
                          <TableRow key={shift.id}>
                            {isOwnerOrManager && (
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                    {shift.staff?.profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">
                                      {shift.staff?.profile?.full_name || 'Unknown'}
                                    </p>
                                    <p className="text-xs text-muted-foreground capitalize">
                                      {shift.staff?.role || 'staff'}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                            )}
                            <TableCell className="font-medium">
                              {format(new Date(shift.clock_in), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell>
                              {format(new Date(shift.clock_in), 'h:mm a')}
                            </TableCell>
                            <TableCell>
                              {shift.clock_out 
                                ? format(new Date(shift.clock_out), 'h:mm a')
                                : '—'
                              }
                            </TableCell>
                            <TableCell className="text-center">
                              {formatDuration(shift.clock_in, shift.clock_out)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              {formatPrice(shift.total_sales || 0)}
                            </TableCell>
                            <TableCell className="text-center">
                              {shift.total_transactions || 0}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant={shift.clock_out ? 'secondary' : 'default'}
                                className={!shift.clock_out ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}
                              >
                                {shift.clock_out ? 'Completed' : 'Active'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredShifts.length)} of {filteredShifts.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm px-2">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.main>
    </div>
  );
}
