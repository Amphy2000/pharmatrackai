import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingDown, TrendingUp, ArrowRight, Shield, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const MoneyFlowAnimation = () => {
  const [phase, setPhase] = useState<"without" | "transition" | "with">("without");
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const phases: ("without" | "transition" | "with")[] = ["without", "transition", "with"];
    const durations = [4000, 1500, 4000]; // Duration for each phase
    
    let currentPhase = 0;
    
    const runCycle = () => {
      setPhase(phases[currentPhase]);
      
      setTimeout(() => {
        currentPhase = (currentPhase + 1) % phases.length;
        if (currentPhase === 0) {
          setCycle(c => c + 1);
        }
        runCycle();
      }, durations[currentPhase]);
    };
    
    runCycle();
    
    return () => {};
  }, []);

  return (
    <div className="relative w-full max-w-xl mx-auto">
      {/* Main Container */}
      <div className="relative h-[280px] sm:h-[320px] rounded-2xl overflow-hidden bg-gradient-to-br from-muted/50 to-background border border-border/50">
        
        {/* Phase indicator */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <AnimatePresence mode="wait">
            {phase === "without" && (
              <motion.div
                key="without-badge"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <Badge variant="destructive" className="text-xs sm:text-sm px-3 py-1">
                  Without PharmaTrack
                </Badge>
              </motion.div>
            )}
            {phase === "transition" && (
              <motion.div
                key="transition-badge"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Badge className="bg-primary text-primary-foreground text-xs sm:text-sm px-3 py-1 animate-pulse">
                  <Zap className="h-3 w-3 mr-1" />
                  Activating AI...
                </Badge>
              </motion.div>
            )}
            {phase === "with" && (
              <motion.div
                key="with-badge"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <Badge className="bg-success text-success-foreground text-xs sm:text-sm px-3 py-1">
                  <Shield className="h-3 w-3 mr-1" />
                  With PharmaTrack AI
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pharmacy Building Icon */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <motion.div
            animate={{
              scale: phase === "transition" ? [1, 1.1, 1] : 1,
            }}
            transition={{ duration: 0.5 }}
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-lg ${
              phase === "with" 
                ? "bg-success/20 border-2 border-success" 
                : phase === "transition"
                ? "bg-primary/20 border-2 border-primary"
                : "bg-destructive/10 border-2 border-destructive/50"
            }`}
          >
            🏥
          </motion.div>
        </div>

        {/* Money flowing OUT (Without PharmaTrack) */}
        <AnimatePresence>
          {phase === "without" && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={`out-${i}-${cycle}`}
                  initial={{ 
                    x: 0, 
                    y: 0, 
                    opacity: 1,
                    scale: 1 
                  }}
                  animate={{ 
                    x: [0, (i % 2 === 0 ? 150 : -150)], 
                    y: [0, (i < 3 ? -80 : 80)],
                    opacity: [1, 1, 0],
                    scale: [1, 0.8, 0.5]
                  }}
                  transition={{ 
                    duration: 2.5,
                    delay: i * 0.4,
                    ease: "easeOut"
                  }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl sm:text-3xl"
                >
                  💸
                </motion.div>
              ))}
              
              {/* Loss indicator */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/20 border border-destructive/30"
              >
                <TrendingDown className="h-4 w-4 text-destructive" />
                <span className="text-sm font-semibold text-destructive">
                  -₦100,000/month lost
                </span>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Transition effect */}
        <AnimatePresence>
          {phase === "transition" && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0.5] }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-40 h-40 rounded-full bg-primary/30 blur-xl" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Money being SAVED (With PharmaTrack) */}
        <AnimatePresence>
          {phase === "with" && (
            <>
              {/* Shield barrier */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-dashed border-success/50"
              />
              
              {/* Money staying inside */}
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={`in-${i}-${cycle}`}
                  initial={{ 
                    x: (i % 2 === 0 ? 80 : -80), 
                    y: (i < 2 ? -60 : 60),
                    opacity: 0,
                    scale: 0.5
                  }}
                  animate={{ 
                    x: [(i % 2 === 0 ? 80 : -80), 0],
                    y: [(i < 2 ? -60 : 60), 0],
                    opacity: [0, 1],
                    scale: [0.5, 1]
                  }}
                  transition={{ 
                    duration: 1.5,
                    delay: i * 0.3,
                    ease: "easeOut"
                  }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl sm:text-3xl"
                  style={{
                    transform: `translate(calc(-50% + ${(i % 2 === 0 ? 20 : -20)}px), calc(-50% + ${(i < 2 ? -20 : 20)}px))`
                  }}
                >
                  💰
                </motion.div>
              ))}
              
              {/* Savings indicator */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-success/20 border border-success/30"
              >
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-sm font-semibold text-success">
                  +₦70,000/month saved
                </span>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs sm:text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span>💸</span>
          <span>Expired stock loss</span>
        </div>
        <ArrowRight className="h-4 w-4" />
        <div className="flex items-center gap-1.5">
          <span>💰</span>
          <span>Recovered revenue</span>
        </div>
      </div>
    </div>
  );
};

export default MoneyFlowAnimation;
