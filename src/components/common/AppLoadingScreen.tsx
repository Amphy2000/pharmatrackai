import { useEffect, useState } from 'react';
import { Loader2, Pill, Wifi, WifiOff } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface AppLoadingScreenProps {
  children: React.ReactNode;
}

export const AppLoadingScreen = ({ children }: AppLoadingScreenProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showSlowMessage, setShowSlowMessage] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Update online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Progressive loading simulation with real checkpoints
    const stages = [
      { target: 15, delay: 50 },   // Initial DOM
      { target: 30, delay: 100 },  // CSS loaded
      { target: 50, delay: 150 },  // JS chunks
      { target: 70, delay: 200 },  // Components ready
      { target: 85, delay: 300 },  // Initial data
      { target: 100, delay: 400 }, // Ready
    ];

    let currentStage = 0;
    const progressInterval = setInterval(() => {
      if (currentStage < stages.length) {
        setProgress(stages[currentStage].target);
        currentStage++;
      }
    }, stages[currentStage]?.delay || 100);

    // Show slow network message after 3 seconds
    const slowTimeout = setTimeout(() => {
      if (isLoading) {
        setShowSlowMessage(true);
      }
    }, 3000);

    // Complete loading
    const completeTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 1200);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(slowTimeout);
      clearTimeout(completeTimeout);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isLoading]);

  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center z-50">
      <div className="w-full max-w-xs px-6 space-y-6 text-center">
        {/* Logo/Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg animate-pulse">
            <Pill className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">PharmaTrack</h1>
        </div>

        {/* Loading indicator */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>

          <Progress value={progress} className="h-1.5" />

          <p className="text-xs text-muted-foreground">
            {progress < 30 && "Initializing..."}
            {progress >= 30 && progress < 60 && "Loading components..."}
            {progress >= 60 && progress < 90 && "Almost ready..."}
            {progress >= 90 && "Starting app..."}
          </p>
        </div>

        {/* Network status */}
        <div className="flex items-center justify-center gap-2 text-xs">
          {isOnline ? (
            <div className="flex items-center gap-1.5 text-success">
              <Wifi className="h-3 w-3" />
              <span>Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-warning">
              <WifiOff className="h-3 w-3" />
              <span>Offline - Limited features</span>
            </div>
          )}
        </div>

        {/* Slow network message */}
        {showSlowMessage && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs text-muted-foreground">
                {isOnline
                  ? "Network seems slow. The app will work offline once loaded."
                  : "You're offline. Some features may be limited."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};