import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, ShieldCheck, DollarSign, FileImage, AlertTriangle, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useMedications } from '@/hooks/useMedications';
import { useSales } from '@/hooks/useSales';
import { differenceInDays, subDays, parseISO } from 'date-fns';

interface ROIDashboardProps {
  invoicesScanned?: number; // From audit logs or manual tracking
  auditLogCount?: number; // Price change attempts blocked
}

export const ROIDashboard = ({ invoicesScanned = 0, auditLogCount = 0 }: ROIDashboardProps) => {
  const { formatPrice } = useCurrency();
  const { medications } = useMedications();
  const { sales: salesData } = useSales();

  const metrics = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    const sixtyDaysAgo = subDays(today, 60);

    // Time Saved: Each invoice scan saves ~30 minutes
    const timeSavedMinutes = invoicesScanned * 30;
    const timeSavedHours = Math.round(timeSavedMinutes / 60);

    // Loss Prevented: Value of drugs sold within 60 days of expiry
    // These are drugs that would have expired if not sold quickly
    const nearExpiryMeds = medications.filter(med => {
      const expiryDate = parseISO(med.expiry_date);
      const daysToExpiry = differenceInDays(expiryDate, today);
      return daysToExpiry > 0 && daysToExpiry <= 60;
    });

    // Calculate sales of near-expiry items in last 30 days
    const nearExpirySales = salesData?.filter(sale => {
      const saleDate = parseISO(sale.sale_date);
      return saleDate >= thirtyDaysAgo && nearExpiryMeds.some(med => med.id === sale.medication_id);
    }) || [];

    const lossPrevented = nearExpirySales.reduce((sum, sale) => sum + sale.total_price, 0);

    // Theft Blocked: Number of unauthorized price-change attempts (from audit logs)
    const theftBlocked = auditLogCount;

    // Estimate value protected from theft (average transaction value * attempts)
    const avgTransactionValue = salesData && salesData.length > 0
      ? salesData.reduce((sum, s) => sum + s.total_price, 0) / salesData.length
      : 5000;
    const theftValueProtected = theftBlocked * avgTransactionValue * 0.1; // Assume 10% would be lost per attempt

    // Total ROI Value
    const hourlyRate = 1500; // ₦1,500/hour staff cost
    const timeSavedValue = timeSavedHours * hourlyRate;
    const totalROIValue = timeSavedValue + lossPrevented + theftValueProtected;

    // Monthly subscription cost (Pro plan)
    const monthlyCost = 35000;
    const roiMultiple = totalROIValue > 0 ? (totalROIValue / monthlyCost).toFixed(1) : '0';

    return {
      timeSavedHours,
      timeSavedValue,
      lossPrevented,
      theftBlocked,
      theftValueProtected,
      totalROIValue,
      roiMultiple,
      nearExpiryCount: nearExpiryMeds.length,
    };
  }, [medications, salesData, invoicesScanned, auditLogCount]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <Card className="glass-card border-primary/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              PharmaTrack ROI Dashboard
            </CardTitle>
            <CardDescription>
              Real savings from AI-powered pharmacy management
            </CardDescription>
          </div>
          <Badge className="bg-gradient-primary text-primary-foreground text-lg px-4 py-1">
            {metrics.roiMultiple}x ROI
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        >
          {/* Time Saved */}
          <motion.div variants={itemVariants}>
            <Card className="bg-info/5 border-info/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-info/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time Saved</p>
                    <p className="text-2xl font-bold text-info">{metrics.timeSavedHours} hrs</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileImage className="h-3 w-3" />
                    {invoicesScanned} invoices scanned
                  </span>
                  <span className="text-info">≈ {formatPrice(metrics.timeSavedValue)}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Loss Prevented */}
          <motion.div variants={itemVariants}>
            <Card className="bg-success/5 border-success/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Loss Prevented</p>
                    <p className="text-2xl font-bold text-success">{formatPrice(metrics.lossPrevented)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {metrics.nearExpiryCount} near-expiry items sold
                  </span>
                  <span className="text-success">Recovered</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Theft Blocked */}
          <motion.div variants={itemVariants}>
            <Card className="bg-warning/5 border-warning/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-warning/20 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Theft Blocked</p>
                    <p className="text-2xl font-bold text-warning">{metrics.theftBlocked}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Price change attempts
                  </span>
                  <span className="text-warning">≈ {formatPrice(metrics.theftValueProtected)}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Total ROI */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-xl bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border border-primary/20"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total PharmaTrack ROI Value</p>
              <p className="text-4xl font-display font-bold text-gradient">
                ₦{metrics.totalROIValue.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This month's savings from AI automation
              </p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-xs text-muted-foreground mb-1">vs. Monthly Cost</p>
              <p className="text-lg font-medium">
                <span className="text-success">₦{metrics.totalROIValue.toLocaleString('en-NG')}</span>
                <span className="text-muted-foreground mx-2">÷</span>
                <span className="text-destructive">₦35,000</span>
              </p>
              <Badge className="mt-2 bg-success/20 text-success border-success/30">
                The app pays for itself {metrics.roiMultiple}x over
              </Badge>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
};