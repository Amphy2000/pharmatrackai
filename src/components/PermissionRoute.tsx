import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionKey, usePermissions } from "@/hooks/usePermissions";

interface PermissionRouteProps {
  children: ReactNode;
  /** User must have at least one of these permissions (owner/manager always allowed). */
  anyOf?: PermissionKey[];
  /** User must have all of these permissions (owner/manager always allowed). */
  allOf?: PermissionKey[];
  /** Where to send unauthorized users. Defaults to /dashboard. */
  redirectTo?: string;
}

export const PermissionRoute = ({
  children,
  anyOf,
  allOf,
  redirectTo = "/dashboard",
}: PermissionRouteProps) => {
  const { isOwnerOrManager, isLoading, hasPermission } = usePermissions();
  const location = useLocation();

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

  const passesAll = allOf ? allOf.every((p) => hasPermission(p)) : true;
  const passesAny = anyOf ? anyOf.some((p) => hasPermission(p)) : true;
  const canAccess = isOwnerOrManager || (passesAll && passesAny);

  if (!canAccess) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
