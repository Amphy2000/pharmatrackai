import { useSubscription } from '@/hooks/useSubscription';
import { Badge } from '@/components/ui/badge';
import { Crown, AlertTriangle } from 'lucide-react';

export const TrialBanner = () => {
  const { isTrial, isExpired, daysRemaining, canAccessFeatures } = useSubscription();

  if (!isTrial && !isExpired) return null;

  if (isExpired) {
    return (
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="font-medium text-destructive">Trial Expired</span>
            <span className="text-muted-foreground">
              Upgrade now to continue using PharmaTrack
            </span>
          </div>
          <Badge variant="destructive" className="gap-1">
            <Crown className="h-3 w-3" />
            Upgrade Required
          </Badge>
        </div>
      </div>
    );
  }

  if (isTrial) {
    const urgency = daysRemaining !== null && daysRemaining <= 2;
    
    return (
      <div className={`border-b px-4 py-2 ${urgency ? 'bg-amber-500/10 border-amber-500/20' : 'bg-primary/5 border-primary/10'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Crown className={`h-4 w-4 ${urgency ? 'text-amber-500' : 'text-primary'}`} />
            <span className="font-medium">Free Trial</span>
            <span className="text-muted-foreground">
              {daysRemaining === 0 
                ? 'Expires today!'
                : daysRemaining === 1 
                  ? '1 day remaining'
                  : `${daysRemaining} days remaining`}
            </span>
          </div>
          <Badge variant={urgency ? 'secondary' : 'outline'} className="gap-1">
            {urgency ? 'Upgrade Soon' : 'Trial Active'}
          </Badge>
        </div>
      </div>
    );
  }

  return null;
};
