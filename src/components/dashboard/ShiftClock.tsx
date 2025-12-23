import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, LogIn, LogOut, Timer, DollarSign, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useShifts } from '@/hooks/useShifts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format, formatDistanceToNow } from 'date-fns';

export const ShiftClock = () => {
  const navigate = useNavigate();
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
      <div className="glass-card rounded-2xl border border-border/50 p-5 h-full flex flex-col">
        <div className="animate-pulse flex items-center gap-3">
          <div className="h-10 w-10 bg-muted rounded-xl" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-5 h-full flex flex-col ${
      activeShift 
        ? 'glass-card border-primary/30 bg-primary/5' 
        : 'glass-card border-border/50'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-lg ${
            activeShift 
              ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
              : 'bg-gradient-to-br from-slate-500 to-slate-600'
          }`}>
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Shift Status</h3>
            <p className="text-xs text-muted-foreground">
              {activeShift ? 'Currently working' : 'Not clocked in'}
            </p>
          </div>
        </div>
        <Badge variant={activeShift ? 'default' : 'secondary'} className={
          activeShift ? 'bg-success text-success-foreground' : ''
        }>
          {activeShift ? 'On Shift' : 'Off Shift'}
        </Badge>
      </div>

      <div className="text-center mb-4">
        <div className="text-3xl font-mono font-bold tracking-tight">
          {format(currentTime, 'HH:mm:ss')}
        </div>
      </div>

      {activeShift ? (
        <div className="flex-1 flex flex-col">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-background/50 rounded-xl p-3 text-center border border-border/30">
              <Timer className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm font-semibold">{getShiftDuration()}</div>
              <div className="text-[10px] text-muted-foreground">Duration</div>
            </div>
            <div className="bg-background/50 rounded-xl p-3 text-center border border-border/30">
              <DollarSign className="h-4 w-4 mx-auto mb-1 text-success" />
              <div className="text-sm font-semibold text-success">
                {formatPrice(activeShift.total_sales || 0)}
              </div>
              <div className="text-[10px] text-muted-foreground">Sales</div>
            </div>
          </div>
          <div className="flex gap-2 mt-auto">
            <Button 
              onClick={handleClockOut} 
              variant="destructive" 
              className="flex-1"
              disabled={clockOut.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {clockOut.isPending ? 'Clocking Out...' : 'Clock Out'}
            </Button>
            <Button 
              onClick={() => navigate('/shift-history')} 
              variant="outline"
              size="icon"
              title="View Shift History"
            >
              <History className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-end">
          <p className="text-sm text-muted-foreground text-center mb-4">
            Clock in to start tracking your shift sales
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={handleClockIn} 
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white"
              disabled={clockIn.isPending}
            >
              <LogIn className="h-4 w-4 mr-2" />
              {clockIn.isPending ? 'Clocking In...' : 'Clock In'}
            </Button>
            <Button 
              onClick={() => navigate('/shift-history')} 
              variant="outline"
              size="icon"
              title="View Shift History"
            >
              <History className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
