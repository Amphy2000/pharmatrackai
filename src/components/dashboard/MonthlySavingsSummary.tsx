import { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  Share2, 
  Download,
  CheckCircle,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useMedications } from '@/hooks/useMedications';
import { useSales } from '@/hooks/useSales';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, parseISO, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';

export const MonthlySavingsSummary = () => {
  const { formatPrice } = useCurrency();
  const { medications } = useMedications();
  const { sales: salesData } = useSales();
  const { pharmacy } = usePharmacy();
  const { toast } = useToast();
  const summaryRef = useRef<HTMLDivElement>(null);

  const savings = useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const monthName = format(today, 'MMMM yyyy');

    // Sales this month of items that were near expiry (within 60 days of expiry when sold)
    const nearExpirySales = salesData?.filter(sale => {
      const saleDate = parseISO(sale.sale_date);
      if (saleDate < monthStart || saleDate > monthEnd) return false;
      
      // Find the medication to check its expiry
      const med = medications.find(m => m.id === sale.medication_id);
      if (!med) return false;
      
      const expiryDate = parseISO(med.expiry_date);
      const daysToExpiryAtSale = differenceInDays(expiryDate, saleDate);
      return daysToExpiryAtSale <= 60 && daysToExpiryAtSale > 0;
    }) || [];

    // Value recovered from near-expiry sales
    const expiryRecovery = nearExpirySales.reduce((sum, sale) => sum + sale.total_price, 0);

    // Count of items that would have expired this month but were sold
    const itemsSaved = nearExpirySales.length;

    // Currently at-risk inventory (items expiring within 30 days)
    const atRiskItems = medications.filter(med => {
      const expiryDate = parseISO(med.expiry_date);
      const daysToExpiry = differenceInDays(expiryDate, today);
      return daysToExpiry > 0 && daysToExpiry <= 30;
    });
    
    const atRiskValue = atRiskItems.reduce((sum, med) => 
      sum + (med.current_stock * med.unit_price), 0
    );

    // Estimate time saved (assuming 2 hours/week on manual tracking)
    const weeksInMonth = 4;
    const hoursSaved = weeksInMonth * 2;
    const hourlyRate = 1500; // ₦1,500/hour
    const timeSavingsValue = hoursSaved * hourlyRate;

    // Total monthly savings
    const totalSavings = expiryRecovery + timeSavingsValue;

    // Monthly subscription cost comparison
    const monthlyCost = 35000;
    const savingsMultiple = totalSavings > 0 ? (totalSavings / monthlyCost) : 0;

    return {
      monthName,
      expiryRecovery,
      itemsSaved,
      atRiskValue,
      atRiskItems: atRiskItems.length,
      hoursSaved,
      timeSavingsValue,
      totalSavings,
      savingsMultiple: savingsMultiple.toFixed(1),
      generatedAt: format(today, 'MMM dd, yyyy h:mm a'),
    };
  }, [medications, salesData]);

  const handleShare = async () => {
    const shareText = `🎉 ${pharmacy?.name || 'Our Pharmacy'} Monthly Savings Report

📅 ${savings.monthName}

💰 Total Saved: ${formatPrice(savings.totalSavings)}
✅ Near-Expiry Items Sold: ${savings.itemsSaved} items
💊 Expiry Loss Prevented: ${formatPrice(savings.expiryRecovery)}
⏰ Time Saved: ${savings.hoursSaved} hours

🛡️ Protected by PharmaTrack
🌐 pharmatrack.com.ng`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PharmaTrack Monthly Savings',
          text: shareText,
        });
      } catch {
        // User cancelled or share failed
        await navigator.clipboard.writeText(shareText);
        toast({
          title: 'Copied to clipboard!',
          description: 'Share this with your colleagues',
        });
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast({
        title: 'Copied to clipboard!',
        description: 'Share this with your colleagues',
      });
    }
  };

  const handleScreenshot = () => {
    toast({
      title: 'Take a Screenshot',
      description: 'Use your device screenshot feature to capture this summary',
    });
  };

  return (
    <motion.div
      ref={summaryRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="overflow-hidden border-2 border-primary/30 shadow-xl bg-gradient-to-br from-background via-background to-primary/5">
        {/* Header with branding */}
        <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold">
                {pharmacy?.name || 'Your Pharmacy'}
              </h3>
              <p className="text-xs text-primary-foreground/80">Monthly Savings Report</p>
            </div>
            <Badge className="bg-white/20 text-white border-white/30 text-xs">
              {savings.monthName}
            </Badge>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Main savings highlight */}
          <div className="text-center py-4 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
            <p className="text-sm text-muted-foreground mb-1">Total Money Saved</p>
            <p className="text-4xl font-display font-bold text-success">
              {formatPrice(savings.totalSavings)}
            </p>
            <Badge className="mt-2 bg-success/20 text-success border-success/30">
              {savings.savingsMultiple}x your subscription cost
            </Badge>
          </div>

          {/* Breakdown */}
          <div className="space-y-3">
            {/* Expiry Prevention */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="font-medium text-sm">Expiry Loss Prevented</p>
                  <p className="text-xs text-muted-foreground">
                    {savings.itemsSaved} near-expiry items sold
                  </p>
                </div>
              </div>
              <p className="font-bold text-success">{formatPrice(savings.expiryRecovery)}</p>
            </div>

            {/* Time Saved */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-info/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="font-medium text-sm">Time Saved</p>
                  <p className="text-xs text-muted-foreground">
                    {savings.hoursSaved} hours of manual work
                  </p>
                </div>
              </div>
              <p className="font-bold text-info">{formatPrice(savings.timeSavingsValue)}</p>
            </div>

            {/* Stock Protected */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Stock Being Protected</p>
                  <p className="text-xs text-muted-foreground">
                    {savings.atRiskItems} items expiring soon
                  </p>
                </div>
              </div>
              <p className="font-bold text-primary">{formatPrice(savings.atRiskValue)}</p>
            </div>
          </div>

          {/* Trust badge */}
          <div className="flex items-center justify-center gap-2 py-3 border-t border-dashed">
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-xs text-muted-foreground">
              Verified by PharmaTrack • pharmatrack.com.ng
            </span>
          </div>

          {/* Share buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleScreenshot}
            >
              <Download className="h-4 w-4 mr-2" />
              Screenshot
            </Button>
            <Button 
              className="flex-1 bg-gradient-primary"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>

          {/* Generated timestamp */}
          <p className="text-xs text-center text-muted-foreground">
            Generated: {savings.generatedAt}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};
