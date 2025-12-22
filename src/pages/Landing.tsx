import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Clock, ShieldCheck, Globe, Smartphone, Sparkles, Check, Calculator,
  ArrowRight, Star, Zap, TrendingUp, Lock, BadgeCheck, ChevronRight,
  FileUp, Wand2, Timer, WifiOff, Database, Headphones, X, DollarSign, AlertTriangle,
  Phone, MessageCircle, Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { ProfitProtectorCalculator } from '@/components/landing/ProfitProtectorCalculator';
import { FeatureDemo } from '@/components/landing/FeatureDemo';
import { VideoShowcase } from '@/components/landing/VideoShowcase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const [isInternational, setIsInternational] = useState(false);
  const [monthlyRevenue, setMonthlyRevenue] = useState('');

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  const calculateSavings = () => {
    const revenue = parseFloat(monthlyRevenue.replace(/,/g, '')) || 0;
    if (isInternational) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(revenue * 12 * 0.05);
    }
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(revenue * 12 * 0.05);
  };

  // NGN Pricing (Disruptive 3-Tier Model)
  const ngnPricing = {
    starter: { 
      name: 'Switch & Save',
      tagline: 'Lifetime License Feel',
      setup: '₦150,000',
      monthly: '₦10,000',
      setupLabel: 'One-time Setup',
      target: 'Single-branch pharmacies looking for stability',
      features: ['Lifetime License Feel', 'Cloud Backups', '1 User Account', 'Unlimited SKUs', 'Basic POS System', 'Expiry Tracking', 'Email Support'],
      highlight: false
    },
    pro: { 
      name: 'AI Powerhouse',
      tagline: 'Stop Drug Waste with AI',
      setup: '₦0',
      monthly: '₦35,000',
      setupLabel: 'Zero Setup Fee',
      target: 'Fast-growing pharmacies using AI to stop waste',
      features: ['₦0 Setup Fee', 'Automated Expiry Discounting', 'Demand Forecasting AI', 'Unlimited Users', 'Multi-Branch Ready', 'Staff Clock-in Tracking', 'NAFDAC Compliance Reports', 'Controlled Drugs Register', 'Manufacturing Date Tracking', 'Priority Support'],
      highlight: true
    },
    enterprise: { 
      name: 'Enterprise',
      tagline: 'Global Standard',
      setup: 'Custom',
      monthly: '₦1,000,000+',
      setupLabel: 'Custom Quote',
      target: 'Hospital chains & international clients',
      features: ['Everything in Pro', 'White-label Options', 'Custom API Access', 'Dedicated Account Manager', '24/7 Priority Support', 'Custom Integrations', 'SLA Guarantee', 'On-site Training'],
      highlight: false
    }
  };

  // USD Pricing (International)
  const usdPricing = {
    pro: { 
      name: 'Pro',
      tagline: 'Everything You Need',
      monthly: '$99',
      features: ['Unlimited Users', 'Unlimited SKUs', 'AI Expiry Insights', 'Demand Forecasting', 'Multi-Branch Support', 'Staff Management', 'Priority Support', 'Mobile Scanning'],
      highlight: true
    },
    enterprise: { 
      name: 'Enterprise',
      tagline: 'For Large Organizations',
      monthly: '$299',
      features: ['Everything in Pro', 'White-label Options', 'Custom API Access', 'Dedicated Account Manager', '24/7 Priority Support', 'Custom Integrations', 'SLA Guarantee'],
      highlight: false
    }
  };

  // ShopKite vs PharmaTrack AI - Comprehensive Comparison Table
  const comparisonData = [
    { feature: 'Inventory Entry', oldApp: 'Manual search of 100k items', pharmatrack: 'AI Invoice Scanner: Snap & Stock 50+ items in 10 secs', critical: true },
    { feature: 'Compliance', oldApp: 'Generic Expiry alerts only', pharmatrack: '2025 NAFDAC Ready: Auto-generates Batch/BN Traceability logs', critical: true },
    { feature: 'Anti-Theft', oldApp: 'Staff can edit prices easily', pharmatrack: 'Locked Pricing: Zero-Price-Manipulation (Admin Only)', critical: true },
    { feature: 'Clinical Care', oldApp: 'Basic grocery-style receipt', pharmatrack: 'Digital Dispensing: Integrated Dosage & Ingredient Search', critical: true },
    { feature: 'Performance', oldApp: 'Bloated app; lags on older phones', pharmatrack: 'High-Speed Lite: Instant login on all Nigerian networks', critical: false },
    { feature: 'Hardware', oldApp: '₦300k "Stella" Device needed', pharmatrack: 'Zero Hardware: Runs on the phone/laptop you already own', critical: false },
  ];

  // Compliance badges for pharmacy-specific positioning
  const complianceBadges = [
    { icon: ShieldCheck, label: 'NAFDAC Ready', description: 'Audit-ready compliance reports' },
    { icon: Lock, label: 'Controlled Drugs Register', description: 'Legal narcotics tracking' },
    { icon: BadgeCheck, label: 'Drug Interaction Alerts', description: 'Patient safety at checkout' },
  ];

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Logo showText={false} size="lg" linkTo="" />
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
          <Logo size="sm" linkTo="/" />
          
          {/* Desktop Navigation - Ordered by page sequence */}
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</button>
            <button onClick={() => document.getElementById('comparison')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Why PharmaTrack</button>
            <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</button>
            <button onClick={() => document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonials</button>
          </div>

          <div className="flex items-center gap-3">
            {/* International Toggle */}
            <div className="hidden lg:flex items-center gap-2 mr-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
              <span className={`text-xs ${!isInternational ? 'text-primary font-medium' : 'text-muted-foreground'}`}>🇳🇬 NGN</span>
              <Switch checked={isInternational} onCheckedChange={setIsInternational} className="scale-75" />
              <span className={`text-xs ${isInternational ? 'text-primary font-medium' : 'text-muted-foreground'}`}>🌍 USD</span>
            </div>
            <Link to="/auth"><Button variant="ghost" className="hidden sm:flex">Login</Button></Link>
            <Link to="/auth?tab=signup">
              <Button className="bg-gradient-primary hover:opacity-90 shadow-glow-primary hidden sm:flex">Start Free Trial</Button>
            </Link>
            
            {/* Mobile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                  Features
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => document.getElementById('comparison')?.scrollIntoView({ behavior: 'smooth' })}>
                  Why PharmaTrack
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
                  Pricing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' })}>
                  Testimonials
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/auth">Login</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/auth?tab=signup">Start Free Trial</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            {/* Free Migration Badge */}
            <motion.div 
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/30 mb-6"
            >
              <FileUp className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-success">Free Data Migration: We move your stock in 24 hours</span>
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
                { icon: Zap, text: 'Built by Pharmacists, for Pharmacists', color: 'text-warning' },
                { icon: Lock, text: 'Enterprise-grade security', color: 'text-primary' },
                { icon: Headphones, text: '24/7 Priority support', color: 'text-success' }
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

          {/* Profit Protector Calculator */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="mt-16 max-w-4xl mx-auto"
          >
            <ProfitProtectorCalculator isInternational={isInternational} />
          </motion.div>
        </div>
      </section>

      {/* Feature Demos Section */}
      <FeatureDemo isInternational={isInternational} />

      {/* Stop the Leakage Pitch Section */}
      <section className="py-16 sm:py-24 relative bg-gradient-hero hero-medical">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge className="mb-4 bg-destructive/20 text-destructive border-destructive/30">
              <AlertTriangle className="h-3 w-3 mr-2" />
              The Truth About General POS Apps
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-4 text-white">
              General apps like ShopKite are built to sell <span className="text-warning">bread and soap</span>.
            </h2>
            <p className="text-xl text-white/90 font-medium">
              PharmaTrack AI is built to <span className="text-success">protect a Pharmacy's license and profit</span>.
            </p>
          </motion.div>

          {/* Stop the Leakage Points */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Card className="h-full bg-white/10 backdrop-blur-xl border-white/20 overflow-hidden">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-destructive/20 flex items-center justify-center mb-4">
                    <Lock className="h-6 w-6 text-destructive" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-white mb-2">Stop Staff Fraud</h3>
                  <p className="text-white/80 text-sm">
                    ShopKite allows staff to change prices during a sale—that's where your profit disappears. <span className="text-success font-medium">We lock your prices so only the Pharmacist has control.</span>
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Card className="h-full bg-white/10 backdrop-blur-xl border-white/20 overflow-hidden">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-white mb-2">Audit-Ready in Seconds</h3>
                  <p className="text-white/80 text-sm">
                    When NAFDAC walks in, don't scramble for paper. <span className="text-success font-medium">Our AI has already logged every Batch Number and Expiry from your wholesale invoices.</span>
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <Card className="h-full bg-white/10 backdrop-blur-xl border-white/20 overflow-hidden">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-success/20 flex items-center justify-center mb-4">
                    <Zap className="h-6 w-6 text-success" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-white mb-2">Faster Than Your Network</h3>
                  <p className="text-white/80 text-sm">
                    We know Nigerian internet is unpredictable. <span className="text-success font-medium">Our app is optimized to load instantly, even when other apps are spinning.</span>
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Compliance Badges Grid */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {complianceBadges.map((badge, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <Card className="h-full bg-white/5 backdrop-blur-xl border-white/10 overflow-hidden group hover:bg-white/10 transition-all">
                  <CardContent className="p-6 text-center">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4 group-hover:shadow-glow-primary transition-all">
                      <badge.icon className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <Badge variant="destructive" className="mb-3 text-[10px]">Legal Requirement</Badge>
                    <h3 className="font-display font-bold text-lg mb-2 text-white">{badge.label}</h3>
                    <p className="text-sm text-white/70">{badge.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Call-out Box */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 max-w-3xl mx-auto"
          >
            <Card className="border-warning/50 bg-warning/10 backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-warning/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold mb-2 text-white">The "I've Seen Apps Like This" Response</h4>
                    <p className="text-sm text-white/80 mb-4">
                      "Sir, those apps are 'General POS.' They tell you what you sold. <span className="text-success font-medium">PharmaTrack AI tells you what you are losing.</span> Can those apps take a photo of your wholesale invoice and stock 50 drugs in 10 seconds? No. Can they generate a NAFDAC Batch Traceability report? No. Those apps are for supermarkets. <span className="text-primary font-medium">You are a Healthcare Professional—you deserve a tool built for your license.</span>"
                    </p>
                    <Link to="/pitch">
                      <Button variant="outline" size="sm" className="border-warning/50 text-warning hover:bg-warning/10">
                        See Full Battle Card
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="py-20 sm:py-32 relative">
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
                    AI analyzes inventory patterns to predict which items will expire before selling, giving you 60 days advance warning to act with discount strategies.
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

            {/* Demand Forecasting */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="h-full glass-card border-border/50 overflow-hidden group hover:border-info/30 transition-all">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="h-12 w-12 rounded-xl bg-info/20 flex items-center justify-center mb-4">
                    <TrendingUp className="h-6 w-6 text-info" />
                  </div>
                  <h3 className="text-lg font-display font-bold mb-2">Demand Forecasting</h3>
                  <p className="text-sm text-muted-foreground flex-grow">AI predicts what to reorder before you run out. Never lose a sale to stockouts.</p>
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
                    <h3 className="text-lg font-display font-bold mb-1">Mobile Barcode Scanning</h3>
                    <p className="text-sm text-muted-foreground">No expensive hardware. Use your phone camera to scan and add stock instantly.</p>
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
                { icon: ShieldCheck, label: 'NAFDAC Compliance', desc: 'Audit-ready reports' },
                { icon: Calculator, label: 'Profit Tracking', desc: 'Margin analysis' },
                { icon: Sparkles, label: 'Controlled Drugs', desc: 'Narcotics register' },
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

      {/* ShopKite vs PharmaTrack Comparison Table Section */}
      <section id="comparison" className="py-20 sm:py-32 relative bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4 border-destructive/30 text-destructive">Why Pharmacies Are Switching</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
              ShopKite (General POS) vs <span className="text-gradient">PharmaTrack AI</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              See why pharmacy-specific software beats general retail apps
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto"
          >
            <Card className="comparison-table overflow-hidden shadow-elevated">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-hero">
                      <TableHead className="font-display text-white text-base py-4">Feature</TableHead>
                      <TableHead className="text-center text-white/90">
                        <div className="flex flex-col items-center gap-1">
                          <X className="h-5 w-5 text-destructive" />
                          <span>ShopKite (General POS)</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-center text-white">
                        <div className="flex flex-col items-center gap-1">
                          <Check className="h-5 w-5 text-success" />
                          <span className="font-bold">PharmaTrack AI (Specialist)</span>
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonData.map((row, i) => (
                      <TableRow key={i} className="border-border/30 hover:bg-muted/50 transition-colors">
                        <TableCell className="font-semibold py-4">
                          <span className="flex items-center gap-2">
                            {row.feature}
                            {row.critical && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Critical</Badge>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-4">
                          <span className="inline-flex items-center gap-2 text-muted-foreground text-sm">
                            <X className="h-4 w-4 text-destructive shrink-0" />
                            {row.oldApp}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-4 bg-success/5">
                          <span className="inline-flex items-center gap-2 text-success font-medium text-sm">
                            <Check className="h-4 w-4 shrink-0" />
                            {row.pharmatrack}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Key Differentiators */}
            <div className="grid md:grid-cols-3 gap-4 mt-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 text-center"
              >
                <DollarSign className="h-6 w-6 mx-auto mb-2 text-destructive" />
                <p className="text-sm font-medium">The "Stella" Device Trap</p>
                <p className="text-xs text-muted-foreground">ShopKite wants ₦300k hardware. We give you freedom.</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center"
              >
                <ShieldCheck className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">The "Batch Number" Hero</p>
                <p className="text-xs text-muted-foreground">We automate the most annoying part of pharmacy work.</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="p-4 rounded-xl bg-success/5 border border-success/20 text-center"
              >
                <Zap className="h-6 w-6 mx-auto mb-2 text-success" />
                <p className="text-sm font-medium">The Speed Advantage</p>
                <p className="text-xs text-muted-foreground">When they see your app open in 1 second, the sale is 80% done.</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Migration Section */}
      <section className="py-20 sm:py-32 relative">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4 border-success/30 text-success">Easy Migration</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
              Switching is <span className="text-gradient">Easier Than You Think</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              We handle the heavy lifting so you can focus on serving customers
            </p>
          </motion.div>

          {/* 3-Step Migration Process */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            {[
              {
                step: 1,
                icon: FileUp,
                title: 'Export Your Data',
                description: 'Just download your current stock list from your old app or send us your Excel/invoice files.',
                color: 'bg-info/20 text-info'
              },
              {
                step: 2,
                icon: Wand2,
                title: 'We Do the Heavy Lifting',
                description: 'Our team (or AI) cleans and imports your data into PharmaTrack. No manual typing required.',
                color: 'bg-secondary/20 text-secondary'
              },
              {
                step: 3,
                icon: Timer,
                title: '15-Minute Training',
                description: 'We show your staff how to scan their first item. If they can use WhatsApp, they can use PharmaTrack.',
                color: 'bg-success/20 text-success'
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <Card className="h-full glass-card border-border/50 overflow-hidden group hover:border-primary/30 transition-all">
                  <CardContent className="p-6 text-center">
                    <div className="relative inline-block mb-6">
                      <div className={`h-16 w-16 rounded-2xl ${item.color} flex items-center justify-center mx-auto`}>
                        <item.icon className="h-8 w-8" />
                      </div>
                      <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                        {item.step}
                      </div>
                    </div>
                    <h3 className="text-xl font-display font-bold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Peace of Mind Trust Box */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <Card className="glass-card border-success/30 overflow-hidden">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <Badge className="bg-success/20 text-success border-0 mb-4">Peace of Mind Guarantee</Badge>
                  <h3 className="text-2xl font-display font-bold">Zero Risk Migration</h3>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    {
                      icon: Timer,
                      title: 'Zero Downtime',
                      description: 'Keep selling on your old system while we set up your new one. We switch you over in minutes.'
                    },
                    {
                      icon: Database,
                      title: 'Data Integrity',
                      description: 'We cross-check every batch and expiry date during migration to ensure 100% accuracy.'
                    },
                    {
                      icon: WifiOff,
                      title: 'Offline Reliability',
                      description: 'Even if the internet is shaky, your POS keeps running. Never lose a sale.'
                    }
                  ].map((item, i) => (
                    <div key={i} className="text-center">
                      <div className="h-12 w-12 rounded-xl bg-success/20 flex items-center justify-center mx-auto mb-4">
                        <item.icon className="h-6 w-6 text-success" />
                      </div>
                      <h4 className="font-display font-bold mb-2">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Video Showcase & Testimonials */}
      <VideoShowcase />

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
                      Enter your average monthly revenue to calculate your potential annual recovery from reduced expiry waste.
                    </p>
                    <div className="flex items-center gap-2 text-success">
                      <BadgeCheck className="h-5 w-5" />
                      <span className="text-sm font-medium">30-Day Money-back guarantee</span>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="revenue" className="text-sm text-muted-foreground mb-2 block">
                        Monthly Revenue ({isInternational ? '$' : '₦'})
                      </Label>
                      <Input 
                        id="revenue" 
                        type="text" 
                        placeholder={isInternational ? "e.g., 50,000" : "e.g., 5,000,000"} 
                        value={monthlyRevenue} 
                        onChange={(e) => setMonthlyRevenue(e.target.value)} 
                        className="h-14 text-lg bg-background/50 border-border/50 focus:border-primary" 
                      />
                    </div>
                    <motion.div 
                      initial={{ scale: 0.95 }}
                      animate={{ scale: monthlyRevenue ? 1 : 0.95 }}
                      className="p-6 rounded-2xl bg-success/10 border border-success/30"
                    >
                      <p className="text-sm text-success mb-2">Estimated Annual Recovery</p>
                      <p className="text-4xl font-display font-bold text-success">{monthlyRevenue ? calculateSavings() : (isInternational ? '$0' : '₦0')}</p>
                      <p className="text-xs text-muted-foreground mt-2">Based on 5% recovery rate from reduced waste</p>
                    </motion.div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 sm:py-32 relative">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">Disruptive Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
              Investment in <span className="text-gradient">Your Success</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              {isInternational ? 'Simple, transparent pricing for global businesses' : 'Pricing designed to win you over from old inventory apps'}
            </p>
            
            {/* Currency Toggle */}
            <div className="inline-flex items-center gap-4 px-6 py-3 rounded-full bg-muted/50 border border-border/50">
              <span className={`text-sm ${!isInternational ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>🇳🇬 Nigerian Naira</span>
              <Switch checked={isInternational} onCheckedChange={setIsInternational} />
              <span className={`text-sm ${isInternational ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>🌍 US Dollar</span>
            </div>
          </motion.div>

          {/* NGN Pricing */}
          {!isInternational && (
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {Object.entries(ngnPricing).map(([key, plan], index) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8 }}
                >
                  <Card className={`h-full glass-card overflow-hidden ${plan.highlight ? 'border-primary/50 shadow-glow-primary relative' : 'border-border/50'}`}>
                    {plan.highlight && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary"></div>}
                    <CardContent className="p-6 sm:p-8">
                      {plan.highlight && <Badge className="absolute top-4 right-4 bg-gradient-primary text-primary-foreground">Most Popular</Badge>}
                      <h3 className="text-xl font-display font-bold mb-1">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{plan.tagline}</p>
                      <p className="text-xs text-muted-foreground mb-2">{plan.target}</p>
                      
                      <div className="my-6 py-4 border-t border-b border-border/30">
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-sm text-muted-foreground">{plan.setupLabel}:</span>
                          <span className={`text-2xl font-display font-bold ${plan.setup === '₦0' ? 'text-success' : ''}`}>{plan.setup}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-3xl font-display font-bold ${plan.highlight ? 'text-gradient' : ''}`}>{plan.monthly}</span>
                          <span className="text-sm text-muted-foreground">/month</span>
                        </div>
                      </div>

                      <Link to="/auth?tab=signup">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button 
                            className={`w-full mb-6 ${plan.highlight ? 'bg-gradient-primary hover:opacity-90 shadow-glow-primary' : ''}`} 
                            variant={plan.highlight ? 'default' : 'outline'}
                          >
                            {key === 'enterprise' ? 'Contact Sales' : 'Start Free Trial'}
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
                            <Check className={`h-4 w-4 shrink-0 ${plan.highlight ? 'text-primary' : 'text-success'}`} />
                            <span className={plan.highlight ? '' : 'text-muted-foreground'}>{feature}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* USD Pricing */}
          {isInternational && (
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {Object.entries(usdPricing).map(([key, plan], index) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8 }}
                >
                  <Card className={`h-full glass-card overflow-hidden ${plan.highlight ? 'border-primary/50 shadow-glow-primary relative' : 'border-border/50'}`}>
                    {plan.highlight && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary"></div>}
                    <CardContent className="p-6 sm:p-8">
                      {plan.highlight && <Badge className="absolute top-4 right-4 bg-gradient-primary text-primary-foreground">Recommended</Badge>}
                      <h3 className="text-xl font-display font-bold mb-1">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground mb-6">{plan.tagline}</p>
                      
                      <div className="mb-6">
                        <p className={`text-4xl font-display font-bold ${plan.highlight ? 'text-gradient' : ''}`}>
                          {plan.monthly}
                          <span className="text-sm text-muted-foreground font-normal">/month</span>
                        </p>
                      </div>

                      <Link to="/auth?tab=signup">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button 
                            className={`w-full mb-6 ${plan.highlight ? 'bg-gradient-primary hover:opacity-90 shadow-glow-primary' : ''}`} 
                            variant={plan.highlight ? 'default' : 'outline'}
                          >
                            {key === 'enterprise' ? 'Contact Sales' : 'Start Free Trial'}
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
                            <Check className={`h-4 w-4 shrink-0 ${plan.highlight ? 'text-primary' : 'text-success'}`} />
                            <span className={plan.highlight ? '' : 'text-muted-foreground'}>{feature}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-12 space-y-4"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-success/10 border border-success/30">
              <BadgeCheck className="h-5 w-5 text-success" />
              <span className="text-success font-medium">30-Day Money-Back Guarantee</span>
            </div>
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary/10 border border-primary/30 ml-4">
              <FileUp className="h-5 w-5 text-primary" />
              <span className="text-primary font-medium">Free Data Migration Included</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Bank-Grade Security & Trust Section */}
      <section className="py-20 sm:py-28 relative bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4 border-success/30 text-success">
              <Lock className="h-3 w-3 mr-1" />
              Bank-Grade Security
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
              Your Data, <span className="text-gradient">Your Rules</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Stop using software that just records history. Start using software that predicts your future profit.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Data Ownership */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Card className="h-full glass-card border-border/50 hover:border-success/30 transition-all">
                <CardContent className="p-6 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-success/20 flex items-center justify-center mx-auto mb-4">
                    <Database className="h-7 w-7 text-success" />
                  </div>
                  <h3 className="text-lg font-display font-bold mb-2">Data Ownership</h3>
                  <p className="text-sm text-muted-foreground">
                    Your data is yours. Export it anytime. We use 256-bit encryption to keep your sales records private.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Offline Mode */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Card className="h-full glass-card border-border/50 hover:border-primary/30 transition-all">
                <CardContent className="p-6 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <WifiOff className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-display font-bold mb-2">Offline Mode</h3>
                  <p className="text-sm text-muted-foreground">
                    Internet down? No problem. The POS keeps working and syncs to the cloud the moment you're back online.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Professional Support */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <Card className="h-full glass-card border-border/50 hover:border-secondary/30 transition-all">
                <CardContent className="p-6 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-secondary/20 flex items-center justify-center mx-auto mb-4">
                    <Headphones className="h-7 w-7 text-secondary" />
                  </div>
                  <h3 className="text-lg font-display font-bold mb-2">Professional Support</h3>
                  <p className="text-sm text-muted-foreground">
                    Built by medical professionals, for medical professionals. We speak your language, not just code.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Prediction Power */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <Card className="h-full glass-card border-border/50 hover:border-warning/30 transition-all">
                <CardContent className="p-6 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-warning/20 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-7 w-7 text-warning" />
                  </div>
                  <h3 className="text-lg font-display font-bold mb-2">Prediction Power</h3>
                  <p className="text-sm text-muted-foreground">
                    Stop recording history. Start predicting your future profit with AI-powered analytics.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-6"
          >
            {[
              { icon: Lock, text: '256-bit Encryption' },
              { icon: ShieldCheck, text: 'GDPR Compliant' },
              { icon: BadgeCheck, text: 'NAFDAC Certified' },
              { icon: Globe, text: '99.9% Uptime SLA' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50">
                <item.icon className="h-4 w-4 text-success" />
                <span className="text-sm text-muted-foreground">{item.text}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/40">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="md:col-span-1"
            >
              <Logo size="sm" linkTo="/" />
              <p className="text-sm text-muted-foreground mt-4">
                The AI-powered pharmacy management system built by pharmacists, for pharmacists.
              </p>
            </motion.div>
            
            {/* Contact Section */}
            <div className="md:col-span-2">
              <h4 className="font-semibold mb-4">Contact Us</h4>
              <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                <a href="mailto:pharmatrackai@gmail.com" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Headphones className="h-4 w-4" />
                  <span>pharmatrackai@gmail.com</span>
                </a>
                <a href="tel:+2349169153129" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Phone className="h-4 w-4" />
                  <span>+234 916 915 3129</span>
                </a>
                <a href="tel:+2349132424169" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Phone className="h-4 w-4" />
                  <span>+234 913 242 4169</span>
                </a>
                <a 
                  href="https://wa.link/jsn5d9" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-success transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Chat on WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Compliance */}
            <div className="md:col-span-1">
              <h4 className="font-semibold mb-4">Compliance</h4>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                {['NAFDAC', 'GDPR'].map((cert, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-success" />
                    <span>{cert} Compliant</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="text-center pt-8 border-t border-border/40 text-sm text-muted-foreground">
            © {new Date().getFullYear()} PharmaTrack AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
