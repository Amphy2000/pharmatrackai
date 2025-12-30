import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { 
  Globe, 
  Search, 
  Eye, 
  MessageCircle, 
  MapPin,
  Users,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface RecentSearch {
  id: string;
  search_query: string;
  location_filter: string | null;
  searched_at: string;
}

export const LandingMarketplaceProof = () => {
  const navigate = useNavigate();
  const [displayedSearches, setDisplayedSearches] = useState<RecentSearch[]>([]);

  // Fetch platform-wide marketplace stats (last 24 hours)
  const { data: platformStats } = useQuery({
    queryKey: ['landing-marketplace-stats'],
    queryFn: async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const [searchesResult, viewsResult, leadsResult, pharmaciesResult] = await Promise.all([
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
          .gte('clicked_at', yesterday.toISOString()),
        supabase
          .from('pharmacies')
          .select('*', { count: 'exact', head: true })
      ]);

      return {
        searches: searchesResult.count || 0,
        views: viewsResult.count || 0,
        leads: leadsResult.count || 0,
        pharmacies: pharmaciesResult.count || 0
      };
    },
    refetchInterval: 30000,
    staleTime: 10000
  });

  // Fetch recent searches to show live activity
  const { data: recentSearches } = useQuery({
    queryKey: ['landing-recent-searches'],
    queryFn: async () => {
      const { data } = await supabase
        .from('marketplace_searches')
        .select('id, search_query, location_filter, searched_at')
        .order('searched_at', { ascending: false })
        .limit(10);
      return (data || []) as RecentSearch[];
    },
    refetchInterval: 15000,
    staleTime: 5000
  });

  // Rotate through searches for visual effect
  useEffect(() => {
    if (!recentSearches?.length) return;
    setDisplayedSearches(recentSearches.slice(0, 4));
  }, [recentSearches]);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-cyan-500/10 border border-violet-500/20 p-8">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-2 w-2 rounded-full bg-violet-400/20"
            initial={{ 
              x: Math.random() * 100 + '%', 
              y: Math.random() * 100 + '%',
              opacity: 0.3 
            }}
            animate={{ 
              y: [null, '-20%', null],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ 
              duration: 4 + i, 
              repeat: Infinity, 
              ease: 'easeInOut',
              delay: i * 0.5
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Globe className="h-7 w-7 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold font-display flex items-center gap-3">
              Patient Discovery Marketplace
              <Badge className="bg-success/20 text-success border-success/30">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse mr-1.5" />
                LIVE
              </Badge>
            </h3>
            <p className="text-muted-foreground">Real patients searching for medications right now</p>
          </div>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <motion.div 
          className="text-center p-5 rounded-2xl bg-background/50 backdrop-blur border border-border/50"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-2">
            <Search className="h-4 w-4" />
            <span className="text-sm font-medium">Searches Today</span>
          </div>
          <p className="text-3xl font-bold font-display text-foreground">
            {platformStats?.searches.toLocaleString() || '—'}
          </p>
        </motion.div>

        <motion.div 
          className="text-center p-5 rounded-2xl bg-background/50 backdrop-blur border border-border/50"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-2">
            <Eye className="h-4 w-4" />
            <span className="text-sm font-medium">Store Views</span>
          </div>
          <p className="text-3xl font-bold font-display text-foreground">
            {platformStats?.views.toLocaleString() || '—'}
          </p>
        </motion.div>

        <motion.div 
          className="text-center p-5 rounded-2xl bg-emerald-500/10 backdrop-blur border border-emerald-500/20"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-center gap-1.5 text-emerald-600 mb-2">
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm font-medium">WhatsApp Orders</span>
          </div>
          <p className="text-3xl font-bold font-display text-emerald-600">
            {platformStats?.leads.toLocaleString() || '—'}
          </p>
        </motion.div>

        <motion.div 
          className="text-center p-5 rounded-2xl bg-primary/10 backdrop-blur border border-primary/20"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-center gap-1.5 text-primary mb-2">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">Pharmacies</span>
          </div>
          <p className="text-3xl font-bold font-display text-primary">
            {platformStats?.pharmacies.toLocaleString() || '—'}
          </p>
        </motion.div>
      </div>

      {/* Live Searches Feed */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-violet-500" />
          <span className="font-semibold">Live Patient Searches</span>
          <span className="text-xs text-muted-foreground">(refreshes every 15 seconds)</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {displayedSearches.map((search, index) => (
              <motion.div
                key={search.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-background/70 backdrop-blur border border-border/50"
              >
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <Search className="h-5 w-5 text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-foreground">
                    "{search.search_query}"
                  </p>
                  {search.location_filter && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {search.location_filter}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(search.searched_at), { addSuffix: true })}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {displayedSearches.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Loading live searches...</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
        <div>
          <p className="font-semibold text-lg">Join the marketplace and get discovered by patients</p>
          <p className="text-sm text-muted-foreground">Your products appear when patients search nearby</p>
        </div>
        <Button 
          onClick={() => navigate('/auth')}
          size="lg"
          className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25 whitespace-nowrap"
        >
          Start Free Trial
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};
