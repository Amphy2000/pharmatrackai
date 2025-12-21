import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Shield, Settings2, UserCog, Crown, Briefcase, User, UserPlus } from 'lucide-react';
import { useStaffManagement } from '@/hooks/useStaffManagement';
import { usePermissions, PERMISSION_LABELS, ROLE_TEMPLATES, PermissionKey } from '@/hooks/usePermissions';
import { AddStaffModal } from './AddStaffModal';

export const StaffManagement = () => {
  const { staff, isLoading, refetch, updateStaffPermissions, updateStaffRole, toggleStaffActive } = useStaffManagement();
  const { isOwnerOrManager, userRole } = usePermissions();
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<PermissionKey[]>([]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);

  if (!isOwnerOrManager) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>You don't have permission to manage staff</p>
        </CardContent>
      </Card>
    );
  }

  const handleEditPermissions = (staffId: string, currentPermissions: PermissionKey[]) => {
    setSelectedStaff(staffId);
    setEditPermissions([...currentPermissions]);
    setShowPermissionModal(true);
  };

  const handleApplyTemplate = (templateKey: string) => {
    const template = ROLE_TEMPLATES[templateKey];
    if (template) {
      setEditPermissions([...template.permissions]);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedStaff) return;
    await updateStaffPermissions(selectedStaff, editPermissions);
    setShowPermissionModal(false);
    setSelectedStaff(null);
  };

  const togglePermission = (permission: PermissionKey) => {
    setEditPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'manager': return <Briefcase className="h-4 w-4 text-blue-500" />;
      default: return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'manager': return 'secondary';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading staff...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Staff Management
              </CardTitle>
              <CardDescription>
                Manage your team members and their access permissions
              </CardDescription>
            </div>
            {userRole === 'owner' && (
              <Button onClick={() => setShowAddStaffModal(true)} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add Staff
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {staff.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No staff members yet</p>
              </div>
            ) : (
              staff.map((member) => (
                <div
                  key={member.id}
                  className={`p-4 rounded-lg border ${
                    member.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {getRoleIcon(member.role)}
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {member.profile?.full_name || 'Unnamed Staff'}
                          <Badge variant={getRoleBadgeVariant(member.role)}>
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </Badge>
                          {!member.is_active && (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {member.profile?.phone || 'No phone'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Role can't be changed for owner */}
                      {member.role !== 'owner' && (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(value) => updateStaffRole(member.id, value as 'manager' | 'staff')}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                            </SelectContent>
                          </Select>

                          {member.role === 'staff' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPermissions(member.id, member.permissions)}
                            >
                              <Settings2 className="h-4 w-4 mr-1" />
                              Permissions
                            </Button>
                          )}

                          <div className="flex items-center gap-2 ml-2">
                            <Switch
                              checked={member.is_active}
                              onCheckedChange={(checked) => toggleStaffActive(member.id, checked)}
                            />
                            <span className="text-xs text-muted-foreground">
                              {member.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Show current permissions for staff */}
                  {member.role === 'staff' && member.permissions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {member.permissions.map(perm => (
                        <Badge key={perm} variant="secondary" className="text-xs">
                          {PERMISSION_LABELS[perm]?.label || perm}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {member.role === 'staff' && member.permissions.length === 0 && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      No special permissions - basic access only
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permission Edit Modal */}
      <Dialog open={showPermissionModal} onOpenChange={setShowPermissionModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Edit Staff Permissions
            </DialogTitle>
            <DialogDescription>
              Configure what features this staff member can access
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Role Templates */}
            <div>
              <Label className="text-sm font-medium">Quick Templates</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(ROLE_TEMPLATES).map(([key, template]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyTemplate(key)}
                  >
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Individual Permissions */}
            <div>
              <Label className="text-sm font-medium">Permissions</Label>
              <ScrollArea className="h-64 mt-2 border rounded-lg p-3">
                <div className="space-y-3">
                  {(Object.entries(PERMISSION_LABELS) as [PermissionKey, { label: string; description: string }][]).map(
                    ([key, { label, description }]) => (
                      <div
                        key={key}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50"
                      >
                        <Checkbox
                          id={key}
                          checked={editPermissions.includes(key)}
                          onCheckedChange={() => togglePermission(key)}
                        />
                        <div className="flex-1">
                          <Label htmlFor={key} className="font-medium cursor-pointer">
                            {label}
                          </Label>
                          <p className="text-xs text-muted-foreground">{description}</p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions}>
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddStaffModal
        isOpen={showAddStaffModal}
        onClose={() => setShowAddStaffModal(false)}
        onSuccess={refetch}
      />
    </>
  );
};
