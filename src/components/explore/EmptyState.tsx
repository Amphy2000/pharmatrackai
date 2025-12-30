import { motion } from "framer-motion";
import { Search, Package, MapPin, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RequestDrugButton } from "./RequestDrugButton";

interface EmptyStateProps {
  type: "no-results" | "initial";
  searchQuery?: string;
  onSuggestionClick?: (term: string) => void;
  alternativeNeighborhoods?: string[];
  onNeighborhoodClick?: (neighborhood: string) => void;
}

const popularDrugs = [
  "Paracetamol",
  "Amoxicillin",
  "Vitamin C",
  "Metformin",
  "Ibuprofen",
  "Omeprazole",
];

const allNeighborhoods = [
  "Barnawa",
  "Sabo",
  "Malali",
  "Rigasa",
  "Tudun Wada",
  "Sabon Gari",
];

export const EmptyState = ({
  type,
  searchQuery = "",
  onSuggestionClick,
  alternativeNeighborhoods = allNeighborhoods.slice(0, 4),
  onNeighborhoodClick,
}: EmptyStateProps) => {
  if (type === "initial") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12 px-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.1 }}
          className="relative mx-auto mb-6 w-20 h-20"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-marketplace/20 animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/10 to-marketplace/10 flex items-center justify-center">
            <Search className="h-8 w-8 text-primary" />
          </div>
        </motion.div>

        <h3 className="text-lg font-bold text-foreground mb-2">
          Find Medications Nearby
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
          Search for any medication and discover pharmacies with stock in your
          area
        </p>

        {/* Popular Searches */}
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Popular Searches
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {popularDrugs.map((drug, i) => (
              <motion.div
                key={drug}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSuggestionClick?.(drug)}
                  className="h-8 px-3 rounded-full bg-muted/50 hover:bg-primary/10 hover:border-primary/30 transition-all group"
                >
                  <Sparkles className="h-3 w-3 mr-1.5 text-primary group-hover:scale-110 transition-transform" />
                  {drug}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  // No results state
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12 px-6 bg-gradient-to-b from-muted/30 to-muted/10 rounded-2xl border border-dashed border-muted-foreground/20"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.1 }}
        className="relative mx-auto mb-6 w-20 h-20"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20" />
        <div className="absolute inset-2 rounded-full bg-white dark:bg-card flex items-center justify-center shadow-lg">
          <Package className="h-8 w-8 text-amber-500" />
        </div>
      </motion.div>

      <h3 className="text-lg font-bold text-foreground mb-2">
        No results for "{searchQuery}"
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
        We couldn't find this medication in our network. Try the suggestions
        below or request it.
      </p>

      {/* Alternative Suggestions */}
      <div className="space-y-5">
        {/* Try Other Neighborhoods */}
        {alternativeNeighborhoods.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>Try other neighborhoods</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {alternativeNeighborhoods.map((neighborhood, i) => (
                <motion.div
                  key={neighborhood}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNeighborhoodClick?.(neighborhood)}
                    className="h-8 px-3 rounded-full bg-primary/5 hover:bg-primary/10 border-primary/20 hover:border-primary/40 transition-all"
                  >
                    <MapPin className="h-3 w-3 mr-1.5 text-primary" />
                    {neighborhood}
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Popular Alternatives */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Popular medications</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {popularDrugs.slice(0, 4).map((drug, i) => (
              <motion.div
                key={drug}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.05 }}
              >
                <Badge
                  variant="secondary"
                  className="px-3 py-1 cursor-pointer hover:bg-secondary/80 transition-colors"
                  onClick={() => onSuggestionClick?.(drug)}
                >
                  {drug}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Badge>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Request CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="pt-4 border-t border-border"
        >
          <p className="text-xs text-muted-foreground mb-3">
            Can't find what you need?
          </p>
          <RequestDrugButton searchQuery={searchQuery} />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default EmptyState;
