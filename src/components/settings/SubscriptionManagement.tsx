import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSubscription } from '@/hooks/useSubscription';
import { usePharmacy } from '@/hooks/usePharmacy';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Crown, Check, Zap, Calendar, CreditCard, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const plans = [
  {
    id: 'starter',
    name: 'Starter (Ownership)',
    price: 150000,
    priceDisplay: '₦150,000',
    priceLabel: 'Setup',
    subtext: '+ ₦10,000/month for cloud maintenance',
    monthlyFee: 10000,
    isHybrid: true,
    period: '',
    features: [
      'Up to 1,000 medications',
      '1 user account',
      'Basic POS',
      'Data Migration Support',
      'Cloud Backups',
    ],
    popular: false,
    buttonText: 'Get Started',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 35000,
    priceDisplay: '₦35,000',
    priceLabel: '',
    subtext: '₦0 Setup Fee',
    monthlyFee: 35000,
    isHybrid: false,
    period: '/month',
    features: [
      'Unlimited medications',
      'Up to 5 users',
      'AI Expiry Insights',
      'Advanced Analytics',
      'Multi-branch support',
    ],
    popular: true,
    buttonText: 'Subscribe',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 1000000,
    priceDisplay: '₦1,000,000+',
    priceLabel: '',
    subtext: 'Custom pricing',
    monthlyFee: 0,
    isHybrid: false,
    period: '',
    features: [
      'Unlimited users',
      'Custom integrations',
      'Dedicated account manager',
      'On-premise installation option',
    ],
    popular: false,
    buttonText: 'Contact Sales',
  },
];

export const SubscriptionManagement = () => {
  const navigate = useNavigate();
  const { state, plan: currentPlan, daysRemaining, isTrial, isExpired } = useSubscription();
  const { pharmacy } = usePharmacy();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Fetch billing history
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['subscription-payments', pharmacy?.id],
    queryFn: async () => {
      if (!pharmacy?.id) return [];
      const { data, error } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('pharmacy_id', pharmacy.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!pharmacy?.id,
  });

  const handleUpgrade = async (planId: string) => {
    setIsProcessing(planId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Login required',
          description: 'Please sign in to upgrade your subscription.',
          variant: 'destructive',
        });
        navigate('/auth');
        return;
      }

      // Validate session with backend (fixes "session_not_found" stale sessions)
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        await supabase.auth.signOut();
        toast({
          title: 'Session expired',
          description: 'Please sign in again to continue.',
          variant: 'destructive',
        });
        navigate('/auth');
        return;
      }

      const response = await supabase.functions.invoke('create-payment', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          plan: planId,
          callback_url: `${window.location.origin}/settings?tab=subscription`,
        },
      });

      if (response.error) {
        const msg = response.error.message || 'Failed to initialize payment.';
        // If backend still says session expired/unauthorized, force re-login.
        if (msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('session expired')) {
          await supabase.auth.signOut();
          toast({
            title: 'Session expired',
            description: 'Please sign in again to upgrade.',
            variant: 'destructive',
          });
          navigate('/auth');
          return;
        }
        throw new Error(msg);
      }

      const { authorization_url } = response.data || {};
      if (authorization_url) {
        window.location.href = authorization_url;
      } else {
        throw new Error('No payment URL received');
      }
    } catch (error: any) {
      console.error('Upgrade error:', error);
      toast({
        title: 'Payment Error',
        description: error.message || 'Failed to initialize payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const getStatusBadge = () => {
    if (isExpired) return <Badge variant="destructive">Expired</Badge>;
    if (isTrial) return <Badge variant="secondary">Trial</Badge>;
    if (state === 'active') return <Badge className="bg-green-500">Active</Badge>;
    return <Badge variant="outline">{state}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Current Plan
              </CardTitle>
              <CardDescription>
                Manage your subscription and billing
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-semibold text-lg capitalize">{currentPlan} Plan</p>
              <p className="text-sm text-muted-foreground">
                {isTrial && daysRemaining !== null && (
                  <>Trial ends in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</>
                )}
                {state === 'active' && daysRemaining !== null && (
                  <>Renews in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</>
                )}
                {isExpired && 'Your subscription has expired'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {plans.find(p => p.id === currentPlan)?.priceDisplay || '₦0'}
              </p>
              <p className="text-sm text-muted-foreground">/month</p>
            </div>
          </div>

          {pharmacy?.subscription_ends_at && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Next billing date: {format(new Date(pharmacy.subscription_ends_at), 'MMMM d, yyyy')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Choose the plan that best fits your pharmacy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((planOption) => {
              const isCurrentPlan = planOption.id === currentPlan && !isTrial && !isExpired;
              
              return (
                <Card 
                  key={planOption.id}
                  className={`relative ${planOption.popular ? 'border-primary shadow-md' : ''} ${isCurrentPlan ? 'bg-muted/30' : ''}`}
                >
                  {planOption.popular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs">
                      Most Popular
                    </Badge>
                  )}
                  <CardHeader className="text-center pb-2 pt-6">
                    <CardTitle className="text-base">{planOption.name}</CardTitle>
                    <div className="mt-2">
                      <span className="text-2xl font-bold">{planOption.priceDisplay}</span>
                      {planOption.priceLabel && (
                        <span className="text-sm text-muted-foreground ml-1">{planOption.priceLabel}</span>
                      )}
                      {planOption.period && (
                        <span className="text-sm text-muted-foreground">{planOption.period}</span>
                      )}
                    </div>
                    {planOption.subtext && (
                      <p className="text-xs text-muted-foreground mt-1">{planOption.subtext}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {planOption.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full gap-2" 
                      variant={isCurrentPlan ? 'outline' : planOption.popular ? 'default' : 'outline'}
                      disabled={isCurrentPlan || isProcessing !== null || planOption.id === 'enterprise'}
                      onClick={() => planOption.id === 'enterprise' 
                        ? window.open('mailto:sales@pharmatrack.com?subject=Enterprise%20Plan%20Inquiry', '_blank')
                        : handleUpgrade(planOption.id)
                      }
                    >
                      {isProcessing === planOption.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : isCurrentPlan ? (
                        'Current Plan'
                      ) : (
                        <>
                          <Zap className="h-4 w-4" />
                          {planOption.buttonText}
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing History
          </CardTitle>
          <CardDescription>
            View your past payments and invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No payment history yet</p>
              <p className="text-sm">Your payments will appear here after you subscribe</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="capitalize">{payment.plan}</TableCell>
                    <TableCell>₦{payment.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {payment.paystack_reference || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
