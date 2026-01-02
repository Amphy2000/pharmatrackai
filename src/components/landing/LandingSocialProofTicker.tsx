import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, TrendingUp, Users, Clock, Shield, Sparkles } from "lucide-react";

interface ActivityItem {
  id: string;
  message: string;
  icon: "signup" | "savings" | "waste" | "milestone";
  city?: string;
  time: string;
}

const NIGERIAN_CITIES = [
  "Lagos",
  "Abuja",
  "Port Harcourt",
  "Kano",
  "Ibadan",
  "Kaduna",
  "Benin City",
  "Enugu",
  "Warri",
  "Calabar",
  "Jos",
  "Uyo",
  "Owerri",
  "Abeokuta",
];

const generateActivities = (): ActivityItem[] => {
  const activities: ActivityItem[] = [];
  
  // Generate signup activities
  for (let i = 0; i < 3; i++) {
    const city = NIGERIAN_CITIES[Math.floor(Math.random() * NIGERIAN_CITIES.length)];
    const minutes = Math.floor(Math.random() * 45) + 2;
    activities.push({
      id: `signup-${i}-${Date.now()}`,
      message: `New pharmacy signed up from ${city}`,
      icon: "signup",
      city,
      time: `${minutes}m ago`,
    });
  }

  // Generate savings activities
  const savingsAmounts = [45000, 78000, 120000, 95000, 156000, 89000, 210000];
  for (let i = 0; i < 2; i++) {
    const city = NIGERIAN_CITIES[Math.floor(Math.random() * NIGERIAN_CITIES.length)];
    const amount = savingsAmounts[Math.floor(Math.random() * savingsAmounts.length)];
    activities.push({
      id: `savings-${i}-${Date.now()}`,
      message: `₦${amount.toLocaleString()} in waste prevented in ${city}`,
      icon: "savings",
      city,
      time: "Today",
    });
  }

  // Generate waste prevention
  for (let i = 0; i < 2; i++) {
    const city = NIGERIAN_CITIES[Math.floor(Math.random() * NIGERIAN_CITIES.length)];
    const items = Math.floor(Math.random() * 15) + 5;
    activities.push({
      id: `waste-${i}-${Date.now()}`,
      message: `${items} expiring items saved from waste in ${city}`,
      icon: "waste",
      city,
      time: "Just now",
    });
  }

  // Add milestone
  activities.push({
    id: `milestone-${Date.now()}`,
    message: "Join pharmacies already protecting their profits",
    icon: "milestone",
    time: "",
  });

  return activities.sort(() => Math.random() - 0.5);
};

export const LandingSocialProofTicker = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setActivities(generateActivities());

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % 8);
    }, 3500);

    const refreshInterval = setInterval(() => {
      setActivities(generateActivities());
    }, 45000);

    return () => {
      clearInterval(interval);
      clearInterval(refreshInterval);
    };
  }, []);

  if (activities.length === 0) return null;

  const currentActivity = activities[currentIndex % activities.length];

  const getIcon = (type: ActivityItem["icon"]) => {
    switch (type) {
      case "signup":
        return <Users className="h-3.5 w-3.5" />;
      case "savings":
        return <TrendingUp className="h-3.5 w-3.5" />;
      case "waste":
        return <Shield className="h-3.5 w-3.5" />;
      case "milestone":
        return <Sparkles className="h-3.5 w-3.5" />;
      default:
        return <MapPin className="h-3.5 w-3.5" />;
    }
  };

  const getIconColor = (type: ActivityItem["icon"]) => {
    switch (type) {
      case "signup":
        return "text-primary bg-primary/20";
      case "savings":
        return "text-success bg-success/20";
      case "waste":
        return "text-warning bg-warning/20";
      case "milestone":
        return "text-marketplace bg-marketplace/20";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg"
    >
      {/* Live indicator */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="relative">
          <div className="h-2 w-2 rounded-full bg-success" />
          <div className="absolute inset-0 h-2 w-2 rounded-full bg-success animate-ping" />
        </div>
        <span className="text-[10px] font-bold text-success uppercase tracking-wider">
          Live
        </span>
      </div>

      <div className="h-4 w-px bg-border/50 shrink-0" />

      {/* Activity content */}
      <div className="min-w-[240px] sm:min-w-[320px] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentActivity.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2"
          >
            <span className={`p-1 rounded-full shrink-0 ${getIconColor(currentActivity.icon)}`}>
              {getIcon(currentActivity.icon)}
            </span>
            <p className="text-xs sm:text-sm text-foreground font-medium line-clamp-1">
              {currentActivity.message}
            </p>
            {currentActivity.time && (
              <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5 ml-auto">
                <Clock className="h-2.5 w-2.5" />
                {currentActivity.time}
              </span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default LandingSocialProofTicker;
