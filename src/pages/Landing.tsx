import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 }
};

const Landing = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);
  const [monthlyRevenue, setMonthlyRevenue] = useState('');

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  const calculateSavings = () => {
    const revenue = parseFloat(monthlyRevenue.replace(/,/g, '')) || 0;
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(revenue * 12 * 0.05);
  };

  const pricing = {
    starter: { monthly: '₦19,500', yearly: '₦195,000', original: '₦50,000', name: 'Starter', tagline: 'For the Small Pharmacy', features: ['1 User Account', '200 SKU Limit', 'Basic POS System', 'Expiry Tracking', 'Email Support'] },
    pro: { monthly: '₦35,000', yearly: '₦350,000', original: '₦85,000', name: 'Pro', tagline: 'The Business Optimizer', features: ['Unlimited Users', 'Unlimited SKUs', 'AI Expiry Insights', 'Staff Clock-in Tracking', 'Automated Invoices', 'Priority Support'] },
    enterprise: { monthly: '₦75,000', yearly: '₦750,000', original: '₦150,000', name: 'Enterprise', tagline: 'For Chains & Clinicians', features: ['Multi-Branch Management', 'Custom API Access', 'White-label Options', 'Dedicated Account Manager', '24/7 Priority Support', 'Custom Integrations'] }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow-primary"
      >
        <Sparkles className="h-8 w-8 text-primary-foreground animate-pulse" />
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navigation */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur-xl bg-background/80"
      >
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">PharmaTrack</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth"><Button variant="ghost" className="hidden sm:flex">Login</Button></Link>
            <Link to="/auth?tab=signup">
              <Button className="bg-gradient-primary hover:opacity-90 shadow-glow-primary">Start Free Trial</Button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-mesh opacity-50"></div>
        <motion.div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
          animate={{ y: [0, -20, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl"
          animate={{ y: [0, 20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="max-w-4xl mx-auto text-center"
          >
            {/* Badge */}
            <motion.div 
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
            >
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Pharmacy Intelligence</span>
            </motion.div>

            {/* Headline */}
            <motion.h1 
              variants={fadeInUp}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-tight mb-6"
            >
              Stop Guessing.{' '}
              <span className="text-gradient-premium">Start Growing.</span>
              <br />
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-muted-foreground"
              >
                The AI Brain for Your Pharmacy.
              </motion.span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p 
              variants={fadeInUp}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            >
              Eliminate expiry waste, stop staff leakage, and automate your inventory with the world's most advanced pharmacy intelligence system.
            </motion.p>

            {/* CTA */}
            <motion.div 
              variants={fadeInUp}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link to="/auth?tab=signup">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    size="lg" 
                    className="bg-gradient-primary hover:opacity-90 text-lg px-8 py-6 shadow-glow-primary font-semibold relative overflow-hidden group"
                  >
                    <motion.span
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      initial={{ x: '-100%' }}
                      animate={{ x: '200%' }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'linear', repeatDelay: 3 }}
                    />
                    Start 7-Day Free Trial
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>
              </Link>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />No credit card required
              </p>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div 
              variants={fadeInUp}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-16 flex flex-wrap items-center justify-center gap-8"
            >
              {[
                { icon: Star, text: 'Trusted by 500+ pharmacies', color: 'text-warning fill-warning' },
                { icon: TrendingUp, text: '₦2.5B+ in recovered value', color: 'text-success' },
                { icon: Lock, text: 'Enterprise-grade security', color: 'text-primary' }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                  <span className="text-sm">{item.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="py-20 sm:py-32 relative">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">Complete Solution</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
              Everything You Need to <span className="text-gradient">Dominate</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Purpose-built for modern pharmacies by medical professionals
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
            {/* AI Expiry - Featured Card */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="md:col-span-2 lg:col-span-1 lg:row-span-2"
            >
              <Card className="h-full glass-card border-primary/30 overflow-hidden group hover:border-primary/50 transition-all duration-500">
                <CardContent className="p-6 sm:p-8 h-full flex flex-col">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 group-hover:shadow-glow-primary transition-all">
                    <Clock className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <Badge className="w-fit mb-4 bg-primary/20 text-primary border-0">AI-Powered</Badge>
                  <h3 className="text-2xl font-display font-bold mb-3">Predictive Expiry Alerts</h3>
                  <p className="text-muted-foreground mb-6 flex-grow">
                    AI analyzes inventory patterns to predict which items will expire before selling, giving you time to act with discount strategies and prevent losses.
                  </p>
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <TrendingUp className="h-4 w-4" />
                    <span>Recover up to 10% lost revenue</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* POS System */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="h-full glass-card border-border/50 overflow-hidden group hover:border-success/30 transition-all">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="h-12 w-12 rounded-xl bg-success/20 flex items-center justify-center mb-4">
                    <Calculator className="h-6 w-6 text-success" />
                  </div>
                  <h3 className="text-lg font-display font-bold mb-2">Smart POS System</h3>
                  <p className="text-sm text-muted-foreground flex-grow">Fast checkout with barcode scanning, held transactions, and automatic stock deduction.</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Staff Management */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="h-full glass-card border-border/50 overflow-hidden group hover:border-secondary/30 transition-all">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="h-12 w-12 rounded-xl bg-secondary/20 flex items-center justify-center mb-4">
                    <ShieldCheck className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="text-lg font-display font-bold mb-2">Staff Clock-in & Tracking</h3>
                  <p className="text-sm text-muted-foreground flex-grow">Track shifts, sales per staff, and prevent theft with complete accountability.</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Inventory Management */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="h-full glass-card border-border/50 overflow-hidden group hover:border-info/30 transition-all">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="h-12 w-12 rounded-xl bg-info/20 flex items-center justify-center mb-4">
                    <Sparkles className="h-6 w-6 text-info" />
                  </div>
                  <h3 className="text-lg font-display font-bold mb-2">AI Inventory Search</h3>
                  <p className="text-sm text-muted-foreground flex-grow">Natural language search finds medications even with misspellings or generic names.</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Multi-Branch */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="h-full glass-card border-border/50 overflow-hidden group hover:border-warning/30 transition-all">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="h-12 w-12 rounded-xl bg-warning/20 flex items-center justify-center mb-4">
                    <Globe className="h-6 w-6 text-warning" />
                  </div>
                  <h3 className="text-lg font-display font-bold mb-2">Multi-Branch Support</h3>
                  <p className="text-sm text-muted-foreground flex-grow">Manage multiple locations, transfer stock between branches, centralized reporting.</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Barcode Scanning */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="md:col-span-2 lg:col-span-1"
            >
              <Card className="glass-card border-border/50 overflow-hidden group hover:border-primary/30 transition-all">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold mb-1">Smartphone Barcode Scanning</h3>
                    <p className="text-sm text-muted-foreground">No expensive hardware needed. Use your phone camera to scan items instantly.</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Additional Features Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-12 max-w-6xl mx-auto"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: TrendingUp, label: 'Sales Analytics', desc: 'Real-time insights' },
                { icon: ShieldCheck, label: 'NAFDAC Compliant', desc: 'Regulatory ready' },
                { icon: Calculator, label: 'Profit Tracking', desc: 'Margin analysis' },
                { icon: Zap, label: 'AI Insights', desc: 'Smart recommendations' },
              ].map((feature, i) => (
                <div key={i} className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center hover:bg-muted/50 transition-colors">
                  <feature.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="font-medium text-sm">{feature.label}</p>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-20 sm:py-32 relative bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <Card className="glass-card border-border/50 overflow-hidden">
              <CardContent className="p-8 sm:p-12">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <motion.div 
                      whileHover={{ rotate: 10 }}
                      className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 shadow-glow-primary"
                    >
                      <Calculator className="h-7 w-7 text-primary-foreground" />
                    </motion.div>
                    <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                      See How Much We <span className="text-gradient">Save You</span>
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      Enter your average monthly revenue to calculate your potential annual recovery.
                    </p>
                    <div className="flex items-center gap-2 text-success">
                      <BadgeCheck className="h-5 w-5" />
                      <span className="text-sm font-medium">Money-back guarantee</span>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="revenue" className="text-sm text-muted-foreground mb-2 block">Monthly Revenue (₦)</Label>
                      <Input id="revenue" type="text" placeholder="e.g., 5,000,000" value={monthlyRevenue} onChange={(e) => setMonthlyRevenue(e.target.value)} className="h-14 text-lg bg-background/50 border-border/50 focus:border-primary" />
                    </div>
                    <motion.div 
                      initial={{ scale: 0.95 }}
                      animate={{ scale: monthlyRevenue ? 1 : 0.95 }}
                      className="p-6 rounded-2xl bg-success/10 border border-success/30"
                    >
                      <p className="text-sm text-success mb-2">Estimated Annual Recovery</p>
                      <p className="text-4xl font-display font-bold text-success">{monthlyRevenue ? calculateSavings() : '₦0'}</p>
                      <p className="text-xs text-muted-foreground mt-2">Based on 5% recovery rate</p>
                    </motion.div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 sm:py-32 relative">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
              Investment in <span className="text-gradient">Your Success</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">Choose the plan that fits your needs</p>
            <div className="flex items-center justify-center gap-4">
              <span className={`text-sm ${!isYearly ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Monthly</span>
              <Switch checked={isYearly} onCheckedChange={setIsYearly} />
              <span className={`text-sm ${isYearly ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                Yearly <Badge variant="secondary" className="ml-2 bg-success/20 text-success">Save 20%</Badge>
              </span>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {Object.entries(pricing).map(([key, plan], index) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8 }}
              >
                <Card className={`h-full glass-card overflow-hidden ${key === 'pro' ? 'border-primary/50 shadow-glow-primary relative' : 'border-border/50'}`}>
                  {key === 'pro' && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary"></div>}
                  <CardContent className="p-6 sm:p-8">
                    {key === 'pro' && <Badge className="absolute top-4 right-4 bg-gradient-primary text-primary-foreground">Most Popular</Badge>}
                    <h3 className="text-xl font-display font-bold mb-1">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mb-6">{plan.tagline}</p>
                    <div className="mb-6">
                      <span className="text-sm text-muted-foreground line-through">{plan.original}</span>
                      <p className={`text-4xl font-display font-bold ${key === 'pro' ? 'text-gradient' : ''}`}>
                        {isYearly ? plan.yearly : plan.monthly}
                        <span className="text-sm text-muted-foreground font-normal">/{isYearly ? 'year' : 'mo'}</span>
                      </p>
                    </div>
                    <Link to="/auth?tab=signup">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button className={`w-full mb-6 ${key === 'pro' ? 'bg-gradient-primary hover:opacity-90 shadow-glow-primary' : ''}`} variant={key === 'pro' ? 'default' : 'outline'}>
                          {key === 'enterprise' ? 'Contact Sales' : key === 'pro' ? 'Start Free Trial' : 'Get Started'}
                        </Button>
                      </motion.div>
                    </Link>
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <motion.li 
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.3 + i * 0.05 }}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Check className={`h-4 w-4 shrink-0 ${key === 'pro' ? 'text-primary' : 'text-success'}`} />
                          <span className={key === 'pro' ? '' : 'text-muted-foreground'}>{feature}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-success/10 border border-success/30">
              <BadgeCheck className="h-5 w-5 text-success" />
              <span className="text-success font-medium">30-Day Money-Back Guarantee</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/40">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl">PharmaTrack</span>
            </motion.div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              {['GDPR', 'NAFDAC', 'MHRA', 'FDA'].map((cert, i) => (
                <div key={i} className="flex items-center gap-2">
                  {i === 0 ? <ShieldCheck className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}
                  <span>{cert} {i === 0 ? 'Compliant' : 'Ready'}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} PharmaTrack. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
