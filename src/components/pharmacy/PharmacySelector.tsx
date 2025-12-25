import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, ArrowRight, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface PharmacyWithDetails {
  pharmacy_id: string;
  role: 'owner' | 'manager' | 'staff';
  is_active: boolean;
  created_at: string;
  pharmacy: {
    id: string;
    name: string;
    address: string | null;
    email: string;
    subscription_status: 'active' | 'trial' | 'expired' | 'cancelled';
  };
}

interface PharmacySelectorProps {
  onSelect: (pharmacyId: string) => void;
}

export const PharmacySelector = ({ onSelect }: PharmacySelectorProps) => {
  const { user } = useAuth();

  const { data: pharmacies = [], isLoading } = useQuery({
    queryKey: ['user-pharmacies', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('pharmacy_staff')
        .select(`
          pharmacy_id,
          role,
          is_active,
          created_at,
          pharmacy:pharmacies!pharmacy_staff_pharmacy_id_fkey (
            id,
            name,
            address,
            email,
            subscription_status
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter and type the results
      return (data || []).filter(
        (item): item is PharmacyWithDetails => 
          item.pharmacy !== null && typeof item.pharmacy === 'object'
      );
    },
    enabled: !!user?.id,
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge className="bg-primary/10 text-primary border-primary/20">Owner</Badge>;
      case 'manager':
        return <Badge className="bg-secondary/10 text-secondary border-secondary/20">Manager</Badge>;
      default:
        return <Badge variant="outline">Staff</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success/10 text-success border-success/20">Active</Badge>;
      case 'trial':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Trial</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-2xl font-display">Select Pharmacy</CardTitle>
          <CardDescription>
            You belong to multiple pharmacies. Choose which one to access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pharmacies.map((item) => (
            <button
              key={item.pharmacy_id}
              disabled={!item.is_active}
              onClick={() => item.is_active && onSelect(item.pharmacy_id)}
              className="w-full p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-left group disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-transparent"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">
                      {item.pharmacy.name}
                    </h3>
                    {getRoleBadge(item.role)}
                    {getStatusBadge(item.pharmacy.subscription_status)}
                    {!item.is_active && (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    {item.pharmacy.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[200px]">{item.pharmacy.address}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Joined {format(new Date(item.created_at), 'MMM yyyy')}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors ml-4 flex-shrink-0" />
              </div>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
