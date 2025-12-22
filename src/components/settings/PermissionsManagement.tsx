import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  UserCog, 
  Crown, 
  Briefcase, 
  User, 
  Search,
  Check,
  X,
  Sparkles,
  ChevronRight,
  Users,
  LayoutGrid,
  List,
  Info
} from 'lucide-react';
import { useStaffManagement } from '@/hooks/useStaffManagement';
import { usePermissions, PERMISSION_LABELS, ROLE_TEMPLATES, PermissionKey } from '@/hooks/usePermissions';
import { motion, AnimatePresence } from 'framer-motion';

export const PermissionsManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { staff, isLoading, updateStaffPermissions } = useStaffManagement();
  const { isOwnerOrManager } = usePermissions();
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<PermissionKey[]>([]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  // Filter only staff members (not owner/manager)
  const staffMembers = useMemo(() => {
    return staff.filter(s => s.role === 'staff' && s.is_active);
  }, [staff]);

  // Handle URL parameter to auto-open a specific staff member's permissions
  useEffect(() => {
    const staffId = searchParams.get('staff');
    if (staffId && staff.length > 0 && !isLoading) {
      const member = staff.find(s => s.id === staffId);
      if (member && member.role === 'staff') {
        setSelectedStaff(staffId);
        setEditPermissions([...member.permissions]);
        setShowPermissionModal(true);
        // Clear the URL parameter after opening
        searchParams.delete('staff');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, staff, isLoading, setSearchParams]);

  const filteredStaff = useMemo(() => {
    if (!searchQuery) return staffMembers;
    const query = searchQuery.toLowerCase();
    return staffMembers.filter(s => 
      s.profile?.full_name?.toLowerCase().includes(query) ||
      s.profile?.phone?.toLowerCase().includes(query)
    );
  }, [staffMembers, searchQuery]);

  if (!isOwnerOrManager) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>You don't have permission to manage staff permissions</p>
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

  const getMatchingTemplate = (permissions: PermissionKey[]): string | null => {
    for (const [key, template] of Object.entries(ROLE_TEMPLATES)) {
      if (
        template.permissions.length === permissions.length &&
        template.permissions.every(p => permissions.includes(p))
      ) {
        return key;
      }
    }
    return null;
  };

  const getTemplateIcon = (key: string) => {
    switch (key) {
      case 'cashier': return <User className="h-5 w-5" />;
      case 'pharmacist': return <Sparkles className="h-5 w-5" />;
      case 'inventory_clerk': return <LayoutGrid className="h-5 w-5" />;
      case 'senior_staff': return <Briefcase className="h-5 w-5" />;
      default: return <User className="h-5 w-5" />;
    }
  };

  const getTemplateColor = (key: string) => {
    switch (key) {
      case 'cashier': return 'bg-slate-500/10 text-slate-600 border-slate-200';
      case 'pharmacist': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      case 'inventory_clerk': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'senior_staff': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const selectedStaffMember = staff.find(s => s.id === selectedStaff);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading staff permissions...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Tip Banner */}
        <Alert className="bg-primary/5 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>Tip:</strong> Use the <strong>Staff</strong> tab to add new team members or change roles. Use this tab to configure <strong>what each staff member can access</strong>.
          </AlertDescription>
        </Alert>

        {/* Role Templates Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Role Templates
            </CardTitle>
            <CardDescription>
              Pre-configured permission sets for common pharmacy roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(ROLE_TEMPLATES).map(([key, template]) => (
                <div
                  key={key}
                  className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${getTemplateColor(key)}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center shadow-sm">
                      {getTemplateIcon(key)}
                    </div>
                    <div>
                      <h4 className="font-semibold">{template.name}</h4>
                      <p className="text-xs opacity-80">{template.permissions.length} permissions</p>
                    </div>
                  </div>
                  <p className="text-xs mb-3 opacity-80">{template.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {template.permissions.slice(0, 3).map(perm => (
                      <Badge key={perm} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {PERMISSION_LABELS[perm]?.label.replace('Access ', '').replace('View ', '')}
                      </Badge>
                    ))}
                    {template.permissions.length > 3 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        +{template.permissions.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Staff Permissions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-primary" />
                  Staff Permissions
                </CardTitle>
                <CardDescription>
                  {staffMembers.length} staff member{staffMembers.length !== 1 ? 's' : ''} with configurable permissions
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search staff..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-48"
                  />
                </div>
                <div className="flex border rounded-lg overflow-hidden">
                  <Button
                    variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="rounded-none h-9 w-9"
                    onClick={() => setViewMode('cards')}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="rounded-none h-9 w-9"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredStaff.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">No staff members found</p>
                <p className="text-sm">Staff with the "Staff" role will appear here for permission management</p>
              </div>
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {filteredStaff.map((member) => {
                    const matchingTemplate = getMatchingTemplate(member.permissions);
                    return (
                      <motion.div
                        key={member.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-4 rounded-xl border bg-card hover:shadow-md transition-all group cursor-pointer"
                        onClick={() => handleEditPermissions(member.id, member.permissions)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium">{member.profile?.full_name || 'Unnamed Staff'}</h4>
                              <p className="text-xs text-muted-foreground">{member.profile?.phone || 'No phone'}</p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        
                        {matchingTemplate ? (
                          <Badge className={`${getTemplateColor(matchingTemplate)} border`}>
                            {ROLE_TEMPLATES[matchingTemplate].name}
                          </Badge>
                        ) : member.permissions.length > 0 ? (
                          <Badge variant="outline">Custom ({member.permissions.length} permissions)</Badge>
                        ) : (
                          <Badge variant="secondary">Cashier (POS Only)</Badge>
                        )}

                        <div className="mt-3 flex flex-wrap gap-1">
                          {member.permissions.slice(0, 4).map(perm => (
                            <span key={perm} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {PERMISSION_LABELS[perm]?.label.replace('Access ', '').replace('View ', '')}
                            </span>
                          ))}
                          {member.permissions.length > 4 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{member.permissions.length - 4} more
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredStaff.map((member) => {
                  const matchingTemplate = getMatchingTemplate(member.permissions);
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleEditPermissions(member.id, member.permissions)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{member.profile?.full_name || 'Unnamed Staff'}</h4>
                          <p className="text-xs text-muted-foreground">{member.profile?.phone || 'No phone'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {matchingTemplate ? (
                          <Badge className={`${getTemplateColor(matchingTemplate)} border`}>
                            {ROLE_TEMPLATES[matchingTemplate].name}
                          </Badge>
                        ) : member.permissions.length > 0 ? (
                          <Badge variant="outline">Custom ({member.permissions.length})</Badge>
                        ) : (
                          <Badge variant="secondary">Cashier</Badge>
                        )}
                        <Button variant="ghost" size="sm">
                          Edit
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Permission Edit Modal */}
      <Dialog open={showPermissionModal} onOpenChange={setShowPermissionModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Edit Permissions for {selectedStaffMember?.profile?.full_name || 'Staff Member'}
            </DialogTitle>
            <DialogDescription>
              Choose a role template or customize individual permissions
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="templates" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Role Templates
              </TabsTrigger>
              <TabsTrigger value="custom" className="gap-2">
                <Shield className="h-4 w-4" />
                Custom Permissions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(ROLE_TEMPLATES).map(([key, template]) => {
                  const isSelected = 
                    template.permissions.length === editPermissions.length &&
                    template.permissions.every(p => editPermissions.includes(p));
                  
                  return (
                    <div
                      key={key}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                      onClick={() => handleApplyTemplate(key)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${getTemplateColor(key)}`}>
                            {getTemplateIcon(key)}
                          </div>
                          <h4 className="font-semibold">{template.name}</h4>
                        </div>
                        {isSelected && (
                          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{template.description}</p>
                      <div className="space-y-1">
                        {template.permissions.map(perm => (
                          <div key={perm} className="flex items-center gap-2 text-xs">
                            <Check className="h-3 w-3 text-success" />
                            <span>{PERMISSION_LABELS[perm]?.label}</span>
                          </div>
                        ))}
                        {template.permissions.length === 0 && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <X className="h-3 w-3" />
                            <span>POS access only</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="custom" className="mt-4">
              <ScrollArea className="h-80 border rounded-lg p-4">
                <div className="space-y-6">
                  {['Navigation', 'Data Access', 'Management'].map(category => {
                    const categoryPermissions = (Object.entries(PERMISSION_LABELS) as [PermissionKey, { label: string; description: string; category: string }][])
                      .filter(([_, { category: cat }]) => cat === category);
                    
                    if (categoryPermissions.length === 0) return null;

                    return (
                      <div key={category}>
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                          <div className="h-1 w-1 rounded-full bg-primary" />
                          {category}
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          {categoryPermissions.map(([key, { label, description }]) => (
                            <div
                              key={key}
                              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                                editPermissions.includes(key) 
                                  ? 'bg-primary/5 border-primary/30' 
                                  : 'hover:bg-muted/50 border-transparent'
                              }`}
                              onClick={() => togglePermission(key)}
                            >
                              <Checkbox
                                id={key}
                                checked={editPermissions.includes(key)}
                                onCheckedChange={() => togglePermission(key)}
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <Label htmlFor={key} className="font-medium cursor-pointer text-sm">
                                  {label}
                                </Label>
                                <p className="text-xs text-muted-foreground">{description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Selected permissions:</span>
                  <Badge variant="secondary">{editPermissions.length} of {Object.keys(PERMISSION_LABELS).length}</Badge>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowPermissionModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} className="gap-2">
              <Check className="h-4 w-4" />
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
