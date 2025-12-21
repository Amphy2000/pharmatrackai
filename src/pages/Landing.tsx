import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Clock, ShieldCheck, Globe, Smartphone, Sparkles, Check, Calculator,
  ArrowRight, Star, Zap, TrendingUp, Lock, BadgeCheck, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

const Landing = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);
  const [monthlyRevenue, setMonthlyRevenue] = useState('');
  const [animatedIn, setAnimatedIn] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const calculateSavings = () => {
    const revenue = parseFloat(monthlyRevenue.replace(/,/g, '')) || 0;
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(revenue * 12 * 0.05);
  };

  const pricing = {
    starter: { monthly: '₦19,500', yearly: '₦195,000', original: '₦50,000', name: 'Starter', tagline: 'For the Small Pharmacy', features: ['1 User Account', '200 SKU Limit', 'Basic POS System', 'Expiry Tracking', 'Email Support'] },
    pro: { monthly: '₦35,000', yearly: '₦350,000', original: '₦85,000', name: 'Pro', tagline: 'The Business Optimizer', features: ['Unlimited Users', 'Unlimited SKUs', 'AI Expiry Insights', 'Staff Clock-in Tracking', 'Automated Invoices', 'Priority Support'] },
    enterprise: { monthly: '₦75,000', yearly: '₦750,000', original: '₦150,000', name: 'Enterprise', tagline: 'For Chains & Clinicians', features: ['Multi-Branch Management', 'Custom API Access', 'White-label Options', 'Dedicated Account Manager', '24/7 Priority Support', 'Custom Integrations'] }
  };

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse h-16 w-16 rounded-2xl bg-primary/20"></div></div>;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur-xl bg-background/80">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-primary"><Sparkles className="h-5 w-5 text-primary-foreground" /></div>
            <span className="font-display font-bold text-xl">PharmaTrack</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth"><Button variant="ghost" className="hidden sm:flex">Login</Button></Link>
            <Link to="/auth?tab=signup"><Button className="bg-gradient-primary hover:opacity-90 shadow-glow-primary">Start Free Trial</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh opacity-50"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 transition-all duration-700 ${animatedIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <Zap className="h-4 w-4 text-primary" /><span className="text-sm font-medium text-primary">AI-Powered Pharmacy Intelligence</span>
            </div>
            <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-tight mb-6 transition-all duration-700 delay-100 ${animatedIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              Stop Guessing. <span className="text-gradient-premium">Start Growing.</span><br />
              <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-muted-foreground">The AI Brain for Your Pharmacy.</span>
            </h1>
            <p className={`text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 transition-all duration-700 delay-200 ${animatedIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              Eliminate expiry waste, stop staff leakage, and automate your inventory with the world's most advanced pharmacy intelligence system.
            </p>
            <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 delay-300 ${animatedIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <Link to="/auth?tab=signup"><Button size="lg" className="bg-gradient-primary hover:opacity-90 text-lg px-8 py-6 shadow-glow-primary animate-glow-pulse font-semibold">Start 7-Day Free Trial<ArrowRight className="ml-2 h-5 w-5" /></Button></Link>
              <p className="text-sm text-muted-foreground flex items-center gap-2"><Check className="h-4 w-4 text-success" />No credit card required</p>
            </div>
            <div className={`mt-16 flex flex-wrap items-center justify-center gap-8 transition-all duration-700 delay-500 ${animatedIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="flex items-center gap-2 text-muted-foreground"><Star className="h-5 w-5 text-warning fill-warning" /><span className="text-sm">Trusted by 500+ pharmacies</span></div>
              <div className="flex items-center gap-2 text-muted-foreground"><TrendingUp className="h-5 w-5 text-success" /><span className="text-sm">₦2.5B+ in recovered value</span></div>
              <div className="flex items-center gap-2 text-muted-foreground"><Lock className="h-5 w-5 text-primary" /><span className="text-sm">Enterprise-grade security</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="py-20 sm:py-32 relative">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">Features</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">Everything You Need to <span className="text-gradient">Dominate</span></h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">Purpose-built for modern pharmacies by medical professionals</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
            <Card className="md:col-span-2 lg:row-span-2 glass-card border-border/50 overflow-hidden group hover:border-primary/30 transition-all duration-500">
              <CardContent className="p-6 sm:p-8 h-full flex flex-col">
                <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 group-hover:shadow-glow-primary transition-all duration-500"><Clock className="h-7 w-7 text-primary-foreground" /></div>
                <h3 className="text-2xl font-display font-bold mb-3">Predictive Expiry Alerts</h3>
                <p className="text-muted-foreground mb-6 flex-grow">AI analyzes your inventory patterns to predict which items will expire before selling, giving you time to act with discount strategies.</p>
                <div className="flex items-center gap-2 text-primary font-medium"><span>Recover up to 10% lost revenue</span><ChevronRight className="h-4 w-4" /></div>
              </CardContent>
            </Card>
            <Card className="glass-card border-border/50 overflow-hidden group hover:border-secondary/30 transition-all duration-500">
              <CardContent className="p-6 h-full flex flex-col">
                <div className="h-12 w-12 rounded-xl bg-gradient-secondary flex items-center justify-center mb-4"><ShieldCheck className="h-6 w-6 text-secondary-foreground" /></div>
                <h3 className="text-lg font-display font-bold mb-2">Staff Clock-in & Anti-Theft</h3>
                <p className="text-sm text-muted-foreground">Track every transaction with shift accountability. Know exactly who sold what and when.</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-border/50 overflow-hidden group hover:border-accent/30 transition-all duration-500">
              <CardContent className="p-6 h-full flex flex-col">
                <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center mb-4"><Globe className="h-6 w-6 text-accent-foreground" /></div>
                <h3 className="text-lg font-display font-bold mb-2">Multi-Currency & Regulatory Ready</h3>
                <p className="text-sm text-muted-foreground">NAFDAC • MHRA • FDA compliant with automatic currency handling.</p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2 glass-card border-border/50 overflow-hidden group hover:border-info/30 transition-all duration-500">
              <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-6">
                <div className="h-14 w-14 rounded-2xl bg-info flex items-center justify-center shrink-0"><Smartphone className="h-7 w-7 text-info-foreground" /></div>
                <div><h3 className="text-xl font-display font-bold mb-2">Barcode Scanning via Smartphone</h3><p className="text-muted-foreground">No expensive hardware needed. Use your phone camera to scan items instantly.</p></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-20 sm:py-32 relative bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <Card className="glass-card border-border/50 overflow-hidden">
              <CardContent className="p-8 sm:p-12">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 shadow-glow-primary"><Calculator className="h-7 w-7 text-primary-foreground" /></div>
                    <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">See How Much We <span className="text-gradient">Save You</span></h2>
                    <p className="text-muted-foreground mb-6">Enter your average monthly revenue to calculate your potential annual recovery from reduced expiry waste.</p>
                    <div className="flex items-center gap-2 text-success"><BadgeCheck className="h-5 w-5" /><span className="text-sm font-medium">Money-back guarantee if you don't save</span></div>
                  </div>
                  <div className="space-y-6">
                    <div><Label htmlFor="revenue" className="text-sm text-muted-foreground mb-2 block">Monthly Revenue (₦)</Label><Input id="revenue" type="text" placeholder="e.g., 5,000,000" value={monthlyRevenue} onChange={(e) => setMonthlyRevenue(e.target.value)} className="h-14 text-lg bg-background/50 border-border/50 focus:border-primary" /></div>
                    <div className="p-6 rounded-2xl bg-success/10 border border-success/30"><p className="text-sm text-success mb-2">Estimated Annual Recovery</p><p className="text-4xl font-display font-bold text-success">{monthlyRevenue ? calculateSavings() : '₦0'}</p><p className="text-xs text-muted-foreground mt-2">Based on 5% recovery rate from AI-assisted expiry management</p></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 sm:py-32 relative">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">Investment in <span className="text-gradient">Your Success</span></h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">Choose the plan that fits your pharmacy's needs</p>
            <div className="flex items-center justify-center gap-4">
              <span className={`text-sm ${!isYearly ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Monthly</span>
              <Switch checked={isYearly} onCheckedChange={setIsYearly} />
              <span className={`text-sm ${isYearly ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Yearly <Badge variant="secondary" className="ml-2 bg-success/20 text-success">Save 20%</Badge></span>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {Object.entries(pricing).map(([key, plan]) => (
              <Card key={key} className={`glass-card overflow-hidden ${key === 'pro' ? 'border-primary/50 shadow-glow-primary relative' : 'border-border/50'}`}>
                {key === 'pro' && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary"></div>}
                <CardContent className="p-6 sm:p-8">
                  {key === 'pro' && <Badge className="absolute top-4 right-4 bg-gradient-primary text-primary-foreground">Most Popular</Badge>}
                  <h3 className="text-xl font-display font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-6">{plan.tagline}</p>
                  <div className="mb-6">
                    <span className="text-sm text-muted-foreground line-through">{plan.original}</span>
                    <p className={`text-4xl font-display font-bold ${key === 'pro' ? 'text-gradient' : ''}`}>{isYearly ? plan.yearly : plan.monthly}<span className="text-sm text-muted-foreground font-normal">/{isYearly ? 'year' : 'mo'}</span></p>
                  </div>
                  <Link to="/auth?tab=signup"><Button className={`w-full mb-6 ${key === 'pro' ? 'bg-gradient-primary hover:opacity-90 shadow-glow-primary' : ''}`} variant={key === 'pro' ? 'default' : 'outline'}>{key === 'enterprise' ? 'Contact Sales' : key === 'pro' ? 'Start Free Trial' : 'Get Started'}</Button></Link>
                  <ul className="space-y-3">{plan.features.map((feature, i) => (<li key={i} className="flex items-center gap-2 text-sm"><Check className={`h-4 w-4 shrink-0 ${key === 'pro' ? 'text-primary' : 'text-success'}`} /><span className={key === 'pro' ? '' : 'text-muted-foreground'}>{feature}</span></li>))}</ul>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-12"><div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-success/10 border border-success/30"><BadgeCheck className="h-5 w-5 text-success" /><span className="text-success font-medium">30-Day Money-Back Guarantee</span></div></div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/40">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center"><Sparkles className="h-5 w-5 text-primary-foreground" /></div><span className="font-display font-bold text-xl">PharmaTrack</span></div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /><span>GDPR Compliant</span></div>
              <div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4" /><span>NAFDAC Ready</span></div>
              <div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4" /><span>MHRA Ready</span></div>
              <div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4" /><span>FDA Ready</span></div>
            </div>
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} PharmaTrack. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
