import { useState } from 'react';
import { Star, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';

const DURATION_OPTIONS = [
  { value: '7', label: '7 Days', description: 'Weekly Boost' },
  { value: '14', label: '14 Days', description: 'Stock Clearer' },
  { value: '30', label: '30 Days', description: 'Store Anchor' },
];

interface FeatureDurationSelectProps {
  medicationId: string;
  medicationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FeatureDurationSelect = ({
  medicationId,
  medicationName,
  open,
  onOpenChange,
}: FeatureDurationSelectProps) => {
  const [duration, setDuration] = useState<string>('7');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const calculateExpiryDate = (days: number) => {
    return addDays(new Date(), days);
  };

  const handleFeature = async () => {
    setIsSubmitting(true);
    try {
      const daysToAdd = parseInt(duration, 10);
      const expiryDate = calculateExpiryDate(daysToAdd);

      const { error } = await supabase
        .from('medications')
        .update({
          is_featured: true,
          featured_until: expiryDate.toISOString(),
        })
        .eq('id', medicationId);

      if (error) {
        if (error.message.includes('Maximum of 3 featured products')) {
          toast({
            title: 'Featured Slots Full',
            description: 'Maximum of 3 featured products allowed. Please remove one first.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: 'Product Featured!',
        description: `"${medicationName}" will be featured until ${format(expiryDate, 'MMM d, yyyy')}`,
      });

      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['featured-medications'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Error featuring product:', error);
      toast({
        title: 'Error',
        description: 'Failed to feature product. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDuration = DURATION_OPTIONS.find(o => o.value === duration);
  const previewDate = calculateExpiryDate(parseInt(duration, 10));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-marketplace fill-marketplace" />
            Feature This Product
          </DialogTitle>
          <DialogDescription>
            Choose how long "{medicationName}" should appear in the Spotlight section.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Promotion Duration</label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-muted-foreground text-xs">({option.description})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <span>Promotion Preview</span>
            </div>
            <div className="space-y-1">
              <p className="font-semibold">{selectedDuration?.label} - {selectedDuration?.description}</p>
              <p className="text-sm text-muted-foreground">
                Featured until: <span className="font-medium text-foreground">{format(previewDate, 'EEEE, MMMM d, yyyy')}</span>
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleFeature} 
            disabled={isSubmitting}
            className="bg-marketplace hover:bg-marketplace/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Featuring...
              </>
            ) : (
              <>
                <Star className="mr-2 h-4 w-4" />
                Feature Product
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
