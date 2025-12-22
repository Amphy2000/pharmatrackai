import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const OfflineIndicator = () => {
  const { isOnline, pendingSalesCount, isSyncing, lastSyncTime, syncPendingSales } = useOfflineSync();

  const handleSync = () => {
    if (isOnline && pendingSalesCount > 0) {
      syncPendingSales();
    }
  };

  if (isOnline && pendingSalesCount === 0 && !isSyncing) {
    // All good - show subtle online status
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span className="text-xs font-medium text-success">Online</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Connected and synced</p>
          {lastSyncTime && (
            <p className="text-xs text-muted-foreground">
              Last sync: {lastSyncTime.toLocaleTimeString()}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (!isOnline) {
    // Offline mode
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/20">
            <WifiOff className="h-3.5 w-3.5 text-warning" />
            <span className="text-xs font-medium text-warning">Offline</span>
            {pendingSalesCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-warning/20 text-warning border-0">
                {pendingSalesCount}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Working offline</p>
          {pendingSalesCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {pendingSalesCount} sale{pendingSalesCount > 1 ? 's' : ''} pending sync
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (isSyncing) {
    // Currently syncing
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <RefreshCw className="h-3.5 w-3.5 text-primary animate-spin" />
            <span className="text-xs font-medium text-primary">Syncing...</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Syncing pending transactions</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Online but has pending sales
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleSync}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors",
            "bg-warning/10 border-warning/20 hover:bg-warning/20"
          )}
        >
          <Cloud className="h-3.5 w-3.5 text-warning" />
          <span className="text-xs font-medium text-warning">Pending</span>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-warning/20 text-warning border-0">
            {pendingSalesCount}
          </Badge>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{pendingSalesCount} sale{pendingSalesCount > 1 ? 's' : ''} pending sync</p>
        <p className="text-xs text-muted-foreground">Click to sync now</p>
      </TooltipContent>
    </Tooltip>
  );
};
