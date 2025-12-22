import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Smartphone, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        setDismissed(true);
        return;
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a delay
      setTimeout(() => setShowPrompt(true), 3000);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Error installing PWA:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-prompt-dismissed', new Date().toISOString());
  };

  // Detect if mobile or desktop
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isInstalled || dismissed || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
      >
        <Card className="glass-card border-primary/30 shadow-glow-primary overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                {isMobile ? (
                  <Smartphone className="h-6 w-6 text-primary-foreground" />
                ) : (
                  <Monitor className="h-6 w-6 text-primary-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-sm mb-1">
                  Install PharmaTrack
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {isMobile 
                    ? 'Add to your home screen for quick access and offline support.'
                    : 'Install on your desktop for faster access and a native app experience.'
                  }
                </p>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    className="bg-gradient-primary hover:opacity-90 gap-2"
                    onClick={handleInstall}
                  >
                    <Download className="h-4 w-4" />
                    Install Now
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleDismiss}
                  >
                    Later
                  </Button>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 flex-shrink-0 -mt-1 -mr-1"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
