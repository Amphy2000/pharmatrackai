import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Sparkles, TrendingUp, Clock, ShieldCheck, Users, BarChart3, Zap,
  Check, X, ArrowRight, Star, DollarSign, AlertTriangle, Target,
  BadgeCheck, Globe, Smartphone, WifiOff, Database, Headphones,
  ChevronLeft, ChevronRight as ChevronRightIcon, Play, Calculator,
  Building2, Award, LineChart, Package, Receipt, UserCog, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const SalesPitch = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isInternational, setIsInternational] = useState(false);
  const [monthlyRevenue, setMonthlyRevenue] = useState('5000000');
  const [expiryLoss, setExpiryLoss] = useState('8');

  const formatCurrency = (amount: number) => {
    if (isInternational) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount / 750);
    }
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);
  };

  const revenue = parseFloat(monthlyRevenue.replace(/,/g, '')) || 0;
  const annualRevenue = revenue * 12;
  const currentExpiryLoss = (parseFloat(expiryLoss) / 100) * annualRevenue;
  const recoveredWithAI = currentExpiryLoss * 0.7; // 70% recovery rate
  const staffTheftSaved = annualRevenue * 0.02; // 2% staff leakage prevention
  const totalSavings = recoveredWithAI + staffTheftSaved;

  const metrics = [
    { label: 'Pharmacies Trust Us', value: '500+', icon: Building2, color: 'text-primary' },
    { label: 'Value Recovered', value: isInternational ? '$3.2M+' : '₦2.5B+', icon: DollarSign, color: 'text-success' },
    { label: 'Expiry Reduction', value: '67%', icon: TrendingUp, color: 'text-info' },
    { label: 'Customer Rating', value: '4.9/5', icon: Star, color: 'text-warning' },
  ];

  const painPoints = [
    {
      icon: AlertTriangle,
      title: 'Drugs Expiring on Shelves',
      problem: 'Average pharmacy loses 5-12% of inventory to expiry annually',
      cost: formatCurrency(annualRevenue * 0.08),
      solution: 'AI predicts expiry 60 days early, auto-suggests discounts'
    },
    {
      icon: Users,
      title: 'Staff Pilferage & Leakage',
      problem: 'Untracked sales, missing cash, no accountability',
      cost: formatCurrency(annualRevenue * 0.03),
      solution: 'Clock-in tracking, per-shift sales reports, complete audit trail'
    },
    {
      icon: Package,
      title: 'Stockouts & Overstocking',
      problem: 'Guessing what to order, losing customers to competitors',
      cost: formatCurrency(annualRevenue * 0.05),
      solution: 'AI demand forecasting tells you exactly what to reorder'
    },
    {
      icon: Receipt,
      title: 'Manual Inventory Entry',
      problem: 'Hours wasted on spreadsheets, human errors',
      cost: '40+ hours/month',
      solution: 'Barcode scanning, invoice import, bulk uploads'
    },
  ];

  const features = [
    {
      category: 'AI-Powered Intelligence',
      icon: Sparkles,
      color: 'from-violet-500 to-purple-600',
      items: [
        { name: 'Predictive Expiry Alerts', desc: 'AI identifies at-risk stock 60 days early' },
        { name: 'Smart Discount Engine', desc: 'Auto-generates optimal discount strategies' },
        { name: 'Demand Forecasting', desc: 'Know what to reorder before stockouts' },
        { name: 'AI Search', desc: 'Natural language inventory queries' },
      ]
    },
    {
      category: 'Complete Operations',
      icon: BarChart3,
      color: 'from-emerald-500 to-teal-600',
      items: [
        { name: 'Smart POS System', desc: 'Fast checkout with barcode scanning' },
        { name: 'Multi-Branch Support', desc: 'Manage all locations from one dashboard' },
        { name: 'Stock Transfers', desc: 'Move inventory between branches seamlessly' },
        { name: 'Customer Prescriptions', desc: 'Track Rx history and refill reminders' },
      ]
    },
    {
      category: 'Staff & Security',
      icon: ShieldCheck,
      color: 'from-amber-500 to-orange-600',
      items: [
        { name: 'Clock-in/Clock-out', desc: 'Track every shift with accountability' },
        { name: 'Role-Based Permissions', desc: 'Control who sees and does what' },
        { name: 'Sales Attribution', desc: 'Know exactly who sold what' },
        { name: 'Audit Trails', desc: 'Complete history of all actions' },
      ]
    },
  ];

  const testimonials = [
    {
      quote: "We recovered ₦4.2M in our first year just from the expiry alerts alone. The software paid for itself 10x over.",
      author: "Pharm. Adebayo Okonkwo",
      role: "Managing Director",
      company: "MedPlus Pharmacy Chain",
      location: "Lagos, Nigeria",
      metric: "₦4.2M Recovered",
      avatar: "AO"
    },
    {
      quote: "Staff theft dropped to zero. When everyone knows they're being tracked, behavior changes immediately.",
      author: "Mrs. Chioma Eze",
      role: "Owner",
      company: "HealthFirst Pharmacy",
      location: "Abuja, Nigeria",
      metric: "0% Shrinkage",
      avatar: "CE"
    },
    {
      quote: "I used to spend 3 hours daily on inventory. Now it's 15 minutes. The AI basically runs my reordering.",
      author: "Pharm. Ibrahim Musa",
      role: "Chief Pharmacist",
      company: "Greenfield Medical Centre",
      location: "Kano, Nigeria",
      metric: "90% Time Saved",
      avatar: "IM"
    },
  ];

  const comparisonData = [
    { feature: 'Expiry Management', old: 'Manual checking', pharmatrack: 'AI predicts 60 days early', impact: 'critical' },
    { feature: 'Stock Entry', old: 'Typing everything', pharmatrack: 'Barcode + Invoice scan', impact: 'high' },
    { feature: 'Staff Tracking', old: 'Trust-based', pharmatrack: 'Clock-in with sales audit', impact: 'critical' },
    { feature: 'Reordering', old: 'Guesswork', pharmatrack: 'AI demand forecasting', impact: 'high' },
    { feature: 'Multi-Branch', old: 'Separate systems', pharmatrack: 'Unified dashboard', impact: 'medium' },
    { feature: 'Support', old: 'Call the vendor', pharmatrack: '24/7 Priority support', impact: 'high' },
    { feature: 'Setup Fee', old: 'Heavy upfront', pharmatrack: '₦0 option available', impact: 'high' },
    { feature: 'Updates', old: 'Pay per upgrade', pharmatrack: 'Always latest version', impact: 'medium' },
  ];

  const pricing: Record<string, { name: string; tagline: string; setup: string; monthly: string; annual: string; target: string; features: string[]; popular?: boolean }> = {
    starter: {
      name: 'Switch & Save',
      tagline: 'Lifetime License Feel',
      setup: '₦150,000',
      monthly: '₦10,000',
      annual: '₦100,000',
      target: 'Single-branch pharmacies',
      features: ['Cloud Backups', '1 User', 'Unlimited SKUs', 'Basic POS', 'Expiry Tracking', 'Email Support'],
    },
    pro: {
      name: 'AI Powerhouse',
      tagline: 'Stop Drug Waste',
      setup: '₦0',
      monthly: '₦35,000',
      annual: '₦350,000',
      target: 'Growing pharmacies',
      features: ['Everything in Starter', 'AI Expiry Predictions', 'Demand Forecasting', 'Unlimited Users', 'Multi-Branch', 'Staff Tracking', 'Priority Support'],
      popular: true,
    },
    enterprise: {
      name: 'Enterprise',
      tagline: 'Hospital Chains',
      setup: 'Custom',
      monthly: 'Custom',
      annual: 'Custom',
      target: 'Large organizations',
      features: ['Everything in Pro', 'White-label', 'Custom API', 'Dedicated Manager', '24/7 Support', 'SLA Guarantee', 'On-site Training'],
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur-xl bg-background/90">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <span className="font-display font-bold text-2xl">PharmaTrack</span>
              <p className="text-xs text-muted-foreground">AI Pharmacy Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border">
              <span className={`text-sm ${!isInternational ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>🇳🇬 NGN</span>
              <Switch checked={isInternational} onCheckedChange={setIsInternational} />
              <span className={`text-sm ${isInternational ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>🌍 USD</span>
            </div>
            <Link to="/auth?tab=signup">
              <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80 shadow-lg">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Full Screen Impact */}
      <section className="min-h-screen flex items-center justify-center relative pt-20 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <motion.div 
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
          transition={{ duration: 10, repeat: Infinity }}
        />

        <div className="container mx-auto px-6 relative z-10">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="max-w-5xl mx-auto text-center"
          >
            <motion.div variants={fadeInUp} className="mb-6">
              <Badge className="text-sm px-4 py-2 bg-success/10 text-success border-success/30">
                <Zap className="h-4 w-4 mr-2" />
                Trusted by 500+ Nigerian Pharmacies
              </Badge>
            </motion.div>

            <motion.h1 
              variants={fadeInUp}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold leading-[1.1] mb-8"
            >
              Stop Losing
              <br />
              <span className="bg-gradient-to-r from-destructive via-destructive to-destructive/70 bg-clip-text text-transparent">
                {formatCurrency(currentExpiryLoss)}
              </span>
              <br />
              <span className="text-muted-foreground text-4xl sm:text-5xl md:text-6xl">Every Year to Expiry</span>
            </motion.h1>

            <motion.p 
              variants={fadeInUp}
              className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12"
            >
              PharmaTrack's AI predicts expiry 60 days early, stops staff pilferage, and tells you exactly what to reorder—
              <span className="text-primary font-semibold"> so you keep more of what you earn.</span>
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-center gap-4 mb-16">
              <Link to="/auth?tab=signup">
                <Button size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-primary/80 shadow-xl hover:shadow-2xl transition-all">
                  Start 7-Day Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </motion.div>

            {/* Trust Metrics */}
            <motion.div 
              variants={fadeInUp}
              className="grid grid-cols-2 md:grid-cols-4 gap-6"
            >
              {metrics.map((metric, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="p-6 rounded-2xl bg-card/50 backdrop-blur border border-border/50"
                >
                  <metric.icon className={`h-8 w-8 ${metric.color} mb-3 mx-auto`} />
                  <div className="text-3xl font-display font-bold">{metric.value}</div>
                  <div className="text-sm text-muted-foreground">{metric.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Pain Points Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4 text-destructive border-destructive/30">The Problem</Badge>
            <h2 className="text-4xl sm:text-5xl font-display font-bold mb-4">
              Your Pharmacy is <span className="text-destructive">Bleeding Money</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Most pharmacies lose 15-20% of potential profit to these silent killers
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {painPoints.map((point, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full border-destructive/20 bg-card/80 backdrop-blur overflow-hidden group hover:border-primary/50 transition-all">
                  <CardContent className="p-8">
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                        <point.icon className="h-7 w-7 text-destructive group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold mb-2">{point.title}</h3>
                        <p className="text-muted-foreground mb-4">{point.problem}</p>
                        <div className="flex items-center gap-2 mb-4">
                          <Badge variant="destructive" className="text-sm">
                            Costing you: {point.cost}
                          </Badge>
                        </div>
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
                          <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                          <p className="text-sm text-success">{point.solution}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary">ROI Calculator</Badge>
              <h2 className="text-4xl sm:text-5xl font-display font-bold mb-4">
                See Your <span className="text-primary">Potential Savings</span>
              </h2>
            </div>

            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background overflow-hidden">
              <CardContent className="p-8 sm:p-12">
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Monthly Revenue ({isInternational ? 'USD' : 'NGN'})</label>
                    <Input
                      type="text"
                      value={monthlyRevenue}
                      onChange={(e) => setMonthlyRevenue(e.target.value.replace(/[^0-9]/g, ''))}
                      className="text-2xl font-bold h-14"
                      placeholder="5,000,000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Current Expiry Loss (%)</label>
                    <Input
                      type="text"
                      value={expiryLoss}
                      onChange={(e) => setExpiryLoss(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="text-2xl font-bold h-14"
                      placeholder="8"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-6">
                  <div className="p-6 rounded-xl bg-destructive/10 border border-destructive/20">
                    <div className="text-sm text-destructive font-medium mb-1">Current Annual Loss</div>
                    <div className="text-3xl font-display font-bold text-destructive">
                      {formatCurrency(currentExpiryLoss)}
                    </div>
                  </div>
                  <div className="p-6 rounded-xl bg-success/10 border border-success/20">
                    <div className="text-sm text-success font-medium mb-1">Recovered with AI</div>
                    <div className="text-3xl font-display font-bold text-success">
                      {formatCurrency(recoveredWithAI)}
                    </div>
                  </div>
                  <div className="p-6 rounded-xl bg-primary/10 border border-primary/20">
                    <div className="text-sm text-primary font-medium mb-1">Total Annual Savings</div>
                    <div className="text-3xl font-display font-bold text-primary">
                      {formatCurrency(totalSavings)}
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-6 rounded-xl bg-card border text-center">
                  <p className="text-lg text-muted-foreground mb-2">
                    ROI: <span className="text-4xl font-display font-bold text-primary">{Math.round(totalSavings / (35000 * 12) * 100)}x</span> your investment
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Based on Pro plan pricing of ₦35,000/month
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4">Complete Solution</Badge>
            <h2 className="text-4xl sm:text-5xl font-display font-bold mb-4">
              Everything You Need to <span className="text-primary">Dominate</span>
            </h2>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((category, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full border-border/50 overflow-hidden group hover:shadow-xl transition-all">
                  <div className={`h-2 bg-gradient-to-r ${category.color}`} />
                  <CardContent className="p-8">
                    <div className={`h-14 w-14 rounded-2xl bg-gradient-to-r ${category.color} flex items-center justify-center mb-6`}>
                      <category.icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-xl font-display font-bold mb-6">{category.category}</h3>
                    <div className="space-y-4">
                      {category.items.map((item, j) => (
                        <div key={j} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">{item.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4">Why Switch?</Badge>
            <h2 className="text-4xl sm:text-5xl font-display font-bold mb-4">
              Old Software vs <span className="text-primary">PharmaTrack</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-display font-bold">Feature</th>
                      <th className="text-left p-4 font-display font-bold text-destructive">Old Software</th>
                      <th className="text-left p-4 font-display font-bold text-primary">PharmaTrack</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row, i) => (
                      <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-medium">{row.feature}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <X className="h-4 w-4 text-destructive" />
                            {row.old}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-success" />
                            <span className="font-medium">{row.pharmatrack}</span>
                            {row.impact === 'critical' && (
                              <Badge variant="destructive" className="text-[10px] ml-1">Critical</Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4">Social Proof</Badge>
            <h2 className="text-4xl sm:text-5xl font-display font-bold mb-4">
              What Pharmacy Owners Say
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full border-border/50 overflow-hidden">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-warning fill-warning" />
                      ))}
                    </div>
                    <Badge className="mb-4 bg-success/10 text-success border-success/30">
                      {testimonial.metric}
                    </Badge>
                    <p className="text-lg mb-6 italic">"{testimonial.quote}"</p>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <div className="font-bold">{testimonial.author}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.company}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4">Pricing</Badge>
            <h2 className="text-4xl sm:text-5xl font-display font-bold mb-4">
              Simple, Transparent <span className="text-primary">Pricing</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Start free. Upgrade when you're ready.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {Object.entries(pricing).map(([key, plan], i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-primary text-primary-foreground shadow-lg">
                      <Zap className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <Card className={`h-full ${plan.popular ? 'border-2 border-primary shadow-xl' : 'border-border/50'}`}>
                  <CardContent className="p-8">
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-display font-bold">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                    </div>
                    <div className="text-center mb-6">
                      {plan.setup !== 'Custom' && (
                        <div className="text-sm text-muted-foreground mb-1">
                          Setup: <span className={plan.setup === '₦0' ? 'text-success font-bold' : ''}>{plan.setup}</span>
                        </div>
                      )}
                      <div className="text-4xl font-display font-bold">{plan.monthly}</div>
                      <div className="text-sm text-muted-foreground">/month</div>
                    </div>
                    <div className="space-y-3 mb-8">
                      {plan.features.map((feature, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-success shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                    <Link to="/auth?tab=signup" className="block">
                      <Button className={`w-full ${plan.popular ? 'bg-primary' : ''}`} variant={plan.popular ? 'default' : 'outline'}>
                        Get Started
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-br from-primary/10 via-background to-secondary/10 relative overflow-hidden">
        <motion.div 
          className="absolute inset-0"
          animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
          transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse' }}
        />
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold mb-6">
              Ready to Stop Losing Money?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join 500+ pharmacies already using PharmaTrack to recover lost profits and grow faster.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link to="/auth?tab=signup">
                <Button size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-primary/80 shadow-xl">
                  Start Your Free 7-Day Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                Free data migration
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                Cancel anytime
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-card/50">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">PharmaTrack</span>
          </div>
          <p className="text-muted-foreground mb-4">
            The AI Brain for Your Pharmacy
          </p>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} PharmaTrack. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default SalesPitch;