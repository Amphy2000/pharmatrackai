import { ReactNode } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradePrompt } from './UpgradePrompt';
import { Skeleton } from '@/components/ui/skeleton';

interface SubscriptionGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

export const SubscriptionGuard = ({ 
  children, 
  fallback,
  showUpgradePrompt = true 
}: SubscriptionGuardProps) => {
  const { canAccessFeatures, isLoading, isExpired, isTrial, daysRemaining } = useSubscription();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Skeleton className="h-32 w-full max-w-md" />
      </div>
    );
  }

  if (!canAccessFeatures) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    if (showUpgradePrompt) {
      return <UpgradePrompt />;
    }
    
    return null;
  }

  return <>{children}</>;
};
