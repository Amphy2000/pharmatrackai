import { useState } from 'react';
import { useOfflineSync, PendingSale } from '@/hooks/useOfflineSync';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  WifiOff, 
  RefreshCw, 
  Trash2, 
  Clock, 
  Package,
  AlertCircle,
  CheckCircle,
  CloudUpload,
  X
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface PendingSalesQueueProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PendingSalesQueue = ({ isOpen, onClose }: PendingSalesQueueProps) => {
  const { 
    isOnline, 
    isSyncing, 
    getPendingSales, 
    removePendingSale, 
    clearAllPendingSales,
    syncPendingSales 
  } = useOfflineSync();
  const { formatPrice } = useCurrency();
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);

  const pendingSales = getPendingSales();

  if (!isOpen) return null;

  const getStatusBadge = (sale: PendingSale) => {
    switch (sale.syncStatus) {
      case 'syncing':
        return (
          <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-0">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Syncing
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1 bg-warning/10 text-warning border-0">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[80vh] flex flex-col bg-background">
        <CardHeader className="flex-shrink-0 border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <WifiOff className="h-5 w-5 text-warning" />
              </div>
              <div>
                <CardTitle className="text-lg">Pending Sales Queue</CardTitle>
                <CardDescription>
                  {pendingSales.length} transaction{pendingSales.length !== 1 ? 's' : ''} awaiting sync
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          {pendingSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <CheckCircle className="h-12 w-12 text-success mb-4" />
              <p className="font-medium mb-1">All synced!</p>
              <p className="text-sm text-muted-foreground">
                No pending sales to sync
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="p-4 space-y-3">
                {pendingSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(sale)}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(sale.timestamp, { addSuffix: true })}
                          </span>
                        </div>
                        <p className="font-medium text-sm">
                          {sale.customerName || 'Walk-in Customer'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sale.items.length} item{sale.items.length !== 1 ? 's' : ''} • {sale.paymentMethod || 'Cash'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">
                          {formatPrice(sale.total)}
                        </p>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                              onClick={() => setSaleToDelete(sale.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete pending sale?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this sale from the queue. 
                                The sale won't be synced to the database.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  removePendingSale(sale.id);
                                  setSaleToDelete(null);
                                }}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {/* Items list */}
                    <div className="space-y-1.5 pt-2 border-t">
                      {sale.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate max-w-[200px]">{item.medicationName}</span>
                            <span className="text-muted-foreground">×{item.quantity}</span>
                          </div>
                          <span className="font-medium">{formatPrice(item.totalPrice)}</span>
                        </div>
                      ))}
                    </div>

                    {sale.syncError && (
                      <div className="mt-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
                        Error: {sale.syncError}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>

        {pendingSales.length > 0 && (
          <div className="flex-shrink-0 p-4 border-t space-y-2">
            <Button
              className="w-full gap-2"
              onClick={syncPendingSales}
              disabled={!isOnline || isSyncing}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <CloudUpload className="h-4 w-4" />
                  {isOnline ? 'Sync All Now' : 'Waiting for connection...'}
                </>
              )}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2 text-destructive">
                  <Trash2 className="h-4 w-4" />
                  Clear All Pending
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all pending sales?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {pendingSales.length} pending sale{pendingSales.length !== 1 ? 's' : ''}. 
                    These sales won't be synced to the database.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={clearAllPendingSales}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </Card>
    </div>
  );
};
