import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, Loader2, Mail, Lock, User, Shield, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useBranches } from '@/hooks/useBranches';
import { useToast } from '@/hooks/use-toast';
import { PERMISSION_LABELS, ROLE_TEMPLATES, PermissionKey } from '@/hooks/usePermissions';

// External Supabase URL for edge functions
const EXTERNAL_FUNCTIONS_URL = 'https://sdejkpweecasdzsixxbd.supabase.co/functions/v1';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'owner' | 'manager';
  forcedBranchId?: string | null;
}

export const AddStaffModal = ({ isOpen, onClose, onSuccess, mode = 'owner', forcedBranchId = null }: AddStaffModalProps) => {
  const { pharmacy, isLoading: pharmacyLoading } = usePharmacy();
  const { branches, branchesLoading } = useBranches();
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

  // Safe branches array
  const safeBranches = branches || [];
  const ALL_BRANCHES_VALUE = '__lovable_all_branches__';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacy?.id) {
      toast({
        title: 'Error',
        description: 'Pharmacy not found. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.email || !formData.password || !formData.fullName) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 8 characters.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const effectiveRole: 'manager' | 'staff' = mode === 'manager' ? 'staff' : formData.role;
      const effectiveBranchId = mode === 'manager' ? forcedBranchId : (formData.branchId || null);

      if (mode === 'manager' && !effectiveBranchId) {
        throw new Error('You must be assigned to a branch to create staff accounts.');
      }

      // Get auth token for the request
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      // Call external edge function to create staff
      const fetchResponse = await fetch(`${EXTERNAL_FUNCTIONS_URL}/create-staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          fullName: formData.fullName.trim(),
          phone: formData.phone?.trim() || null,
          role: effectiveRole,
          pharmacyId: pharmacy.id,
          branchId: effectiveBranchId,
          permissions: effectiveRole === 'staff' ? selectedPermissions : [],
        }),
      });

      const response = { data: await fetchResponse.json(), error: !fetchResponse.ok ? { message: 'Request failed' } : null };

      const rawErrorMessage =
        (response.data as any)?.error ??
        (response.error ? response.error.message : null);

      if (rawErrorMessage) {
        const msg = String(rawErrorMessage);
        console.error('Create staff failed:', { msg, response });

        const lower = msg.toLowerCase();
        const isEmailExists =
          lower.includes('already been registered') ||
          lower.includes('already registered');

        toast({
          title: isEmailExists ? 'Email Already Registered' : 'Failed to Add Staff',
          description: isEmailExists
            ? 'That email already has an account. Use a different email, or ask the user to reset their password.'
            : msg,
          variant: 'destructive',
        });
        return;
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
        title: 'Failed to Add Staff',
        description: error.message || 'An unexpected error occurred. Please try again.',
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

  // Show loading while context is being prepared
  if (pharmacyLoading || branchesLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add Staff Member
          </DialogTitle>
          <DialogDescription>
            Create a new account for a team member. They can log in immediately with these credentials.
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
                    placeholder="Minimum 8 characters"
                    required
                    minLength={8}
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
              {mode !== 'manager' && (
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
              )}

              {/* Branch Assignment */}
              {mode !== 'manager' && safeBranches.length > 0 && (
                <div>
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Assigned Branch
                  </Label>
                  <Select
                    value={formData.branchId || ALL_BRANCHES_VALUE}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        branchId: value === ALL_BRANCHES_VALUE ? '' : value,
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="All Branches (Full Access)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_BRANCHES_VALUE}>All Branches (Full Access)</SelectItem>
                      {safeBranches.filter(b => b.is_active).map((branch) => (
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
