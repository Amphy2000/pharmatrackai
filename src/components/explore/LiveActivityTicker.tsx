import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, MapPin, Package, Users, Clock, Sparkles } from "lucide-react";

interface ActivityItem {
  id: string;
  message: string;
  icon: "inquiry" | "pharmacy" | "user" | "update";
  neighborhood?: string;
  time: string;
}

// Simulated activity for social proof - in production, this would be from real data
const generateActivities = (): ActivityItem[] => {
  const neighborhoods = [
    "Barnawa",
    "Sabo",
    "Malali",
    "Rigasa",
    "Tudun Wada",
    "Sabon Gari",
    "Kabala Costain",
    "Ungwan Rimi",
  ];

  const medications = [
    "Amoxicillin",
    "Paracetamol",
    "Metformin",
    "Amlodipine",
    "Ciprofloxacin",
    "Vitamin C",
    "Omeprazole",
    "Ibuprofen",
  ];

  const templates = [
    {
      template: (med: string, area: string) =>
        `💊 Someone in ${area} just inquired about ${med}`,
      icon: "inquiry" as const,
    },
    {
      template: (_: string, area: string) =>
        `✅ ${Math.floor(Math.random() * 8) + 3} pharmacies in ${area} updated stock`,
      icon: "pharmacy" as const,
    },
    {
      template: (med: string, _: string) =>
        `🔥 ${med} is trending - ${Math.floor(Math.random() * 20) + 10} searches`,
      icon: "update" as const,
    },
    {
      template: (_: string, area: string) =>
        `👤 New pharmacy joined from ${area}`,
      icon: "user" as const,
    },
  ];

  return Array.from({ length: 5 }, (_, i) => {
    const template = templates[Math.floor(Math.random() * templates.length)];
    const med = medications[Math.floor(Math.random() * medications.length)];
    const area = neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
    const minutes = Math.floor(Math.random() * 30) + 1;

    return {
      id: `activity-${i}-${Date.now()}`,
      message: template.template(med, area),
      icon: template.icon,
      neighborhood: area,
      time: `${minutes}m ago`,
    };
  });
};

export const LiveActivityTicker = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setActivities(generateActivities());

    // Rotate through activities
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % 5);
    }, 4000);

    // Refresh activities periodically
    const refreshInterval = setInterval(() => {
      setActivities(generateActivities());
    }, 60000);

    return () => {
      clearInterval(interval);
      clearInterval(refreshInterval);
    };
  }, []);

  if (activities.length === 0) return null;

  const currentActivity = activities[currentIndex];

  const getIcon = (type: string) => {
    switch (type) {
      case "inquiry":
        return <Package className="h-3 w-3" />;
      case "pharmacy":
        return <MapPin className="h-3 w-3" />;
      case "user":
        return <Users className="h-3 w-3" />;
      default:
        return <Sparkles className="h-3 w-3" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-primary/10 via-marketplace/10 to-primary/10 border border-primary/20 rounded-xl px-2 sm:px-3 py-2 overflow-hidden"
    >
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <div className="relative">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping" />
          </div>
          <span className="text-[9px] sm:text-[10px] font-semibold text-green-600 uppercase tracking-wider">
            Live
          </span>
        </div>

        <div className="h-4 w-px bg-border shrink-0" />

        <div className="flex-1 min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentActivity.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-1 sm:gap-2"
            >
              <span className="text-primary shrink-0">{getIcon(currentActivity.icon)}</span>
              <p className="text-[10px] sm:text-xs text-foreground line-clamp-1">
                {currentActivity.message}
              </p>
              <span className="text-[9px] sm:text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5">
                <Clock className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                {currentActivity.time}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default LiveActivityTicker;
