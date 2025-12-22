import { motion, AnimatePresence } from 'framer-motion';
import { useProductTour } from '@/hooks/useProductTour';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  LayoutDashboard,
  ShoppingCart,
  Package,
  Zap,
  Users,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

const stepIcons = {
  welcome: Sparkles,
  dashboard: LayoutDashboard,
  pos: ShoppingCart,
  inventory: Package,
  'quick-actions': Zap,
  staff: Users,
  complete: CheckCircle2,
};

export const ProductTour = () => {
  const {
    isOpen,
    currentStep,
    totalSteps,
    currentStepData,
    nextStep,
    prevStep,
    skipTour,
  } = useProductTour();

  if (!isOpen || !currentStepData) return null;

  const progress = ((currentStep + 1) / totalSteps) * 100;
  const StepIcon = stepIcons[currentStepData.id as keyof typeof stepIcons] || Sparkles;
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md"
      >
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg mx-4"
        >
          {/* Card */}
          <div className="glass-card rounded-3xl overflow-hidden border border-border/50 shadow-elevated">
            {/* Progress bar */}
            <div className="px-6 pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">
                  Step {currentStep + 1} of {totalSteps}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipTour}
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>

            {/* Content */}
            <div className="p-8 pt-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="text-center"
                >
                  {/* Icon */}
                  <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow-primary">
                    <StepIcon className="h-10 w-10 text-primary-foreground" />
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl font-bold font-display mb-3">
                    {currentStepData.title}
                  </h2>

                  {/* Description */}
                  <p className="text-muted-foreground leading-relaxed">
                    {currentStepData.description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="px-8 pb-8 flex items-center justify-between gap-4">
              <Button
                variant="ghost"
                onClick={prevStep}
                disabled={isFirstStep}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>

              <div className="flex gap-1.5">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === currentStep 
                        ? 'w-6 bg-primary' 
                        : i < currentStep 
                        ? 'w-2 bg-primary/50' 
                        : 'w-2 bg-muted'
                    }`}
                  />
                ))}
              </div>

              <Button
                onClick={nextStep}
                className="gap-2 bg-gradient-primary hover:opacity-90"
              >
                {isLastStep ? 'Get Started' : 'Next'}
                {!isLastStep && <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Skip button */}
          {!isLastStep && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={skipTour}
              className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip tour
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
