import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Bell, 
  AlertTriangle, 
  Package, 
  Calendar,
  MessageCircle,
  Filter,
  CheckCircle,
  XCircle,
  ExternalLink,
  TrendingDown,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAlertEngine, SystemAlert } from '@/hooks/useAlertEngine';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/hooks/use-toast';

const Notifications = () => {
  const { alerts, alertCounts, generateWhatsAppMessage } = useAlertEngine();
  const { pharmacy } = usePharmacy();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

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
    const url = generateWhatsAppMessage(alert, pharmacy?.phone || '');
    window.open(url, '_blank');
    toast({
      title: 'WhatsApp Opened',
      description: 'Message prepared and ready to send.',
    });
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
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        {/* Alert Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-destructive/10 border-destructive/30">
            <CardContent className="p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-destructive">{alertCounts.high}</p>
              <p className="text-xs text-destructive/80">High Priority</p>
            </CardContent>
          </Card>
          <Card className="bg-warning/10 border-warning/30">
            <CardContent className="p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-warning">{alertCounts.medium}</p>
              <p className="text-xs text-warning/80">Medium</p>
            </CardContent>
          </Card>
          <Card className="bg-info/10 border-info/30">
            <CardContent className="p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-info">{alertCounts.expiry}</p>
              <p className="text-xs text-info/80">Expiring</p>
            </CardContent>
          </Card>
          <Card className="bg-muted border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold">{alertCounts.lowStock}</p>
              <p className="text-xs text-muted-foreground">Low Stock</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for filtering */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expiry" className="gap-2">
              <Calendar className="h-4 w-4" />
              Expiry Alerts
            </TabsTrigger>
            <TabsTrigger value="stock" className="gap-2">
              <Package className="h-4 w-4" />
              Stock Alerts
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
                  className="capitalize"
                >
                  {f === 'all' ? 'All' : `${f} Priority`}
                </Button>
              ))}
            </div>
            <ScrollArea className="h-[60vh]">
              <AnimatePresence>
                <div className="space-y-3">
                  {filteredAlerts.filter(a => a.type === 'expiry').length === 0 ? (
                    <Card className="p-8 text-center">
                      <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
                      <p className="text-lg font-medium">No Expiry Alerts</p>
                      <p className="text-sm text-muted-foreground">All your stock is within safe expiry dates.</p>
                    </Card>
                  ) : (
                    filteredAlerts.filter(a => a.type === 'expiry').map((alert, index) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className={`border ${getPriorityColor(alert.priority)}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className={`p-2 rounded-lg ${getPriorityColor(alert.priority)}`}>
                                {getTypeIcon(alert.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h3 className="font-semibold">{alert.title}</h3>
                                  {getPriorityBadge(alert.priority)}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                                
                                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                  <div className="bg-muted/50 p-2 rounded">
                                    <span className="text-muted-foreground">Expiry:</span>
                                    <p className="font-medium">
                                      {alert.expiryDate ? new Date(alert.expiryDate).toLocaleDateString() : 'N/A'}
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
                                      💡 <strong>AI Suggestion:</strong> {alert.suggestedAction}
                                    </p>
                                  </div>
                                )}

                                <div className="flex gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-2"
                                    onClick={() => handleSendWhatsApp(alert)}
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                    Send to WhatsApp
                                  </Button>
                                  <Link to="/inventory">
                                    <Button size="sm" variant="ghost" className="gap-2">
                                      <ExternalLink className="h-4 w-4" />
                                      View in Inventory
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
                  className="capitalize"
                >
                  {f === 'all' ? 'All' : `${f} Priority`}
                </Button>
              ))}
            </div>
            <ScrollArea className="h-[60vh]">
              <AnimatePresence>
                <div className="space-y-3">
                  {filteredAlerts.filter(a => a.type === 'low_stock' || a.type === 'out_of_stock').length === 0 ? (
                    <Card className="p-8 text-center">
                      <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
                      <p className="text-lg font-medium">Stock Levels Healthy</p>
                      <p className="text-sm text-muted-foreground">All items are above reorder levels.</p>
                    </Card>
                  ) : (
                    filteredAlerts.filter(a => a.type === 'low_stock' || a.type === 'out_of_stock').map((alert, index) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className={`border ${getPriorityColor(alert.priority)}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className={`p-2 rounded-lg ${getPriorityColor(alert.priority)}`}>
                                {getTypeIcon(alert.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h3 className="font-semibold">{alert.title}</h3>
                                  {getPriorityBadge(alert.priority)}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                                
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
                                      🛒 <strong>Suggested Reorder:</strong> {alert.suggestedReorderQty} units
                                    </p>
                                  </div>
                                )}

                                <div className="flex gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-2"
                                    onClick={() => handleSendWhatsApp(alert)}
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                    Send to WhatsApp
                                  </Button>
                                  <Link to="/suppliers">
                                    <Button size="sm" variant="ghost" className="gap-2">
                                      <ExternalLink className="h-4 w-4" />
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
        </Tabs>
      </main>
    </div>
  );
};

export default Notifications;
