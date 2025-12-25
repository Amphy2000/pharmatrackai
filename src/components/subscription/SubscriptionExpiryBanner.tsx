import { useSubscription } from '@/hooks/useSubscription';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Clock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SubscriptionExpiryBanner = () => {
  const navigate = useNavigate();
  const { state, isTrial, isExpired, daysRemaining, isActive } = useSubscription();

  // Don't show if trial (TrialBanner handles that) or if no subscription info
  if (isTrial) return null;

  // Show expiry warning for active subscriptions expiring within 7 days
  if (isActive && daysRemaining !== null && daysRemaining <= 7) {
    const isUrgent = daysRemaining <= 3;
    
    return (
      <div className={`border-b px-4 py-2 ${isUrgent ? 'bg-destructive/10 border-destructive/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {isUrgent ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <Clock className="h-4 w-4 text-amber-500" />
            )}
            <span className={`font-medium ${isUrgent ? 'text-destructive' : 'text-amber-600'}`}>
              Subscription {daysRemaining === 0 ? 'expires today!' : `expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`}
            </span>
            <span className="text-muted-foreground hidden sm:inline">
              Renew now to avoid service interruption
            </span>
          </div>
          <Button 
            size="sm" 
            variant={isUrgent ? 'destructive' : 'outline'}
            className="gap-1"
            onClick={() => navigate('/settings?tab=subscription')}
          >
            <Crown className="h-3 w-3" />
            Renew Now
          </Button>
        </div>
      </div>
    );
  }

  // Show expired banner for expired subscriptions
  if (isExpired && !isTrial) {
    return (
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="font-medium text-destructive">Subscription Expired</span>
            <span className="text-muted-foreground hidden sm:inline">
              Upgrade now to continue using PharmaTrack
            </span>
          </div>
          <Badge variant="destructive" className="gap-1 cursor-pointer" onClick={() => navigate('/settings?tab=subscription')}>
            <Crown className="h-3 w-3" />
            Upgrade Required
          </Badge>
        </div>
      </div>
    );
  }

  return null;
};
