import { motion, AnimatePresence } from 'framer-motion';
import { useProductTourContext, TourStep } from '@/contexts/ProductTourContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Sparkles,
  Shield,
  BarChart3,
  Check
} from 'lucide-react';

const stepIcons = {
  sparkles: Sparkles,
  dashboard: LayoutDashboard,
  cart: ShoppingCart,
  package: Package,
  zap: Zap,
  users: Users,
  check: CheckCircle2,
  shield: Shield,
  chart: BarChart3,
};

const stepGradients = {
  sparkles: 'from-purple-500 to-pink-500',
  dashboard: 'from-blue-500 to-cyan-500',
  cart: 'from-green-500 to-emerald-500',
  package: 'from-orange-500 to-amber-500',
  zap: 'from-yellow-500 to-orange-500',
  users: 'from-indigo-500 to-purple-500',
  check: 'from-emerald-500 to-green-500',
  shield: 'from-red-500 to-rose-500',
  chart: 'from-cyan-500 to-blue-500',
};

const getAnimationVariants = (animation: string = 'fade') => {
  switch (animation) {
    case 'slide':
      return {
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -50 },
      };
    case 'scale':
      return {
        initial: { opacity: 0, scale: 0.8 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.8 },
      };
    case 'bounce':
      return {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -30 },
      };
    default:
      return {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
      };
  }
};

export const ProductTour = () => {
  const {
    isOpen,
    currentStep,
    totalSteps,
    currentStepData,
    allSteps,
    nextStep,
    prevStep,
    goToStep,
    skipTour,
  } = useProductTourContext();

  if (!isOpen || !currentStepData) return null;

  const progress = ((currentStep + 1) / totalSteps) * 100;
  const StepIcon = stepIcons[currentStepData.icon] || Sparkles;
  const gradient = stepGradients[currentStepData.icon] || 'from-primary to-primary/70';
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;
  const animationVariants = getAnimationVariants(currentStepData.animation);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md overflow-y-auto"
      >
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className={`absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br ${gradient} opacity-10 rounded-full blur-3xl`}
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, 0],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div 
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.15, 1],
              rotate: [0, -5, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
        </div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl my-auto"
        >
          {/* Card */}
          <div className="glass-card rounded-3xl overflow-hidden border border-border/50 shadow-elevated">
            {/* Header with progress */}
            <div className="px-6 pt-6 pb-4 border-b border-border/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    Step {currentStep + 1} of {totalSteps}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    • {currentStepData.title.split(' ').slice(0, 2).join(' ')}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipTour}
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Progress value={progress} className="h-2" />
              
              {/* Step indicators */}
              <div className="flex items-center justify-center gap-1 mt-4">
                {allSteps.map((step, i) => (
                  <button
                    key={step.id}
                    onClick={() => goToStep(i)}
                    className={`h-2 rounded-full transition-all duration-300 hover:opacity-80 ${
                      i === currentStep 
                        ? 'w-8 bg-primary' 
                        : i < currentStep 
                        ? 'w-2 bg-primary/60' 
                        : 'w-2 bg-muted hover:bg-muted-foreground/30'
                    }`}
                    title={step.title}
                  />
                ))}
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="max-h-[50vh] sm:max-h-[55vh]">
              <div className="p-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    {...animationVariants}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="space-y-6"
                  >
                    {/* Icon */}
                    <div className="flex justify-center">
                      <motion.div 
                        className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}
                        initial={{ scale: 0.5, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', delay: 0.1 }}
                      >
                        <StepIcon className="h-12 w-12 text-white" />
                      </motion.div>
                    </div>

                    {/* Title */}
                    <motion.h2 
                      className="text-2xl md:text-3xl font-bold font-display text-center"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                    >
                      {currentStepData.title}
                    </motion.h2>

                    {/* Description */}
                    <motion.p 
                      className="text-muted-foreground text-center leading-relaxed max-w-md mx-auto"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      {currentStepData.description}
                    </motion.p>

                    {/* Features list */}
                    <motion.div 
                      className="bg-muted/30 rounded-2xl p-6 border border-border/50"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                    >
                      <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                        {isLastStep ? 'Quick Links' : 'Key Features'}
                      </h3>
                      <div className="grid gap-3">
                        {currentStepData.features.map((feature, index) => (
                          <motion.div
                            key={feature}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + index * 0.05 }}
                            className="flex items-start gap-3"
                          >
                            <div className={`mt-0.5 h-5 w-5 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                              <Check className="h-3 w-3 text-white" />
                            </div>
                            <span className="text-sm">{feature}</span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </ScrollArea>

            {/* Navigation */}
            <div className="px-8 py-6 border-t border-border/30 flex items-center justify-between gap-4">
              <Button
                variant="ghost"
                onClick={prevStep}
                disabled={isFirstStep}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>

              <Button
                onClick={nextStep}
                className={`gap-2 bg-gradient-to-r ${gradient} hover:opacity-90 text-white border-0`}
              >
                {isLastStep ? 'Get Started' : 'Continue'}
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
              Skip tour and explore on my own
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
