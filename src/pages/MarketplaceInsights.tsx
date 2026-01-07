import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { 
  Eye, 
  TrendingUp, 
  MessageCircle, 
  Package,
  AlertTriangle,
  ArrowLeft,
  ToggleLeft,
  ToggleRight,
  Search,
  Star,
  Clock,
  Users,
  Rocket,
  EyeOff,
  Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { usePharmacy } from "@/hooks/usePharmacy";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { FeatureDurationSelect } from "@/components/inventory/FeatureDurationSelect";

const MarketplaceInsights = () => {
  const { pharmacy } = usePharmacy();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const [searchFilter, setSearchFilter] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [boostDialogOpen, setBoostDialogOpen] = useState(false);
  const [selectedMedForBoost, setSelectedMedForBoost] = useState<{ id: string; name: string } | null>(null);

  // Fetch store views for the last 7 days
  const { data: viewsData } = useQuery({
    queryKey: ["marketplace-views", pharmacy?.id],
    queryFn: async () => {
      if (!pharmacy?.id) return [];
      
      const startDate = subDays(new Date(), 7);
      const { data, error } = await supabase
        .from("marketplace_views")
        .select("viewed_at")
        .eq("pharmacy_id", pharmacy.id)
        .gte("viewed_at", startDate.toISOString());

      if (error) throw error;

      // Group by date
      const grouped: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const date = format(subDays(new Date(), i), "MMM dd");
        grouped[date] = 0;
      }

      data?.forEach((view) => {
        const date = format(new Date(view.viewed_at), "MMM dd");
        if (grouped[date] !== undefined) {
          grouped[date]++;
        }
      });

      return Object.entries(grouped).map(([date, views]) => ({ date, views }));
    },
    enabled: !!pharmacy?.id,
  });

  // Fetch WhatsApp leads (full history)
  const { data: leadsData } = useQuery({
    queryKey: ["whatsapp-leads-all", pharmacy?.id],
    queryFn: async () => {
      if (!pharmacy?.id) return [];
      
      const { data, error } = await supabase
        .from("whatsapp_leads")
        .select("*")
        .eq("pharmacy_id", pharmacy.id)
        .order("clicked_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!pharmacy?.id,
  });

  // Fetch medications for Go Live management
  const { data: medications, refetch: refetchMedications } = useQuery({
    queryKey: ["marketplace-medications", pharmacy?.id, searchFilter],
    queryFn: async () => {
      if (!pharmacy?.id) return [];
      
      let query = supabase
        .from("medications")
        .select("id, name, category, current_stock, selling_price, is_public, is_shelved, is_featured")
        .eq("pharmacy_id", pharmacy.id)
        .eq("is_shelved", true)
        .order("name");

      if (searchFilter) {
        query = query.ilike("name", `%${searchFilter}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!pharmacy?.id,
  });

  // Fetch top searched drugs that are out of stock
  const { data: outOfStockSearches } = useQuery({
    queryKey: ["out-of-stock-searches", pharmacy?.id],
    queryFn: async () => {
      if (!pharmacy?.id) return [];
      
      const { data: searches } = await supabase
        .from("marketplace_searches")
        .select("search_query")
        .order("searched_at", { ascending: false })
        .limit(100);

      if (!searches) return [];

      const { data: pharmacyMeds } = await supabase
        .from("medications")
        .select("name, current_stock")
        .eq("pharmacy_id", pharmacy.id);

      const pharmacyMedNames = new Set(
        pharmacyMeds?.filter(m => m.current_stock > 0).map(m => m.name.toLowerCase()) || []
      );

      const searchCounts: Record<string, number> = {};
      searches.forEach((s) => {
        const query = s.search_query.toLowerCase();
        if (!pharmacyMedNames.has(query)) {
          searchCounts[s.search_query] = (searchCounts[s.search_query] || 0) + 1;
        }
      });

      return Object.entries(searchCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([drug, count]) => ({ drug, count }));
    },
    enabled: !!pharmacy?.id,
  });

  const togglePublicStatus = async (medicationId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("medications")
        .update({ is_public: !currentStatus })
        .eq("id", medicationId);

      if (error) throw error;

      toast({
        title: currentStatus ? "Removed from Marketplace" : "Listed on Marketplace",
        description: currentStatus 
          ? "This product is no longer visible to the public" 
          : "This product is now visible on the public marketplace",
      });

      refetchMedications();
    } catch (error) {
      console.error("Error toggling public status:", error);
      toast({
        title: "Error",
        description: "Failed to update marketplace status",
        variant: "destructive",
      });
    }
  };

  const toggleFeaturedStatus = async (medicationId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("medications")
        .update({ is_featured: !currentStatus })
        .eq("id", medicationId);

      if (error) throw error;

      toast({
        title: currentStatus ? "Removed from Featured" : "Added to Featured",
        description: currentStatus 
          ? "This product will no longer appear in the Promoted section" 
          : "This product will appear in the Promoted section",
      });

      refetchMedications();
    } catch (error) {
      console.error("Error toggling featured status:", error);
      toast({
        title: "Error",
        description: "Failed to update featured status",
        variant: "destructive",
      });
    }
  };

  // Toggle price visibility - sets selling_price to null to hide, or keeps it visible
  const togglePriceVisibility = async (medicationId: string, currentPrice: number | null) => {
    try {
      // If price is currently set, we store it in metadata and set to null
      // If price is null, we restore from metadata or do nothing
      const med = medications?.find(m => m.id === medicationId);
      
      if (currentPrice !== null) {
        // Hide price - store in metadata first, then set to null
        const { error } = await supabase
          .from("medications")
          .update({ 
            selling_price: null,
            metadata: { hidden_price: currentPrice }
          })
          .eq("id", medicationId);

        if (error) throw error;

        toast({
          title: "Price Hidden",
          description: "Customers will see 'Price on Request' and contact you via WhatsApp",
        });
      } else {
        // Show price - we'd need to have a stored price or prompt to enter one
        toast({
          title: "Set a Price",
          description: "Go to Inventory to set a selling price for this product",
        });
        return;
      }

      refetchMedications();
    } catch (error) {
      console.error("Error toggling price visibility:", error);
      toast({
        title: "Error",
        description: "Failed to update price visibility",
        variant: "destructive",
      });
    }
  };

  const handleBoost = (med: { id: string; name: string }) => {
    setSelectedMedForBoost(med);
    setBoostDialogOpen(true);
  };

  const totalViews = viewsData?.reduce((sum, day) => sum + day.views, 0) || 0;
  const totalLeads = leadsData?.length || 0;
  const listedProducts = medications?.filter(m => m.is_public).length || 0;
  const featuredProducts = medications?.filter(m => m.is_featured).length || 0;
  const totalLeadValue = leadsData?.reduce((sum, lead) => {
    const med = medications?.find(m => m.id === (lead as any).medication_id);
    return sum + ((med?.selling_price || 0) * (lead.quantity || 1));
  }, 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-marketplace text-marketplace-foreground py-6 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Marketplace Insights</h1>
              <p className="text-sm opacity-90">Track your public storefront performance</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <Eye className="h-6 w-6 mx-auto mb-2" />
              <p className="text-2xl font-bold">{totalViews}</p>
              <p className="text-sm opacity-80">Store Views (7d)</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <MessageCircle className="h-6 w-6 mx-auto mb-2" />
              <p className="text-2xl font-bold">{totalLeads}</p>
              <p className="text-sm opacity-80">WhatsApp Leads</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <Package className="h-6 w-6 mx-auto mb-2" />
              <p className="text-2xl font-bold">{listedProducts}</p>
              <p className="text-sm opacity-80">Products Listed</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <TrendingUp className="h-6 w-6 mx-auto mb-2" />
              <p className="text-2xl font-bold">{formatPrice(totalLeadValue)}</p>
              <p className="text-sm opacity-80">Lead Value</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="overview" className="gap-2">
              <Eye className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="leads" className="gap-2">
              <Users className="h-4 w-4" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Views Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-marketplace" />
                  Store Views - Last 7 Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={viewsData || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="views" 
                        stroke="hsl(var(--marketplace))" 
                        strokeWidth={3}
                        dot={{ fill: "hsl(var(--marketplace))", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Top Searched Drugs (Out of Stock) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    Opportunity Alert
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    People are searching for these drugs but you don't have them in stock
                  </p>
                </CardHeader>
                <CardContent>
                  {outOfStockSearches && outOfStockSearches.length > 0 ? (
                    <div className="space-y-3 max-h-80 overflow-auto">
                      {outOfStockSearches.map((item, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-3 bg-warning/10 rounded-lg border border-warning/20"
                        >
                          <span className="font-medium">{item.drug}</span>
                          <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30">
                            {item.count} searches
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mb-4">
                        <Check className="h-6 w-6 text-success" />
                      </div>
                      <p className="text-muted-foreground">No missed opportunities found.</p>
                      <p className="text-sm text-muted-foreground mt-1">You're stocking what people need!</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent WhatsApp Leads */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-[#25D366]" />
                    Recent WhatsApp Leads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {leadsData && leadsData.length > 0 ? (
                    <div className="max-h-80 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Drug</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leadsData.slice(0, 10).map((lead) => (
                            <TableRow key={lead.id}>
                              <TableCell className="font-medium">{lead.medication_name}</TableCell>
                              <TableCell>{lead.quantity}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {format(new Date(lead.clicked_at), "MMM dd, HH:mm")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                        <MessageCircle className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">No WhatsApp leads yet.</p>
                      <p className="text-sm text-muted-foreground mt-1">List products to start receiving orders!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-marketplace" />
                  Marketplace Leads History
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  All drugs that customers searched and clicked to order
                </p>
              </CardHeader>
              <CardContent>
                {leadsData && leadsData.length > 0 ? (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Drug Name</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Date & Time</TableHead>
                          <TableHead className="text-right">Est. Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leadsData.map((lead) => {
                          const med = medications?.find(m => m.id === (lead as any).medication_id);
                          const value = (med?.selling_price || 0) * (lead.quantity || 1);
                          return (
                            <TableRow key={lead.id}>
                              <TableCell className="font-medium">{lead.medication_name}</TableCell>
                              <TableCell>{lead.quantity}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {format(new Date(lead.clicked_at), "MMM dd, yyyy HH:mm")}
                              </TableCell>
                              <TableCell className="text-right font-medium text-marketplace">
                                {formatPrice(value)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-12">
                    No leads yet. List products on the marketplace to start receiving leads!
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-marketplace" />
                  Go Live Management
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Toggle products on/off the public marketplace and feature them in the Promoted section
                </p>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="max-h-[500px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="hidden sm:table-cell">Category</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead className="text-center">Price</TableHead>
                        <TableHead className="text-center">Boost</TableHead>
                        <TableHead className="text-right">Marketplace</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {medications?.map((med) => {
                        const hasPrice = med.selling_price !== null && med.selling_price > 0;
                        return (
                          <TableRow key={med.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-[150px]">{med.name}</span>
                                {med.is_featured && (
                                  <Star className="h-4 w-4 text-marketplace fill-marketplace flex-shrink-0" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant="outline">{med.category}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={med.current_stock > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}
                              >
                                {med.current_stock}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {hasPrice ? (
                                <div className="flex items-center justify-center gap-2">
                                  <span className="text-sm font-medium">{formatPrice(med.selling_price!)}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => togglePriceVisibility(med.id, med.selling_price)}
                                    title="Hide price (show 'Price on Request')"
                                  >
                                    <EyeOff className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/50 text-[10px]">
                                  On Request
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {med.is_featured ? (
                                <Badge variant="secondary" className="text-xs bg-marketplace/10 text-marketplace">
                                  <Star className="h-3 w-3 mr-1 fill-current" />
                                  Live
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1 border-marketplace/30 text-marketplace hover:bg-marketplace/10"
                                  onClick={() => handleBoost({ id: med.id, name: med.name })}
                                  disabled={!med.is_public || med.current_stock === 0}
                                >
                                  <Rocket className="h-3 w-3" />
                                  Boost
                                </Button>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {med.is_public ? (
                                  <ToggleRight 
                                    className="h-8 w-8 text-marketplace cursor-pointer hover:scale-110 transition-transform" 
                                    onClick={() => togglePublicStatus(med.id, true)}
                                  />
                                ) : (
                                  <ToggleLeft 
                                    className="h-8 w-8 text-muted-foreground cursor-pointer hover:scale-110 transition-transform" 
                                    onClick={() => togglePublicStatus(med.id, false)}
                                  />
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Boost Dialog - Paystack Payment Required */}
        {selectedMedForBoost && (
          <FeatureDurationSelect
            medicationId={selectedMedForBoost.id}
            medicationName={selectedMedForBoost.name}
            open={boostDialogOpen}
            onOpenChange={(open) => {
              setBoostDialogOpen(open);
              if (!open) setSelectedMedForBoost(null);
            }}
          />
        )}
      </main>
    </div>
  );
};

export default MarketplaceInsights;