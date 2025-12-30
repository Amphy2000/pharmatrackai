import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format, addDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Star, Search, Plus, Trash2, Loader2, Gift, Store, Package } from 'lucide-react';

interface FeaturedMedication {
  id: string;
  name: string;
  pharmacy_id: string;
  pharmacy_name: string;
  is_featured: boolean;
  featured_until: string | null;
}

const DURATION_OPTIONS = [
  { value: 7, label: '7 Days' },
  { value: 14, label: '14 Days' },
  { value: 30, label: '30 Days' },
  { value: 60, label: '60 Days' },
  { value: 90, label: '90 Days' },
];

export const FeaturedSlotsPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);
  const [selectedMedicationId, setSelectedMedicationId] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(7);

  // Fetch current featured medications
  const { data: featuredMeds = [], isLoading: loadingFeatured } = useQuery({
    queryKey: ['admin-featured-medications'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_featured_medications');
      if (error) throw error;
      return data as FeaturedMedication[];
    },
  });

  // Fetch all pharmacies
  const { data: pharmacies = [] } = useQuery({
    queryKey: ['admin-pharmacies-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pharmacies')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch medications for selected pharmacy
  const { data: pharmacyMedications = [], isLoading: loadingMedications } = useQuery({
    queryKey: ['pharmacy-medications', selectedPharmacyId],
    queryFn: async () => {
      if (!selectedPharmacyId) return [];
      const { data, error } = await supabase
        .from('medications')
        .select('id, name, category, current_stock, is_featured')
        .eq('pharmacy_id', selectedPharmacyId)
        .eq('is_public', true)
        .gt('current_stock', 0)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPharmacyId,
  });

  // Assign featured slot mutation
  const assignFeaturedMutation = useMutation({
    mutationFn: async ({ medicationId, duration }: { medicationId: string; duration: number }) => {
      const expiryDate = addDays(new Date(), duration);
      const { error } = await supabase
        .from('medications')
        .update({
          is_featured: true,
          featured_until: expiryDate.toISOString(),
        })
        .eq('id', medicationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-featured-medications'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-medications'] });
      setAssignDialogOpen(false);
      setSelectedPharmacyId(null);
      setSelectedMedicationId(null);
      toast({
        title: 'Featured slot assigned',
        description: 'The medication is now featured in the Spotlight section.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to assign slot',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remove featured slot mutation
  const removeFeaturedMutation = useMutation({
    mutationFn: async (medicationId: string) => {
      const { error } = await supabase
        .from('medications')
        .update({
          is_featured: false,
          featured_until: null,
        })
        .eq('id', medicationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-featured-medications'] });
      toast({
        title: 'Featured slot removed',
        description: 'The medication is no longer featured.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to remove slot',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const filteredFeatured = featuredMeds.filter(med =>
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.pharmacy_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-marketplace to-primary flex items-center justify-center">
              <Star className="h-4 w-4 text-white fill-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Spotlight Management</CardTitle>
              <CardDescription>Assign or remove featured slots for pharmacies</CardDescription>
            </div>
          </div>
          <Button onClick={() => setAssignDialogOpen(true)} className="gap-2">
            <Gift className="h-4 w-4" />
            Assign Slot
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search featured medications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Featured Table */}
        {loadingFeatured ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredFeatured.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No featured medications</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medication</TableHead>
                <TableHead>Pharmacy</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeatured.map((med) => (
                <TableRow key={med.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{med.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      <span>{med.pharmacy_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {med.featured_until ? (
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(med.featured_until), 'MMM dd, yyyy')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">No expiry</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFeaturedMutation.mutate(med.id)}
                      disabled={removeFeaturedMutation.isPending}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-marketplace" />
              Assign Featured Slot
            </DialogTitle>
            <DialogDescription>
              Select a pharmacy and medication to feature in the Spotlight section.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            {/* Pharmacy Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Pharmacy</label>
              <Select
                value={selectedPharmacyId || ''}
                onValueChange={(val) => {
                  setSelectedPharmacyId(val);
                  setSelectedMedicationId(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a pharmacy" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {pharmacies.map((pharmacy) => (
                    <SelectItem key={pharmacy.id} value={pharmacy.id}>
                      {pharmacy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Medication Select */}
            {selectedPharmacyId && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Medication</label>
                {loadingMedications ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading medications...
                  </div>
                ) : pharmacyMedications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No eligible medications (must be public with stock)
                  </p>
                ) : (
                  <Select
                    value={selectedMedicationId || ''}
                    onValueChange={setSelectedMedicationId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a medication" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {pharmacyMedications.map((med) => (
                        <SelectItem 
                          key={med.id} 
                          value={med.id}
                          disabled={med.is_featured}
                        >
                          <div className="flex items-center gap-2">
                            <span className="truncate">{med.name}</span>
                            {med.is_featured && (
                              <Badge variant="secondary" className="text-[10px] flex-shrink-0">Featured</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Duration Select */}
            {selectedMedicationId && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration</label>
                <Select
                  value={selectedDuration.toString()}
                  onValueChange={(val) => setSelectedDuration(parseInt(val))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedMedicationId) {
                  assignFeaturedMutation.mutate({
                    medicationId: selectedMedicationId,
                    duration: selectedDuration,
                  });
                }
              }}
              disabled={!selectedMedicationId || assignFeaturedMutation.isPending}
              className="gap-2"
            >
              {assignFeaturedMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Star className="h-4 w-4" />
              Assign Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
