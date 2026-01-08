import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, TrendingUp, Clock, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AIScansUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scansUsed: number;
  scansLimit: number;
}

export const AIScansUpgradeModal = ({ 
  open, 
  onOpenChange, 
  scansUsed, 
  scansLimit 
}: AIScansUpgradeModalProps) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/settings?tab=subscription');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            You've Used All {scansLimit} Free AI Scans
          </DialogTitle>
          <DialogDescription className="text-center">
            Upgrade to AI Powerhouse for unlimited invoice scanning and save hours every week.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current usage */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary" className="font-mono">
              {scansUsed} / {scansLimit} scans used
            </Badge>
            <span>this month</span>
          </div>

          {/* Value propositions */}
          <div className="space-y-3 bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Unlimited AI Scans</p>
                <p className="text-xs text-muted-foreground">Scan as many invoices as you need, no limits</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                <Clock className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="font-medium text-sm">Save 2+ Hours Per Invoice</p>
                <p className="text-xs text-muted-foreground">AI extracts 50+ items in seconds, not hours</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="font-medium text-sm">AI Demand Forecasting</p>
                <p className="text-xs text-muted-foreground">Never overstock or run out again</p>
              </div>
            </div>
          </div>

          {/* Pricing highlight */}
          <div className="text-center p-4 rounded-lg border border-primary/20 bg-primary/5">
            <p className="text-sm text-muted-foreground mb-1">AI Powerhouse</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl font-bold text-primary">₦15,000</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <p className="text-xs text-success mt-1">billed annually (save 57%)</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleUpgrade} className="w-full bg-gradient-to-r from-primary to-primary/80">
            Upgrade Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
