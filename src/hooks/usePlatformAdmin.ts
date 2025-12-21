import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const DEV_EMAIL = "amphy2000@gmail.com";

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

  // Check if current user is the dev (can become admin)
  const isDevEmail = user?.email === DEV_EMAIL;

  const checkAdminStatus = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setAdminRecord(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('platform_admins')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking admin status:', error);
      }

      if (data) {
        setIsAdmin(true);
        setIsSuperAdmin(data.role === 'super_admin');
        setAdminRecord(data as PlatformAdmin);
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setAdminRecord(null);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  const bootstrapAdmin = async () => {
    if (!isDevEmail) return { error: 'Not authorized' };
    
    setIsBootstrapping(true);
    try {
      const { data, error } = await supabase.functions.invoke('bootstrap-admin');
      
      if (error) throw error;
      
      // Refresh admin status
      await checkAdminStatus();
      
      return { data, error: null };
    } catch (error: any) {
      console.error('Bootstrap error:', error);
      return { error: error.message };
    } finally {
      setIsBootstrapping(false);
    }
  };

  return {
    isAdmin,
    isSuperAdmin,
    adminRecord,
    isLoading,
    isDevEmail,
    isBootstrapping,
    bootstrapAdmin,
    refetch: checkAdminStatus,
  };
};