import { useMemo, useState, useRef } from 'react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Shield, AlertTriangle, FileText, ChevronDown, ChevronUp, Printer, Download, Filter } from 'lucide-react';
import { Medication } from '@/types/medication';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { usePharmacy } from '@/hooks/usePharmacy';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateNAFDACComplianceReport } from '@/utils/nafdacReportGenerator';

interface NAFDACCompliancePanelProps {
  medications: Medication[];
}

type FilterType = 'all' | 'expiring_soon' | 'controlled';

export const NAFDACCompliancePanel = ({ medications }: NAFDACCompliancePanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const { regulatory, flagEmoji } = useRegionalSettings();
  const { pharmacy } = usePharmacy();
  const printRef = useRef<HTMLDivElement>(null);

  // Filter medications based on selected filter
  const filteredMedications = useMemo(() => {
    const today = new Date();
    
    switch (filter) {
      case 'expiring_soon':
        return medications.filter(med => {
          const expiryDate = parseISO(med.expiry_date);
          const daysUntilExpiry = differenceInDays(expiryDate, today);
          return daysUntilExpiry >= 0 && daysUntilExpiry <= 90;
        });
      case 'controlled':
        // Filter for controlled drugs using the is_controlled flag
        return medications.filter(med => med.is_controlled === true);
      default:
        return medications;
    }
  }, [medications, filter]);

  const complianceData = useMemo(() => {
    const today = new Date();
    const criticalDays = 30;
    const warningDays = 90;

    let criticalCount = 0;
    let warningCount = 0;
    let expiredCount = 0;

    medications.forEach(med => {
      const expiryDate = parseISO(med.expiry_date);
      const daysUntilExpiry = differenceInDays(expiryDate, today);

      if (daysUntilExpiry < 0) {
        expiredCount++;
        criticalCount++;
      } else if (daysUntilExpiry <= criticalDays) {
        criticalCount++;
      } else if (daysUntilExpiry <= warningDays) {
        warningCount++;
      }
    });

    const issueCount = expiredCount + criticalCount + warningCount - expiredCount; // avoid double counting expired
    const compliantCount = medications.length - criticalCount - warningCount;
    const complianceScore = medications.length > 0 
      ? Math.round((Math.max(0, compliantCount) / medications.length) * 100) 
      : 100;

    return { criticalCount, warningCount, complianceScore, expiredCount };
  }, [medications]);

  const getStatusBadge = (med: Medication) => {
    const expiryDate = parseISO(med.expiry_date);
    const today = new Date();
    const daysUntilExpiry = differenceInDays(expiryDate, today);

    if (daysUntilExpiry < 0) {
      return <Badge className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5">Expired</Badge>;
    } else if (daysUntilExpiry <= 90) {
      return <Badge className="bg-warning text-warning-foreground text-[10px] px-1.5 py-0.5">{daysUntilExpiry}d left</Badge>;
    }
    return <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-success border-success/30">OK</Badge>;
  };

  const handleDownloadPDF = () => {
    if (!pharmacy) return;
    
    const doc = generateNAFDACComplianceReport(
      filteredMedications,
      {
        name: pharmacy.name,
        address: pharmacy.address,
        phone: pharmacy.phone,
        license_number: pharmacy.license_number,
        pharmacist_in_charge: pharmacy.pharmacist_in_charge,
      },
      {
        regulatory,
        filter,
      }
    );
    
    const today = format(new Date(), 'yyyy-MM-dd');
    doc.save(`${regulatory.abbreviation.toLowerCase()}-compliance-report-${today}.pdf`);
  };

  const handlePrint = () => {
    if (!pharmacy) return;
    
    const doc = generateNAFDACComplianceReport(
      filteredMedications,
      {
        name: pharmacy.name,
        address: pharmacy.address,
        phone: pharmacy.phone,
        license_number: pharmacy.license_number,
        pharmacist_in_charge: pharmacy.pharmacist_in_charge,
      },
      {
        regulatory,
        filter,
      }
    );
    
    // Open in new window for printing
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-primary/10 text-xl flex-shrink-0">
            {flagEmoji}
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold font-display truncate">{regulatory.abbreviation} Compliance</h3>
            <p className="text-xs text-muted-foreground">Professional Audit Document</p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="gap-1.5 h-8 px-2.5">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
          <Button onClick={handlePrint} variant="outline" size="sm" className="gap-1.5 h-8 px-2.5">
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Print</span>
          </Button>
        </div>
      </div>

      {/* Filter Dropdown */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <SelectTrigger className="w-[200px] h-8 text-sm">
            <SelectValue placeholder="Filter view" />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border z-50">
            <SelectItem value="all">Full Inventory</SelectItem>
            <SelectItem value="expiring_soon">Expiring Soon (90 days)</SelectItem>
            <SelectItem value="controlled">Controlled/Narcotic Drugs</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-2">
          {filteredMedications.length} items
        </span>
      </div>

      {/* Compliance Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Compliance Score</span>
          <span className={`text-lg font-bold ${
            complianceData.complianceScore >= 90 ? 'text-success' :
            complianceData.complianceScore >= 70 ? 'text-warning' : 'text-destructive'
          }`}>
            {complianceData.complianceScore}%
          </span>
        </div>
        <Progress 
          value={complianceData.complianceScore} 
          className="h-2"
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
        <div className="text-center p-3 rounded-xl bg-destructive/10 border border-destructive/20">
          <p className="text-xl sm:text-2xl font-bold text-destructive">{complianceData.expiredCount}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Expired</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-warning/10 border border-warning/20">
          <p className="text-xl sm:text-2xl font-bold text-warning">{complianceData.warningCount}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Expiring Soon</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-success/10 border border-success/20">
          <p className="text-xl sm:text-2xl font-bold text-success">{medications.length - complianceData.criticalCount - complianceData.warningCount}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Compliant</p>
        </div>
      </div>

      {/* Inventory Table */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between text-sm h-9 mb-2">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              View Inventory Table
            </span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ScrollArea className="h-[300px] rounded-lg border border-border">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10">
                <TableRow>
                  <TableHead className="w-10 text-xs">S/N</TableHead>
                  <TableHead className="text-xs">Product Name</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Batch No</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Exp Date</TableHead>
                  <TableHead className="text-xs text-right">Stock</TableHead>
                  <TableHead className="text-xs text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMedications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {filter === 'controlled' 
                        ? 'No controlled drugs found in inventory'
                        : filter === 'expiring_soon'
                        ? 'No items expiring within 90 days'
                        : 'No inventory items found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMedications.map((med, index) => (
                    <TableRow key={med.id} className="text-xs">
                      <TableCell className="font-medium py-2">{index + 1}</TableCell>
                      <TableCell className="py-2">
                        <span className="line-clamp-1">{med.name}</span>
                      </TableCell>
                      <TableCell className="py-2 hidden sm:table-cell font-mono text-[10px]">
                        {med.batch_number}
                      </TableCell>
                      <TableCell className="py-2 hidden md:table-cell">
                        {format(parseISO(med.expiry_date), 'MMM yyyy')}
                      </TableCell>
                      <TableCell className="py-2 text-right">{med.current_stock}</TableCell>
                      <TableCell className="py-2 text-center">
                        {getStatusBadge(med)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>

      {/* All Clear Message */}
      {complianceData.criticalCount === 0 && complianceData.warningCount === 0 && medications.length > 0 && (
        <div className="text-center py-4 mt-2">
          <Shield className="h-8 w-8 text-success mx-auto mb-2" />
          <p className="text-sm text-success font-medium">All Clear!</p>
          <p className="text-xs text-muted-foreground">All medications meet {regulatory.abbreviation} requirements</p>
        </div>
      )}
    </div>
  );
};
