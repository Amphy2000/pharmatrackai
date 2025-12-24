import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Zap, Shield, Users, BarChart3 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

interface UpgradePromptProps {
  inline?: boolean;
  onUpgrade?: () => void;
}

const plans = [
  {
    name: 'Starter',
    price: '₦15,000',
    period: '/month',
    setup: '₦150,000 one-time setup',
    features: [
      'Up to 500 medications',
      '1 user account',
      'Basic POS',
      'Email support',
    ],
    popular: false,
  },
  {
    name: 'Pro',
    price: '₦35,000',
    period: '/month',
    setup: '₦0 Setup',
    features: [
      'Unlimited medications',
      'Up to 5 users',
      'Advanced analytics',
      'Multi-branch support',
      'Priority support',
      'AI insights',
    ],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    setup: 'Custom Quote',
    features: [
      'Everything in Pro',
      'Unlimited users',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee',
      'On-premise option',
    ],
    popular: false,
  },
];

export const UpgradePrompt = ({ inline = false, onUpgrade }: UpgradePromptProps) => {
  const { state, daysRemaining, plan } = useSubscription();

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // In production, this would redirect to a payment page
      window.open('mailto:support@pharmatrack.com?subject=Upgrade%20Subscription', '_blank');
    }
  };

  if (inline) {
    return (
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg">
        <Crown className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">
            {state === 'trial' 
              ? `Trial expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`
              : 'Your trial has expired'}
          </p>
          <p className="text-xs text-muted-foreground">
            Upgrade now to continue using all features
          </p>
        </div>
        <Button size="sm" onClick={handleUpgrade} className="gap-1">
          <Zap className="h-3 w-3" />
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
      <div className="text-center mb-8 max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mb-4">
          <Crown className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">
          {state === 'expired' || state === 'cancelled' 
            ? 'Your Trial Has Expired' 
            : 'Upgrade Your Plan'}
        </h2>
        <p className="text-muted-foreground">
          {state === 'expired' || state === 'cancelled'
            ? 'Your 7-day free trial has ended. Upgrade now to continue managing your pharmacy with PharmaTrack.'
            : `Your trial ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Upgrade now to ensure uninterrupted access.`}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl w-full mb-8">
        {plans.map((planOption) => (
          <Card 
            key={planOption.name} 
            className={`relative ${planOption.popular ? 'border-primary shadow-lg scale-105' : ''}`}
          >
            {planOption.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Most Popular
              </Badge>
            )}
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">{planOption.name}</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">{planOption.price}</span>
                <span className="text-muted-foreground">{planOption.period}</span>
              </div>
              {planOption.setup && (
                <p className="text-xs text-muted-foreground mt-1">{planOption.setup}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {planOption.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                variant={planOption.popular ? 'default' : 'outline'}
                onClick={handleUpgrade}
              >
                {planOption.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Questions? Contact us at{' '}
        <a href="mailto:support@pharmatrack.com" className="text-primary hover:underline">
          support@pharmatrack.com
        </a>
      </p>
    </div>
  );
};
