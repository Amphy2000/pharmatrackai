import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useBranches } from '@/hooks/useBranches';
import { Branch } from '@/types/branch';

interface AddBranchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBranch?: Branch | null;
}

export const AddBranchModal = ({ open, onOpenChange, editingBranch }: AddBranchModalProps) => {
  const { addBranch, updateBranch } = useBranches();
  const [formData, setFormData] = useState({
    name: editingBranch?.name || '',
    address: editingBranch?.address || '',
    phone: editingBranch?.phone || '',
    email: editingBranch?.email || '',
    is_main_branch: editingBranch?.is_main_branch || false,
    is_active: editingBranch?.is_active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBranch) {
      await updateBranch.mutateAsync({ id: editingBranch.id, ...formData });
    } else {
      await addBranch.mutateAsync(formData);
    }
    onOpenChange(false);
    setFormData({ name: '', address: '', phone: '', email: '', is_main_branch: false, is_active: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Branch Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Main Store"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Street, City"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+234..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="branch@pharmacy.com"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="main-branch">Main Branch</Label>
            <Switch
              id="main-branch"
              checked={formData.is_main_branch}
              onCheckedChange={(checked) => setFormData({ ...formData, is_main_branch: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="active">Active</Label>
            <Switch
              id="active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={addBranch.isPending || updateBranch.isPending}
          >
            {editingBranch ? 'Update Branch' : 'Add Branch'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
