import { useState, useMemo } from 'react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';
import { 
  Bell, 
  MessageCircle, 
  Smartphone, 
  Filter, 
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Info,
  Search,
  Download,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDbNotifications, DbNotification, SentAlert } from '@/hooks/useDbNotifications';
import { useNotifications, Notification } from '@/hooks/useNotifications';

type LogEntry = {
  id: string;
  timestamp: string;
  type: 'in_app' | 'in_app_local' | 'sms' | 'whatsapp';
  title: string;
  message: string;
  status: 'read' | 'unread' | 'sent' | 'delivered' | 'failed' | 'pending';
  priority?: string;
  recipient?: string;
  metadata?: any;
  source: 'database' | 'local';
};

const NotificationAuditLog = () => {
  const { notifications: dbNotifications, sentAlerts, loading, generateInventoryNotifications } = useDbNotifications();
  const { notifications: localNotifications } = useNotifications();
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'in_app' | 'in_app_local' | 'sms' | 'whatsapp'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'read' | 'unread' | 'sent' | 'delivered' | 'failed'>('all');
  const [dateRange, setDateRange] = useState<'all' | '7days' | '30days' | 'custom'>('all');
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await generateInventoryNotifications();
    setIsRefreshing(false);
  };

  // Combine all notification sources into unified log entries
  const logEntries = useMemo<LogEntry[]>(() => {
    const entries: LogEntry[] = [];

    // Add database notifications
    dbNotifications.forEach((n: DbNotification) => {
      entries.push({
        id: `db_notif_${n.id}`,
        timestamp: n.created_at,
        type: 'in_app',
        title: n.title,
        message: n.message,
        status: n.is_read ? 'read' : 'unread',
        priority: n.priority,
        metadata: n.metadata,
        source: 'database',
      });
    });

    // Add local/in-memory notifications (from useNotifications hook)
    localNotifications.forEach((n: Notification) => {
      entries.push({
        id: `local_notif_${n.id}`,
        timestamp: new Date().toISOString(), // Local notifications don't have precise timestamps
        type: 'in_app_local',
        title: n.title,
        message: n.message,
        status: n.isRead ? 'read' : 'unread',
        priority: n.type === 'danger' ? 'critical' : n.type === 'warning' ? 'high' : 'medium',
        metadata: { timeLabel: n.time, link: n.link },
        source: 'local',
      });
    });

    // Add sent alerts (SMS/WhatsApp)
    sentAlerts.forEach((a: SentAlert) => {
      entries.push({
        id: `alert_${a.id}`,
        timestamp: a.created_at,
        type: a.channel === 'whatsapp' ? 'whatsapp' : 'sms',
        title: `${a.alert_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Alert`,
        message: a.message,
        status: a.status as LogEntry['status'],
        recipient: a.recipient_phone,
        metadata: {
          termii_message_id: a.termii_message_id,
          items_included: a.items_included,
        },
        source: 'database',
      });
    });

    // Sort by timestamp descending (newest first)
    return entries.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [dbNotifications, localNotifications, sentAlerts]);

  // Apply filters
  const filteredEntries = useMemo(() => {
    return logEntries.filter(entry => {
      // Type filter
      if (typeFilter !== 'all' && entry.type !== typeFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false;

      // Date range filter
      const entryDate = parseISO(entry.timestamp);
      if (dateRange === '7days') {
        if (!isWithinInterval(entryDate, { 
          start: startOfDay(subDays(new Date(), 7)), 
          end: endOfDay(new Date()) 
        })) return false;
      } else if (dateRange === '30days') {
        if (!isWithinInterval(entryDate, { 
          start: startOfDay(subDays(new Date(), 30)), 
          end: endOfDay(new Date()) 
        })) return false;
      } else if (dateRange === 'custom' && customDateFrom && customDateTo) {
        if (!isWithinInterval(entryDate, { 
          start: startOfDay(customDateFrom), 
          end: endOfDay(customDateTo) 
        })) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          entry.title.toLowerCase().includes(query) ||
          entry.message.toLowerCase().includes(query) ||
          entry.recipient?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [logEntries, typeFilter, statusFilter, dateRange, customDateFrom, customDateTo, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: filteredEntries.length,
      inApp: filteredEntries.filter(e => e.type === 'in_app' || e.type === 'in_app_local').length,
      sms: filteredEntries.filter(e => e.type === 'sms').length,
      whatsapp: filteredEntries.filter(e => e.type === 'whatsapp').length,
      delivered: filteredEntries.filter(e => e.status === 'sent' || e.status === 'delivered').length,
      failed: filteredEntries.filter(e => e.status === 'failed').length,
    };
  }, [filteredEntries]);

  const getTypeIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'in_app': return <Bell className="h-4 w-4 text-primary" />;
      case 'in_app_local': return <Bell className="h-4 w-4 text-orange-500" />;
      case 'sms': return <Smartphone className="h-4 w-4 text-blue-500" />;
      case 'whatsapp': return <MessageCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getTypeBadge = (type: LogEntry['type']) => {
    switch (type) {
      case 'in_app': return <Badge variant="outline" className="text-xs">In-App (DB)</Badge>;
      case 'in_app_local': return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/30 text-xs">In-App (Live)</Badge>;
      case 'sms': return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-xs">SMS</Badge>;
      case 'whatsapp': return <Badge className="bg-green-500/10 text-green-500 border-green-500/30 text-xs">WhatsApp</Badge>;
    }
  };

  const getStatusBadge = (status: LogEntry['status']) => {
    switch (status) {
      case 'read': return <Badge variant="secondary" className="text-xs gap-1"><CheckCircle className="h-3 w-3" /> Read</Badge>;
      case 'unread': return <Badge variant="outline" className="text-xs gap-1"><Clock className="h-3 w-3" /> Unread</Badge>;
      case 'sent': return <Badge className="bg-blue-500/10 text-blue-500 text-xs gap-1"><CheckCircle className="h-3 w-3" /> Sent</Badge>;
      case 'delivered': return <Badge className="bg-green-500/10 text-green-500 text-xs gap-1"><CheckCircle className="h-3 w-3" /> Delivered</Badge>;
      case 'failed': return <Badge variant="destructive" className="text-xs gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>;
      case 'pending': return <Badge variant="outline" className="text-xs gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
    }
  };

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'medium': return <Info className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Type', 'Title', 'Message', 'Status', 'Recipient', 'Priority'];
    const rows = filteredEntries.map(e => [
      format(parseISO(e.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      e.type,
      e.title,
      e.message.replace(/,/g, ';'),
      e.status,
      e.recipient || 'N/A',
      e.priority || 'N/A',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Notification & Alert Audit Log</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Sync DB Notifications
        </Button>
      </div>

      {/* Info about in-app live notifications */}
      <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-sm text-orange-700 dark:text-orange-300">
        <strong>In-App (Live)</strong> notifications are generated dynamically from your inventory status (expired drugs, low stock, etc.) and appear in the bell icon. They are not stored in the database until you click "Sync DB Notifications".
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <Card className="p-3 text-center">
          <p className="text-xl font-bold">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Total</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-primary">{stats.inApp}</p>
          <p className="text-[10px] text-muted-foreground uppercase">In-App</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-blue-500">{stats.sms}</p>
          <p className="text-[10px] text-muted-foreground uppercase">SMS</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-green-500">{stats.whatsapp}</p>
          <p className="text-[10px] text-muted-foreground uppercase">WhatsApp</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-success">{stats.delivered}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Delivered</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-destructive">{stats.failed}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Failed</p>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Search */}
            <div className="col-span-2 sm:col-span-1 relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="in_app">In-App (DB)</SelectItem>
                <SelectItem value="in_app_local">In-App (Live)</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range */}
            <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {/* Export Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToCSV}
              className="gap-2 h-9"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>

          {/* Custom Date Range Pickers */}
          {dateRange === 'custom' && (
            <div className="flex gap-3 mt-3 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    {customDateFrom ? format(customDateFrom, 'MMM dd, yyyy') : 'From'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={customDateFrom}
                    onSelect={setCustomDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    {customDateTo ? format(customDateTo, 'MMM dd, yyyy') : 'To'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={customDateTo}
                    onSelect={setCustomDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Table */}
      <Card>
        <ScrollArea className="h-[50vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead className="w-[140px]">Timestamp</TableHead>
                <TableHead className="w-[80px]">Type</TableHead>
                <TableHead>Title / Message</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[120px] hidden sm:table-cell">Recipient</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">No notifications found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => (
                  <Collapsible key={entry.id} asChild open={expandedRows.has(entry.id)}>
                    <>
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(entry.id)}
                      >
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <ChevronDown className={`h-4 w-4 transition-transform ${expandedRows.has(entry.id) ? 'rotate-180' : ''}`} />
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          <div className="flex flex-col">
                            <span>{format(parseISO(entry.timestamp), 'MMM dd, yyyy')}</span>
                            <span className="text-muted-foreground">{format(parseISO(entry.timestamp), 'HH:mm:ss')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getTypeIcon(entry.type)}
                            {getTypeBadge(entry.type)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getPriorityIcon(entry.priority)}
                            <span className="font-medium text-sm truncate max-w-[200px]">{entry.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(entry.status)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                          {entry.recipient || '-'}
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={6} className="p-4">
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium text-muted-foreground">Message:</span>
                                <p className="mt-1">{entry.message}</p>
                              </div>
                              {entry.recipient && (
                                <div>
                                  <span className="font-medium text-muted-foreground">Recipient:</span>
                                  <span className="ml-2">{entry.recipient}</span>
                                </div>
                              )}
                              {entry.metadata?.termii_message_id && (
                                <div>
                                  <span className="font-medium text-muted-foreground">Message ID:</span>
                                  <span className="ml-2 font-mono text-xs">{entry.metadata.termii_message_id}</span>
                                </div>
                              )}
                              {entry.metadata?.items_included && (
                                <div>
                                  <span className="font-medium text-muted-foreground">Items Included:</span>
                                  <pre className="mt-1 text-xs bg-background p-2 rounded overflow-x-auto">
                                    {JSON.stringify(entry.metadata.items_included, null, 2)}
                                  </pre>
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                Full timestamp: {format(parseISO(entry.timestamp), 'PPpp')}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
};

export default NotificationAuditLog;
