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
import { Star, Search, Trash2, Loader2, Gift, Store, Package, Sparkles } from 'lucide-react';

interface FeaturedMedication {
  id: string;
  name: string;
  pharmacy_id: string;
  pharmacy_name: string;
  is_featured: boolean;
  featured_until: string | null;
}

interface FeaturedCredit {
  id: string;
  pharmacy_id: string;
  pharmacy_name: string;
  duration_days: number;
  created_at: string;
  used: boolean;
  used_at?: string;
  used_for_medication_id?: string;
}

const DURATION_OPTIONS = [
  { value: 7, label: '7 Days', description: 'Basic spotlight' },
  { value: 14, label: '14 Days', description: 'Extended visibility' },
  { value: 30, label: '30 Days', description: 'Premium placement' },
  { value: 60, label: '60 Days', description: 'Double premium' },
  { value: 90, label: '90 Days', description: 'Quarter spotlight' },
];

export const FeaturedSlotsPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [giftDialogOpen, setGiftDialogOpen] = useState(false);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);
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
        .select('id, name, email')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Gift featured credit to pharmacy - this creates a custom feature they can use
  const giftCreditMutation = useMutation({
    mutationFn: async ({ pharmacyId, durationDays }: { pharmacyId: string; durationDays: number }) => {
      // Create a custom feature for the pharmacy with the featured credit
      const { error } = await supabase
        .from('pharmacy_custom_features')
        .insert({
          pharmacy_id: pharmacyId,
          feature_key: `featured_credit_${Date.now()}`,
          feature_name: `Featured Product Credit (${durationDays} days)`,
          description: `Gift credit for ${durationDays} days of featured placement. Apply this to any product in Marketplace Insights.`,
          is_enabled: true,
          config: { 
            type: 'featured_credit', 
            duration_days: durationDays,
            granted_at: new Date().toISOString(),
            used: false
          },
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pharmacies-list'] });
      setGiftDialogOpen(false);
      setSelectedPharmacyId(null);
      setSelectedDuration(7);
      toast({
        title: 'Featured credit gifted!',
        description: 'The pharmacy can now apply this credit to any of their products.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to gift credit',
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

  const filteredPharmacies = pharmacies.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedPharmacy = pharmacies.find(p => p.id === selectedPharmacyId);

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
              <CardDescription>Gift featured credits to pharmacies or manage active featured products</CardDescription>
            </div>
          </div>
          <Button onClick={() => setGiftDialogOpen(true)} className="gap-2 bg-gradient-to-r from-marketplace to-primary">
            <Gift className="h-4 w-4" />
            Gift Featured Credit
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search featured medications or pharmacies..."
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
            <p className="text-xs mt-1">Gift a credit to a pharmacy to get started</p>
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

      {/* Gift Credit Dialog - Simplified */}
      <Dialog open={giftDialogOpen} onOpenChange={setGiftDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-marketplace" />
              Gift Featured Credit
            </DialogTitle>
            <DialogDescription>
              Gift a featured credit to a pharmacy. They can apply it to any product they choose.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Pharmacy Select with search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Pharmacy</label>
              <Select
                value={selectedPharmacyId || ''}
                onValueChange={setSelectedPharmacyId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a pharmacy to gift..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {filteredPharmacies.map((pharmacy) => (
                    <SelectItem key={pharmacy.id} value={pharmacy.id}>
                      <div className="flex flex-col">
                        <span>{pharmacy.name}</span>
                        <span className="text-xs text-muted-foreground">{pharmacy.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration Select with descriptions */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Credit Duration</label>
              <div className="grid gap-2">
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedDuration(option.value)}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      selectedDuration === option.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        selectedDuration === option.value ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <Star className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                    {selectedDuration === option.value && (
                      <Badge className="bg-primary">Selected</Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {selectedPharmacy && (
              <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
                <div className="flex items-center gap-2 text-sm">
                  <Gift className="h-4 w-4 text-marketplace" />
                  <span>Gifting <strong>{selectedDuration} days</strong> featured credit to</span>
                </div>
                <p className="font-medium mt-1">{selectedPharmacy.name}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  The pharmacy owner will see this credit in their settings and can apply it to any product.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGiftDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedPharmacyId) {
                  giftCreditMutation.mutate({
                    pharmacyId: selectedPharmacyId,
                    durationDays: selectedDuration,
                  });
                }
              }}
              disabled={!selectedPharmacyId || giftCreditMutation.isPending}
              className="gap-2 bg-gradient-to-r from-marketplace to-primary"
            >
              {giftCreditMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Gift className="h-4 w-4" />
              Gift Credit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};