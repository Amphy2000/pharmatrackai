import { useMemo } from 'react';
import { usePharmacy } from './usePharmacy';

export interface PlanLimits {
  maxUsers: number;
  maxBranches: number;
  canAddBranches: boolean;
  planName: string;
}

const PLAN_LIMITS = {
  starter: { maxUsers: 1, maxBranches: 1 },
  pro: { maxUsers: 5, maxBranches: 10 },
  enterprise: { maxUsers: 999, maxBranches: 999 },
};

export const usePlanLimits = () => {
  const { pharmacy, isLoading } = usePharmacy();

  const limits = useMemo((): PlanLimits => {
    const plan = pharmacy?.subscription_plan || 'starter';
    const planConfig = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.starter;

    return {
      maxUsers: planConfig.maxUsers,
      maxBranches: planConfig.maxBranches,
      canAddBranches: plan !== 'starter',
      planName: plan.charAt(0).toUpperCase() + plan.slice(1),
    };
  }, [pharmacy]);

  return {
    ...limits,
    isLoading,
    plan: pharmacy?.subscription_plan || 'starter',
  };
};
