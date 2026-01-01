import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, TrendingDown, Calendar, Zap, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface CostOfInactionCalculatorProps {
  isInternational?: boolean;
}

export const CostOfInactionCalculator = ({ isInternational = false }: CostOfInactionCalculatorProps) => {
  const [monthlyRevenue, setMonthlyRevenue] = useState(isInternational ? 20000 : 2000000);
  const [daysWaiting, setDaysWaiting] = useState(30);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate the counter periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const calculations = useMemo(() => {
    // Assume 3% monthly loss from expiry + inefficiency
    const dailyLoss = (monthlyRevenue * 0.03) / 30;
    const weeklyLoss = dailyLoss * 7;
    const monthlyLoss = monthlyRevenue * 0.03;
    const yearlyLoss = monthlyLoss * 12;
    
    // Loss during waiting period
    const lossWhileWaiting = dailyLoss * daysWaiting;
    
    // Potential recovery (70% of what's lost)
    const recoveryRate = 0.7;
    const missedRecovery = lossWhileWaiting * recoveryRate;

    return {
      dailyLoss,
      weeklyLoss,
      monthlyLoss,
      yearlyLoss,
      lossWhileWaiting,
      missedRecovery,
    };
  }, [monthlyRevenue, daysWaiting]);

  const formatCurrency = (value: number) => {
    if (isInternational) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);
    }
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="glass-card border-warning/30 overflow-hidden">
      <CardContent className="p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <motion.div
            animate={{ 
              scale: isAnimating ? [1, 1.2, 1] : 1,
              rotate: isAnimating ? [0, -10, 10, 0] : 0
            }}
            transition={{ duration: 0.5 }}
            className="h-12 w-12 rounded-xl bg-warning/20 flex items-center justify-center"
          >
            <AlertTriangle className="h-6 w-6 text-warning" />
          </motion.div>
          <div>
            <h3 className="text-xl font-display font-bold text-warning">
              Cost of Waiting
            </h3>
            <p className="text-sm text-muted-foreground">
              Every day you delay is money lost forever
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Inputs */}
          <div className="space-y-6">
            {/* Monthly Revenue */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
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
            </div>

            {/* Days Waiting */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Days Until You Start
                </Label>
                <Badge variant="secondary">{daysWaiting} days</Badge>
              </div>
              <Slider
                value={[daysWaiting]}
                onValueChange={(v) => setDaysWaiting(v[0])}
                min={1}
                max={90}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Start today</span>
                <span>Wait 3 months</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {/* Daily Loss Counter */}
            <motion.div
              animate={{ scale: isAnimating ? [1, 1.02, 1] : 1 }}
              className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingDown className="h-5 w-5 text-destructive animate-pulse" />
                <span className="text-sm font-medium text-destructive">
                  You're Losing Every Day
                </span>
              </div>
              <motion.div
                key={calculations.dailyLoss}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="text-3xl sm:text-4xl font-display font-bold text-destructive"
              >
                {formatCurrency(calculations.dailyLoss)}
                <span className="text-lg font-normal text-destructive/70">/day</span>
              </motion.div>
            </motion.div>

            {/* Waiting Period Loss */}
            <motion.div
              key={calculations.lossWhileWaiting}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              className="p-4 rounded-xl bg-warning/10 border border-warning/30"
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-warning" />
                <span className="text-sm font-medium text-warning">
                  If you wait {daysWaiting} days...
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-display font-bold text-warning">
                {formatCurrency(calculations.lossWhileWaiting)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                That's {formatCurrency(calculations.missedRecovery)} in recoverable savings gone forever
              </p>
            </motion.div>

            {/* Urgency breakdown */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-lg font-bold text-foreground">
                  {formatCurrency(calculations.weeklyLoss)}
                </div>
                <div className="text-xs text-muted-foreground">Per Week</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-lg font-bold text-foreground">
                  {formatCurrency(calculations.yearlyLoss)}
                </div>
                <div className="text-xs text-muted-foreground">Per Year</div>
              </div>
            </div>

            {/* CTA */}
            <Link to="/auth?tab=signup" className="block">
              <Button
                size="lg"
                className="w-full bg-gradient-primary hover:opacity-90 shadow-glow-primary group"
              >
                <Zap className="h-5 w-5 mr-2 group-hover:animate-pulse" />
                Stop the Bleeding Today
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CostOfInactionCalculator;
