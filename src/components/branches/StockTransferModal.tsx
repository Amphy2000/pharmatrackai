import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBranches } from '@/hooks/useBranches';
import { useMedications } from '@/hooks/useMedications';
import { ArrowRight } from 'lucide-react';

interface StockTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StockTransferModal = ({ open, onOpenChange }: StockTransferModalProps) => {
  const { branches, createTransfer } = useBranches();
  const { medications } = useMedications();
  const [formData, setFormData] = useState({
    from_branch_id: '',
    to_branch_id: '',
    medication_id: '',
    quantity: 1,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTransfer.mutateAsync(formData);
    onOpenChange(false);
    setFormData({ from_branch_id: '', to_branch_id: '', medication_id: '', quantity: 1, notes: '' });
  };

  const activeBranches = branches.filter(b => b.is_active);
  const selectedMed = medications.find(m => m.id === formData.medication_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Stock Transfer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Label>From Branch</Label>
              <Select
                value={formData.from_branch_id}
                onValueChange={(v) => setFormData({ ...formData, from_branch_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {activeBranches
                    .filter(b => b.id !== formData.to_branch_id)
                    .map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground mt-6" />
            <div className="flex-1 space-y-2">
              <Label>To Branch</Label>
              <Select
                value={formData.to_branch_id}
                onValueChange={(v) => setFormData({ ...formData, to_branch_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {activeBranches
                    .filter(b => b.id !== formData.from_branch_id)
                    .map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Medication</Label>
            <Select
              value={formData.medication_id}
              onValueChange={(v) => setFormData({ ...formData, medication_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select medication" />
              </SelectTrigger>
              <SelectContent>
                {medications.map(med => (
                  <SelectItem key={med.id} value={med.id}>
                    {med.name} ({med.current_stock} in stock)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={selectedMed?.current_stock || 999}
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Reason for transfer..."
              rows={2}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={
              createTransfer.isPending ||
              !formData.from_branch_id ||
              !formData.to_branch_id ||
              !formData.medication_id
            }
          >
            Create Transfer Request
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
