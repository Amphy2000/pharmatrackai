import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const TOUR_COMPLETED_KEY = 'pharmatrack_tour_completed';

interface TourStep {
  id: string;
  title: string;
  description: string;
  features: string[];
  icon: 'sparkles' | 'dashboard' | 'cart' | 'package' | 'zap' | 'users' | 'check' | 'shield' | 'chart';
  animation?: 'fade' | 'slide' | 'scale' | 'bounce';
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to PharmaTrack! 🎉',
    description: 'Let us show you around your new pharmacy management system. This interactive guide will help you master each feature step by step.',
    features: [
      'AI-powered inventory management',
      'Real-time sales analytics',
      'Multi-branch support',
      'NAFDAC compliance tools'
    ],
    icon: 'sparkles',
    animation: 'scale',
  },
  {
    id: 'dashboard',
    title: 'Your Command Center',
    description: 'The Dashboard gives you a bird\'s eye view of your entire pharmacy operation. Monitor performance, track trends, and make data-driven decisions.',
    features: [
      'Real-time revenue tracking',
      'Low stock alerts at a glance',
      'Expiry warnings dashboard',
      'AI-powered insights panel',
      'Staff performance metrics'
    ],
    icon: 'dashboard',
    animation: 'fade',
  },
  {
    id: 'pos',
    title: 'Lightning-Fast Point of Sale',
    description: 'Process sales in seconds with our intuitive POS system. Built for speed and accuracy in high-traffic pharmacy environments.',
    features: [
      'Barcode scanning support',
      'Smart product search',
      'Hold & recall transactions',
      'Multiple payment methods',
      'Auto drug interaction warnings',
      'Instant receipt printing'
    ],
    icon: 'cart',
    animation: 'slide',
  },
  {
    id: 'inventory',
    title: 'Smart Inventory Management',
    description: 'Never run out of stock or lose money to expiring drugs. Our AI helps you maintain optimal inventory levels automatically.',
    features: [
      'AI Invoice Scanner - add 50+ items in 10 seconds',
      'Automatic expiry tracking',
      'Smart reorder suggestions',
      'Batch & lot number tracking',
      'Controlled drugs register',
      'Location/shelf mapping'
    ],
    icon: 'package',
    animation: 'fade',
  },
  {
    id: 'ai-features',
    title: 'AI-Powered Intelligence',
    description: 'Let artificial intelligence work for you. Predict demand, optimize pricing, and prevent losses before they happen.',
    features: [
      'Demand forecasting',
      'Expiry discount recommendations',
      'Profit margin analysis',
      'Sales trend predictions',
      'Smart restocking alerts'
    ],
    icon: 'chart',
    animation: 'scale',
  },
  {
    id: 'staff',
    title: 'Team Management',
    description: 'Manage your staff efficiently with role-based access, shift tracking, and performance monitoring.',
    features: [
      'Add unlimited staff members',
      'Role-based permissions',
      'Clock in/out tracking',
      'Sales by cashier reports',
      'Admin PIN protection',
      'Activity audit logs'
    ],
    icon: 'users',
    animation: 'slide',
  },
  {
    id: 'compliance',
    title: 'Stay NAFDAC Compliant',
    description: 'Built-in compliance tools ensure you\'re always audit-ready. Generate reports instantly when inspectors arrive.',
    features: [
      'NAFDAC registration tracking',
      'Batch traceability logs',
      'Manufacturing date records',
      'Controlled drugs register',
      'One-click compliance reports'
    ],
    icon: 'shield',
    animation: 'fade',
  },
  {
    id: 'complete',
    title: 'You\'re All Set! ✅',
    description: 'You now know the key features of PharmaTrack. Explore at your own pace, and remember - we\'re here to help!',
    features: [
      'Restart this tour anytime from Settings',
      'Check the User Guide for detailed help',
      'Contact support: pharmatrackai@gmail.com',
      'WhatsApp: +234 916 915 3129'
    ],
    icon: 'check',
    animation: 'bounce',
  },
];

interface ProductTourContextValue {
  isOpen: boolean;
  currentStep: number;
  totalSteps: number;
  currentStepData: TourStep | undefined;
  allSteps: TourStep[];
  hasCompletedTour: boolean;
  isPaused: boolean;
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
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedTour, setHasCompletedTour] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

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
    setIsPaused(false);
    setIsOpen(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      completeTourFn();
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < tourSteps.length) {
      setCurrentStep(step);
    }
  }, []);

  const skipTour = useCallback(() => {
    completeTourFn();
  }, []);

  const pauseTour = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeTour = useCallback(() => {
    setIsPaused(false);
  }, []);

  const completeTourFn = useCallback(() => {
    if (user?.id) {
      const tourKey = `${TOUR_COMPLETED_KEY}_${user.id}`;
      localStorage.setItem(tourKey, 'true');
    }
    setHasCompletedTour(true);
    setIsOpen(false);
    setCurrentStep(0);
    setIsPaused(false);
  }, [user?.id]);

  const resetTour = useCallback(() => {
    if (user?.id) {
      const tourKey = `${TOUR_COMPLETED_KEY}_${user.id}`;
      localStorage.removeItem(tourKey);
    }
    setHasCompletedTour(false);
    setCurrentStep(0);
    setIsPaused(false);
    setIsOpen(true);
  }, [user?.id]);

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
