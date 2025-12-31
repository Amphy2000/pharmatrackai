import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useSubscription } from '@/hooks/useSubscription';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useBranchLimit } from '@/hooks/useBranchLimit';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Crown, Check, Zap, Calendar, CreditCard, Loader2, RefreshCw, Key, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { BranchPricingCalculator } from '@/components/subscription/BranchPricingCalculator';
import { describeFunctionsInvokeError } from '@/utils/functionsError';

// Annual discount rate (40% off)
const ANNUAL_DISCOUNT = 0.4;

const plans = [
  {
    id: 'lite',
    name: 'Lite',
    tagline: 'Essential POS',
    setup: '₦0',
    setupPrice: 0,
    monthly: '₦7,500',
    monthlyPrice: 7500,
    annual: `₦${Math.round(7500 * 12 * (1 - ANNUAL_DISCOUNT)).toLocaleString()}`,
    annualPrice: Math.round(7500 * 12 * (1 - ANNUAL_DISCOUNT)),
    setupLabel: 'No Setup Fee',
    target: 'New pharmacies starting digital',
    features: ['Basic POS System', 'Cloud Backups', '2 User Accounts', 'Unlimited SKUs', 'Expiry Tracking', 'Basic Reports', 'Email Support'],
    popular: false,
    buttonText: 'Get Started',
    isNew: true,
  },
  {
    id: 'pro',
    name: 'AI Powerhouse',
    tagline: 'Stop Drug Waste with AI',
    setup: '₦0',
    setupPrice: 0,
    monthly: '₦35,000',
    monthlyPrice: 35000,
    annual: `₦${Math.round(35000 * 12 * (1 - ANNUAL_DISCOUNT)).toLocaleString()}`,
    annualPrice: Math.round(35000 * 12 * (1 - ANNUAL_DISCOUNT)),
    setupLabel: 'Zero Setup Fee',
    target: 'Fast-growing pharmacies using AI',
    features: ['Everything in Lite', 'AI Invoice Scanner', 'Demand Forecasting AI', 'Unlimited Users', 'Multi-Branch Ready', 'Staff Clock-in', 'NAFDAC Reports', 'Priority WhatsApp Support'],
    popular: true,
    buttonText: 'Subscribe',
    isNew: false,
    savings: 'Save ₦1.2M+/year in waste',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Global Standard',
    setup: 'Custom',
    setupPrice: 0,
    monthly: 'Custom',
    monthlyPrice: 0,
    annual: 'Custom',
    annualPrice: 0,
    setupLabel: 'Custom Quote',
    target: 'Hospital chains & large networks',
    features: ['Everything in Pro', 'White-label Options', 'Custom API Access', 'Dedicated Account Manager', '24/7 Priority Support'],
    popular: false,
    buttonText: 'Contact Sales',
    isNew: false,
  },
];

const CANCELLATION_REASONS = [
  { value: 'too_expensive', label: 'Too expensive for my budget' },
  { value: 'not_using', label: 'Not using it enough' },
  { value: 'missing_features', label: 'Missing features I need' },
  { value: 'switching_competitor', label: 'Switching to a competitor' },
  { value: 'closing_business', label: 'Closing my business' },
  { value: 'other', label: 'Other reason' },
];

