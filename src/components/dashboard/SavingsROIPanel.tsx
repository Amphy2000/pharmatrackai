import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  DollarSign, 
  Lock,
  Share2,
  FileDown,
  CheckCircle,
  Building2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useMedications } from '@/hooks/useMedications';
import { useSales } from '@/hooks/useSales';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useBranchContext } from '@/contexts/BranchContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useBranches } from '@/hooks/useBranches';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays, parseISO, startOfMonth, endOfMonth, format } from 'date-fns';
import { generateSavingsSummaryPdf } from '@/utils/savingsSummaryPdfGenerator';

interface SavingsROIPanelProps {
  invoicesScanned?: number;
  auditLogCount?: number;
}

export const SavingsROIPanel = ({ invoicesScanned = 0, auditLogCount = 0 }: SavingsROIPanelProps) => {
  const { formatPrice } = useCurrency();
  const { medications } = useMedications();
  const { sales: salesData } = useSales();
  const { pharmacy } = usePharmacy();
  const { isMainBranch, currentBranchName, currentBranchId } = useBranchContext();
  const { userRole } = usePermissions();
  const { branches } = useBranches();
  const { toast } = useToast();

  const isOwner = userRole === 'owner';
  const branchCount = branches.length;

  // Get subscription cost based on plan
  const monthlyCost = useMemo(() => {
    const plan = pharmacy?.subscription_plan || 'starter';
    switch (plan) {
      case 'starter': return 35000;
      case 'pro': return 55000;
      case 'enterprise': return 85000;
      default: return 35000;
    }
  }, [pharmacy?.subscription_plan]);

  const metrics = useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const monthName = format(today, 'MMMM yyyy');

    // Filter data based on user role - owners see all, managers see their branch only
    const relevantMedications = isOwner 
      ? medications 
      : medications.filter(med => {
          // If the medication has metadata with branch_id, use that
          const medBranchId = (med.metadata as any)?.branch_id;
          return !medBranchId || medBranchId === currentBranchId;
        });

    const relevantSales = isOwner
      ? salesData
      : salesData?.filter(sale => sale.branch_id === currentBranchId || !sale.branch_id);

    // Time Saved: Calculate from invoices scanned and audit log activities
    // Each invoice scan saves ~30 minutes, each audit action saves ~5 minutes
    const invoiceTimeSaved = invoicesScanned * 30;
    const auditTimeSaved = auditLogCount * 5;
    const timeSavedMinutes = invoiceTimeSaved + auditTimeSaved;
    const timeSavedHours = Math.round(timeSavedMinutes / 60);

    // Loss Prevented: Value of drugs sold within 60 days of expiry this month
    const nearExpirySales = relevantSales?.filter(sale => {
      const saleDate = parseISO(sale.sale_date);
      if (saleDate < monthStart || saleDate > monthEnd) return false;
      const med = relevantMedications.find(m => m.id === sale.medication_id);
      if (!med) return false;
      const expiryDate = parseISO(med.expiry_date);
      const daysToExpiryAtSale = differenceInDays(expiryDate, saleDate);
      return daysToExpiryAtSale <= 60 && daysToExpiryAtSale > 0;
    }) || [];

    const lossPrevented = nearExpirySales.reduce((sum, sale) => sum + sale.total_price, 0);
    const itemsSaved = nearExpirySales.length;

    // Theft Blocked: Number of unauthorized price-change attempts blocked
    // Each blocked attempt protects an estimated 10% of average transaction
    const theftBlocked = auditLogCount;
    const avgTransactionValue = relevantSales && relevantSales.length > 0
      ? relevantSales.reduce((sum, s) => sum + s.total_price, 0) / relevantSales.length
      : 5000;
    const theftValueProtected = theftBlocked * avgTransactionValue * 0.1;

    // At-risk inventory (items expiring within 30 days)
    const atRiskItems = relevantMedications.filter(med => {
      const expiryDate = parseISO(med.expiry_date);
      const daysToExpiry = differenceInDays(expiryDate, today);
      return daysToExpiry > 0 && daysToExpiry <= 30;
    });
    const atRiskValue = atRiskItems.reduce((sum, med) => 
      sum + (med.current_stock * med.unit_price), 0
    );

    // Calculate total savings
    const hourlyRate = 1500; // NGN per hour for pharmacy staff
    const timeSavedValue = timeSavedHours * hourlyRate;
    const totalSavings = timeSavedValue + lossPrevented + theftValueProtected;

    // Calculate ROI multiple
    const savingsMultiple = monthlyCost > 0 && totalSavings > 0 
      ? (totalSavings / monthlyCost).toFixed(1) 
      : '0';

    return {
      monthName,
      timeSavedHours,
      timeSavedValue,
      lossPrevented,
      nearExpiryCount: atRiskItems.length,
      itemsSaved,
      theftBlocked,
      theftValueProtected,
      atRiskValue,
      atRiskItems: atRiskItems.length,
      totalSavings,
      savingsMultiple,
      generatedAt: format(today, 'MMM dd, yyyy h:mm a'),
    };
  }, [medications, salesData, invoicesScanned, auditLogCount, isOwner, currentBranchId, monthlyCost]);

  const handleShare = async () => {
    const scopeLabel = isOwner && branchCount > 1 ? 'All Branches' : currentBranchName;
    const shareText = `🎉 ${pharmacy?.name || 'Our Pharmacy'} Monthly Savings Report
${isOwner && branchCount > 1 ? `📍 ${branchCount} Branches Combined\n` : ''}
📅 ${metrics.monthName}

💰 Total Saved: ${formatPrice(metrics.totalSavings, 'NGN')}
✅ Near-Expiry Items Sold: ${metrics.itemsSaved} items
💊 Expiry Loss Prevented: ${formatPrice(metrics.lossPrevented, 'NGN')}
⏰ Time Saved: ${metrics.timeSavedHours} hours
🔒 Theft Attempts Blocked: ${metrics.theftBlocked}

🛡️ Protected by PharmaTrack
🌐 pharmatrack.com.ng`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'PharmaTrack Monthly Savings', text: shareText });
      } catch {
        await navigator.clipboard.writeText(shareText);
        toast({ title: 'Copied to clipboard!', description: 'Share this with your colleagues' });
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast({ title: 'Copied to clipboard!', description: 'Share this with your colleagues' });
    }
  };

  const handleDownloadPdf = () => {
    const branchInfo = isOwner && branchCount > 1 
      ? `Total Savings Across ${branchCount} Branches`
      : `${currentBranchName} Monthly Savings`;
    
    generateSavingsSummaryPdf({
      pharmacyName: pharmacy?.name || 'Your Pharmacy',
      monthName: metrics.monthName,
      branchInfo,
      totalSavings: metrics.totalSavings,
      lossPrevented: metrics.lossPrevented,
      itemsSaved: metrics.itemsSaved,
      timeSavedHours: metrics.timeSavedHours,
      timeSavedValue: metrics.timeSavedValue,
      theftBlocked: metrics.theftBlocked,
      theftValueProtected: metrics.theftValueProtected,
      atRiskValue: metrics.atRiskValue,
      atRiskItems: metrics.atRiskItems,
      savingsMultiple: metrics.savingsMultiple,
      generatedAt: metrics.generatedAt,
      monthlyCost,
    });

    toast({ 
      title: 'PDF Downloaded!', 
      description: 'Share this savings report with colleagues and friends' 
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-6">
      {/* Header Card with Monthly Summary */}
      <Card className="overflow-hidden border-2 border-primary/30 shadow-xl bg-gradient-to-br from-background via-background to-primary/5">
        <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4 text-primary-foreground">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-display text-lg font-bold">
                {pharmacy?.name || 'Your Pharmacy'}
              </h3>
              <p className="text-xs text-primary-foreground/80 flex items-center gap-1">
                {isOwner && branchCount > 1 ? (
                  <>
                    <Building2 className="h-3 w-3" />
                    Total Savings Across {branchCount} Branches
                  </>
                ) : (
                  `${currentBranchName} Monthly Savings`
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 text-white border-white/30 text-xs">
                {metrics.monthName}
              </Badge>
              <Badge className="bg-success/80 text-white border-success/50 text-sm font-bold">
                {metrics.savingsMultiple}x ROI
              </Badge>
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          {/* Main Total Savings - Horizontal */}
          <div className="text-center py-4 mb-6 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
            <p className="text-sm text-muted-foreground mb-1">Total Money Saved This Month</p>
            <p className="text-4xl md:text-5xl font-display font-bold text-success">
              {formatPrice(metrics.totalSavings, 'NGN')}
            </p>
            <Badge className="mt-2 bg-success/20 text-success border-success/30">
              {metrics.savingsMultiple}x your subscription cost
            </Badge>
          </div>

          {/* Horizontal Savings Cards */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
          >
            {/* Loss Prevented */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-success/5 border border-success/20">
                <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-6 w-6 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Loss Prevented</p>
                  <p className="text-xl font-bold text-success truncate">{formatPrice(metrics.lossPrevented, 'NGN')}</p>
                  <p className="text-xs text-muted-foreground">{metrics.itemsSaved} near-expiry sold</p>
                </div>
              </div>
            </motion.div>

            {/* Time Saved */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-info/5 border border-info/20">
                <div className="h-12 w-12 rounded-full bg-info/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-6 w-6 text-info" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Time Saved</p>
                  <p className="text-xl font-bold text-info">{metrics.timeSavedHours} hrs</p>
                  <p className="text-xs text-muted-foreground">≈ {formatPrice(metrics.timeSavedValue, 'NGN')}</p>
                </div>
              </div>
            </motion.div>

            {/* Theft Blocked */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/5 border border-warning/20">
                <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                  <Lock className="h-6 w-6 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Theft Blocked</p>
                  <p className="text-xl font-bold text-warning">{metrics.theftBlocked}</p>
                  <p className="text-xs text-muted-foreground">≈ {formatPrice(metrics.theftValueProtected, 'NGN')}</p>
                </div>
              </div>
            </motion.div>

            {/* Stock Protected */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Stock Protected</p>
                  <p className="text-xl font-bold text-primary truncate">{formatPrice(metrics.atRiskValue, 'NGN')}</p>
                  <p className="text-xs text-muted-foreground">{metrics.atRiskItems} expiring soon</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* ROI Summary Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="p-5 rounded-xl bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border border-primary/20"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">PharmaTrack ROI Value</p>
                  <p className="text-2xl font-display font-bold text-gradient">
                    {formatPrice(metrics.totalSavings, 'NGN')}
                  </p>
                </div>
              </div>
              <div className="text-center md:text-right">
                <p className="text-xs text-muted-foreground mb-1">vs. Monthly Cost</p>
                <p className="text-lg font-medium">
                  <span className="text-success">{formatPrice(metrics.totalSavings, 'NGN')}</span>
                  <span className="text-muted-foreground mx-2">÷</span>
                  <span className="text-destructive">{formatPrice(monthlyCost, 'NGN')}</span>
                </p>
                <Badge className="mt-1 bg-success/20 text-success border-success/30 text-xs">
                  App pays for itself {metrics.savingsMultiple}x over
                </Badge>
              </div>
            </div>
          </motion.div>

          {/* Footer with actions */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-dashed">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">
                Verified by PharmaTrack • pharmatrack.com.ng
              </span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownloadPdf}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button 
                size="sm"
                className="bg-gradient-primary"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-3">
            Generated: {metrics.generatedAt}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
