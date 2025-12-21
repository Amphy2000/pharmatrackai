import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  Check, 
  Shield, 
  Zap, 
  TrendingUp, 
  BarChart3, 
  Globe, 
  Users,
  Package,
  AlertTriangle,
  DollarSign,
  Star,
  ChevronRight
} from 'lucide-react';
import { useRegionalSettings, CountryCode } from '@/contexts/RegionalSettingsContext';

const Landing = () => {
  const { country, setCountry, flagEmoji } = useRegionalSettings();
  const [stockValue, setStockValue] = useState('');
  
  const isNigeria = country === 'NG';
  const currencySymbol = isNigeria ? '₦' : country === 'GB' ? '£' : '$';
  
  // Pricing based on country - All processed via Paystack (converts to Naira)
  const pricing = {
    NG: {
      starter: { price: 19500, original: 50000, sku: 200 },
      pro: { price: 35000, original: 80000, sku: 'Unlimited' },
      top: { price: 75000, original: 150000, sku: 'Unlimited' },
    },
    GB: {
      starter: { price: 49, original: 99, sku: 200 },
      pro: { price: 99, original: 199, sku: 'Unlimited' },
      top: { price: 299, original: 499, sku: 'Unlimited' },
    },
    US: {
      starter: { price: 49, original: 99, sku: 200 },
      pro: { price: 99, original: 199, sku: 'Unlimited' },
      top: { price: 299, original: 499, sku: 'Unlimited' },
    },
  };
  
  const currentPricing = pricing[country];
  
  // Calculate ROI
  const calculateSavings = () => {
    const value = parseFloat(stockValue.replace(/,/g, '')) || 0;
    const lowSavings = value * 0.05 * 12;
    const highSavings = value * 0.10 * 12;
    return { low: lowSavings, high: highSavings };
  };
  
  const savings = calculateSavings();
  
  const formatCurrency = (amount: number) => {
    if (isNigeria) {
      return `₦${amount.toLocaleString()}`;
    }
    return country === 'GB' ? `£${amount.toLocaleString()}` : `$${amount.toLocaleString()}`;
  };

  const features = [
    {
      icon: AlertTriangle,
      title: 'AI Expiry Tracking',
      description: 'Never lose money to expired stock. Our AI predicts and alerts before it\'s too late.',
    },
    {
      icon: BarChart3,
      title: 'Demand Forecasting',
      description: 'Know what to reorder and when. AI-powered predictions based on your sales patterns.',
    },
    {
      icon: Package,
      title: 'Smart Inventory',
      description: 'Barcode scanning, bulk imports, and auto-categorization. Stock faster than ever.',
    },
    {
      icon: DollarSign,
      title: 'Profit Analytics',
      description: 'See your most profitable products. Optimize margins with real-time insights.',
    },
    {
      icon: Shield,
      title: 'Regulatory Compliance',
      description: 'NAFDAC, MHRA, FDA compliant. Batch tracking and audit trails built-in.',
    },
    {
      icon: Users,
      title: 'Customer Loyalty',
      description: 'Track prescriptions, credit, and purchase history. Build lasting relationships.',
    },
  ];

  const testimonials = [
    {
      quote: "We recovered ₦2.3M in potential expiry losses in the first quarter alone.",
      author: "Dr. Adebayo",
      role: "MedPlus Pharmacy, Lagos",
      rating: 5,
    },
    {
      quote: "The demand forecasting is incredibly accurate. We never overstock anymore.",
      author: "Pharmacist Ngozi",
      role: "HealthFirst Pharmacy, Abuja",
      rating: 5,
    },
    {
      quote: "Setup took 15 minutes. We were scanning products the same day.",
      author: "Mr. Okonkwo",
      role: "City Drugs, Port Harcourt",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold">PharmaTrack AI</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Country Toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {(['NG', 'GB', 'US'] as CountryCode[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCountry(c)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    country === c 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {c === 'NG' ? '🇳🇬' : c === 'GB' ? '🇬🇧' : '🇺🇸'} {c === 'GB' ? 'UK' : c}
                </button>
              ))}
            </div>
            
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button className="bg-gradient-primary text-primary-foreground">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
              <Zap className="h-3 w-3 mr-1" />
              7-Day Free Trial • No Credit Card Required
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight">
              The Intelligence Layer for{' '}
              <span className="text-gradient">Your Pharmacy</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Built by medical professionals to stop expiry waste and maximize profit. 
              Join 500+ pharmacies already saving millions.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="bg-gradient-primary text-primary-foreground h-14 px-8 text-lg">
                  Start Your Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
                Watch Demo
              </Button>
            </div>
            
            <p className="mt-6 text-sm text-muted-foreground">
              ✓ 7-day Pro trial &nbsp;&nbsp; ✓ No credit card needed &nbsp;&nbsp; ✓ Setup in 15 minutes
            </p>
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Card className="glass-card border-primary/20">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center">
                  <TrendingUp className="h-7 w-7 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl font-display">Calculate Your Potential Savings</CardTitle>
                <CardDescription>
                  See how much you could recover from expiry waste with AI tracking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Monthly Stock Value ({currencySymbol})</label>
                  <Input
                    type="text"
                    placeholder={`e.g., ${isNigeria ? '5,000,000' : '50,000'}`}
                    value={stockValue}
                    onChange={(e) => setStockValue(e.target.value)}
                    className="text-lg h-12"
                  />
                </div>
                
                {stockValue && savings.low > 0 && (
                  <div className="p-6 rounded-xl bg-success/10 border border-success/20">
                    <p className="text-sm text-muted-foreground mb-2">
                      Potential Annual Savings from AI Expiry Tracking:
                    </p>
                    <p className="text-3xl font-display font-bold text-success">
                      {formatCurrency(savings.low)} - {formatCurrency(savings.high)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Based on 5-10% recovery rate from expiry prevention
                    </p>
                  </div>
                )}
                
                <Link to="/auth?mode=signup" className="block">
                  <Button className="w-full bg-gradient-primary text-primary-foreground h-12">
                    Start Saving Today
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-secondary/10 text-secondary border-secondary/20">
              Features
            </Badge>
            <h2 className="text-4xl font-display font-bold mb-4">
              Everything You Need to Run a Modern Pharmacy
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From inventory to analytics, PharmaTrack AI handles it all so you can focus on patient care.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="metric-card group">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-gradient-primary transition-all duration-300">
                    <feature.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-card/50" id="pricing">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              <Globe className="h-3 w-3 mr-1" />
              {flagEmoji} Pricing for {country === 'NG' ? 'Nigeria' : country === 'GB' ? 'United Kingdom' : 'United States'}
            </Badge>
            <h2 className="text-4xl font-display font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground">
              Start with a 7-day free trial. No credit card required.
            </p>
            {country !== 'NG' && (
              <p className="text-sm text-muted-foreground mt-2">
                💳 Payments processed via Paystack (automatically converts to local currency equivalent)
              </p>
            )}
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <Card className="metric-card">
              <CardHeader>
                <CardTitle className="text-xl">Starter</CardTitle>
                <CardDescription>For small pharmacies getting started</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-display font-bold">
                      {currencySymbol}{currentPricing.starter.price.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-through">
                    {currencySymbol}{currentPricing.starter.original.toLocaleString()}/month
                  </p>
                </div>
                
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    Up to {currentPricing.starter.sku} SKUs
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    Barcode scanning
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    Expiry tracking
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    Basic reports
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    1 user
                  </li>
                </ul>
                
                <Link to="/auth?mode=signup&plan=starter" className="block">
                  <Button variant="outline" className="w-full">
                    Start Free Trial
                  </Button>
                </Link>
              </CardContent>
            </Card>
            
            {/* Pro - Featured */}
            <Card className="metric-card relative border-primary/50 shadow-glow-primary">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-gradient-primary text-primary-foreground">
                  Most Popular
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-xl">Pro</CardTitle>
                <CardDescription>For growing pharmacies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-display font-bold text-primary">
                      {currencySymbol}{currentPricing.pro.price.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-through">
                    {currencySymbol}{currentPricing.pro.original.toLocaleString()}/month
                  </p>
                </div>
                
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    Unlimited SKUs
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    AI demand forecasting
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    Profit analytics
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    Customer loyalty
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    3 users
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    Priority support
                  </li>
                </ul>
                
                <Link to="/auth?mode=signup&plan=pro" className="block">
                  <Button className="w-full bg-gradient-primary text-primary-foreground">
                    Start Free Trial
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
            
            {/* Enterprise/Elite */}
            <Card className="metric-card">
              <CardHeader>
                <CardTitle className="text-xl">{isNigeria ? 'Elite' : 'Enterprise'}</CardTitle>
                <CardDescription>For pharmacy chains & hospitals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-display font-bold">
                      {currencySymbol}{currentPricing.top.price.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-through">
                    {currencySymbol}{currentPricing.top.original.toLocaleString()}/month
                  </p>
                </div>
                
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    Everything in Pro
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    Multi-branch support
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    Advanced analytics
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    API access
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    Unlimited users
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    Dedicated support
                  </li>
                </ul>
                
                <Link to="/auth?mode=signup&plan=enterprise" className="block">
                  <Button variant="outline" className="w-full">
                    Contact Sales
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-warning/10 text-warning border-warning/20">
              <Star className="h-3 w-3 mr-1" />
              Testimonials
            </Badge>
            <h2 className="text-4xl font-display font-bold mb-4">
              Trusted by Pharmacies Across Africa
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="glass-card">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="text-foreground mb-4">"{testimonial.quote}"</p>
                  <div>
                    <p className="font-medium">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-background to-card">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-display font-bold mb-6">
              Ready to Transform Your Pharmacy?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join 500+ pharmacies already using PharmaTrack AI to save money and grow their business.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="bg-gradient-primary text-primary-foreground h-14 px-8 text-lg">
                  Start Your 7-Day Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              No credit card required • Cancel anytime • 24/7 support
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold">PharmaTrack AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 PharmaTrack AI. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Privacy</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Terms</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
