import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import {
  Eye,
  MousePointer,
  TrendingUp,
  MapPin,
  MessageCircle,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { usePharmacy } from "@/hooks/usePharmacy";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { motion } from "framer-motion";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

const PharmacyAnalyticsPanel = () => {
  const { pharmacy } = usePharmacy();
  const { formatPrice } = useCurrency();

  // Fetch views data for the last 14 days
  const { data: viewsData } = useQuery({
    queryKey: ["pharmacy-analytics-views", pharmacy?.id],
    queryFn: async () => {
      if (!pharmacy?.id) return [];

      const startDate = subDays(new Date(), 14);
      const { data, error } = await supabase
        .from("marketplace_views")
        .select("viewed_at, visit_type, search_query")
        .eq("pharmacy_id", pharmacy.id)
        .gte("viewed_at", startDate.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!pharmacy?.id,
  });

  // Fetch WhatsApp leads
  const { data: leadsData } = useQuery({
    queryKey: ["pharmacy-analytics-leads", pharmacy?.id],
    queryFn: async () => {
      if (!pharmacy?.id) return [];

      const startDate = subDays(new Date(), 14);
      const { data, error } = await supabase
        .from("whatsapp_leads")
        .select("*")
        .eq("pharmacy_id", pharmacy.id)
        .gte("clicked_at", startDate.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!pharmacy?.id,
  });

  // Fetch marketplace searches to understand neighborhood demand
  const { data: searchesData } = useQuery({
    queryKey: ["neighborhood-demand", pharmacy?.id],
    queryFn: async () => {
      if (!pharmacy?.id) return [];

      const startDate = subDays(new Date(), 7);
      const { data, error } = await supabase
        .from("marketplace_searches")
        .select("search_query, location_filter, searched_at")
        .gte("searched_at", startDate.toISOString())
        .limit(200);

      if (error) throw error;
      return data || [];
    },
    enabled: !!pharmacy?.id,
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const views = viewsData || [];
    const leads = leadsData || [];
    const searches = searchesData || [];

    // This week vs last week comparison
    const now = new Date();
    const thisWeekStart = startOfWeek(now);
    const lastWeekStart = subDays(thisWeekStart, 7);

    const thisWeekViews = views.filter(
      (v) => new Date(v.viewed_at) >= thisWeekStart
    ).length;
    const lastWeekViews = views.filter(
      (v) =>
        new Date(v.viewed_at) >= lastWeekStart &&
        new Date(v.viewed_at) < thisWeekStart
    ).length;

    const thisWeekLeads = leads.filter(
      (l) => new Date(l.clicked_at) >= thisWeekStart
    ).length;
    const lastWeekLeads = leads.filter(
      (l) =>
        new Date(l.clicked_at) >= lastWeekStart &&
        new Date(l.clicked_at) < thisWeekStart
    ).length;

    const viewsChange =
      lastWeekViews > 0
        ? ((thisWeekViews - lastWeekViews) / lastWeekViews) * 100
        : thisWeekViews > 0
        ? 100
        : 0;
    const leadsChange =
      lastWeekLeads > 0
        ? ((thisWeekLeads - lastWeekLeads) / lastWeekLeads) * 100
        : thisWeekLeads > 0
        ? 100
        : 0;

    // Click rate (leads / views)
    const clickRate = views.length > 0 ? (leads.length / views.length) * 100 : 0;

    // Group views by date for chart
    const viewsByDate: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const date = format(subDays(now, i), "MMM dd");
      viewsByDate[date] = 0;
    }
    views.forEach((v) => {
      const date = format(new Date(v.viewed_at), "MMM dd");
      if (viewsByDate[date] !== undefined) {
        viewsByDate[date]++;
      }
    });

    // Group leads by date for chart
    const leadsByDate: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const date = format(subDays(now, i), "MMM dd");
      leadsByDate[date] = 0;
    }
    leads.forEach((l) => {
      const date = format(new Date(l.clicked_at), "MMM dd");
      if (leadsByDate[date] !== undefined) {
        leadsByDate[date]++;
      }
    });

    const chartData = Object.entries(viewsByDate).map(([date, views]) => ({
      date,
      views,
      leads: leadsByDate[date] || 0,
    }));

    // Top searched drugs in the area
    const searchCounts: Record<string, number> = {};
    searches.forEach((s) => {
      if (s.search_query && !s.search_query.startsWith("[CUSTOM_LOCATION]")) {
        const query = s.search_query.toLowerCase().trim();
        searchCounts[query] = (searchCounts[query] || 0) + 1;
      }
    });
    const topSearches = Object.entries(searchCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([drug, count]) => ({ drug, count }));

    // Neighborhood breakdown from location filters
    const neighborhoodCounts: Record<string, number> = {};
    searches.forEach((s) => {
      if (s.location_filter) {
        neighborhoodCounts[s.location_filter] =
          (neighborhoodCounts[s.location_filter] || 0) + 1;
      }
    });
    const topNeighborhoods = Object.entries(neighborhoodCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      totalViews: views.length,
      totalLeads: leads.length,
      thisWeekViews,
      thisWeekLeads,
      viewsChange,
      leadsChange,
      clickRate,
      chartData,
      topSearches,
      topNeighborhoods,
    };
  }, [viewsData, leadsData, searchesData]);

  const chartConfig = {
    views: {
      label: "Views",
      color: "hsl(var(--marketplace))",
    },
    leads: {
      label: "WhatsApp Clicks",
      color: "hsl(142, 76%, 36%)",
    },
  };

  const neighborhoodColors = [
    "hsl(var(--primary))",
    "hsl(var(--marketplace))",
    "hsl(142, 76%, 36%)",
    "hsl(38, 92%, 50%)",
    "hsl(280, 65%, 60%)",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-marketplace to-primary flex items-center justify-center shadow-lg shadow-marketplace/20">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Marketplace Analytics
            </h2>
            <p className="text-xs text-muted-foreground">
              Your store's performance in the public marketplace
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link to="/marketplace-insights">
            <Sparkles className="h-4 w-4" />
            Full Insights
          </Link>
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-marketplace/10 to-marketplace/5 border-marketplace/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <Eye className="h-5 w-5 text-marketplace" />
                {metrics.viewsChange !== 0 && (
                  <Badge
                    variant={metrics.viewsChange > 0 ? "default" : "destructive"}
                    className="text-[10px] h-5"
                  >
                    {metrics.viewsChange > 0 ? (
                      <ArrowUpRight className="h-3 w-3 mr-0.5" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 mr-0.5" />
                    )}
                    {Math.abs(metrics.viewsChange).toFixed(0)}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold text-foreground">
                {metrics.totalViews}
              </p>
              <p className="text-xs text-muted-foreground">Store Views (14d)</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                {metrics.leadsChange !== 0 && (
                  <Badge
                    variant={metrics.leadsChange > 0 ? "default" : "destructive"}
                    className="text-[10px] h-5"
                  >
                    {metrics.leadsChange > 0 ? (
                      <ArrowUpRight className="h-3 w-3 mr-0.5" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 mr-0.5" />
                    )}
                    {Math.abs(metrics.leadsChange).toFixed(0)}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold text-foreground">
                {metrics.totalLeads}
              </p>
              <p className="text-xs text-muted-foreground">WhatsApp Clicks</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <MousePointer className="h-5 w-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {metrics.clickRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">Click Rate</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {metrics.thisWeekViews}
              </p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Views & Leads Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-marketplace" />
              Views & Engagement Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.chartData}>
                    <defs>
                      <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="hsl(var(--marketplace))"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(var(--marketplace))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="views"
                      stroke="hsl(var(--marketplace))"
                      fill="url(#viewsGradient)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="leads"
                      stroke="hsl(142, 76%, 36%)"
                      fill="url(#leadsGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Neighborhood Demand */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Neighborhood Demand
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.topNeighborhoods.length > 0 ? (
              <div className="space-y-3">
                {metrics.topNeighborhoods.map((n, i) => (
                  <div key={n.name} className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: neighborhoodColors[i] }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground">
                          {n.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {n.count} searches
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${
                              (n.count / metrics.topNeighborhoods[0].count) * 100
                            }%`,
                          }}
                          transition={{ duration: 0.5, delay: i * 0.1 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: neighborhoodColors[i] }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <MapPin className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No neighborhood data yet</p>
                <p className="text-xs">Data will appear as customers search</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Searched Drugs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-warning" />
            Top Searched Drugs in Your Area
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Stock these to capture more customers
          </p>
        </CardHeader>
        <CardContent>
          {metrics.topSearches.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {metrics.topSearches.map((s, i) => (
                <motion.div
                  key={s.drug}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Badge
                    variant="secondary"
                    className="px-3 py-1.5 text-xs capitalize bg-gradient-to-r from-primary/10 to-marketplace/10 border border-primary/20"
                  >
                    {s.drug}
                    <span className="ml-2 text-muted-foreground">({s.count})</span>
                  </Badge>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-20 text-muted-foreground">
              <p className="text-sm">Search data will appear as customers search</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PharmacyAnalyticsPanel;
