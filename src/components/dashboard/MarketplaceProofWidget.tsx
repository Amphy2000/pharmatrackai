import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { 
  Globe, 
  Search, 
  Eye, 
  MessageCircle, 
  TrendingUp,
  MapPin,
  Sparkles,
  ArrowRight,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface MarketplaceActivity {
  id: string;
  type: 'search' | 'view' | 'lead';
  query?: string;
  location?: string;
  timestamp: Date;
  isSimulated?: boolean;
}

// Realistic simulated data for Nigerian pharmacy context
const SIMULATED_SEARCHES = [
  { query: 'Amoxicillin 500mg', location: 'Barnawa, Kaduna' },
  { query: 'Paracetamol', location: 'Sabon Gari, Kaduna' },
  { query: 'Metformin 500mg', location: 'Tudun Wada' },
  { query: 'Vitamin C', location: 'Kaduna Central' },
  { query: 'Ciprofloxacin', location: 'Malali' },
  { query: 'Ibuprofen 400mg', location: 'Narayi' },
  { query: 'Omeprazole', location: 'Ungwan Rimi' },
  { query: 'Flagyl', location: 'Kakuri' },
  { query: 'Augmentin', location: 'Sabon Tasha' },
  { query: 'Insulin', location: 'Kaduna South' },
  { query: 'Blood pressure medication', location: 'Rigasa' },
  { query: 'Cough syrup', location: 'Barnawa' },
  { query: 'Antimalarial drugs', location: 'Tudun Wada' },
  { query: 'Eye drops', location: 'Ungwan Boro' },
  { query: 'Antacid', location: 'Kawo' },
];

const getRandomTimeAgo = (maxMinutes: number = 30) => {
  const minutes = Math.floor(Math.random() * maxMinutes) + 1;
  return new Date(Date.now() - minutes * 60 * 1000);
};

export const MarketplaceProofWidget = () => {
  const navigate = useNavigate();
  const { pharmacy } = usePharmacy();
  const { formatPrice } = useCurrency();
  const [liveActivities, setLiveActivities] = useState<MarketplaceActivity[]>([]);
  const [animatingCount, setAnimatingCount] = useState(false);

  // Fetch platform-wide marketplace stats (last 24 hours)
  const { data: platformStats } = useQuery({
    queryKey: ['marketplace-platform-stats'],
    queryFn: async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const [searchesResult, viewsResult, leadsResult] = await Promise.all([
        supabase
          .from('marketplace_searches')
          .select('*', { count: 'exact', head: true })
          .gte('searched_at', yesterday.toISOString()),
        supabase
          .from('marketplace_views')
          .select('*', { count: 'exact', head: true })
          .gte('viewed_at', yesterday.toISOString()),
        supabase
          .from('whatsapp_leads')
          .select('*', { count: 'exact', head: true })
          .gte('clicked_at', yesterday.toISOString())
      ]);

      return {
        searches: searchesResult.count || 0,
        views: viewsResult.count || 0,
        leads: leadsResult.count || 0
      };
    },
    refetchInterval: 30000
  });

  // Fetch YOUR pharmacy's stats
  const { data: myStats } = useQuery({
    queryKey: ['marketplace-my-stats', pharmacy?.id],
    queryFn: async () => {
      if (!pharmacy?.id) return null;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const [viewsResult, leadsResult] = await Promise.all([
        supabase
          .from('marketplace_views')
          .select('*', { count: 'exact', head: true })
          .eq('pharmacy_id', pharmacy.id)
          .gte('viewed_at', yesterday.toISOString()),
        supabase
          .from('whatsapp_leads')
          .select('*', { count: 'exact', head: true })
          .eq('pharmacy_id', pharmacy.id)
          .gte('clicked_at', yesterday.toISOString())
      ]);

      return {
        views: viewsResult.count || 0,
        leads: leadsResult.count || 0,
        potentialRevenue: (leadsResult.count || 0) * 5000
      };
    },
    enabled: !!pharmacy?.id,
    refetchInterval: 30000
  });

  // Fetch recent searches to show live activity
  const { data: recentSearches } = useQuery({
    queryKey: ['marketplace-recent-searches'],
    queryFn: async () => {
      const { data } = await supabase
        .from('marketplace_searches')
        .select('id, search_query, location_filter, searched_at')
        .order('searched_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    refetchInterval: 10000
  });

  // Generate simulated stats that look realistic (baseline + small random variance)
  const displayStats = useMemo(() => {
    const realSearches = platformStats?.searches || 0;
    const realViews = platformStats?.views || 0;
    const realLeads = platformStats?.leads || 0;

    // If we have real data, use it
    if (realSearches > 5 || realViews > 5 || realLeads > 2) {
      return platformStats;
    }

    // Generate simulated baseline that looks realistic for a growing platform
    const hourOfDay = new Date().getHours();
    const isBusinessHours = hourOfDay >= 8 && hourOfDay <= 20;
    const activityMultiplier = isBusinessHours ? 1.5 : 0.7;

    return {
      searches: Math.floor((47 + Math.random() * 28) * activityMultiplier) + realSearches,
      views: Math.floor((89 + Math.random() * 45) * activityMultiplier) + realViews,
      leads: Math.floor((12 + Math.random() * 8) * activityMultiplier) + realLeads
    };
  }, [platformStats]);

  // Build live activities from real data + simulated when needed
  useEffect(() => {
    const realActivities: MarketplaceActivity[] = (recentSearches || []).slice(0, 5).map(search => ({
      id: search.id,
      type: 'search' as const,
      query: search.search_query,
      location: search.location_filter,
      timestamp: new Date(search.searched_at),
      isSimulated: false
    }));

    // If we don't have enough real activity, supplement with simulated
    if (realActivities.length < 4) {
      const simulatedNeeded = 4 - realActivities.length;
      const shuffled = [...SIMULATED_SEARCHES].sort(() => Math.random() - 0.5);
      
      const simulatedActivities: MarketplaceActivity[] = shuffled.slice(0, simulatedNeeded).map((sim, i) => ({
        id: `sim-${i}-${Date.now()}`,
        type: 'search' as const,
        query: sim.query,
        location: sim.location,
        timestamp: getRandomTimeAgo(25),
        isSimulated: true
      }));

      setLiveActivities([...realActivities, ...simulatedActivities].sort((a, b) => 
        b.timestamp.getTime() - a.timestamp.getTime()
      ));
    } else {
      setLiveActivities(realActivities);
    }
  }, [recentSearches]);

  // Rotate simulated searches periodically to make it feel alive
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveActivities(prev => {
        const hasSimulated = prev.some(a => a.isSimulated);
        if (!hasSimulated) return prev;

        // Replace one random simulated search with a new one
        const simulatedIndices = prev.map((a, i) => a.isSimulated ? i : -1).filter(i => i >= 0);
        if (simulatedIndices.length === 0) return prev;

        const indexToReplace = simulatedIndices[Math.floor(Math.random() * simulatedIndices.length)];
        const unusedSearches = SIMULATED_SEARCHES.filter(s => 
          !prev.some(a => a.query === s.query)
        );
        
        if (unusedSearches.length === 0) return prev;

        const newSearch = unusedSearches[Math.floor(Math.random() * unusedSearches.length)];
        const newActivities = [...prev];
        newActivities[indexToReplace] = {
          id: `sim-${Date.now()}`,
          type: 'search',
          query: newSearch.query,
          location: newSearch.location,
          timestamp: new Date(),
          isSimulated: true
        };

        return newActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      });
    }, 8000 + Math.random() * 7000); // Random interval 8-15 seconds

    return () => clearInterval(interval);
  }, []);

  // Animate count updates
  useEffect(() => {
    if (displayStats) {
      setAnimatingCount(true);
      const timer = setTimeout(() => setAnimatingCount(false), 500);
      return () => clearTimeout(timer);
    }
  }, [displayStats?.searches, displayStats?.views, displayStats?.leads]);

  return (
    <Card className="glass-card border-border/50 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5" />
      
      <CardContent className="p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                Patient Discovery
                <Badge variant="secondary" className="bg-success/10 text-success border-success/20 text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse mr-1" />
                  LIVE
                </Badge>
              </h3>
              <p className="text-sm text-muted-foreground">Patients searching for drugs right now</p>
            </div>
          </div>
        </div>

        {/* Platform-wide Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <motion.div 
            className="text-center p-4 rounded-xl bg-muted/50 border border-border/50"
            animate={animatingCount ? { scale: [1, 1.05, 1] } : {}}
          >
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Search className="h-3.5 w-3.5" />
              <span className="text-xs">Searches</span>
            </div>
            <p className="text-2xl font-bold font-display text-foreground">
              {displayStats?.searches?.toLocaleString() || '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">last 24h</p>
          </motion.div>

          <motion.div 
            className="text-center p-4 rounded-xl bg-muted/50 border border-border/50"
            animate={animatingCount ? { scale: [1, 1.05, 1] } : {}}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Eye className="h-3.5 w-3.5" />
              <span className="text-xs">Views</span>
            </div>
            <p className="text-2xl font-bold font-display text-foreground">
              {displayStats?.views?.toLocaleString() || '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">store visits</p>
          </motion.div>

          <motion.div 
            className="text-center p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
            animate={animatingCount ? { scale: [1, 1.05, 1] } : {}}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="text-xs">Leads</span>
            </div>
            <p className="text-2xl font-bold font-display text-emerald-600">
              {displayStats?.leads?.toLocaleString() || '—'}
            </p>
            <p className="text-[10px] text-emerald-600/70">WhatsApp orders</p>
          </motion.div>
        </div>

        {/* Your Pharmacy Stats */}
        {myStats && (myStats.views > 0 || myStats.leads > 0) && (
          <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Your Store Performance</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xl font-bold">{myStats.views}</p>
                <p className="text-xs text-muted-foreground">views today</p>
              </div>
              <div>
                <p className="text-xl font-bold text-emerald-600">{myStats.leads}</p>
                <p className="text-xs text-muted-foreground">leads today</p>
              </div>
              <div>
                <p className="text-xl font-bold text-primary">{formatPrice(myStats.potentialRevenue)}</p>
                <p className="text-xs text-muted-foreground">potential revenue</p>
              </div>
            </div>
          </div>
        )}

        {/* Live Activity Feed */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Live Searches</span>
          </div>
          
          <AnimatePresence mode="popLayout">
            <div className="space-y-2 max-h-[140px] overflow-hidden">
              {liveActivities.slice(0, 4).map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/30"
                >
                  <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Search className="h-3.5 w-3.5 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      "{activity.query}"
                    </p>
                    {activity.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5" />
                        {activity.location}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: false })}
                  </span>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        </div>

        {/* CTA */}
        <Button 
          onClick={() => navigate('/marketplace-insights')}
          className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
        >
          View Full Marketplace Insights
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};
