import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';

interface ManagerRouteProps {
  children: ReactNode;
}

export const ManagerRoute = ({ children }: ManagerRouteProps) => {
  const { isOwnerOrManager, isLoading } = usePermissions();

  if (isLoading) {
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

  return <>{children}</>;
};