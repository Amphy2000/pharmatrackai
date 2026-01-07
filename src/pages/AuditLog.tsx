import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { usePharmacy } from '@/hooks/usePharmacy';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Search, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  user_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  pharmacy_id: string | null;
}

interface Profile {
  user_id: string;
  full_name: string | null;
}

const AuditLog = () => {
  const { pharmacy } = usePharmacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  // Fetch audit logs
  const { data: auditLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['audit-logs', pharmacy?.id],
    queryFn: async () => {
      if (!pharmacy?.id) return [];
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('pharmacy_id', pharmacy.id)
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!pharmacy?.id,
  });

  // Fetch profiles to map user_id to names
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name');
      
      if (error) throw error;
      return data as Profile[];
    },
  });

  const profileMap = new Map(profiles.map(p => [p.user_id, p.full_name || 'Unknown User']));

  // Filter logs
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = searchQuery === '' || 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.entity_type?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (profileMap.get(log.user_id || '')?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = actionFilter === 'all' || log.action.includes(actionFilter);
    
    return matchesSearch && matchesFilter;
  });

  // Get unique action types for filter
  const actionTypes = [...new Set(auditLogs.map(log => {
    if (log.action.includes('price')) return 'price';
    if (log.action.includes('login') || log.action.includes('auth')) return 'auth';
    if (log.action.includes('create') || log.action.includes('add')) return 'create';
    if (log.action.includes('update') || log.action.includes('edit')) return 'update';
    if (log.action.includes('delete') || log.action.includes('remove')) return 'delete';
    return 'other';
  }))];

  const getActionIcon = (action: string) => {
    if (action.includes('price') || action.includes('shield')) {
      return <Shield className="h-4 w-4 text-amber-500" />;
    }
    if (action.includes('approved') || action.includes('success')) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (action.includes('denied') || action.includes('failed') || action.includes('blocked')) {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    if (action.includes('attempt')) {
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const getActionBadge = (action: string) => {
    if (action.includes('price_change_blocked') || action.includes('denied')) {
      return <Badge variant="destructive">Blocked</Badge>;
    }
    if (action.includes('price_change_approved') || action.includes('approved')) {
      return <Badge variant="default" className="bg-green-600">Approved</Badge>;
    }
    if (action.includes('attempt')) {
      return <Badge variant="secondary">Attempt</Badge>;
    }
    return <Badge variant="outline">{action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</Badge>;
  };

  const formatDetails = (details: Record<string, unknown> | null) => {
    if (!details) return '-';
    
    const entries = Object.entries(details);
    if (entries.length === 0) return '-';
    
    return entries.map(([key, value]) => (
      <div key={key} className="text-xs">
        <span className="font-medium capitalize">{key.replace(/_/g, ' ')}: </span>
        <span className="text-muted-foreground">{String(value)}</span>
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-display flex items-center gap-2">
                    <Shield className="h-6 w-6 text-primary" />
                    Audit Log
                  </CardTitle>
                  <CardDescription>
                    Track all security events, price changes, and user actions
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search logs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full sm:w-64"
                    />
                  </div>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="price">Price Changes</SelectItem>
                      <SelectItem value="auth">Authentication</SelectItem>
                      <SelectItem value="create">Creations</SelectItem>
                      <SelectItem value="update">Updates</SelectItem>
                      <SelectItem value="delete">Deletions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No audit logs found</p>
                  <p className="text-sm">Security events will appear here as they occur</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/30">
                          <TableCell>{getActionIcon(log.action)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {getActionBadge(log.action)}
                              {log.entity_type && (
                                <span className="text-xs text-muted-foreground">
                                  {log.entity_type}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {log.user_id ? profileMap.get(log.user_id) || 'Unknown' : 'System'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              {formatDetails(log.details as Record<string, unknown>)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(log.created_at), 'MMM d, yyyy')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), 'HH:mm:ss')}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Summary Stats */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="p-4 bg-muted/30">
                  <div className="text-2xl font-bold">{auditLogs.length}</div>
                  <div className="text-xs text-muted-foreground">Total Events</div>
                </Card>
                <Card className="p-4 bg-amber-500/10">
                  <div className="text-2xl font-bold text-amber-600">
                    {auditLogs.filter(l => l.action.includes('price')).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Price Events</div>
                </Card>
                <Card className="p-4 bg-destructive/10">
                  <div className="text-2xl font-bold text-destructive">
                    {auditLogs.filter(l => l.action.includes('blocked') || l.action.includes('denied')).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Blocked Actions</div>
                </Card>
                <Card className="p-4 bg-green-500/10">
                  <div className="text-2xl font-bold text-green-600">
                    {auditLogs.filter(l => l.action.includes('approved')).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Approved Changes</div>
                </Card>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default AuditLog;
