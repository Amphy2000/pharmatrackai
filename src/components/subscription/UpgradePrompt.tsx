import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

interface UpgradePromptProps {
  inline?: boolean;
  onUpgrade?: () => void;
}

const plans = [
  {
    id: 'lite',
    name: 'Lite POS',
    tagline: 'Essential POS',
    price: '₦7,500',
    period: '/month',
    setup: 'Zero Setup Fee: ₦0',
    target: 'Pharmacies starting digital POS operations',
    features: [
      'Basic POS & Receipt Printer',
      'Cloud Stock Backups',
      '2 User Accounts',
      'Unlimited SKUs & Categories',
      'Expiry Tracking & Alerts',
      '5 AI Invoice Scans/month',
    ],
    popular: false,
  },
  {
    id: 'pro',
    name: 'AI Powerhouse',
    tagline: 'Stop Drug Waste with AI',
    price: '₦35,000',
    period: '/month',
    setup: 'Zero Setup Fee: ₦0',
    target: 'Pharmacies using AI to automate inventory & stop waste',
    features: [
      'Everything in Lite',
      'UNLIMITED AI Invoice Scans',
      '0ms Autopilot Clinical Safety',
      'Automated Expiry Discounting',
      'Demand Forecasting AI',
      'Unlimited Users & Multi-Branch',
      'Staff Clock-in & Fraud Lock',
      'NAFDAC Compliance Reports',
    ],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Global Standard',
    price: 'Custom',
    period: '',
    setup: 'Custom Quote',
    target: 'Hospital chains & multi-location networks',
    features: [
      'Everything in AI Powerhouse',
      'White-label Options',
      'Custom API & ERP Access',
      'Dedicated Account Manager',
      '24/7 Priority WhatsApp Support',
      'Custom Integrations',
    ],
    popular: false,
  },
];

export const UpgradePrompt = ({ inline = false, onUpgrade }: UpgradePromptProps) => {
  const navigate = useNavigate();
  const { state, daysRemaining, isExpired, isTrial } = useSubscription();

  const handleAction = (planId: string) => {
    if (onUpgrade) {
      onUpgrade();
      return;
    }

    if (planId === 'enterprise') {
      window.open('https://wa.me/2348000000000?text=Hi,%20I%20want%20to%20discuss%20PharmaTrack%20Enterprise%20Plan', '_blank');
      return;
    }

    // Redirect to Subscription page in Settings to complete Paystack payment
    navigate('/settings?tab=subscription');
  };

  const ctaText = isExpired
    ? 'Subscribe Now'
    : isTrial
      ? `Upgrade Now (${daysRemaining}d left in trial)`
      : 'Choose Plan';

  if (inline) {
    return (
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl">
        <Crown className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            {isTrial
              ? `Free Trial expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`
              : 'Your Free Trial Has Ended'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isTrial ? 'Subscribe to lock in your discounted pricing' : 'Subscribe to continue managing your inventory and POS.'}
          </p>
        </div>
        <Button size="sm" onClick={() => handleAction('pro')} className="gap-1 bg-amber-500 hover:bg-amber-600 text-white border-0">
          <Zap className="h-3.5 w-3.5" />
          {isTrial ? 'Upgrade' : 'Subscribe'}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="text-center mb-8 max-w-lg">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 mb-4 border border-amber-500/20">
          <Crown className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold font-display mb-2">
          {isExpired ? 'Your Free Trial Has Ended' : 'Select Your PharmaTrack Plan'}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          {isExpired
            ? 'Your 7-day free trial has expired. Subscribe to an active plan below to continue accessing your inventory, POS, and sales data.'
            : `Your trial has ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining. Upgrade now for uninterrupted operations.`}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full mb-8">
        {plans.map((planOption) => (
          <Card
            key={planOption.id}
            className={`relative flex flex-col justify-between transition-all duration-300 ${
              planOption.popular ? 'border-primary shadow-xl ring-2 ring-primary/20 scale-[1.02]' : 'border-border/60'
            }`}
          >
            {planOption.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary text-white border-0 px-3 py-0.5 text-xs font-semibold">
                Most Popular
              </Badge>
            )}
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl font-bold font-display">{planOption.name}</CardTitle>
              <CardDescription className="text-xs">{planOption.tagline}</CardDescription>
              <p className="text-xs text-muted-foreground mt-2">{planOption.target}</p>
              <div className="mt-3">
                <span className="text-3xl font-bold font-display">{planOption.price}</span>
                <span className="text-sm text-muted-foreground">{planOption.period}</span>
              </div>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1">{planOption.setup}</p>
            </CardHeader>

            <CardContent className="space-y-2.5 pt-4">
              {planOption.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-xs">
                  <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </CardContent>

            <CardFooter className="pt-4">
              <Button
                className="w-full gap-2 font-semibold"
                variant={planOption.popular ? 'default' : 'outline'}
                onClick={() => handleAction(planOption.id)}
              >
                {planOption.id === 'enterprise' ? 'Contact Sales' : ctaText}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span>Instant Activation · Pay securely via Paystack · Single trial limit strictly enforced</span>
      </div>
    </div>
  );
};
