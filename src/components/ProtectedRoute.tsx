import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [hasPharmacy, setHasPharmacy] = useState<boolean | null>(null);
  const [checkingPharmacy, setCheckingPharmacy] = useState(true);

  useEffect(() => {
    const checkPharmacy = async () => {
      if (!user) {
        setCheckingPharmacy(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('pharmacy_staff')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;
        setHasPharmacy(!!data);
      } catch (error) {
        console.error('Error checking pharmacy:', error);
        setHasPharmacy(false);
      } finally {
        setCheckingPharmacy(false);
      }
    };

    checkPharmacy();
  }, [user]);

  if (isLoading || checkingPharmacy) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If user has no pharmacy and not on onboarding page, redirect to onboarding
  if (hasPharmacy === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
