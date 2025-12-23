import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { TourStep, getTourStepsForRole, getTourStorageKey } from '@/data/tourSteps';

interface ProductTourContextValue {
  isOpen: boolean;
  currentStep: number;
  totalSteps: number;
  currentStepData: TourStep | undefined;
  allSteps: TourStep[];
  hasCompletedTour: boolean;
  isPaused: boolean;
  userRole: 'owner' | 'manager' | 'staff' | null;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  skipTour: () => void;
  pauseTour: () => void;
  resumeTour: () => void;
  completeTour: () => void;
  resetTour: () => void;
}

const ProductTourContext = createContext<ProductTourContextValue | null>(null);

export const ProductTourProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { userRole, isLoading: permissionsLoading } = usePermissions();
  
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedTour, setHasCompletedTour] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [tourSteps, setTourSteps] = useState<TourStep[]>([]);

  // Update tour steps when role changes
  useEffect(() => {
    if (!permissionsLoading) {
      const steps = getTourStepsForRole(userRole);
      setTourSteps(steps);
    }
  }, [userRole, permissionsLoading]);

  // Check if user has completed the tour for their current role
  useEffect(() => {
    if (!user?.id || permissionsLoading) return;
    
    const tourKey = getTourStorageKey(user.id, userRole);
    const completed = localStorage.getItem(tourKey);
    
    if (completed === 'true') {
      setHasCompletedTour(true);
    } else {
      setHasCompletedTour(false);
      // Auto-start tour for first-time users after a short delay
      const timer = setTimeout(() => {
        if (tourSteps.length > 0) {
          setIsOpen(true);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user?.id, userRole, permissionsLoading, tourSteps.length]);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsPaused(false);
    setIsOpen(true);
  }, []);

  const completeTourFn = useCallback(() => {
    if (user?.id) {
      const tourKey = getTourStorageKey(user.id, userRole);
      localStorage.setItem(tourKey, 'true');
    }
    setHasCompletedTour(true);
    setIsOpen(false);
    setCurrentStep(0);
    setIsPaused(false);
  }, [user?.id, userRole]);

  const nextStep = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      completeTourFn();
    }
  }, [currentStep, tourSteps.length, completeTourFn]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < tourSteps.length) {
      setCurrentStep(step);
    }
  }, [tourSteps.length]);

  const skipTour = useCallback(() => {
    completeTourFn();
  }, [completeTourFn]);

  const pauseTour = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeTour = useCallback(() => {
    setIsPaused(false);
  }, []);

  const resetTour = useCallback(() => {
    if (user?.id) {
      const tourKey = getTourStorageKey(user.id, userRole);
      localStorage.removeItem(tourKey);
    }
    setHasCompletedTour(false);
    setCurrentStep(0);
    setIsPaused(false);
    setIsOpen(true);
  }, [user?.id, userRole]);

  return (
    <ProductTourContext.Provider
      value={{
        isOpen,
        currentStep,
        totalSteps: tourSteps.length,
        currentStepData: tourSteps[currentStep],
        allSteps: tourSteps,
        hasCompletedTour,
        isPaused,
        userRole,
        startTour,
        nextStep,
        prevStep,
        goToStep,
        skipTour,
        pauseTour,
        resumeTour,
        completeTour: completeTourFn,
        resetTour,
      }}
    >
      {children}
    </ProductTourContext.Provider>
  );
};

export const useProductTourContext = () => {
  const context = useContext(ProductTourContext);
  if (!context) {
    throw new Error('useProductTourContext must be used within ProductTourProvider');
  }
  return context;
};

export type { TourStep };
