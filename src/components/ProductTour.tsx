import { motion, AnimatePresence } from 'framer-motion';
import { useProductTourContext } from '@/contexts/ProductTourContext';
import { TourStep } from '@/data/tourSteps';
import { Button } from '@/components/ui/button';
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
  Check,
  ArrowRight
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

const stepGradients: Record<string, { from: string; to: string; glow: string }> = {
  sparkles: { from: '#a855f7', to: '#ec4899', glow: 'rgba(168,85,247,0.4)' },
  dashboard: { from: '#3b82f6', to: '#06b6d4', glow: 'rgba(59,130,246,0.4)' },
  cart:      { from: '#22c55e', to: '#10b981', glow: 'rgba(34,197,94,0.4)' },
  package:   { from: '#f97316', to: '#f59e0b', glow: 'rgba(249,115,22,0.4)' },
  zap:       { from: '#eab308', to: '#f97316', glow: 'rgba(234,179,8,0.4)' },
  users:     { from: '#6366f1', to: '#a855f7', glow: 'rgba(99,102,241,0.4)' },
  check:     { from: '#10b981', to: '#22c55e', glow: 'rgba(16,185,129,0.4)' },
  shield:    { from: '#ef4444', to: '#f43f5e', glow: 'rgba(239,68,68,0.4)' },
  chart:     { from: '#06b6d4', to: '#3b82f6', glow: 'rgba(6,182,212,0.4)' },
};

const getAnimationVariants = (animation: string = 'fade') => {
  switch (animation) {
    case 'slide':
      return {
        initial: { opacity: 0, x: 60 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -60 },
      };
    case 'scale':
      return {
        initial: { opacity: 0, scale: 0.85 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.85 },
      };
    case 'bounce':
      return {
        initial: { opacity: 0, y: 40 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -40 },
      };
    default:
      return {
        initial: { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -24 },
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
  const grad = stepGradients[currentStepData.icon] || stepGradients.sparkles;
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;
  const animationVariants = getAnimationVariants(currentStepData.animation);

  return (
    <AnimatePresence>
      {/* ── Overlay ─────────────────────────────────────────── */}
      <motion.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      >
        {/* Ambient glow blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px]"
            style={{ background: grad.glow }}
            animate={{ scale: [1, 1.12, 1], rotate: [0, 8, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px]"
            style={{ background: grad.glow, opacity: 0.5 }}
            animate={{ scale: [1, 1.18, 1], rotate: [0, -6, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          />
        </div>

        {/* ── Modal Card ─────────────────────────────────────── */}
        <motion.div
          key="tour-card"
          initial={{ scale: 0.88, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 30 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="relative w-full max-w-lg my-auto"
        >
          <div
            className="rounded-3xl overflow-hidden shadow-2xl border border-white/10"
            style={{
              background: 'linear-gradient(145deg, rgba(15,15,25,0.98) 0%, rgba(20,20,35,0.98) 100%)',
            }}
          >
            {/* ── Gradient header strip ─────────────────────── */}
            <div
              className="relative px-8 pt-8 pb-10 overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${grad.from}22 0%, ${grad.to}11 100%)` }}
            >
              {/* Close */}
              <button
                onClick={skipTour}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Step badge */}
              <div className="flex items-center gap-2 mb-6">
                <span
                  className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border"
                  style={{
                    color: grad.from,
                    borderColor: `${grad.from}44`,
                    background: `${grad.from}18`,
                  }}
                >
                  Step {currentStep + 1} / {totalSteps}
                </span>
              </div>

              {/* Icon + Title */}
              <div className="flex items-center gap-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`icon-${currentStep}`}
                    initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.4, opacity: 0, rotate: 20 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                    className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl"
                    style={{
                      background: `linear-gradient(135deg, ${grad.from}, ${grad.to})`,
                      boxShadow: `0 8px 30px ${grad.glow}`,
                    }}
                  >
                    <StepIcon className="h-8 w-8 text-white" />
                  </motion.div>
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  <motion.h2
                    key={`title-${currentStep}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.28 }}
                    className="text-2xl font-bold text-white leading-tight"
                  >
                    {currentStepData.title}
                  </motion.h2>
                </AnimatePresence>
              </div>

              {/* Progress bar */}
              <div className="mt-6 h-1 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${grad.from}, ${grad.to})` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>

              {/* Dot indicators */}
              <div className="flex items-center gap-1.5 mt-4">
                {allSteps.map((step, i) => (
                  <button
                    key={step.id}
                    onClick={() => goToStep(i)}
                    title={step.title}
                    className="rounded-full transition-all duration-300"
                    style={{
                      height: '6px',
                      width: i === currentStep ? '28px' : '6px',
                      background: i === currentStep
                        ? `linear-gradient(90deg, ${grad.from}, ${grad.to})`
                        : i < currentStep
                        ? `${grad.from}88`
                        : 'rgba(255,255,255,0.18)',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* ── Body ──────────────────────────────────────── */}
            <div className="px-8 py-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`body-${currentStep}`}
                  {...animationVariants}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="space-y-5"
                >
                  {/* Description */}
                  <p className="text-white/70 leading-relaxed text-sm">
                    {currentStepData.description}
                  </p>

                  {/* Features */}
                  <div
                    className="rounded-2xl p-5 space-y-3 border"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      borderColor: 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <p
                      className="text-xs font-bold uppercase tracking-widest mb-4"
                      style={{ color: grad.from }}
                    >
                      {isLastStep ? 'Quick Links' : 'Key Features'}
                    </p>
                    {currentStepData.features.map((feature, index) => (
                      <motion.div
                        key={feature}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 + index * 0.06 }}
                        className="flex items-start gap-3"
                      >
                        <div
                          className="mt-0.5 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})` }}
                        >
                          <Check className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm text-white/80">{feature}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── Footer ────────────────────────────────────── */}
            <div
              className="px-8 py-5 flex items-center justify-between border-t"
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <Button
                variant="ghost"
                onClick={prevStep}
                disabled={isFirstStep}
                className="gap-2 text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-20"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>

              <button
                onClick={skipTour}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                Skip tour
              </button>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-xl transition-all"
                style={{
                  background: `linear-gradient(135deg, ${grad.from}, ${grad.to})`,
                  boxShadow: `0 4px 20px ${grad.glow}`,
                }}
              >
                {isLastStep ? 'Get Started' : 'Next'}
                {!isLastStep && <ArrowRight className="h-4 w-4" />}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
