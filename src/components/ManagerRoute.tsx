import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradePrompt } from '@/components/subscription';
import { Header } from '@/components/Header';
import { Skeleton } from '@/components/ui/skeleton';

interface ManagerRouteProps {
  children: ReactNode;
}

export const ManagerRoute = ({ children }: ManagerRouteProps) => {
  const { isOwnerOrManager, isLoading } = usePermissions();
  const { canAccessFeatures, isLoading: isLoadingSubscription } = useSubscription();
  const location = useLocation();

  if (isLoading || isLoadingSubscription) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isOwnerOrManager) {
    return <Navigate to="/" replace />;
  }

  // Check subscription for manager routes
  const exemptRoutes = ['/admin', '/profile', '/settings', '/guide'];
  const isExemptRoute = exemptRoutes.some(route => location.pathname.startsWith(route));
  
  if (!isExemptRoute && !canAccessFeatures) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <UpgradePrompt />
      </div>
    );
  }

  return <>{children}</>;
};