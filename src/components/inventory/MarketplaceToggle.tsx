import { useState } from "react";
import { Globe, GlobeLock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface MarketplaceToggleProps {
  medicationId: string;
  isPublic: boolean;
  onToggle?: (newValue: boolean) => void;
  disabled?: boolean;
}

export const MarketplaceToggle = ({ 
  medicationId, 
  isPublic, 
  onToggle,
  disabled = false 
}: MarketplaceToggleProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleToggle = async () => {
    if (isUpdating || disabled) return;
    
    setIsUpdating(true);
    try {
      const newValue = !isPublic;
      const { error } = await supabase
        .from("medications")
        .update({ is_public: newValue })
        .eq("id", medicationId);

      if (error) throw error;

      toast({
        title: newValue ? "Listed on Marketplace" : "Removed from Marketplace",
        description: newValue 
          ? "This product is now visible on the public marketplace" 
          : "This product is no longer visible to the public",
      });

      onToggle?.(newValue);
    } catch (error) {
      console.error("Error toggling marketplace status:", error);
      toast({
        title: "Error",
        description: "Failed to update marketplace status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Switch
        id={`marketplace-${medicationId}`}
        checked={isPublic}
        onCheckedChange={handleToggle}
        disabled={isUpdating || disabled}
        className="data-[state=checked]:bg-marketplace"
      />
      <Label 
        htmlFor={`marketplace-${medicationId}`}
        className="flex items-center gap-1.5 text-sm cursor-pointer"
      >
        {isPublic ? (
          <>
            <Globe className="h-4 w-4 text-marketplace" />
            <span className="text-marketplace font-medium">Listed</span>
          </>
        ) : (
          <>
            <GlobeLock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Private</span>
          </>
        )}
      </Label>
    </div>
  );
};

export default MarketplaceToggle;