import { Lock, Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface BranchLockedOverlayProps {
  branchName: string;
  currentLimit: number;
  branchPosition: number;
  onUpgrade?: () => void;
}

export const BranchLockedOverlay = ({
  branchName,
  currentLimit,
  branchPosition,
  onUpgrade,
}: BranchLockedOverlayProps) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigate('/settings?tab=subscription');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-destructive/50 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-xl">Branch Locked</CardTitle>
            <CardDescription className="mt-2">
              Your subscription allows {currentLimit} branch{currentLimit !== 1 ? 'es' : ''}, 
              but "{branchName}" is branch #{branchPosition}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Visual Explanation */}
          <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-sm">{branchName}</p>
                <p className="text-xs text-muted-foreground">
                  Requires upgrade to unlock
                </p>
              </div>
              <Lock className="h-4 w-4 text-destructive" />
            </div>
          </div>

          {/* Pricing Info */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Add this branch for just
            </p>
            <p className="text-2xl font-bold text-primary">
              +₦15,000<span className="text-sm font-normal text-muted-foreground">/month</span>
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              className="w-full gap-2" 
              size="lg"
              onClick={handleUpgrade}
            >
              Upgrade to Activate {branchName}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => navigate('/dashboard')}
            >
              Return to Dashboard
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-center text-muted-foreground">
            Upgrade your subscription to unlock all your branches. 
            Contact support if you need help.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
