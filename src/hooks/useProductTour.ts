import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const TOUR_COMPLETED_KEY = 'pharmatrack_tour_completed';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  position: 'center' | 'top' | 'bottom' | 'left' | 'right';
  action?: string;
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to PharmaTrack! 🎉',
    description: 'Let us show you around your new pharmacy management system. This tour will help you get started quickly.',
    position: 'center',
  },
  {
    id: 'dashboard',
    title: 'Your Dashboard',
    description: 'This is your command center. See real-time inventory metrics, sales data, and AI-powered insights at a glance.',
    position: 'center',
  },
  {
    id: 'pos',
    title: 'Point of Sale (POS)',
    description: 'Click "Open POS" to start selling. Scan barcodes, search products, and process transactions in seconds.',
    position: 'center',
    action: 'Open POS →',
  },
  {
    id: 'inventory',
    title: 'Inventory Management',
    description: 'Add medications, track stock levels, and get alerts for low stock or expiring items. Use the AI-powered invoice scanner to add items faster!',
    position: 'center',
  },
  {
    id: 'quick-actions',
    title: 'Quick Actions',
    description: 'These shortcuts give you instant access to your most-used features. Customize your workflow for maximum efficiency.',
    position: 'center',
  },
  {
    id: 'staff',
    title: 'Staff Management',
    description: 'Add team members, assign roles, and control permissions. Track shifts and performance from the Settings page.',
    position: 'center',
  },
  {
    id: 'complete',
    title: 'You\'re All Set! ✅',
    description: 'You can restart this tour anytime from your Profile Settings. Need help? Check the User Guide or contact support.',
    position: 'center',
  },
];

export const useProductTour = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedTour, setHasCompletedTour] = useState(true); // Default to true to prevent flash

  // Check if user has completed the tour
  useEffect(() => {
    if (!user?.id) return;
    
    const tourKey = `${TOUR_COMPLETED_KEY}_${user.id}`;
    const completed = localStorage.getItem(tourKey);
    
    if (completed === 'true') {
      setHasCompletedTour(true);
    } else {
      setHasCompletedTour(false);
      // Auto-start tour for first-time users after a short delay
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user?.id]);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsOpen(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      completeTour();
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const skipTour = useCallback(() => {
    completeTour();
  }, []);

  const completeTour = useCallback(() => {
    if (user?.id) {
      const tourKey = `${TOUR_COMPLETED_KEY}_${user.id}`;
      localStorage.setItem(tourKey, 'true');
    }
    setHasCompletedTour(true);
    setIsOpen(false);
    setCurrentStep(0);
  }, [user?.id]);

  const resetTour = useCallback(() => {
    if (user?.id) {
      const tourKey = `${TOUR_COMPLETED_KEY}_${user.id}`;
      localStorage.removeItem(tourKey);
    }
    setHasCompletedTour(false);
    setCurrentStep(0);
    setIsOpen(true);
  }, [user?.id]);

  return {
    isOpen,
    currentStep,
    totalSteps: tourSteps.length,
    currentStepData: tourSteps[currentStep],
    hasCompletedTour,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    resetTour,
  };
};

export type { TourStep };
