/**
 * AppShell
 *
 * Invisible wrapper mounted inside every authenticated route.
 * Activates the background push notification scheduler so that
 * OS-level alerts fire for critical inventory events (expired
 * medications, low stock, daily briefing) even when the user
 * has minimised the browser tab.
 */
import { useBackgroundPushScheduler } from '@/hooks/useBackgroundPushScheduler';

const AppShell = ({ children }: { children: React.ReactNode }) => {
  // Activate the background push scheduler globally for all authenticated users
  useBackgroundPushScheduler();

  return <>{children}</>;
};

export default AppShell;
