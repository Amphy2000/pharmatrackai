import { useMemo } from 'react';
import { usePharmacy } from './usePharmacy';

export interface PlanLimits {
  maxUsers: number;
  maxBranches: number;
  canAddBranches: boolean;
  planName: string;
  features: string[];
  hasAIFeatures: boolean;
  hasMultiBranch: boolean;
  hasUnlimitedUsers: boolean;
  hasNAFDACReports: boolean;
  hasControlledDrugsRegister: boolean;
  hasDemandForecasting: boolean;
  hasExpiryDiscounting: boolean;
  hasStaffClockIn: boolean;
  hasPrioritySupport: boolean;
}

// Feature sets aligned with Landing page and SubscriptionManagement (3-tier model)
const PLAN_FEATURES = {
  lite: {
    maxUsers: 2,
    maxBranches: 1,
    features: [
      'Basic POS System',
      'Cloud Backups',
      '2 User Accounts',
      'Unlimited SKUs',
      'Expiry Tracking',
      'Basic Reports',
      'Email Support'
    ],
    hasAIFeatures: false,
    hasMultiBranch: false,
    hasUnlimitedUsers: false,
    hasNAFDACReports: false,
    hasControlledDrugsRegister: false,
    hasDemandForecasting: false,
    hasExpiryDiscounting: false,
    hasStaffClockIn: false,
    hasPrioritySupport: false,
  },
  // Keep starter as fallback for existing subscribers, maps to lite features
  starter: {
    maxUsers: 2,
    maxBranches: 1,
    features: [
      'Basic POS System',
      'Cloud Backups',
      '2 User Accounts',
      'Unlimited SKUs',
      'Expiry Tracking',
      'Basic Reports',
      'Email Support'
    ],
    hasAIFeatures: false,
    hasMultiBranch: false,
    hasUnlimitedUsers: false,
    hasNAFDACReports: false,
    hasControlledDrugsRegister: false,
    hasDemandForecasting: false,
    hasExpiryDiscounting: false,
    hasStaffClockIn: false,
    hasPrioritySupport: false,
  },
  pro: {
    maxUsers: 999,
    maxBranches: 10,
    features: [
      'Everything in Lite',
      'AI Invoice Scanner',
      'Automated Expiry Discounting',
      'Demand Forecasting AI',
      'Unlimited Users',
      'Multi-Branch Ready',
      'Staff Clock-in Tracking',
      'NAFDAC Compliance Reports',
      'Controlled Drugs Register',
      'Priority WhatsApp Support'
    ],
    hasAIFeatures: true,
    hasMultiBranch: true,
    hasUnlimitedUsers: true,
    hasNAFDACReports: true,
    hasControlledDrugsRegister: true,
    hasDemandForecasting: true,
    hasExpiryDiscounting: true,
    hasStaffClockIn: true,
    hasPrioritySupport: true,
  },
  enterprise: {
    maxUsers: 999,
    maxBranches: 999,
    features: [
      'Everything in Pro',
      'White-label Options',
      'Custom API Access',
      'Dedicated Account Manager',
      '24/7 Priority Support',
      'Custom Integrations',
      'SLA Guarantee',
      'On-site Training'
    ],
    hasAIFeatures: true,
    hasMultiBranch: true,
    hasUnlimitedUsers: true,
    hasNAFDACReports: true,
    hasControlledDrugsRegister: true,
    hasDemandForecasting: true,
    hasExpiryDiscounting: true,
    hasStaffClockIn: true,
    hasPrioritySupport: true,
  },
};

export const usePlanLimits = () => {
  const { pharmacy, isLoading } = usePharmacy();

  const limits = useMemo((): PlanLimits => {
    const plan = pharmacy?.subscription_plan || 'lite';
    const planConfig = PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES] || PLAN_FEATURES.lite;

    // Map plan IDs to display names
    const getPlanName = (planId: string) => {
      switch (planId) {
        case 'lite':
        case 'starter': // Legacy fallback
          return 'Lite';
        case 'pro':
          return 'AI Powerhouse';
        case 'enterprise':
          return 'Enterprise';
        default:
          return 'Lite';
      }
    };

    return {
      maxUsers: planConfig.maxUsers,
      maxBranches: planConfig.maxBranches,
      canAddBranches: plan === 'pro' || plan === 'enterprise',
      planName: getPlanName(plan),
      features: planConfig.features,
      hasAIFeatures: planConfig.hasAIFeatures,
      hasMultiBranch: planConfig.hasMultiBranch,
      hasUnlimitedUsers: planConfig.hasUnlimitedUsers,
      hasNAFDACReports: planConfig.hasNAFDACReports,
      hasControlledDrugsRegister: planConfig.hasControlledDrugsRegister,
      hasDemandForecasting: planConfig.hasDemandForecasting,
      hasExpiryDiscounting: planConfig.hasExpiryDiscounting,
      hasStaffClockIn: planConfig.hasStaffClockIn,
      hasPrioritySupport: planConfig.hasPrioritySupport,
    };
  }, [pharmacy]);

  return {
    ...limits,
    isLoading,
    plan: pharmacy?.subscription_plan || 'lite',
  };
};
