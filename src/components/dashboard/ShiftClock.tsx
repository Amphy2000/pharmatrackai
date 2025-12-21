import { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useShifts } from '@/hooks/useShifts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format, formatDistanceToNow } from 'date-fns';

export const ShiftClock = () => {
  const { activeShift, clockIn, clockOut, isLoadingActiveShift } = useShifts();
  const { formatPrice } = useCurrency();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClockIn = () => {
    clockIn.mutate(undefined);
  };

  const handleClockOut = () => {
    if (activeShift) {
      clockOut.mutate(activeShift.id);
    }
  };

  const getShiftDuration = () => {
    if (!activeShift) return null;
    return formatDistanceToNow(new Date(activeShift.clock_in));
  };

  if (isLoadingActiveShift) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-4">
          <div className="animate-pulse flex items-center gap-3">
            <div className="h-10 w-10 bg-muted rounded-full" />
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`backdrop-blur-sm border-border/50 ${activeShift ? 'bg-primary/5 border-primary/30' : 'bg-card/50'}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Shift Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-mono font-bold">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <Badge variant={activeShift ? 'default' : 'secondary'}>
            {activeShift ? 'On Shift' : 'Off Shift'}
          </Badge>
        </div>

        {activeShift ? (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-background/50 rounded-lg p-3">
                <div className="text-muted-foreground text-xs">Started</div>
                <div className="font-medium">
                  {format(new Date(activeShift.clock_in), 'h:mm a')}
                </div>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <div className="text-muted-foreground text-xs flex items-center gap-1">
                  <Timer className="h-3 w-3" /> Duration
                </div>
                <div className="font-medium">{getShiftDuration()}</div>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <div className="text-muted-foreground text-xs">Sales</div>
                <div className="font-medium text-green-600">
                  {formatPrice(activeShift.total_sales || 0)}
                </div>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <div className="text-muted-foreground text-xs">Transactions</div>
                <div className="font-medium">{activeShift.total_transactions || 0}</div>
              </div>
            </div>
            <Button 
              onClick={handleClockOut} 
              variant="destructive" 
              className="w-full"
              disabled={clockOut.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {clockOut.isPending ? 'Clocking Out...' : 'Clock Out'}
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center py-2">
              Clock in to start tracking your shift sales
            </p>
            <Button 
              onClick={handleClockIn} 
              className="w-full"
              disabled={clockIn.isPending}
            >
              <LogIn className="h-4 w-4 mr-2" />
              {clockIn.isPending ? 'Clocking In...' : 'Clock In'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
