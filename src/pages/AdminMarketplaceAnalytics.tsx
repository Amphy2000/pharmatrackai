import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format, subDays } from "date-fns";
import {
  TrendingUp,
  Search,
  MessageCircle,
  BarChart3,
  PieChart,
  DollarSign,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Lock,
  CheckCircle,
  XCircle,
  Building2,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Header } from "@/components/Header";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";

const COLORS = ["hsl(var(--marketplace))", "hsl(var(--primary))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--destructive))"];

const AdminMarketplaceAnalytics = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: adminLoading } = usePlatformAdmin();
  const { formatPrice } = useCurrency();

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [adminLoading, isAdmin, navigate]);

  // Fetch all marketplace views
  const { data: viewsData, isLoading: loadingViews } = useQuery({
    queryKey: ["admin-marketplace-views"],
    queryFn: async () => {
      const startDate = subDays(new Date(), 7);
      const { data, error } = await supabase
        .from("marketplace_views")
        .select("*")
        .gte("viewed_at", startDate.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Fetch all WhatsApp leads
  const { data: leadsData, isLoading: loadingLeads } = useQuery({
    queryKey: ["admin-whatsapp-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_leads")
        .select("*, medications(selling_price)")
        .order("clicked_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Fetch all marketplace searches
  const { data: searchesData, isLoading: loadingSearches } = useQuery({
    queryKey: ["admin-marketplace-searches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_searches")
        .select("*")
        .order("searched_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Fetch pharmacies for lead distribution
  const { data: pharmaciesData } = useQuery({
    queryKey: ["admin-pharmacies-marketplace"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacies")
        .select("id, name, address");
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Fetch sent alerts for Termii monitoring
  const { data: sentAlertsData } = useQuery({
    queryKey: ["admin-sent-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sent_alerts")
        .select("*")
        .eq("alert_type", "whatsapp_lead")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Calculate metrics
  const totalViews = viewsData?.length || 0;
  const totalWhatsAppClicks = leadsData?.length || 0;
  const conversionRate = totalViews > 0 ? ((totalWhatsAppClicks / totalViews) * 100).toFixed(1) : 0;

  // Calculate total lead value and potential commission
  const totalLeadValue = leadsData?.reduce((sum, lead) => {
    const price = (lead as any).medications?.selling_price || 0;
    return sum + (price * (lead.quantity || 1));
  }, 0) || 0;
  const potentialCommission = totalLeadValue * 0.01; // 1% commission

  // Get zero-result searches (Supply-Demand Gap)
  const zeroResultSearches = searchesData
    ?.filter(s => s.results_count === 0)
    .reduce((acc: Record<string, number>, s) => {
      acc[s.search_query] = (acc[s.search_query] || 0) + 1;
      return acc;
    }, {}) || {};

  const topZeroResultSearches = Object.entries(zeroResultSearches)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }));

  // Market share by pharmacy
  const leadsByPharmacy = leadsData?.reduce((acc: Record<string, number>, lead) => {
    acc[lead.pharmacy_id] = (acc[lead.pharmacy_id] || 0) + 1;
    return acc;
  }, {}) || {};

  const marketShareData = Object.entries(leadsByPharmacy)
    .map(([pharmacyId, count]) => ({
      name: pharmaciesData?.find(p => p.id === pharmacyId)?.name || "Unknown",
      value: count,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Conversion funnel data
  const funnelData = [
    { name: "Page Visits", value: totalViews, fill: "hsl(var(--marketplace))" },
    { name: "WhatsApp Clicks", value: totalWhatsAppClicks, fill: "hsl(var(--success))" },
  ];

  // Location heatmap data
  const locationData = searchesData?.reduce((acc: Record<string, number>, s) => {
    const location = s.location_filter || "Unknown";
    acc[location] = (acc[location] || 0) + 1;
    return acc;
  }, {}) || {};

  const locationChartData = Object.entries(locationData)
    .filter(([loc]) => loc !== "Unknown" && loc !== "null")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([location, count]) => ({ location, searches: count }));

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <Lock className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
            <Button className="mt-6" onClick={() => navigate("/dashboard")}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-display">Marketplace Analytics</h1>
            <p className="text-muted-foreground">Global platform marketplace intelligence</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-marketplace/10 border-marketplace/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-marketplace/20 flex items-center justify-center">
                  <Eye className="h-6 w-6 text-marketplace" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{totalViews}</p>
                  <p className="text-sm text-muted-foreground">Explore Page Visits</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-success/10 border-success/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-success/20 flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{totalWhatsAppClicks}</p>
                  <p className="text-sm text-muted-foreground">WhatsApp Clicks</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{conversionRate}%</p>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-warning/10 border-warning/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-warning/20 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{formatPrice(potentialCommission)}</p>
                  <p className="text-sm text-muted-foreground">1% Commission Potential</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-marketplace" />
                Lead Conversion Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--marketplace))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Market Share */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Market Share by Pharmacy
              </CardTitle>
              <CardDescription>Which pharmacies are receiving the most leads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {marketShareData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={marketShareData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {marketShareData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No lead data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Supply-Demand Gap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Supply-Demand Gap
              </CardTitle>
              <CardDescription>Top searches that returned 0 results</CardDescription>
            </CardHeader>
            <CardContent>
              {topZeroResultSearches.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-auto">
                  {topZeroResultSearches.map((item, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-warning/10 rounded-lg border border-warning/20"
                    >
                      <span className="font-medium">{item.query}</span>
                      <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30">
                        {item.count} searches
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No zero-result searches found
                </p>
              )}
            </CardContent>
          </Card>

          {/* Location Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-marketplace" />
                Search Activity by Location
              </CardTitle>
              <CardDescription>Where are people searching from?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {locationChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={locationChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="location" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Bar dataKey="searches" fill="hsl(var(--marketplace))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No location data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Termii Monitor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-success" />
              SMS/WhatsApp Notification Log
            </CardTitle>
            <CardDescription>Monitor notifications sent to pharmacy owners</CardDescription>
          </CardHeader>
          <CardContent>
            {sentAlertsData && sentAlertsData.length > 0 ? (
              <div className="overflow-auto max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Pharmacy</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sentAlertsData.map((alert) => {
                      const pharmacy = pharmaciesData?.find(p => p.id === alert.pharmacy_id);
                      return (
                        <TableRow key={alert.id}>
                          <TableCell>
                            {alert.status === "sent" ? (
                              <Badge className="bg-success/10 text-success border-success/20 gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Sent
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                Failed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{pharmacy?.name || "Unknown"}</TableCell>
                          <TableCell className="text-muted-foreground">{alert.recipient_phone}</TableCell>
                          <TableCell className="max-w-xs truncate">{alert.message}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(alert.created_at), "MMM dd, HH:mm")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No SMS notifications sent yet
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminMarketplaceAnalytics;