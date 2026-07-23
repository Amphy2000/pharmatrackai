import { useSubscription } from '@/hooks/useSubscription';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TrialBanner = () => {
  const navigate = useNavigate();
  const { isTrial, daysRemaining } = useSubscription();

  // Only render if trial is currently active
  if (!isTrial) return null;

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
        <Badge
          variant={urgency ? 'destructive' : 'secondary'}
          className="gap-1 cursor-pointer"
          onClick={() => navigate('/settings?tab=subscription')}
        >
          {urgency ? 'Upgrade Now' : 'Trial Active'}
        </Badge>
      </div>
    </div>
  );
};
