/**
 * AppShell
 *
 * Invisible wrapper mounted inside every authenticated route.
 * Activates the background push notification scheduler so that
 * OS-level alerts fire for critical inventory events (expired
 * medications, low stock, daily briefing) even when the user
 * has minimised the browser tab.
 *
 * Also automatically prompts the user to enable Push Notifications
 * if permission has not yet been granted.
 */
import { useBackgroundPushScheduler } from '@/hooks/useBackgroundPushScheduler';
import { AutoPushPromptBanner } from '@/components/common/AutoPushPromptBanner';

const AppShell = ({ children }: { children: React.ReactNode }) => {
  // Activate the background push scheduler globally for all authenticated users
  useBackgroundPushScheduler();

  return (
    <>
      <AutoPushPromptBanner />
      {children}
    </>
  );
};

export default AppShell;
