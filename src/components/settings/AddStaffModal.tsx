import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, Loader2, Mail, Lock, User, Shield, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useBranches } from '@/hooks/useBranches';
import { useToast } from '@/hooks/use-toast';
import { PERMISSION_LABELS, ROLE_TEMPLATES, PermissionKey } from '@/hooks/usePermissions';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddStaffModal = ({ isOpen, onClose, onSuccess }: AddStaffModalProps) => {
  const { pharmacy } = usePharmacy();
  const { branches } = useBranches();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'staff' as 'manager' | 'staff',
    branchId: '' as string,
  });
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacy?.id) return;

    setIsLoading(true);

    try {
      // Call edge function to create staff (avoids session switching)
      const response = await supabase.functions.invoke('create-staff', {
        body: {
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          phone: formData.phone,
          role: formData.role,
          pharmacyId: pharmacy.id,
          branchId: formData.branchId || null, // null means all branches
          permissions: formData.role === 'staff' ? selectedPermissions : [],
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create staff member');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: 'Staff Member Added',
        description: `${formData.fullName} has been added to your team. They can now log in with their credentials.`,
      });

      // Reset form
      setFormData({
        email: '',
        password: '',
        fullName: '',
        phone: '',
        role: 'staff',
        branchId: '',
      });
      setSelectedPermissions([]);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add staff member',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = (permission: PermissionKey) => {
    setSelectedPermissions(prev =>
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const applyTemplate = (templateKey: string) => {
    const template = ROLE_TEMPLATES[templateKey];
    if (template) {
      setSelectedPermissions([...template.permissions]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add Staff Member
          </DialogTitle>
          <DialogDescription>
            Create a new account for a team member. They will receive an email to verify their account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 pb-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fullName" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="John Doe"
                    required
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="staff@pharmacy.com"
                    required
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Initial Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Minimum 6 characters"
                    required
                    minLength={6}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The staff member can change this after logging in.
                  </p>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+234 800 000 0000"
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Role
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as 'manager' | 'staff' }))}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager - Full access to all features</SelectItem>
                    <SelectItem value="staff">Staff - Limited access based on permissions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Branch Assignment */}
              {branches.length > 0 && (
                <div>
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Assigned Branch
                  </Label>
                  <Select
                    value={formData.branchId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, branchId: value }))}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="All Branches (Full Access)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Branches (Full Access)</SelectItem>
                      {branches.filter(b => b.is_active).map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name} {branch.is_main_branch ? '(Main)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Staff assigned to a branch will only see that branch's data.
                  </p>
                </div>
              )}

              {/* Permissions (only for staff role) */}
              {formData.role === 'staff' && (
                <div className="space-y-3">
                  <Label>Permissions</Label>
                  
                  {/* Quick Templates */}
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(ROLE_TEMPLATES).map(([key, template]) => (
                      <Button
                        key={key}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyTemplate(key)}
                      >
                        {template.name}
                      </Button>
                    ))}
                  </div>

                  {/* Permission Checkboxes */}
                  <div className="border rounded-lg p-3 space-y-3">
                    {(Object.entries(PERMISSION_LABELS) as [PermissionKey, { label: string; description: string }][]).map(
                      ([key, { label, description }]) => (
                        <div key={key} className="flex items-start gap-3">
                          <Checkbox
                            id={`perm-${key}`}
                            checked={selectedPermissions.includes(key)}
                            onCheckedChange={() => togglePermission(key)}
                          />
                          <div className="flex-1">
                            <Label htmlFor={`perm-${key}`} className="font-medium cursor-pointer">
                              {label}
                            </Label>
                            <p className="text-xs text-muted-foreground">{description}</p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Staff Member
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
