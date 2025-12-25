import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { setSelectedPharmacyId, useSelectedPharmacyId } from "@/hooks/useSelectedPharmacy";

interface PharmacyWithDetails {
  pharmacy_id: string;
  role: "owner" | "manager" | "staff";
  is_active: boolean;
  created_at: string;
  pharmacy: {
    id: string;
    name: string;
    address: string | null;
    email: string;
    subscription_status: "active" | "trial" | "expired" | "cancelled";
  };
}

const getRoleBadge = (role: string) => {
  switch (role) {
    case "owner":
      return <Badge className="bg-primary/10 text-primary border-primary/20">Owner</Badge>;
    case "manager":
      return <Badge className="bg-secondary/10 text-secondary border-secondary/20">Manager</Badge>;
    default:
      return <Badge variant="outline">Staff</Badge>;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return <Badge className="bg-success/10 text-success border-success/20">Active</Badge>;
    case "trial":
      return <Badge className="bg-warning/10 text-warning border-warning/20">Trial</Badge>;
    case "expired":
      return <Badge variant="destructive">Expired</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export const PharmacySwitchDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedPharmacyId } = useSelectedPharmacyId();

  const { data: pharmacies = [], isLoading } = useQuery({
    queryKey: ["user-pharmacies", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("pharmacy_staff")
        .select(
          `
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
        `
        )
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).filter(
        (item): item is PharmacyWithDetails => item.pharmacy !== null && typeof item.pharmacy === "object"
      );
    },
    enabled: open && !!user?.id,
  });

  const handleSelect = async (pharmacy: PharmacyWithDetails) => {
    setSelectedPharmacyId(pharmacy.pharmacy_id);

    // Refresh all cached queries so the UI updates immediately
    await queryClient.invalidateQueries();

    toast({
      title: "Pharmacy switched",
      description: `Now using ${pharmacy.pharmacy.name}.`,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Switch Pharmacy
          </DialogTitle>
          <DialogDescription>Select which pharmacy you want to work in.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : pharmacies.length === 0 ? (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
            No active pharmacies found for your account.
          </div>
        ) : (
          <ScrollArea className="max-h-[55vh] pr-2">
            <div className="space-y-2">
              {pharmacies.map((item) => {
                const isSelected = item.pharmacy_id === selectedPharmacyId;
                return (
                  <button
                    key={item.pharmacy_id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="w-full rounded-xl border border-border/60 bg-background p-4 text-left transition-all hover:bg-muted/30 hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground truncate">{item.pharmacy.name}</h3>
                          {getRoleBadge(item.role)}
                          {getStatusBadge(item.pharmacy.subscription_status)}
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                          {item.pharmacy.address && (
                            <span className="flex items-center gap-1 min-w-0">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate max-w-[260px]">{item.pharmacy.address}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Joined {format(new Date(item.created_at), "MMM yyyy")}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                            <Check className="h-3 w-3" />
                            Current
                          </div>
                        ) : (
                          <span className="inline-flex h-8 items-center justify-center rounded-md bg-secondary px-3 text-xs font-medium text-secondary-foreground">
                            Use
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
