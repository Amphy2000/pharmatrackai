import { Pill, Activity } from 'lucide-react';

export const Header = () => {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-lg">
              <Pill className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
                PharmaTrack
                <span className="bg-gradient-primary bg-clip-text text-transparent">AI</span>
              </h1>
              <p className="text-xs text-muted-foreground">Inventory & Expiry Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4 text-success animate-pulse" />
            <span>System Active</span>
          </div>
        </div>
      </div>
    </header>
  );
};
