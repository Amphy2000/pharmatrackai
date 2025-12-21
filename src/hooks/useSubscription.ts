import { useMemo } from 'react';
import { usePharmacy } from './usePharmacy';
import { isAfter, parseISO, differenceInDays } from 'date-fns';

export type SubscriptionState = 'active' | 'trial' | 'expired' | 'cancelled';

export interface SubscriptionInfo {
  state: SubscriptionState;
  isActive: boolean;
  isTrial: boolean;
  isExpired: boolean;
  daysRemaining: number | null;
  plan: string;
  canAccessFeatures: boolean;
}

export const useSubscription = (): SubscriptionInfo & { isLoading: boolean } => {
  const { pharmacy, isLoading } = usePharmacy();

  const subscriptionInfo = useMemo((): SubscriptionInfo => {
    if (!pharmacy) {
      return {
        state: 'expired',
        isActive: false,
        isTrial: false,
        isExpired: true,
        daysRemaining: null,
        plan: 'starter',
        canAccessFeatures: false,
      };
    }

    const now = new Date();
    const status = pharmacy.subscription_status;
    const plan = pharmacy.subscription_plan;
    
    // Check trial status
    if (status === 'trial') {
      const trialEndsAt = pharmacy.trial_ends_at ? parseISO(pharmacy.trial_ends_at) : null;
      
      if (trialEndsAt && isAfter(now, trialEndsAt)) {
        // Trial has expired
        return {
          state: 'expired',
          isActive: false,
          isTrial: false,
          isExpired: true,
          daysRemaining: 0,
          plan,
          canAccessFeatures: false,
        };
      }
      
      // Trial is still active
      const daysRemaining = trialEndsAt ? Math.max(0, differenceInDays(trialEndsAt, now)) : 7;
      return {
        state: 'trial',
        isActive: true,
        isTrial: true,
        isExpired: false,
        daysRemaining,
        plan,
        canAccessFeatures: true,
      };
    }
    
    // Check active subscription
    if (status === 'active') {
      const subscriptionEndsAt = pharmacy.subscription_ends_at 
        ? parseISO(pharmacy.subscription_ends_at) 
        : null;
      
      if (subscriptionEndsAt && isAfter(now, subscriptionEndsAt)) {
        // Subscription has expired
        return {
          state: 'expired',
          isActive: false,
          isTrial: false,
          isExpired: true,
          daysRemaining: 0,
          plan,
          canAccessFeatures: false,
        };
      }
      
      const daysRemaining = subscriptionEndsAt 
        ? Math.max(0, differenceInDays(subscriptionEndsAt, now)) 
        : null;
        
      return {
        state: 'active',
        isActive: true,
        isTrial: false,
        isExpired: false,
        daysRemaining,
        plan,
        canAccessFeatures: true,
      };
    }
    
    // Expired or cancelled status
    return {
      state: status === 'cancelled' ? 'cancelled' : 'expired',
      isActive: false,
      isTrial: false,
      isExpired: true,
      daysRemaining: 0,
      plan,
      canAccessFeatures: false,
    };
  }, [pharmacy]);

  return {
    ...subscriptionInfo,
    isLoading,
  };
};
