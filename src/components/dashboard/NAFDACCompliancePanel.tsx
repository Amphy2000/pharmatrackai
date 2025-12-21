import { useMemo, useState } from 'react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Shield, AlertTriangle, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Medication } from '@/types/medication';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface NAFDACCompliancePanelProps {
  medications: Medication[];
}

interface ComplianceIssue {
  medication: Medication;
  issue: 'expired' | 'expiring_soon' | 'near_limit';
  daysUntilExpiry: number;
  severity: 'critical' | 'warning' | 'info';
}

export const NAFDACCompliancePanel = ({ medications }: NAFDACCompliancePanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { regulatory, flagEmoji } = useRegionalSettings();

  const complianceData = useMemo(() => {
    const today = new Date();
    const issues: ComplianceIssue[] = [];
    
    // Regulatory bodies typically require medications to have at least 6 months shelf life remaining
    const minDays = 180; // 6 months
    const warningDays = 90; // 3 months warning
    const criticalDays = 30; // 1 month critical

    medications.forEach(med => {
      const expiryDate = parseISO(med.expiry_date);
      const daysUntilExpiry = differenceInDays(expiryDate, today);

      if (daysUntilExpiry < 0) {
        issues.push({
          medication: med,
          issue: 'expired',
          daysUntilExpiry,
          severity: 'critical'
        });
      } else if (daysUntilExpiry <= criticalDays) {
        issues.push({
          medication: med,
          issue: 'expiring_soon',
          daysUntilExpiry,
          severity: 'critical'
        });
      } else if (daysUntilExpiry <= warningDays) {
        issues.push({
          medication: med,
          issue: 'expiring_soon',
          daysUntilExpiry,
          severity: 'warning'
        });
      } else if (daysUntilExpiry <= minDays) {
        issues.push({
          medication: med,
          issue: 'near_limit',
          daysUntilExpiry,
          severity: 'info'
        });
      }
    });

    // Sort by severity and days until expiry
    issues.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return a.daysUntilExpiry - b.daysUntilExpiry;
    });

    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const infoCount = issues.filter(i => i.severity === 'info').length;
    
    const compliantCount = medications.length - issues.length;
    const complianceScore = medications.length > 0 
      ? Math.round((compliantCount / medications.length) * 100) 
      : 100;

    return { issues, criticalCount, warningCount, infoCount, complianceScore, compliantCount };
  }, [medications]);

  const generateComplianceReport = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    let report = `${regulatory.abbreviation} COMPLIANCE REPORT\n`;
    report += `Generated: ${format(new Date(), 'PPpp')}\n`;
    report += `Regulatory Body: ${regulatory.name}\n`;
    report += `================================\n\n`;
    
    report += `SUMMARY\n`;
    report += `-------\n`;
    report += `Total Medications: ${medications.length}\n`;
    report += `Compliant: ${complianceData.compliantCount}\n`;
    report += `Compliance Score: ${complianceData.complianceScore}%\n\n`;
    
    report += `ISSUES REQUIRING ATTENTION\n`;
    report += `--------------------------\n\n`;

    if (complianceData.issues.length === 0) {
      report += `No compliance issues found. All medications meet ${regulatory.abbreviation} requirements.\n`;
    } else {
      const critical = complianceData.issues.filter(i => i.severity === 'critical');
      const warning = complianceData.issues.filter(i => i.severity === 'warning');
      const info = complianceData.issues.filter(i => i.severity === 'info');

      if (critical.length > 0) {
        report += `CRITICAL (Immediate Action Required):\n`;
        critical.forEach(issue => {
          report += `  - ${issue.medication.name} (Batch: ${issue.medication.batch_number})\n`;
          report += `    ${regulatory.licenseLabel}: ${issue.medication.batch_number}\n`;
          report += `    Expiry: ${format(parseISO(issue.medication.expiry_date), 'PPP')}\n`;
          report += `    Status: ${issue.daysUntilExpiry < 0 ? 'EXPIRED' : `Expires in ${issue.daysUntilExpiry} days`}\n`;
          report += `    Stock: ${issue.medication.current_stock} units\n\n`;
        });
      }

      if (warning.length > 0) {
        report += `\nWARNING (Action Required Within 30 Days):\n`;
        warning.forEach(issue => {
          report += `  - ${issue.medication.name} (Batch: ${issue.medication.batch_number})\n`;
          report += `    Expiry: ${format(parseISO(issue.medication.expiry_date), 'PPP')}\n`;
          report += `    Days Until Expiry: ${issue.daysUntilExpiry}\n`;
          report += `    Stock: ${issue.medication.current_stock} units\n\n`;
        });
      }

      if (info.length > 0) {
        report += `\nINFO (Monitor - Approaching ${regulatory.abbreviation} Limit):\n`;
        info.forEach(issue => {
          report += `  - ${issue.medication.name} (Batch: ${issue.medication.batch_number})\n`;
          report += `    Expiry: ${format(parseISO(issue.medication.expiry_date), 'PPP')}\n`;
          report += `    Days Until Expiry: ${issue.daysUntilExpiry}\n`;
          report += `    Stock: ${issue.medication.current_stock} units\n\n`;
        });
      }
    }

    report += `\n================================\n`;
    report += `This report is for ${regulatory.abbreviation} inspection purposes.\n`;
    report += `Retain for regulatory compliance records.\n`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${regulatory.abbreviation.toLowerCase()}-compliance-report-${today}.txt`;
    a.click();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'warning': return 'bg-warning text-warning-foreground';
      default: return 'bg-primary/20 text-primary';
    }
  };

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-2xl">
            {flagEmoji}
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold font-display">{regulatory.abbreviation} Compliance</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Regulatory status and alerts</p>
          </div>
        </div>
        <Button onClick={generateComplianceReport} variant="outline" className="gap-2 text-sm">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Generate</span> Report
        </Button>
      </div>

      {/* Compliance Score */}
      <div className="mb-6">
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
        <div className="text-center p-2 sm:p-3 rounded-xl bg-destructive/10 border border-destructive/20">
          <p className="text-lg sm:text-2xl font-bold text-destructive">{complianceData.criticalCount}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Critical</p>
        </div>
        <div className="text-center p-2 sm:p-3 rounded-xl bg-warning/10 border border-warning/20">
          <p className="text-lg sm:text-2xl font-bold text-warning">{complianceData.warningCount}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Warning</p>
        </div>
        <div className="text-center p-2 sm:p-3 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-lg sm:text-2xl font-bold text-primary">{complianceData.infoCount}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Monitor</p>
        </div>
      </div>

      {/* Issues List */}
      {complianceData.issues.length > 0 && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-sm">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {complianceData.issues.length} items need attention
              </span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {complianceData.issues.slice(0, 10).map((issue, idx) => (
                <div 
                  key={idx} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{issue.medication.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Batch: {issue.medication.batch_number} • Stock: {issue.medication.current_stock}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={getSeverityColor(issue.severity)}>
                      {issue.daysUntilExpiry < 0 
                        ? 'Expired' 
                        : `${issue.daysUntilExpiry}d left`}
                    </Badge>
                  </div>
                </div>
              ))}
              {complianceData.issues.length > 10 && (
                <p className="text-xs text-center text-muted-foreground py-2">
                  +{complianceData.issues.length - 10} more items. Download full report for details.
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {complianceData.issues.length === 0 && (
        <div className="text-center py-4">
          <Shield className="h-8 w-8 text-success mx-auto mb-2" />
          <p className="text-sm text-success font-medium">All Clear!</p>
          <p className="text-xs text-muted-foreground">All medications meet {regulatory.abbreviation} requirements</p>
        </div>
      )}
    </div>
  );
};
