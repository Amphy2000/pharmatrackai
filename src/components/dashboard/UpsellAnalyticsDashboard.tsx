import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUpsellAnalytics } from '@/hooks/useUpsellAnalytics';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Target, DollarSign, Package, Sparkles, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';

const UpsellAnalyticsDashboard = () => {
  const { data: analytics, isLoading } = useUpsellAnalytics(30);
  const { formatPrice } = useCurrency();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No upsell analytics data yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Start using the Smart Upsell feature at checkout to see insights here
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = analytics.dailyStats.slice(-14).map(d => ({
    ...d,
    date: format(new Date(d.date), 'MMM d'),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Smart Upsell Analytics</h2>
          <p className="text-muted-foreground">Track how AI-powered suggestions are driving additional sales</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Last 30 days
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Total Suggestions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.totalSuggestions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">AI recommendations shown</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-green-600">
              <ArrowUpRight className="h-4 w-4" />
              Accepted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{analytics.totalAccepted.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Items added to cart</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-amber-600">
              <TrendingUp className="h-4 w-4" />
              Acceptance Rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{analytics.acceptanceRate.toFixed(1)}%</div>
            <Progress value={analytics.acceptanceRate} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-emerald-600">
              <DollarSign className="h-4 w-4" />
              Revenue Generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{formatPrice(analytics.revenueGenerated)}</div>
            <p className="text-xs text-muted-foreground mt-1">From accepted upsells</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily Acceptance Trend</CardTitle>
            <CardDescription>Suggestions shown vs accepted over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="suggestionsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="acceptedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="suggestions" 
                    stroke="hsl(var(--primary))" 
                    fill="url(#suggestionsGradient)" 
                    name="Shown"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="accepted" 
                    stroke="hsl(142, 76%, 36%)" 
                    fill="url(#acceptedGradient)" 
                    name="Accepted"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Performing Products</CardTitle>
            <CardDescription>Most frequently accepted upsell suggestions</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topProducts.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No product data yet</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {analytics.topProducts.slice(0, 6).map((product, index) => (
                  <div key={product.medicationId} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.medicationName}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.timesAccepted} accepted of {product.timesShown} shown
                      </p>
                    </div>
                    <Badge 
                      variant={product.acceptanceRate >= 30 ? "default" : "secondary"}
                      className="flex-shrink-0"
                    >
                      {product.acceptanceRate.toFixed(0)}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Average Acceptance Rate</p>
              <p className="text-lg font-semibold mt-1">
                {analytics.acceptanceRate >= 20 ? '✅ Healthy' : '⚠️ Room to improve'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Industry benchmark: 15-25%
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Revenue per Suggestion</p>
              <p className="text-lg font-semibold mt-1">
                {analytics.totalSuggestions > 0 
                  ? formatPrice(analytics.revenueGenerated / analytics.totalSuggestions)
                  : formatPrice(0)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Average value added per AI suggestion
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Monthly ROI Potential</p>
              <p className="text-lg font-semibold mt-1">
                {formatPrice(analytics.revenueGenerated)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Additional revenue from smart upsells
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpsellAnalyticsDashboard;
