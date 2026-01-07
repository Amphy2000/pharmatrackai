import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  TrendingUp,
  DollarSign,
  Award,
  Building2,
  UserPlus,
  Link as LinkIcon,
  Copy,
  ExternalLink,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface ReferralPartner {
  id: string;
  partner_code: string;
  partner_name: string;
  partner_type: string;
  organization_name: string | null;
  total_referrals: number;
  successful_signups: number;
  total_commission_earned: number;
  commission_type: string;
  commission_value: number;
  is_active: boolean;
  created_at: string;
  contact_email: string | null;
  contact_phone: string | null;
}

interface ReferralSignup {
  id: string;
  partner_code: string;
  pharmacy_id: string | null;
  status: string;
  signup_date: string;
  commission_amount: number | null;
  commission_paid: boolean;
  pharmacies?: {
    name: string;
    subscription_plan: string;
    subscription_status: string;
  } | null;
  referral_partners?: {
    partner_name: string;
    organization_name: string | null;
  } | null;
}

export const ReferralAnalyticsPanel = () => {
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Fetch all referral partners
  const { data: partners = [], isLoading: loadingPartners } = useQuery({
    queryKey: ["admin-referral-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_partners")
        .select("*")
        .order("successful_signups", { ascending: false });
      if (error) throw error;
      return data as ReferralPartner[];
    },
  });

  // Fetch all referral signups
  const { data: signups = [], isLoading: loadingSignups } = useQuery({
    queryKey: ["admin-referral-signups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_signups")
        .select(`
          *,
          pharmacies(name, subscription_plan, subscription_status),
          referral_partners(partner_name, organization_name)
        `)
        .order("signup_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as ReferralSignup[];
    },
  });

  // Calculate metrics
  const totalPartners = partners.length;
  const activePartners = partners.filter(p => p.is_active).length;
  const totalReferrals = partners.reduce((sum, p) => sum + p.total_referrals, 0);
  const totalSuccessfulSignups = partners.reduce((sum, p) => sum + p.successful_signups, 0);
  const conversionRate = totalReferrals > 0 ? ((totalSuccessfulSignups / totalReferrals) * 100).toFixed(1) : "0";
  const totalCommissionPaid = partners.reduce((sum, p) => sum + p.total_commission_earned, 0);
  const pendingCommission = signups
    .filter(s => !s.commission_paid && s.status === "converted")
    .reduce((sum, s) => sum + (s.commission_amount || 0), 0);

  // Partner type breakdown
  const professionalPartners = partners.filter(p => p.partner_type === "professional").length;
  const ambassadorPartners = partners.filter(p => p.partner_type === "ambassador").length;

  const copyPartnerLink = (code: string) => {
    const url = `${window.location.origin}/p/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    toast({ title: "Partner link copied!" });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "converted":
        return <Badge className="bg-success/10 text-success border-success/20 gap-1"><CheckCircle className="h-3 w-3" />Converted</Badge>;
      case "pending":
        return <Badge className="bg-warning/10 text-warning border-warning/20 gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "professional":
        return <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1"><Award className="h-3 w-3" />Professional</Badge>;
      case "ambassador":
        return <Badge className="bg-gradient-to-r from-primary to-marketplace text-white border-0 gap-1"><Users className="h-3 w-3" />Ambassador</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (loadingPartners || loadingSignups) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-marketplace to-primary flex items-center justify-center">
          <Users className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-display">Referral & Partner Analytics</h2>
          <p className="text-sm text-muted-foreground">Track partner performance and commissions</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalPartners}</p>
                  <p className="text-xs text-muted-foreground">Total Partners</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-marketplace/10 border-marketplace/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-marketplace/20 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-marketplace" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalSuccessfulSignups}</p>
                  <p className="text-xs text-muted-foreground">Referred Signups</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-success/10 border-success/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-success/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{conversionRate}%</p>
                  <p className="text-xs text-muted-foreground">Conversion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-warning/10 border-warning/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-warning/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatPrice(pendingCommission)}</p>
                  <p className="text-xs text-muted-foreground">Pending Payout</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Partner Type Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                <Award className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold">Professional Partners</p>
                <p className="text-xs text-muted-foreground">ACPN, Associations</p>
              </div>
            </div>
            <p className="text-2xl font-bold">{professionalPartners}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-marketplace/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Individual Ambassadors</p>
                <p className="text-xs text-muted-foreground">One-time bounties</p>
              </div>
            </div>
            <p className="text-2xl font-bold">{ambassadorPartners}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="partners" className="space-y-4">
        <TabsList className="glass-card p-1">
          <TabsTrigger value="partners" className="gap-2">
            <Award className="h-4 w-4" />
            Partners
          </TabsTrigger>
          <TabsTrigger value="signups" className="gap-2">
            <Building2 className="h-4 w-4" />
            Referred Signups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="partners">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">All Referral Partners</CardTitle>
              <CardDescription>Manage partners and view their performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partner</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Referrals</TableHead>
                      <TableHead className="text-center">Signups</TableHead>
                      <TableHead className="text-center">Rate</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead>Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partners.map((partner) => (
                      <TableRow key={partner.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{partner.organization_name || partner.partner_name}</p>
                            <p className="text-xs text-muted-foreground">{partner.contact_email || partner.partner_code}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(partner.partner_type)}</TableCell>
                        <TableCell className="text-center font-medium">{partner.total_referrals}</TableCell>
                        <TableCell className="text-center font-medium">{partner.successful_signups}</TableCell>
                        <TableCell className="text-center">
                          {partner.total_referrals > 0 
                            ? ((partner.successful_signups / partner.total_referrals) * 100).toFixed(0) + "%"
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatPrice(partner.total_commission_earned)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              onClick={() => copyPartnerLink(partner.partner_code)}
                            >
                              {copiedCode === partner.partner_code ? (
                                <CheckCircle className="h-4 w-4 text-success" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              onClick={() => window.open(`/p/${partner.partner_code}`, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {partners.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No referral partners yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signups">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Referred Pharmacy Signups</CardTitle>
              <CardDescription>Track signups from partner referrals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pharmacy</TableHead>
                      <TableHead>Referred By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {signups.map((signup) => (
                      <TableRow key={signup.id}>
                        <TableCell>
                          <p className="font-medium">{signup.pharmacies?.name || "Pending Signup"}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">
                            {signup.referral_partners?.organization_name || signup.referral_partners?.partner_name || signup.partner_code}
                          </p>
                        </TableCell>
                        <TableCell>{getStatusBadge(signup.status)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {signup.pharmacies?.subscription_plan || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {signup.commission_amount ? formatPrice(signup.commission_amount) : "—"}
                          {signup.commission_paid && (
                            <Badge className="ml-2 bg-success/10 text-success text-[10px]">Paid</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(signup.signup_date), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                    {signups.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No referred signups yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
