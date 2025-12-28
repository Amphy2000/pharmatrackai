import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Bell, 
  AlertTriangle, 
  Package, 
  Calendar,
  MessageCircle,
  CheckCircle,
  XCircle,
  ExternalLink,
  TrendingDown,
  Clock,
  Phone,
  Send,
  Loader2,
  Zap,
  Settings,
  History,
  RefreshCw,
  Trash2,
  DollarSign,
  Check,
  FileText
} from 'lucide-react';
import NotificationAuditLog from '@/components/notifications/NotificationAuditLog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAlertEngine, SystemAlert } from '@/hooks/useAlertEngine';
import { useAlerts } from '@/hooks/useAlerts';
import { useDbNotifications } from '@/hooks/useDbNotifications';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { differenceInDays, formatDistanceToNow, format } from 'date-fns';

const Notifications = () => {
  const { alerts, alertCounts, generateWhatsAppMessage, generateDigestWhatsAppUrl } = useAlertEngine();
  const { sendExpiryAlert, sendLowStockAlert, isSending } = useAlerts();
  const {
    notifications: dbNotifications,
    sentAlerts,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    generateInventoryNotifications,
    loading: notificationsLoading,
  } = useDbNotifications();
  const { pharmacy } = usePharmacy();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const { isOwnerOrManager, userRole } = usePermissions();

  // WhatsApp buttons visible to owner, manager, and all staff roles (pharmacist, inventory clerk, senior staff)
  const canSendAlerts = userRole !== null; // Any authenticated staff can send alerts
  const [searchParams] = useSearchParams();
  const urlFilter = searchParams.get('filter');

  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Set initial tab based on URL filter
    if (urlFilter === 'expired' || urlFilter === 'expiring') return 'expiry';
    if (urlFilter === 'low_stock') return 'stock';
    return 'expiry';
  });
  const [savedPhone, setSavedPhone] = useState<string>('');
  const [useWhatsApp, setUseWhatsApp] = useState(true);
  const [sendingAlertId, setSendingAlertId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sentAlertIds, setSentAlertIds] = useState<Set<string>>(new Set());

  // Calculate total value at risk
  const totalValueAtRisk = alerts
    .filter((a) => a.type === 'expiry')
    .reduce((sum, a) => sum + (a.valueAtRisk || 0), 0);

  // Alerts should route to the saved alert recipient number (fallback to pharmacy phone if none set)
  const ownerPhone = pharmacy?.alert_recipient_phone || pharmacy?.phone || savedPhone;
  const ownerName = pharmacy?.name || 'Owner';

  // Keep local state synced to backend settings
  useEffect(() => {
    setSavedPhone(pharmacy?.alert_recipient_phone || '');
    setUseWhatsApp((pharmacy?.alert_channel || 'whatsapp') === 'whatsapp');
  }, [pharmacy?.alert_recipient_phone, pharmacy?.alert_channel]);

  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(a => a.priority === filter);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 border-destructive/30 text-destructive';
      case 'medium': return 'bg-warning/10 border-warning/30 text-warning';
      case 'low': return 'bg-info/10 border-info/30 text-info';
      default: return 'bg-muted';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive">High Priority</Badge>;
      case 'medium': return <Badge className="bg-warning text-warning-foreground">Medium</Badge>;
      case 'low': return <Badge variant="secondary">Low</Badge>;
      default: return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'expiry': return <Calendar className="h-5 w-5" />;
      case 'low_stock': return <TrendingDown className="h-5 w-5" />;
      case 'out_of_stock': return <XCircle className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const handleSendWhatsApp = (alert: SystemAlert) => {
    const url = generateWhatsAppMessage(alert, ownerPhone);
    window.open(url, '_blank');
    
    // Mark as sent with visual feedback
    setSentAlertIds(prev => new Set([...prev, alert.id]));
    toast({
      title: '✓ WhatsApp Opened',
      description: 'Message ready to send.',
    });
    
    // Reset sent state after 3 seconds
    setTimeout(() => {
      setSentAlertIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(alert.id);
        return newSet;
      });
    }, 3000);
  };

  // Send bundled digest via WhatsApp (single message for all alerts)
  const handleSendDigestWhatsApp = () => {
    if (!ownerPhone) {
      toast({
        title: 'Phone not configured',
        description: 'Please set your phone number in Settings → Alerts',
        variant: 'destructive',
      });
      return;
    }
    const url = generateDigestWhatsAppUrl(alerts, ownerPhone);
    window.open(url, '_blank');
    toast({
      title: '✓ Daily Digest Ready',
      description: `${alerts.length} alerts bundled for ${ownerName}.`,
    });
  };

  const handleSendSMSAlert = async (alert: SystemAlert) => {
    if (!savedPhone) {
      toast({
        title: 'Phone not configured',
        description: 'Please set up your phone number in Settings → Alerts',
        variant: 'destructive',
      });
      return;
    }

    setSendingAlertId(alert.id);
    const channel = useWhatsApp ? 'whatsapp' : 'sms';

    try {
      if (alert.type === 'expiry') {
        await sendExpiryAlert(
          [{
            name: alert.productName,
            expiryDate: alert.expiryDate || 'Soon',
            value: alert.valueAtRisk,
            daysLeft: alert.daysUntilExpiry,
          }],
          savedPhone,
          channel
        );
      } else if (alert.type === 'low_stock' || alert.type === 'out_of_stock') {
        await sendLowStockAlert(
          [{
            name: alert.productName,
            stock: alert.currentStock || 0,
            reorderLevel: alert.suggestedReorderQty,
          }],
          savedPhone,
          channel
        );
      }
    } finally {
      setSendingAlertId(null);
    }
  };

  const handleSendAllAlerts = async () => {
    const phoneToUse = ownerPhone || savedPhone;
    if (!phoneToUse) {
      toast({
        title: 'Phone not configured',
        description: 'Please set your phone number in Settings → Alerts',
        variant: 'destructive',
      });
      return;
    }

    // For WhatsApp, open bundled digest message
    if (useWhatsApp) {
      handleSendDigestWhatsApp();
      return;
    }

    // For SMS via Termii, send bundled digest
    const channel = 'sms';
    const expiryAlerts = alerts.filter(a => a.type === 'expiry');
    const stockAlerts = alerts.filter(a => a.type === 'low_stock' || a.type === 'out_of_stock');

    try {
      // Send as single bundled digest
      if (expiryAlerts.length > 0 || stockAlerts.length > 0) {
        await sendExpiryAlert(
          [...expiryAlerts, ...stockAlerts].map(a => ({
            name: a.productName,
            expiryDate: a.type === 'expiry' ? (a.expiryDate || 'Soon') : undefined,
            value: a.valueAtRisk,
            daysLeft: a.daysUntilExpiry,
            stock: a.currentStock,
          })),
          phoneToUse,
          channel
        );
      }

      toast({
        title: 'Daily digest sent!',
        description: `Sent bundled alert with ${alerts.length} items via ${channel.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: 'Failed to send digest',
        description: 'Check your Termii configuration in settings',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await generateInventoryNotifications();
    setRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/70 backdrop-blur-2xl">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex h-14 sm:h-16 items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-lg font-bold font-display flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Bell className="h-4 w-4 text-white" />
                </div>
                Notifications Center
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">{unreadCount} new</Badge>
                )}
              </h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-1"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        {/* Quick Send All Button - Visible to all staff */}
        {alerts.length > 0 && ownerPhone && canSendAlerts && (
          <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Send Daily Digest to {ownerName}</p>
                  <p className="text-xs text-muted-foreground">{alerts.length} alerts bundled into one WhatsApp message</p>
                </div>
              </div>
              <Button 
                onClick={handleSendDigestWhatsApp} 
                disabled={isSending}
                className="gap-2 bg-green-500 hover:bg-green-600 text-white"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                Send All via WhatsApp
              </Button>
            </CardContent>
          </Card>
        )}

        {!ownerPhone && (
          <Card className="bg-warning/10 border-warning/30">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm font-medium">Set up your pharmacy phone</p>
                  <p className="text-xs text-muted-foreground">Add your phone in Settings to receive WhatsApp digests</p>
                </div>
              </div>
              <Link to="/settings">
                <Button size="sm" variant="outline" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Alert Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card className="bg-destructive/10 border-destructive/30">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-destructive">{alertCounts.high}</p>
              <p className="text-[10px] text-destructive/80 uppercase">Urgent</p>
            </CardContent>
          </Card>
          <Card className="bg-warning/10 border-warning/30">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-warning">{alertCounts.medium}</p>
              <p className="text-[10px] text-warning/80 uppercase">Medium</p>
            </CardContent>
          </Card>
          <Card className="bg-info/10 border-info/30">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-info">{alertCounts.expiry}</p>
              <p className="text-[10px] text-info/80 uppercase">Expiring</p>
            </CardContent>
          </Card>
          <Card className="bg-muted border-border">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{alertCounts.lowStock}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Low Stock</p>
            </CardContent>
          </Card>
          <Card className="bg-destructive/5 border-destructive/20 col-span-2 sm:col-span-1">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-destructive">
                <DollarSign className="h-4 w-4" />
                <p className="text-lg font-bold">{formatPrice(totalValueAtRisk)}</p>
              </div>
              <p className="text-[10px] text-destructive/80 uppercase">At Risk</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="expiry" className="gap-1 text-xs sm:text-sm">
              <Calendar className="h-4 w-4" />
              <span className="hidden xs:inline">Expiry</span>
            </TabsTrigger>
            <TabsTrigger value="stock" className="gap-1 text-xs sm:text-sm">
              <Package className="h-4 w-4" />
              <span className="hidden xs:inline">Stock</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 text-xs sm:text-sm">
              <History className="h-4 w-4" />
              <span className="hidden xs:inline">Sent</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              <span className="hidden xs:inline">Audit Log</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="expiry" className="mt-4">
            <div className="flex gap-2 mb-4 flex-wrap">
              {(['all', 'high', 'medium', 'low'] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f)}
                  className="capitalize text-xs"
                >
                  {f === 'all' ? 'All' : f}
                </Button>
              ))}
            </div>
            <ScrollArea className="h-[55vh]">
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {filteredAlerts.filter(a => a.type === 'expiry').length === 0 ? (
                    <Card className="p-8 text-center">
                      <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
                      <p className="text-lg font-medium">No Expiry Alerts</p>
                      <p className="text-sm text-muted-foreground">All stock is within safe expiry dates.</p>
                    </Card>
                  ) : (
                    filteredAlerts.filter(a => a.type === 'expiry').map((alert, index) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <Card className={`border ${getPriorityColor(alert.priority)}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg shrink-0 ${getPriorityColor(alert.priority)}`}>
                                {getTypeIcon(alert.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h3 className="font-semibold text-sm">{alert.productName}</h3>
                                  {getPriorityBadge(alert.priority)}
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">{alert.message}</p>
                                
                                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                  <div className="bg-muted/50 p-2 rounded">
                                    <span className="text-muted-foreground">Expiry:</span>
                                    <p className="font-medium">
                                      {alert.expiryDate ? format(new Date(alert.expiryDate), 'dd MMM yyyy') : 'N/A'}
                                    </p>
                                  </div>
                                  <div className="bg-muted/50 p-2 rounded">
                                    <span className="text-muted-foreground">Value at Risk:</span>
                                    <p className="font-medium text-destructive">
                                      {formatPrice(alert.valueAtRisk || 0)}
                                    </p>
                                  </div>
                                </div>

                                {alert.suggestedAction && (
                                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-2 mb-3">
                                    <p className="text-xs text-primary">
                                      💡 <strong>AI:</strong> {alert.suggestedAction}
                                    </p>
                                  </div>
                                )}

                                <div className="flex gap-2 flex-wrap">
                                  {canSendAlerts && (
                                    <Button
                                      size="sm"
                                      variant={sentAlertIds.has(alert.id) ? "default" : "outline"}
                                      className={`gap-1.5 text-xs transition-all ${sentAlertIds.has(alert.id) ? 'bg-green-500 hover:bg-green-500 text-white' : ''}`}
                                      onClick={() => handleSendWhatsApp(alert)}
                                    >
                                      {sentAlertIds.has(alert.id) ? (
                                        <>
                                          <Check className="h-3.5 w-3.5" />
                                          Sent!
                                        </>
                                      ) : (
                                        <>
                                          <MessageCircle className="h-3.5 w-3.5" />
                                          WhatsApp
                                        </>
                                      )}
                                    </Button>
                                  )}
                                  {canSendAlerts && savedPhone && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="gap-1.5 text-xs"
                                      onClick={() => handleSendSMSAlert(alert)}
                                      disabled={sendingAlertId === alert.id}
                                    >
                                      {sendingAlertId === alert.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Send className="h-3.5 w-3.5" />
                                      )}
                                      Send via Termii
                                    </Button>
                                  )}
                                  <Link to="/inventory">
                                    <Button size="sm" variant="ghost" className="gap-1.5 text-xs">
                                      <ExternalLink className="h-3.5 w-3.5" />
                                      View
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </div>
              </AnimatePresence>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="stock" className="mt-4">
            <div className="flex gap-2 mb-4 flex-wrap">
              {(['all', 'high', 'medium', 'low'] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f)}
                  className="capitalize text-xs"
                >
                  {f === 'all' ? 'All' : f}
                </Button>
              ))}
            </div>
            <ScrollArea className="h-[55vh]">
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {filteredAlerts.filter(a => a.type === 'low_stock' || a.type === 'out_of_stock').length === 0 ? (
                    <Card className="p-8 text-center">
                      <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
                      <p className="text-lg font-medium">Stock Levels Healthy</p>
                      <p className="text-sm text-muted-foreground">All items above reorder levels.</p>
                    </Card>
                  ) : (
                    filteredAlerts.filter(a => a.type === 'low_stock' || a.type === 'out_of_stock').map((alert, index) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <Card className={`border ${getPriorityColor(alert.priority)}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg shrink-0 ${getPriorityColor(alert.priority)}`}>
                                {getTypeIcon(alert.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h3 className="font-semibold text-sm">{alert.productName}</h3>
                                  {getPriorityBadge(alert.priority)}
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">{alert.message}</p>
                                
                                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                  <div className="bg-muted/50 p-2 rounded">
                                    <span className="text-muted-foreground">Current Stock:</span>
                                    <p className="font-medium">{alert.currentStock} units</p>
                                  </div>
                                  <div className="bg-muted/50 p-2 rounded">
                                    <span className="text-muted-foreground">Est. Empty In:</span>
                                    <p className="font-medium flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {alert.estimatedEmptyDays} days
                                    </p>
                                  </div>
                                </div>

                                {alert.suggestedReorderQty && (
                                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-2 mb-3">
                                    <p className="text-xs text-primary">
                                      🛒 <strong>Suggested:</strong> Reorder {alert.suggestedReorderQty} units
                                    </p>
                                  </div>
                                )}

                                <div className="flex gap-2 flex-wrap">
                                  {canSendAlerts && (
                                    <Button
                                      size="sm"
                                      variant={sentAlertIds.has(alert.id) ? "default" : "outline"}
                                      className={`gap-1.5 text-xs transition-all ${sentAlertIds.has(alert.id) ? 'bg-green-500 hover:bg-green-500 text-white' : ''}`}
                                      onClick={() => handleSendWhatsApp(alert)}
                                    >
                                      {sentAlertIds.has(alert.id) ? (
                                        <>
                                          <Check className="h-3.5 w-3.5" />
                                          Sent!
                                        </>
                                      ) : (
                                        <>
                                          <MessageCircle className="h-3.5 w-3.5" />
                                          WhatsApp
                                        </>
                                      )}
                                    </Button>
                                  )}
                                  <Link to="/suppliers">
                                    <Button size="sm" variant="ghost" className="gap-1.5 text-xs">
                                      <ExternalLink className="h-3.5 w-3.5" />
                                      Create Order
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </div>
              </AnimatePresence>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Automated alerts sent via Termii
              </p>
              {sentAlerts.length > 0 && (
                <Badge variant="outline">{sentAlerts.length} sent</Badge>
              )}
            </div>
            <ScrollArea className="h-[55vh]">
              <div className="space-y-3">
                {sentAlerts.length === 0 ? (
                  <Card className="p-8 text-center">
                    <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-lg font-medium">No Sent Alerts Yet</p>
                    <p className="text-sm text-muted-foreground">
                      Automated daily digests will appear here once the 8 AM cron job runs.
                    </p>
                  </Card>
                ) : (
                  sentAlerts.map((alert, index) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card className="border">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg shrink-0 ${
                              alert.channel === 'whatsapp' ? 'bg-green-500/20' : 'bg-blue-500/20'
                            }`}>
                              {alert.channel === 'whatsapp' ? (
                                <MessageCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <Phone className="h-5 w-5 text-blue-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="font-semibold text-sm capitalize">{alert.alert_type.replace('_', ' ')}</h3>
                                <Badge variant={alert.status === 'sent' ? 'default' : alert.status === 'delivered' ? 'secondary' : 'destructive'} className="text-[10px]">
                                  {alert.status}
                                </Badge>
                                <Badge variant="outline" className="text-[10px]">
                                  {alert.channel.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{alert.message.substring(0, 150)}...</p>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                <span>To: {alert.recipient_phone}</span>
                                <span>•</span>
                                <span>{formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="mt-4">
            <NotificationAuditLog />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Notifications;
