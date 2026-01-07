import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface PlatformAdmin {
  id: string;
  user_id: string;
  role: 'super_admin' | 'support';
  created_at: string;
}

export const usePlatformAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [adminRecord, setAdminRecord] = useState<PlatformAdmin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  // Note: Bootstrap authorization is now handled entirely server-side
  // The edge function validates against BOOTSTRAP_ADMIN_EMAIL env var

  const checkAdminStatus = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setAdminRecord(null);
      setIsLoading(false);
      return;
    }

    try {
      // IMPORTANT: Do not rely on direct SELECT from platform_admins (RLS may block it).
      // Use backend functions that can safely determine admin status.
      const [{ data: isPlatformAdmin, error: adminErr }, { data: isPlatformSuperAdmin, error: superErr }] =
        await Promise.all([
          supabase.rpc('is_platform_admin', { _user_id: user.id }),
          supabase.rpc('is_super_admin', { _user_id: user.id }),
        ]);

      if (adminErr) console.error('Error checking platform admin status:', adminErr);
      if (superErr) console.error('Error checking super admin status:', superErr);

      const admin = Boolean(isPlatformAdmin);
      const superAdmin = Boolean(isPlatformSuperAdmin);

      setIsAdmin(admin);
      setIsSuperAdmin(superAdmin);

      // Best-effort fetch of admin record (may still be blocked by RLS)
      if (admin) {
        try {
          const { data } = await supabase
            .from('platform_admins')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          setAdminRecord((data as PlatformAdmin) ?? null);
        } catch {
          setAdminRecord(null);
        }
      } else {
        setAdminRecord(null);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setAdminRecord(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  const bootstrapAdmin = async () => {
    // Authorization is handled server-side via BOOTSTRAP_ADMIN_EMAIL env var
    
    setIsBootstrapping(true);
    try {
      const { data, error } = await supabase.functions.invoke('bootstrap-admin');
      
      if (error) {
        console.error('Bootstrap function error:', error);
        throw error;
      }
      
      console.log('Bootstrap response:', data);
      
      // Force refresh admin status after successful bootstrap
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for DB
      await checkAdminStatus();
      
      return { data, error: null };
    } catch (error: any) {
      console.error('Bootstrap error:', error);
      return { error: error.message, data: null };
    } finally {
      setIsBootstrapping(false);
    }
  };

  return {
    isAdmin,
    isSuperAdmin,
    adminRecord,
    isLoading,
    isBootstrapping,
    bootstrapAdmin,
    refetch: checkAdminStatus,
  };
};