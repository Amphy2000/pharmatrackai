import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, TrendingUp, MapPin, Sparkles, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

interface TrendingItem {
  name: string;
  count: number;
  category?: string;
}

interface TrendingSectionProps {
  neighborhood: string | null;
  onTrendingClick: (term: string) => void;
}

export const TrendingSection = ({
  neighborhood,
  onTrendingClick,
}: TrendingSectionProps) => {
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTrending();
  }, [neighborhood]);

  const loadTrending = async () => {
    try {
      setIsLoading(true);
      
      // Fetch recent marketplace searches
      const { data: searches } = await supabase
        .from("marketplace_searches")
        .select("search_query, location_filter")
        .order("searched_at", { ascending: false })
        .limit(200);

      if (!searches) {
        setTrending([]);
        return;
      }

      // Filter by neighborhood if available
      let filtered = searches;
      if (neighborhood) {
        filtered = searches.filter(
          (s) =>
            s.location_filter?.toLowerCase().includes(neighborhood.toLowerCase()) ||
            !s.location_filter
        );
      }

      // Count occurrences
      const counts: Record<string, number> = {};
      filtered.forEach((s) => {
        if (s.search_query && !s.search_query.startsWith("[")) {
          const query = s.search_query.toLowerCase().trim();
          counts[query] = (counts[query] || 0) + 1;
        }
      });

      // Sort by count and take top 6
      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, count]) => ({ name, count }));

      setTrending(sorted);
    } catch (error) {
      console.error("Error loading trending:", error);
      setTrending([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-xl bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-24 rounded-full bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (trending.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1">
              Trending
              {neighborhood && (
                <span className="text-primary"> in {neighborhood}</span>
              )}
            </h2>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">
              Popular searches right now
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        <AnimatePresence>
          {trending.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: index * 0.05 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTrendingClick(item.name)}
                className="h-7 sm:h-8 px-2 sm:px-3 rounded-full bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-500/20 transition-all group"
              >
                <TrendingUp className="h-3 w-3 mr-1 sm:mr-1.5 text-orange-500 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] sm:text-xs capitalize font-medium">{item.name}</span>
                <Badge
                  variant="secondary"
                  className="ml-1 sm:ml-1.5 h-4 px-1 sm:px-1.5 text-[8px] sm:text-[9px] bg-orange-500/20 text-orange-700 dark:text-orange-300"
                >
                  {item.count}
                </Badge>
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.section>
  );
};

export default TrendingSection;
