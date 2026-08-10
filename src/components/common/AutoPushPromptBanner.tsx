import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, Smartphone, X, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const AutoPushPromptBanner = () => {
  const { permission, isSupported, requestPermissionAndSubscribe, isLoading } = usePushNotifications();
  const [showPrompt, setShowPrompt] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    // Only prompt if browser supports push & user hasn't made a decision yet (permission === 'default')
    if (!isSupported || permission !== 'default' || isLoading) {
      setShowPrompt(false);
      return;
    }

    // Check if user dismissed recently (wait 2 days before re-prompting)
    const dismissedAt = localStorage.getItem('push_prompt_dismissed_at');
    if (dismissedAt) {
      const daysSinceDismiss = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < 2) {
        setShowPrompt(false);
        return;
      }
    }

    // Gentle 1.5s delay after page load before showing banner
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [permission, isSupported, isLoading]);

  const handleEnable = async () => {
    setRequesting(true);
    const success = await requestPermissionAndSubscribe();
    setRequesting(false);
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('push_prompt_dismissed_at', String(Date.now()));
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-lg"
      >
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-background/95 p-4 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
          
          <div className="flex items-start gap-3.5">
            <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-primary flex items-center justify-center text-white shadow-md shadow-primary/25">
              <BellRing className="h-5 w-5 animate-pulse" />
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm text-foreground">Turn On Vital Push Alerts</p>
                <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <Zap className="h-2.5 w-2.5" /> Auto-Briefing
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Never miss expired stock, stockout risks, or morning briefs — <strong>even when PharmaTrack is closed</strong>.
              </p>

              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleEnable}
                  disabled={requesting}
                  className="h-8 text-xs px-3.5 gap-1.5 bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold shadow-sm"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  {requesting ? 'Allowing...' : 'Allow Notifications'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground"
                >
                  Maybe Later
                </Button>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