export const SubscriptionManagement = () => {
  const navigate = useNavigate();
  const { state, plan: currentPlan, daysRemaining, isTrial, isExpired } = useSubscription();
  const { pharmacy } = usePharmacy();
  const { currentBranchCount, activeBranchesLimit } = useBranchLimit();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isUpgradingBranches, setIsUpgradingBranches] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [autoRenew, setAutoRenew] = useState(pharmacy?.auto_renew ?? true);
  const [isTogglingAutoRenew, setIsTogglingAutoRenew] = useState(false);
  
  // Cancel subscription state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelFeedback, setCancelFeedback] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Sync autoRenew with pharmacy data
  useEffect(() => {
    if (pharmacy?.auto_renew !== undefined) {
      setAutoRenew(pharmacy.auto_renew);
    }
  }, [pharmacy?.auto_renew]);

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

  const getFunctionsHttpStatus = (err: unknown): number | null => {
    const anyErr = err as any;
    return (anyErr?.context?.status ?? anyErr?.status ?? null) as number | null;
  };

  const isAuthLikeFunctionsError = (err: unknown, detailed: string): boolean => {
    const status = getFunctionsHttpStatus(err);
    const msg = detailed.toLowerCase();
    return (
      status === 401 ||
      msg.includes('unauthorized') ||
      msg.includes('invalid jwt') ||
      msg.includes('session_not_found') ||
      msg.includes('jwt expired') ||
      msg.includes('token has expired')
    );
  };


  const extractAuthorizationUrl = (payload: unknown): string | undefined => {
    if (!payload) return undefined;

    let obj: any = payload;

    // Some function deployments return JSON as a string if Content-Type isn't application/json
    if (typeof obj === 'string') {
      try {
        obj = JSON.parse(obj);
      } catch {
        return undefined;
      }
    }

    // Support multiple shapes from edge function response:
    // - { url } (direct url property)
    // - { authorization_url }
    // - { data: { authorization_url } } (Paystack raw shape)
    return (
      obj?.url ??
      obj?.authorization_url ??
      obj?.data?.authorization_url
    );
  };

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

      const paymentBody = {
        plan: planId,
        pharmacy_id: pharmacy?.id,
        callback_url: `${window.location.origin}/settings?tab=subscription`,
      };

      const invokeCreatePayment = (accessToken: string) =>
        supabase.functions.invoke('create-payment', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: paymentBody,
        });

      let accessToken = session.access_token;
      let response = await invokeCreatePayment(accessToken);

      if (response.error) {
        const detailed = await describeFunctionsInvokeError(response.error);

        // Avoid force-logging users out for backend/config issues.
        // Only treat as auth-like when it's a real 401 / JWT failure.
        if (isAuthLikeFunctionsError(response.error, detailed)) {
          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();

          // If refresh succeeded, retry the payment call once with the fresh token.
          if (!refreshError && refreshed?.session) {
            accessToken = refreshed.session.access_token;
            response = await invokeCreatePayment(accessToken);
            if (response.error) {
              const detailedRetry = await describeFunctionsInvokeError(response.error);
              throw new Error(detailedRetry);
            }
          } else {
            toast({
              title: 'Authentication issue',
              description:
                'Your login session could not be verified for payments. This usually happens when the app is pointing to a different backend than the payment function. Please ensure both use the same backend keys, then try again.',
              variant: 'destructive',
            });
            return;
          }
        } else {
          throw new Error(detailed);
        }
      }


      const authorizationUrl = extractAuthorizationUrl(response.data);
      if (authorizationUrl) {
        window.location.href = authorizationUrl;
      } else {
        console.error('create-payment unexpected response:', response.data);
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

  const handleToggleAutoRenew = async () => {
    setIsTogglingAutoRenew(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Please sign in', variant: 'destructive' });
        return;
      }

      const response = await supabase.functions.invoke('manage-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { action: 'toggle_auto_renew' },
      });

      if (response.error) throw new Error(response.error.message);

      const newValue = response.data?.auto_renew;
      setAutoRenew(newValue);
      queryClient.invalidateQueries({ queryKey: ['pharmacy-details'] });
      
      toast({
        title: newValue ? 'Auto-renewal enabled' : 'Auto-renewal disabled',
        description: newValue 
          ? 'Your subscription will automatically renew.' 
          : 'You will need to manually renew your subscription.',
      });
    } catch (error: unknown) {
      console.error('Toggle auto-renew error:', error);
      const message = error instanceof Error ? error.message : 'Failed to update setting';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsTogglingAutoRenew(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!cancelReason) {
      toast({ title: 'Please select a reason', variant: 'destructive' });
      return;
    }

    setIsCancelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Please sign in', variant: 'destructive' });
        return;
      }

      const fullReason = cancelReason === 'other' && cancelFeedback 
        ? `Other: ${cancelFeedback}` 
        : CANCELLATION_REASONS.find(r => r.value === cancelReason)?.label || cancelReason;

      const response = await supabase.functions.invoke('manage-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { 
          action: 'cancel',
          cancellation_reason: fullReason,
        },
      });

      if (response.error) throw new Error(response.error.message);

      queryClient.invalidateQueries({ queryKey: ['pharmacy-details'] });
      setShowCancelDialog(false);
      
      toast({
        title: 'Subscription cancelled',
        description: 'We\'re sorry to see you go. Your access continues until the end of your billing period.',
      });
    } catch (error: unknown) {
      console.error('Cancel subscription error:', error);
      const message = error instanceof Error ? error.message : 'Failed to cancel subscription';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleBranchUpgrade = async (newLimit: number, upgradeAmount: number) => {
    setIsUpgradingBranches(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Login required',
          description: 'Please sign in to upgrade branches.',
          variant: 'destructive',
        });
        return;
      }

      const response = await supabase.functions.invoke('upgrade-branches', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          new_branch_limit: newLimit,
          callback_url: `${window.location.origin}/settings?tab=subscription`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }


      const authorizationUrl = extractAuthorizationUrl(response.data);
      if (authorizationUrl) {
        window.location.href = authorizationUrl;
      } else {
        console.error('upgrade-branches unexpected response:', response.data);
        throw new Error('No payment URL received');
      }
    } catch (error: any) {
      console.error('Branch upgrade error:', error);
      toast({
        title: 'Upgrade Error',
        description: error.message || 'Failed to process branch upgrade.',
        variant: 'destructive',
      });
    } finally {
      setIsUpgradingBranches(false);
    }
  };

  const getStatusBadge = () => {
    if (state === 'cancelled') return <Badge variant="destructive">Cancelled</Badge>;
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
        <CardContent className="space-y-6">
          {/* Plan Status Card */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
            <div className="space-y-1">
              <p className="font-semibold text-lg">
                {plans.find(p => p.id === currentPlan)?.name || 'Starter'} Plan
              </p>
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
              <p className="text-2xl font-bold text-primary">
                {plans.find(p => p.id === currentPlan)?.monthly || '₦0'}
              </p>
              <p className="text-sm text-muted-foreground">/month</p>
            </div>
          </div>

          {/* Renewal Date */}
          {pharmacy?.subscription_ends_at && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Next renewal date: {format(new Date(pharmacy.subscription_ends_at), 'MMMM d, yyyy')}
              </span>
            </div>
          )}

          <Separator />

          {/* Auto-Renew Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 text-muted-foreground ${isTogglingAutoRenew ? 'animate-spin' : ''}`} />
                <Label htmlFor="auto-renew" className="font-medium">Auto-Renewal</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Automatically renew your subscription when it expires
              </p>
            </div>
            <Switch
              id="auto-renew"
              checked={autoRenew}
              disabled={isTogglingAutoRenew || state === 'cancelled'}
              onCheckedChange={handleToggleAutoRenew}
            />
          </div>

          {/* Cancel Subscription */}
          {(state === 'active' || isTrial) && state !== 'cancelled' && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <Label className="font-medium text-destructive">Cancel Subscription</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Cancel your subscription at the end of the billing period
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowCancelDialog(true)}
                >
                  Cancel Plan
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancel Subscription
            </DialogTitle>
            <DialogDescription>
              We're sorry to see you go. Please let us know why you're leaving so we can improve.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <RadioGroup value={cancelReason} onValueChange={setCancelReason}>
              {CANCELLATION_REASONS.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Label htmlFor={reason.value} className="cursor-pointer">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {cancelReason === 'other' && (
              <Textarea
                placeholder="Please tell us more..."
                value={cancelFeedback}
                onChange={(e) => setCancelFeedback(e.target.value)}
                className="min-h-[80px]"
              />
            )}

            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> You'll continue to have access until the end of your current billing period. 
                You can reactivate anytime before then.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Subscription
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelSubscription}
              disabled={isCancelling || !cancelReason}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Cancelling...
                </>
              ) : (
                'Confirm Cancellation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branch Pricing Calculator - Only for Pro plan */}
      {(currentPlan === 'pro' || currentPlan === 'enterprise') && !isExpired && (
        <BranchPricingCalculator
          currentBranches={currentBranchCount}
          currentLimit={activeBranchesLimit}
          onUpgrade={handleBranchUpgrade}
          isProcessing={isUpgradingBranches}
        />
      )}

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Available Plans</CardTitle>
              <CardDescription>
                Choose the plan that best fits your pharmacy
              </CardDescription>
            </div>
            {/* Annual/Monthly Toggle */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-muted/50 border border-border/50">
              <Label htmlFor="billing-toggle" className={`text-sm ${!isAnnual ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                Monthly
              </Label>
              <Switch
                id="billing-toggle"
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
              />
              <Label htmlFor="billing-toggle" className={`text-sm ${isAnnual ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                Annual
                <Badge variant="secondary" className="ml-2 text-xs bg-success text-success-foreground">Save 40%</Badge>
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((planOption) => {
              const isCurrentPlan = planOption.id === currentPlan && !isTrial && !isExpired;
              
              return (
                <Card 
                  key={planOption.id}
                  className={`relative overflow-hidden ${planOption.popular ? 'border-primary shadow-lg ring-1 ring-primary/20' : ''} ${isCurrentPlan ? 'bg-muted/30' : ''}`}
                >
                  {planOption.popular && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/50" />
                  )}
                  {planOption.isNew && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-success" />
                  )}
                  {planOption.popular && (
                    <Badge className="absolute -top-0 right-4 rounded-t-none text-xs bg-primary">
                      Most Popular
                    </Badge>
                  )}
                  {planOption.isNew && !planOption.popular && (
                    <Badge className="absolute -top-0 right-4 rounded-t-none text-xs bg-success">
                      New
                    </Badge>
                  )}
                  <CardHeader className="pt-8 pb-4">
                    <div className="space-y-1">
                      <CardTitle className="text-xl font-bold">{planOption.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{planOption.tagline}</p>
                    </div>
                    <div className="mt-4 space-y-1">
                      {planOption.setupPrice > 0 && !isAnnual && (
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold">{planOption.setup}</span>
                          <span className="text-xs text-muted-foreground">{planOption.setupLabel}</span>
                        </div>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className={`${planOption.setupPrice > 0 && !isAnnual ? 'text-base' : 'text-2xl font-bold'}`}>
                          {isAnnual ? `₦${Math.round(planOption.annualPrice / 12).toLocaleString()}` : planOption.monthly}
                        </span>
                        <span className="text-xs text-muted-foreground">/month</span>
                      </div>
                      {isAnnual && planOption.annualPrice > 0 && (
                        <p className="text-xs text-success">
                          {planOption.annual}/year (save ₦{((planOption.monthlyPrice * 12) - planOption.annualPrice).toLocaleString()})
                        </p>
                      )}
                      {planOption.savings && (
                        <p className="text-xs text-primary font-medium">{planOption.savings}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{planOption.target}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {planOption.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter className="pt-4">
                    <Button 
                      className="w-full gap-2" 
                      variant={isCurrentPlan ? 'outline' : planOption.popular ? 'default' : 'outline'}
                      disabled={isCurrentPlan || isProcessing !== null || planOption.id === 'enterprise'}
                      onClick={() => planOption.id === 'enterprise' 
                        ? window.open('mailto:pharmatrackai@gmail.com?subject=Enterprise%20Plan%20Inquiry', '_blank')
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
