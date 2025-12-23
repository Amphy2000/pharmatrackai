import { useState } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/CurrencyContext';
import { usePharmacy } from '@/hooks/usePharmacy';
import { StaffShift } from '@/hooks/useShifts';
import { Download, FileSpreadsheet, FileText, Loader2, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';

interface ShiftReportExporterProps {
  shifts: StaffShift[];
  period: string;
}

type ReportType = 'daily' | 'weekly' | 'custom';

export const ShiftReportExporter = ({ shifts, period }: ShiftReportExporterProps) => {
  const { toast } = useToast();
  const { formatPrice, currencySymbol } = useCurrency();
  const { pharmacy } = usePharmacy();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [includeDetails, setIncludeDetails] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const formatDuration = (clockIn: string, clockOut: string | null) => {
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : new Date();
    const minutes = differenceInMinutes(end, start);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getHours = (clockIn: string, clockOut: string | null) => {
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : new Date();
    return differenceInMinutes(end, start) / 60;
  };

  // Aggregate shifts by staff
  const getStaffSummary = () => {
    const staffMap = new Map<string, {
      name: string;
      role: string;
      shifts: number;
      totalHours: number;
      totalSales: number;
      totalTransactions: number;
    }>();

    shifts.forEach(shift => {
      const staffId = shift.staff_id;
      const name = shift.staff?.profile?.full_name || 'Unknown';
      const role = shift.staff?.role || 'staff';
      
      const existing = staffMap.get(staffId) || {
        name,
        role,
        shifts: 0,
        totalHours: 0,
        totalSales: 0,
        totalTransactions: 0,
      };

      existing.shifts += 1;
      existing.totalHours += getHours(shift.clock_in, shift.clock_out);
      existing.totalSales += shift.total_sales || 0;
      existing.totalTransactions += shift.total_transactions || 0;

      staffMap.set(staffId, existing);
    });

    return Array.from(staffMap.values()).sort((a, b) => b.totalSales - a.totalSales);
  };

  const exportToCSV = () => {
    setIsExporting(true);
    try {
      const rows: string[][] = [];
      
      // Header
      rows.push(['Shift Report', pharmacy?.name || 'Pharmacy']);
      rows.push(['Generated', format(new Date(), 'PPpp')]);
      rows.push(['Period', period]);
      rows.push([]);
      
      // Summary section
      const summary = getStaffSummary();
      rows.push(['=== Staff Summary ===']);
      rows.push(['Staff Name', 'Role', 'Shifts', 'Total Hours', 'Total Sales', 'Transactions', 'Avg/Hour']);
      
      summary.forEach(staff => {
        rows.push([
          staff.name,
          staff.role,
          staff.shifts.toString(),
          staff.totalHours.toFixed(1),
          staff.totalSales.toFixed(2),
          staff.totalTransactions.toString(),
          (staff.totalHours > 0 ? (staff.totalSales / staff.totalHours) : 0).toFixed(2)
        ]);
      });

      if (includeDetails) {
        rows.push([]);
        rows.push(['=== Shift Details ===']);
        rows.push(['Staff', 'Date', 'Clock In', 'Clock Out', 'Duration', 'Sales', 'Transactions', 'Notes']);
        
        shifts.forEach(shift => {
          rows.push([
            shift.staff?.profile?.full_name || 'Unknown',
            format(new Date(shift.clock_in), 'yyyy-MM-dd'),
            format(new Date(shift.clock_in), 'HH:mm'),
            shift.clock_out ? format(new Date(shift.clock_out), 'HH:mm') : 'Active',
            formatDuration(shift.clock_in, shift.clock_out),
            (shift.total_sales || 0).toFixed(2),
            (shift.total_transactions || 0).toString(),
            shift.notes || ''
          ]);
        });
      }

      // Convert to CSV
      const csvContent = rows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `shift-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();

      toast({ title: 'Report exported', description: 'CSV file downloaded successfully' });
    } catch (error) {
      toast({ title: 'Export failed', description: 'Could not generate CSV', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Header
      doc.setFontSize(18);
      doc.text(pharmacy?.name || 'Pharmacy', pageWidth / 2, y, { align: 'center' });
      y += 10;
      
      doc.setFontSize(14);
      doc.text('Staff Shift Report', pageWidth / 2, y, { align: 'center' });
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Period: ${period} | Generated: ${format(new Date(), 'PPpp')}`, pageWidth / 2, y, { align: 'center' });
      doc.setTextColor(0);
      y += 15;

      // Summary Table
      doc.setFontSize(12);
      doc.text('Staff Performance Summary', 14, y);
      y += 8;

      const summary = getStaffSummary();
      const totals = summary.reduce(
        (acc, s) => ({
          shifts: acc.shifts + s.shifts,
          hours: acc.hours + s.totalHours,
          sales: acc.sales + s.totalSales,
          transactions: acc.transactions + s.totalTransactions,
        }),
        { shifts: 0, hours: 0, sales: 0, transactions: 0 }
      );

      doc.setFontSize(9);
      
      // Table headers
      const headers = ['Staff', 'Role', 'Shifts', 'Hours', 'Sales', 'Trans.', 'Avg/Hr'];
      const colWidths = [40, 20, 18, 20, 30, 18, 25];
      let x = 14;
      
      doc.setFillColor(240, 240, 240);
      doc.rect(14, y - 4, pageWidth - 28, 7, 'F');
      
      headers.forEach((header, i) => {
        doc.text(header, x + 2, y);
        x += colWidths[i];
      });
      y += 7;

      // Table rows
      summary.forEach(staff => {
        x = 14;
        doc.text(staff.name.substring(0, 18), x + 2, y);
        x += colWidths[0];
        doc.text(staff.role.substring(0, 8), x + 2, y);
        x += colWidths[1];
        doc.text(staff.shifts.toString(), x + 2, y);
        x += colWidths[2];
        doc.text(staff.totalHours.toFixed(1), x + 2, y);
        x += colWidths[3];
        doc.text(`${currencySymbol}${staff.totalSales.toFixed(0)}`, x + 2, y);
        x += colWidths[4];
        doc.text(staff.totalTransactions.toString(), x + 2, y);
        x += colWidths[5];
        doc.text(`${currencySymbol}${(staff.totalHours > 0 ? staff.totalSales / staff.totalHours : 0).toFixed(0)}`, x + 2, y);
        y += 6;

        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });

      // Totals row
      y += 2;
      doc.setFillColor(220, 220, 220);
      doc.rect(14, y - 4, pageWidth - 28, 7, 'F');
      
      x = 14;
      doc.text('TOTAL', x + 2, y);
      x += colWidths[0] + colWidths[1];
      doc.text(totals.shifts.toString(), x + 2, y);
      x += colWidths[2];
      doc.text(totals.hours.toFixed(1), x + 2, y);
      x += colWidths[3];
      doc.text(`${currencySymbol}${totals.sales.toFixed(0)}`, x + 2, y);
      x += colWidths[4];
      doc.text(totals.transactions.toString(), x + 2, y);
      y += 15;

      // Shift details if included
      if (includeDetails && y < 250) {
        doc.setFontSize(12);
        doc.text('Shift Details', 14, y);
        y += 8;

        doc.setFontSize(8);
        const detailHeaders = ['Date', 'Staff', 'In', 'Out', 'Duration', 'Sales'];
        const detailWidths = [25, 35, 18, 18, 22, 25];
        
        x = 14;
        doc.setFillColor(240, 240, 240);
        doc.rect(14, y - 3, pageWidth - 28, 6, 'F');
        
        detailHeaders.forEach((header, i) => {
          doc.text(header, x + 1, y);
          x += detailWidths[i];
        });
        y += 6;

        shifts.slice(0, 30).forEach(shift => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          
          x = 14;
          doc.text(format(new Date(shift.clock_in), 'MM/dd'), x + 1, y);
          x += detailWidths[0];
          doc.text((shift.staff?.profile?.full_name || 'Unknown').substring(0, 15), x + 1, y);
          x += detailWidths[1];
          doc.text(format(new Date(shift.clock_in), 'HH:mm'), x + 1, y);
          x += detailWidths[2];
          doc.text(shift.clock_out ? format(new Date(shift.clock_out), 'HH:mm') : '-', x + 1, y);
          x += detailWidths[3];
          doc.text(formatDuration(shift.clock_in, shift.clock_out), x + 1, y);
          x += detailWidths[4];
          doc.text(`${currencySymbol}${(shift.total_sales || 0).toFixed(0)}`, x + 1, y);
          y += 5;
        });

        if (shifts.length > 30) {
          y += 3;
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(`... and ${shifts.length - 30} more shifts (export to CSV for complete list)`, 14, y);
        }
      }

      // Save PDF
      doc.save(`shift-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast({ title: 'Report exported', description: 'PDF file downloaded successfully' });
    } catch (error) {
      toast({ title: 'Export failed', description: 'Could not generate PDF', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Configure Report
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={exportToCSV} disabled={shifts.length === 0}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Quick Export (CSV)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportToPDF} disabled={shifts.length === 0}>
            <FileText className="h-4 w-4 mr-2" />
            Quick Export (PDF)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Shift Report</DialogTitle>
            <DialogDescription>
              Configure your report settings before exporting
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily Summary</SelectItem>
                  <SelectItem value="weekly">Weekly Summary</SelectItem>
                  <SelectItem value="custom">Current Selection ({shifts.length} shifts)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Shift Details</Label>
                <p className="text-xs text-muted-foreground">
                  Add individual shift records to the report
                </p>
              </div>
              <Switch checked={includeDetails} onCheckedChange={setIncludeDetails} />
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium">Report Preview</p>
              <p className="text-muted-foreground mt-1">
                {shifts.length} shifts from {getStaffSummary().length} staff members
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={() => { exportToCSV(); setDialogOpen(false); }}
              disabled={isExporting || shifts.length === 0}
            >
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
              Export CSV
            </Button>
            <Button 
              onClick={() => { exportToPDF(); setDialogOpen(false); }}
              disabled={isExporting || shifts.length === 0}
            >
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Export PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
