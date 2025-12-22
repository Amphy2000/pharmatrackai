import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Shield, Crown, Briefcase, User, UserPlus, Lock, Zap, ChevronRight } from 'lucide-react';
import { useStaffManagement } from '@/hooks/useStaffManagement';
import { usePermissions, PERMISSION_LABELS, ROLE_TEMPLATES, PermissionKey } from '@/hooks/usePermissions';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { AddStaffModal } from './AddStaffModal';

export const StaffManagement = () => {
  const navigate = useNavigate();
  const { staff, isLoading, refetch, updateStaffPermissions, updateStaffRole, toggleStaffActive } = useStaffManagement();
  const { isOwnerOrManager, userRole } = usePermissions();
  const { maxUsers, planName, plan } = usePlanLimits();
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Count active users (excluding inactive)
  const activeUserCount = staff.filter(s => s.is_active).length;
  const isAtLimit = activeUserCount >= maxUsers;
  const usagePercent = Math.min((activeUserCount / maxUsers) * 100, 100);

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

  const handleAddStaffClick = () => {
    if (isAtLimit) {
      setShowUpgradeModal(true);
    } else {
      setShowAddStaffModal(true);
    }
  };

  const navigateToPermissions = (staffId: string) => {
    navigate(`/settings?tab=permissions&staff=${staffId}`);
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
    <TooltipProvider>
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button 
                        onClick={handleAddStaffClick} 
                        className="gap-2"
                        variant={isAtLimit ? 'outline' : 'default'}
                      >
                        {isAtLimit ? <Lock className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                        Add Staff
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {isAtLimit && (
                    <TooltipContent>
                      <p>Upgrade to Pro to add more staff</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Usage Indicator */}
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Staff Accounts</span>
                <span className="text-sm text-muted-foreground">
                  {activeUserCount}/{maxUsers === 999 ? '∞' : maxUsers} Users
                </span>
              </div>
              <Progress value={usagePercent} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {planName} Plan {maxUsers !== 999 && `• ${maxUsers - activeUserCount} slots remaining`}
              </p>
            </div>

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
                              {member.role === 'staff' ? 'Staff' : member.role.charAt(0).toUpperCase() + member.role.slice(1)}
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
                                onClick={() => navigateToPermissions(member.id)}
                              >
                                Permissions
                                <ChevronRight className="h-4 w-4 ml-1" />
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

                    {/* Show current permissions for staff - clickable to edit */}
                    {member.role === 'staff' && (
                      <div 
                        className="mt-3 flex flex-wrap gap-1 cursor-pointer group"
                        onClick={() => navigateToPermissions(member.id)}
                      >
                        {member.permissions.length > 0 ? (
                          <>
                            {member.permissions.slice(0, 4).map(perm => (
                              <Badge key={perm} variant="secondary" className="text-xs">
                                {PERMISSION_LABELS[perm]?.label || perm}
                              </Badge>
                            ))}
                            {member.permissions.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{member.permissions.length - 4} more
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            POS access only - basic cashier permissions
                          </span>
                        )}
                        <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                          Click to manage →
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upgrade Modal */}
        <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-500" />
                Staff Limit Reached
              </DialogTitle>
              <DialogDescription>
                You've reached the maximum number of staff accounts for your {planName} plan.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Upgrade to Pro for:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Up to 5 staff accounts</li>
                  <li>• Multi-branch support</li>
                  <li>• AI Expiry Insights</li>
                  <li>• Advanced Analytics</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUpgradeModal(false)}>
                Maybe Later
              </Button>
              <Button onClick={() => navigate('/settings?tab=subscription')} className="gap-2">
                <Zap className="h-4 w-4" />
                Upgrade Now
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
    </TooltipProvider>
  );
};
