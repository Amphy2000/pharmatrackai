import { motion } from "framer-motion";
import { Shield, CheckCircle, Clock, FileCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface VerifiedBadgeProps {
  variant?: "small" | "large";
  showTooltip?: boolean;
  className?: string;
}

export const VerifiedBadge = ({
  variant = "small",
  showTooltip = true,
  className = "",
}: VerifiedBadgeProps) => {
  const verificationSteps = [
    {
      icon: FileCheck,
      title: "License Verified",
      description: "Valid pharmacy license confirmed",
    },
    {
      icon: Shield,
      title: "Quality Assured",
      description: "Products sourced from authorized distributors",
    },
    {
      icon: Clock,
      title: "Stock Updated",
      description: "Inventory refreshed within 24 hours",
    },
  ];

  const BadgeContent = () => {
    if (variant === "large") {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-primary/10 border border-blue-500/20 ${className}`}
        >
          <div className="relative">
            <Shield className="h-4 w-4 text-blue-500" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="absolute -bottom-0.5 -right-0.5"
            >
              <CheckCircle className="h-2.5 w-2.5 text-green-500 fill-green-500" />
            </motion.div>
          </div>
          <span className="text-xs font-semibold bg-gradient-to-r from-blue-600 to-primary bg-clip-text text-transparent">
            Verified by PharmaTrack
          </span>
        </motion.div>
      );
    }

    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        className={`inline-flex items-center ${className}`}
      >
        <Badge
          variant="secondary"
          className="h-5 px-1.5 gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20"
        >
          <Shield className="h-3 w-3" />
          <span className="text-[10px] font-semibold">Verified</span>
        </Badge>
      </motion.div>
    );
  };

  if (!showTooltip) {
    return <BadgeContent />;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">
            <BadgeContent />
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="w-72 p-0 overflow-hidden bg-card border border-border shadow-xl"
        >
          <div className="bg-gradient-to-r from-blue-500 to-primary p-3 text-white">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <div>
                <p className="font-semibold text-sm">Verified Pharmacy</p>
                <p className="text-xs opacity-90">
                  3-Step Verification Complete
                </p>
              </div>
            </div>
          </div>
          <div className="p-3 space-y-2.5">
            {verificationSteps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-2.5"
              >
                <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                  <step.icon className="h-3.5 w-3.5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {step.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default VerifiedBadge;
