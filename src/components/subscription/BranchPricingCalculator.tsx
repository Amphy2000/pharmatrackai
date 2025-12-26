import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Building2, Check, Zap } from 'lucide-react';

interface BranchPricingCalculatorProps {
  currentBranches?: number;
  currentLimit?: number;
  onUpgrade?: (branches: number, totalAmount: number) => void;
  isProcessing?: boolean;
}

const BASE_SUBSCRIPTION = 35000; // ₦35,000/month includes main branch
const BRANCH_FEE = 15000; // ₦15,000/month per additional branch

export const BranchPricingCalculator = ({
  currentBranches = 1,
  currentLimit = 1,
  onUpgrade,
  isProcessing = false,
}: BranchPricingCalculatorProps) => {
  const [selectedBranches, setSelectedBranches] = useState(Math.max(currentLimit, 1));

  const additionalBranches = Math.max(0, selectedBranches - 1);
  const branchExpansionFee = additionalBranches * BRANCH_FEE;
  const totalMonthly = BASE_SUBSCRIPTION + branchExpansionFee;

  const handleIncrement = () => {
    if (selectedBranches < 50) {
      setSelectedBranches(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (selectedBranches > Math.max(currentBranches, 1)) {
      setSelectedBranches(prev => prev - 1);
    }
  };

  const needsUpgrade = selectedBranches > currentLimit;
  const upgradeAmount = needsUpgrade ? (selectedBranches - currentLimit) * BRANCH_FEE : 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Branch Pricing Calculator
            </CardTitle>
            <CardDescription>
              Scale your subscription based on branches
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs">
            Pro Plan
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pricing Breakdown */}
        <div className="grid gap-4 p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              <span className="text-sm">Base Subscription (incl. Main Branch)</span>
            </div>
            <span className="font-semibold">₦{BASE_SUBSCRIPTION.toLocaleString()}/mo</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="text-sm">Additional Branch Fee</span>
            </div>
            <span className="text-sm">₦{BRANCH_FEE.toLocaleString()}/branch/mo</span>
          </div>
        </div>

        {/* Branch Selector */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Number of Branches</span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={handleDecrement}
                disabled={selectedBranches <= Math.max(currentBranches, 1)}
                className="h-8 w-8"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-2xl font-bold w-12 text-center">{selectedBranches}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleIncrement}
                disabled={selectedBranches >= 50}
                className="h-8 w-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Slider
            value={[selectedBranches]}
            onValueChange={([value]) => setSelectedBranches(Math.max(value, Math.max(currentBranches, 1)))}
            min={1}
            max={50}
            step={1}
            className="w-full"
          />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 Branch</span>
            <span>50 Branches</span>
          </div>
        </div>

        {/* Cost Summary */}
        <div className="space-y-3 p-4 rounded-lg border border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between text-sm">
            <span>Base Subscription</span>
            <span>₦{BASE_SUBSCRIPTION.toLocaleString()}</span>
          </div>
          {additionalBranches > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span>+ {additionalBranches} Additional Branch{additionalBranches > 1 ? 'es' : ''}</span>
              <span>₦{branchExpansionFee.toLocaleString()}</span>
            </div>
          )}
          <div className="border-t pt-3 flex items-center justify-between">
            <span className="font-semibold">Total Monthly Due</span>
            <span className="text-2xl font-bold text-primary">
              ₦{totalMonthly.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Current Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
          <span className="text-muted-foreground">Currently Active</span>
          <span>
            <span className="font-medium">{currentBranches}</span> of{' '}
            <span className="font-medium">{currentLimit}</span> branches
          </span>
        </div>

        {/* Upgrade Button */}
        {needsUpgrade && onUpgrade && (
          <Button
            className="w-full gap-2"
            size="lg"
            onClick={() => onUpgrade(selectedBranches, upgradeAmount)}
            disabled={isProcessing}
          >
            <Zap className="h-4 w-4" />
            {isProcessing ? 'Processing...' : `Upgrade to ${selectedBranches} Branches (+₦${upgradeAmount.toLocaleString()}/mo)`}
          </Button>
        )}

        {!needsUpgrade && currentLimit > 1 && (
          <p className="text-center text-sm text-muted-foreground">
            You have {currentLimit - currentBranches} unused branch slot{currentLimit - currentBranches !== 1 ? 's' : ''} available
          </p>
        )}
      </CardContent>
    </Card>
  );
};
