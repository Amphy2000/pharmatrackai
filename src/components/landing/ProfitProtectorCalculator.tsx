import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingDown, TrendingUp, ArrowRight, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

interface ProfitProtectorCalculatorProps {
  isInternational?: boolean;
}

export const ProfitProtectorCalculator = ({ isInternational = false }: ProfitProtectorCalculatorProps) => {
  const [monthlyRevenue, setMonthlyRevenue] = useState(2000000); // ₦2M default
  const [expiryLossPercent, setExpiryLossPercent] = useState(3);
  const [manualHoursPerWeek, setManualHoursPerWeek] = useState(10);

  // Staff hourly rate estimate (₦1,500/hour or $10/hour)
  const hourlyRate = isInternational ? 10 : 1500;
  
  // Annual PharmaTrack cost
  const annualCost = isInternational ? 1188 : 420000; // $99*12 or ₦35,000*12

  const calculations = useMemo(() => {
    // Annual leakage from expiry
    const annualExpiryLoss = monthlyRevenue * 12 * (expiryLossPercent / 100);
    
    // Annual labor cost for manual work
    const annualLaborCost = manualHoursPerWeek * 52 * hourlyRate;
    
    // Total annual loss
    const totalAnnualLoss = annualExpiryLoss + annualLaborCost;
    
    // PharmaTrack recovery (assume 70% of expiry loss recovered, 80% time saved)
    const expiryRecovery = annualExpiryLoss * 0.7;
    const laborSavings = annualLaborCost * 0.8;
    const totalRecovery = expiryRecovery + laborSavings;
    
    // Net savings after PharmaTrack cost
    const netSavings = totalRecovery - annualCost;
    
    // ROI
    const roi = ((netSavings / annualCost) * 100).toFixed(0);

    return {
      annualExpiryLoss,
      annualLaborCost,
      totalAnnualLoss,
      expiryRecovery,
      laborSavings,
      totalRecovery,
      netSavings,
      roi,
      annualCost,
    };
  }, [monthlyRevenue, expiryLossPercent, manualHoursPerWeek, hourlyRate, annualCost]);

  const formatCurrency = (value: number) => {
    if (isInternational) {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD', 
        maximumFractionDigits: 0 
      }).format(value);
    }
    return new Intl.NumberFormat('en-NG', { 
      style: 'currency', 
      currency: 'NGN', 
      maximumFractionDigits: 0 
    }).format(value);
  };

  return (
    <Card className="glass-card border-primary/30 overflow-hidden">
      <CardContent className="p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center">
            <Calculator className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-display font-bold">Pharmacy Profit Protector</h3>
            <p className="text-sm text-muted-foreground">See how much you're losing monthly</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Inputs */}
          <div className="space-y-6">
            {/* Monthly Revenue */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Monthly Revenue
                </Label>
                <Badge variant="outline">{formatCurrency(monthlyRevenue)}</Badge>
              </div>
              <Slider
                value={[monthlyRevenue]}
                onValueChange={(v) => setMonthlyRevenue(v[0])}
                min={isInternational ? 5000 : 500000}
                max={isInternational ? 100000 : 20000000}
                step={isInternational ? 1000 : 100000}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(isInternational ? 5000 : 500000)}</span>
                <span>{formatCurrency(isInternational ? 100000 : 20000000)}</span>
              </div>
            </div>

            {/* Expiry Loss % */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Estimated Expiry Loss %
                </Label>
                <Badge variant="destructive">{expiryLossPercent}%</Badge>
              </div>
              <Slider
                value={[expiryLossPercent]}
                onValueChange={(v) => setExpiryLossPercent(v[0])}
                min={1}
                max={10}
                step={0.5}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1% (Good)</span>
                <span>10% (Terrible)</span>
              </div>
            </div>

            {/* Manual Hours */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Manual Stock Entry (hrs/week)
                </Label>
                <Badge variant="secondary">{manualHoursPerWeek} hrs</Badge>
              </div>
              <Slider
                value={[manualHoursPerWeek]}
                onValueChange={(v) => setManualHoursPerWeek(v[0])}
                min={2}
                max={40}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>2 hrs (Efficient)</span>
                <span>40 hrs (Full-time)</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {/* Annual Loss - RED */}
            <motion.div 
              key={calculations.totalAnnualLoss}
              initial={{ scale: 0.95, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-4 rounded-xl bg-destructive/10 border border-destructive/30"
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-5 w-5 text-destructive" />
                <span className="text-sm font-medium text-destructive">Estimated Annual Loss</span>
              </div>
              <div className="text-3xl sm:text-4xl font-display font-bold text-destructive">
                {formatCurrency(calculations.totalAnnualLoss)}
              </div>
              <div className="mt-2 text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Expiry waste:</span>
                  <span>{formatCurrency(calculations.annualExpiryLoss)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Labor cost:</span>
                  <span>{formatCurrency(calculations.annualLaborCost)}</span>
                </div>
              </div>
            </motion.div>

            {/* Potential Savings - GREEN */}
            <motion.div 
              key={calculations.netSavings}
              initial={{ scale: 0.95, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-4 rounded-xl bg-success/10 border border-success/30"
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-success" />
                <span className="text-sm font-medium text-success">Potential Savings with PharmaTrack</span>
              </div>
              <div className="text-3xl sm:text-4xl font-display font-bold text-success">
                {formatCurrency(calculations.netSavings)}
              </div>
              <div className="mt-2 text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Expiry recovery (70%):</span>
                  <span>{formatCurrency(calculations.expiryRecovery)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time saved (80%):</span>
                  <span>{formatCurrency(calculations.laborSavings)}</span>
                </div>
                <div className="flex justify-between border-t border-border/50 pt-1 mt-1">
                  <span>PharmaTrack cost:</span>
                  <span>-{formatCurrency(calculations.annualCost)}</span>
                </div>
              </div>
            </motion.div>

            {/* ROI Badge */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm font-medium">Return on Investment</span>
              <Badge className="bg-gradient-primary text-primary-foreground text-lg px-3">
                {calculations.roi}% ROI
              </Badge>
            </div>

            {/* CTA */}
            <Link to="/auth?tab=signup" className="block">
              <Button 
                size="lg" 
                className="w-full bg-gradient-primary hover:opacity-90 shadow-glow-primary"
              >
                Stop the Leakage Now
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};