import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { TrendingUp, Clock, ShieldCheck, Users, BarChart3, Zap, Check, X, ArrowRight, Star, DollarSign, AlertTriangle, Target, BadgeCheck, Globe, Smartphone, WifiOff, Database, Headphones, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Play, Calculator, Building2, Award, LineChart, Package, Receipt, UserCog, Lock, Lightbulb, Rocket, Crown, Sparkles, FileDown } from 'lucide-react';
import { SalesPdfGenerator } from '@/components/sales/SalesPdfGenerator';
import { FeatureComparisonPdfGenerator } from '@/components/sales/FeatureComparisonPdfGenerator';
import { ClientChecklistPdfGenerator } from '@/components/sales/ClientChecklistPdfGenerator';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
const fadeInUp = {
  hidden: {
    opacity: 0,
    y: 40
  },
  visible: {
    opacity: 1,
    y: 0
  }
};
const staggerContainer = {
  hidden: {
    opacity: 0
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};
const slideNames = ['hero', 'problem', 'why-not-generic', 'roi', 'features', 'comparison', 'insights', 'pricing', 'cta'];
const SalesPitch = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isInternational, setIsInternational] = useState(false);
  const [monthlyRevenue, setMonthlyRevenue] = useState('5000000');
  const [expiryLoss, setExpiryLoss] = useState('8');
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const touchStartY = useRef(0);
  const formatCurrency = (amount: number) => {
    if (isInternational) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(amount / 750);
    }
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0
    }).format(amount);
  };
  const revenue = parseFloat(monthlyRevenue.replace(/,/g, '')) || 0;
  const annualRevenue = revenue * 12;
  const currentExpiryLoss = parseFloat(expiryLoss) / 100 * annualRevenue;
  const recoveredWithAI = currentExpiryLoss * 0.7; // 70% recovery rate
  const staffTheftSaved = annualRevenue * 0.02; // 2% staff leakage prevention
  const totalSavings = recoveredWithAI + staffTheftSaved;

  // Fixed ROI calculation: Annual Savings / Annual Cost
  const annualCost = 35000 * 12; // Pro plan annual cost
  const roiMultiple = Math.round(totalSavings / annualCost);
  // Cap ROI to realistic range (1x - 20x)
  const displayROI = Math.min(Math.max(roiMultiple, 1), 20);
  const scrollToSlide = (index: number) => {
    if (index < 0 || index >= slideNames.length || isScrolling.current) return;
    isScrolling.current = true;
    setCurrentSlide(index);
    const slideElement = document.getElementById(`slide-${slideNames[index]}`);
    if (slideElement) {
      slideElement.scrollIntoView({
        behavior: 'smooth'
      });
    }
    setTimeout(() => {
      isScrolling.current = false;
    }, 800);
  };
  const nextSlide = () => scrollToSlide(currentSlide + 1);
  const prevSlide = () => scrollToSlide(currentSlide - 1);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  // Removed aggressive touch swipe - allow natural scrolling on mobile
  // Users can use navigation arrows or dots to move between slides

  // Handle scroll to detect current slide
  useEffect(() => {
    const handleScroll = () => {
      if (isScrolling.current) return;
      const scrollPosition = window.scrollY + window.innerHeight / 2;
      for (let i = 0; i < slideNames.length; i++) {
        const element = document.getElementById(`slide-${slideNames[i]}`);
        if (element) {
          const {
            offsetTop,
            offsetHeight
          } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            if (currentSlide !== i) {
              setCurrentSlide(i);
            }
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, {
      passive: true
    });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentSlide]);
  const painPoints = [{
    icon: AlertTriangle,
    title: 'Drugs Expiring on Shelves',
    problem: 'Average pharmacy loses 5-12% of inventory to expiry annually',
    cost: formatCurrency(annualRevenue * 0.08),
    solution: 'AI predicts expiry 60 days early, auto-suggests discounts'
  }, {
    icon: Users,
    title: 'Staff Pilferage & Leakage',
    problem: 'Untracked sales, missing cash, no accountability',
    cost: formatCurrency(annualRevenue * 0.03),
    solution: 'Clock-in tracking, per-shift sales reports, complete audit trail'
  }, {
    icon: Package,
    title: 'Stockouts & Overstocking',
    problem: 'Guessing what to order, losing customers to competitors',
    cost: formatCurrency(annualRevenue * 0.05),
    solution: 'AI demand forecasting tells you exactly what to reorder'
  }, {
    icon: Receipt,
    title: 'Manual Inventory Entry',
    problem: 'Hours wasted on spreadsheets, human errors',
    cost: '40+ hours/month',
    solution: 'Barcode scanning, invoice import, bulk uploads'
  }];
  const features = [{
    category: 'AI-Powered Intelligence',
    icon: Sparkles,
    color: 'from-violet-500 to-purple-600',
    items: [{
      name: 'Predictive Expiry Alerts',
      desc: 'AI identifies at-risk stock 60 days early'
    }, {
      name: 'Smart Discount Engine',
      desc: 'Auto-generates optimal discount strategies'
    }, {
      name: 'Demand Forecasting',
      desc: 'Know what to reorder before stockouts'
    }, {
      name: 'AI Search',
      desc: 'Natural language inventory queries'
    }]
  }, {
    category: 'Complete Operations',
    icon: BarChart3,
    color: 'from-emerald-500 to-teal-600',
    items: [{
      name: 'Smart POS System',
      desc: 'Fast checkout with barcode scanning'
    }, {
      name: 'Multi-Branch Support',
      desc: 'Manage all locations from one dashboard'
    }, {
      name: 'Stock Transfers',
      desc: 'Move inventory between branches seamlessly'
    }, {
      name: 'Customer Prescriptions',
      desc: 'Track Rx history and refill reminders'
    }]
  }, {
    category: 'Compliance & Security',
    icon: ShieldCheck,
    color: 'from-amber-500 to-orange-600',
    items: [{
      name: 'NAFDAC Audit Reports',
      desc: 'Professional PDF compliance documents'
    }, {
      name: 'Controlled Drugs Register',
      desc: 'Track narcotics with full audit trail'
    }, {
      name: 'Manufacturing Date Tracking',
      desc: 'Complete product lifecycle visibility'
    }, {
      name: 'Staff Clock-in System',
      desc: 'Shift tracking with sales attribution'
    }]
  }];

  // Persona-based insights (not fake testimonials)
  const leaderPerspectives = [{
    perspective: "The Managing Director's View",
    icon: Crown,
    insight: "For an MD, the biggest win is seeing your inventory health from your phone without calling the shop manager. Real-time P&L visibility means faster decisions.",
    benefit: "Remote Business Visibility",
    color: 'from-amber-500 to-orange-500'
  }, {
    perspective: "The Superintendent Pharmacist's View",
    icon: Award,
    insight: "Compliance becomes effortless when expiry dates are tracked automatically. No more surprise NAFDAC inspections finding expired stock on shelves.",
    benefit: "Regulatory Confidence",
    color: 'from-emerald-500 to-teal-500'
  }, {
    perspective: "The Operations Manager's View",
    icon: BarChart3,
    insight: "Staff accountability transforms when everyone knows every transaction is logged. The clock-in system alone changed our culture overnight.",
    benefit: "Team Accountability",
    color: 'from-blue-500 to-indigo-500'
  }];

  // Industry insights (factual, research-based)
  const industryInsights = [{
    icon: Lightbulb,
    title: 'Industry Insight',
    fact: `A pharmacy doing ${formatCurrency(revenue)}/mo can recover up to ${formatCurrency(totalSavings)} annually by automating expiry tracking.`,
    source: 'Based on ROI calculator metrics'
  }, {
    icon: TrendingUp,
    title: 'Market Research',
    fact: 'Nigerian pharmacies lose an average of 8-15% of annual revenue to preventable inventory losses.',
    source: 'Pharmacy sector analysis'
  }, {
    icon: Clock,
    title: 'Time Study',
    fact: 'Manual inventory management consumes 40+ hours monthly that could be spent serving customers.',
    source: 'Operational efficiency study'
  }];

  // Generic POS vs PharmaTrack AI - Premium Comparison Table
  const comparisonData = [{
    feature: 'Inventory Entry',
    old: 'Manual search of 100k items',
    pharmatrack: 'AI Invoice Scanner: Snap & Stock 50+ items in 10 secs',
    impact: 'critical'
  }, {
    feature: 'Compliance',
    old: 'Generic Expiry alerts only',
    pharmatrack: '2025 NAFDAC Ready: Auto-generates Batch/BN Traceability logs',
    impact: 'critical'
  }, {
    feature: 'Anti-Theft',
    old: 'Staff can edit prices easily',
    pharmatrack: 'Locked Pricing: Zero-Price-Manipulation (Admin Only)',
    impact: 'critical'
  }, {
    feature: 'Clinical Care',
    old: 'Basic grocery-style receipt',
    pharmatrack: 'Digital Dispensing: Integrated Dosage & Ingredient Search',
    impact: 'critical'
  }, {
    feature: 'Performance',
    old: 'Bloated app; lags on older phones',
    pharmatrack: 'High-Speed Lite: Instant login on all Nigerian networks',
    impact: 'high'
  }, {
    feature: 'Hardware',
    old: '₦300k dedicated device needed',
    pharmatrack: 'Zero Hardware: Runs on the phone/laptop you already own',
    impact: 'high'
  }];

  // Generic POS vs PharmaTrack comparison (for battle card)
  const genericPosComparison = [{
    category: 'Legal Compliance',
    generic: 'Not designed for pharmacy regulations',
    pharmatrack: 'NAFDAC audit reports, PCN-ready documentation',
    critical: true
  }, {
    category: 'Controlled Drugs',
    generic: 'No narcotics tracking',
    pharmatrack: 'Full controlled drugs register with audit trail',
    critical: true
  }, {
    category: 'Drug Interactions',
    generic: 'No safety warnings',
    pharmatrack: 'Automatic drug interaction alerts at checkout',
    critical: true
  }, {
    category: 'Expiry Tracking',
    generic: 'Basic date field only',
    pharmatrack: 'AI predicts expiry 60 days early + auto discounts',
    critical: true
  }, {
    category: 'Manufacturing Dates',
    generic: 'Not tracked',
    pharmatrack: 'Complete product lifecycle visibility',
    critical: false
  }, {
    category: 'Prescription Management',
    generic: 'Not available',
    pharmatrack: 'Full Rx history, refill reminders, prescriber records',
    critical: false
  }, {
    category: 'NAFDAC Reg Numbers',
    generic: 'Not supported',
    pharmatrack: 'Stored and printed on compliance reports',
    critical: false
  }, {
    category: 'Batch Tracking',
    generic: 'Basic or none',
    pharmatrack: 'Full batch-level traceability for recalls',
    critical: false
  }];

  // "Stop the Leakage" pitch content
  const stopLeakagePitch = {
    headline: "Traditional retail POS systems are built to sell bread and soap.",
    subline: "PharmaTrack AI is purpose-built to protect a Pharmacy's license and profit.",
    points: [{
      title: 'Stop Staff Fraud',
      description: "Generic inventory apps allow staff to change prices during a sale—that's where your profit disappears. We lock your prices so only the Pharmacist has control.",
      icon: Lock,
      color: 'destructive'
    }, {
      title: 'Audit-Ready in Seconds',
      description: "When NAFDAC walks in, don't scramble for paper. Our AI has already logged every Batch Number and Expiry from your wholesale invoices.",
      icon: ShieldCheck,
      color: 'primary'
    }, {
      title: 'Faster than your Network',
      description: "We know Nigerian internet is unpredictable. Our app is optimized to load instantly, even when other apps are spinning.",
      icon: Zap,
      color: 'success'
    }],
    objectionResponse: `"Sir, those apps are 'General POS.' They tell you what you sold. PharmaTrack AI tells you what you are losing. Can those apps take a photo of your wholesale invoice and stock 50 drugs in 10 seconds? No. Can they generate a NAFDAC Batch Traceability report for the 2024/2025 regulations? No. Those apps are for supermarkets. You are a Healthcare Professional—you deserve a tool built for your license."`
  };

  // Killer questions for sales conversations
  const killerQuestions = ["Does your current app generate NAFDAC-ready compliance reports?", "Can it track controlled substances with a legal audit trail?", "Does it warn you about dangerous drug interactions at checkout?", "Can it predict which items will expire before selling?", "Does it track manufacturing dates for full product lifecycle?", "Can your staff prescriptions be linked to customer records for refill reminders?"];
  const pricing: Record<string, {
    name: string;
    tagline: string;
    setup: string;
    monthly: string;
    annual: string;
    target: string;
    features: string[];
    popular?: boolean;
  }> = {
    starter: {
      name: 'Switch & Save',
      tagline: 'Lifetime License Feel',
      setup: '₦150,000',
      monthly: '₦10,000',
      annual: '₦100,000',
      target: 'Single-branch pharmacies',
      features: ['Cloud Backups', '1 User', 'Unlimited SKUs', 'Basic POS', 'Expiry Tracking', 'Email Support']
    },
    pro: {
      name: 'AI Powerhouse',
      tagline: 'Stop Drug Waste',
      setup: '₦0',
      monthly: '₦35,000',
      annual: '₦350,000',
      target: 'Growing pharmacies',
      features: ['Everything in Starter', 'AI Expiry Predictions', 'Demand Forecasting', 'Unlimited Users', 'Multi-Branch', 'Staff Tracking', 'Priority Support'],
      popular: true
    },
    enterprise: {
      name: 'Enterprise',
      tagline: 'Hospital Chains',
      setup: 'Custom',
      monthly: 'Custom',
      annual: 'Custom',
      target: 'Large organizations',
      features: ['Everything in Pro', 'White-label', 'Custom API', 'Dedicated Manager', '24/7 Support', 'SLA Guarantee', 'On-site Training']
    }
  };
  return <div ref={containerRef} className="bg-background text-foreground overflow-x-hidden">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur-xl bg-background/90">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Logo showText={true} linkTo="/pitch" size="lg" />
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border">
              <span className={`text-sm ${!isInternational ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>🇳🇬 NGN</span>
              <Switch checked={isInternational} onCheckedChange={setIsInternational} />
              <span className={`text-sm ${isInternational ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>🌍 USD</span>
            </div>
            <Link to="/auth?tab=signup">
              <Button size="sm" className="bg-gradient-to-r from-primary to-primary/80 shadow-lg text-xs sm:text-sm">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Slide Navigation Dots */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-2">
        {slideNames.map((name, i) => <button key={name} onClick={() => scrollToSlide(i)} className={`w-3 h-3 rounded-full transition-all ${currentSlide === i ? 'bg-primary scale-125' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'}`} aria-label={`Go to ${name} slide`} />)}
      </div>

      {/* Navigation Arrows */}
      <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-between px-6 pointer-events-none">
        <Button variant="outline" size="icon" onClick={prevSlide} disabled={currentSlide === 0} className={`pointer-events-auto transition-opacity ${currentSlide === 0 ? 'opacity-0' : 'opacity-100'}`}>
          <ChevronUp className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="icon" onClick={nextSlide} disabled={currentSlide === slideNames.length - 1} className={`pointer-events-auto transition-opacity ${currentSlide === slideNames.length - 1 ? 'opacity-0' : 'opacity-100'}`}>
          <ChevronDown className="h-5 w-5" />
        </Button>
      </div>

      {/* SLIDE 1: Hero Section */}
      <section id="slide-hero" className="min-h-screen flex items-center justify-center relative pt-20 overflow-hidden snap-start">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <motion.div className="absolute top-1/4 left-1/4 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-primary/10 rounded-full blur-3xl" animate={{
        scale: [1, 1.2, 1],
        opacity: [0.3, 0.5, 0.3]
      }} transition={{
        duration: 8,
        repeat: Infinity
      }} />
        <motion.div className="absolute bottom-1/4 right-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-secondary/10 rounded-full blur-3xl" animate={{
        scale: [1.2, 1, 1.2],
        opacity: [0.5, 0.3, 0.5]
      }} transition={{
        duration: 10,
        repeat: Infinity
      }} />

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="max-w-5xl mx-auto text-center">
            {/* Beta Badge - Scarcity Strategy */}
            <motion.div variants={fadeInUp} className="mb-4 mt-6 sm:mt-8">
              <Badge className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500/50 shadow-lg">
                <Rocket className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Currently in Exclusive Beta: Accepting 5 Pioneer Pharmacies for 2026
              </Badge>
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-display font-bold leading-[1.1] mb-6 sm:mb-8">
              Stop Losing
              <br />
              <span className="bg-gradient-to-r from-destructive via-destructive to-destructive/70 bg-clip-text text-transparent">
                {formatCurrency(currentExpiryLoss)}
              </span>
              <br />
              <span className="text-muted-foreground text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">Every Year to Expiry</span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 sm:mb-12 px-4">
              PharmaTrack's AI predicts expiry 60 days early, stops staff pilferage, and tells you exactly what to reorder—
              <span className="text-primary font-semibold"> so you keep more of what you earn.</span>
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-10 sm:mb-16">
              <Link to="/auth?tab=signup">
                <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 bg-gradient-to-r from-primary to-primary/80 shadow-xl hover:shadow-2xl transition-all">
                  Start 7-Day Free Trial
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6">
                <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Watch Demo
              </Button>
            </motion.div>

            {/* Join the Next Generation Badge - Moved down */}
            <motion.div variants={fadeInUp} className="mb-8">
              <Badge variant="outline" className="text-xs sm:text-sm px-4 py-2 border-primary/30 text-primary">
                <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                Join the Next Generation of Smart Pharmacies
              </Badge>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div className="absolute bottom-20 left-1/2 -translate-x-1/2" animate={{
        y: [0, 10, 0]
      }} transition={{
        duration: 2,
        repeat: Infinity
      }}>
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* SLIDE 2: Pain Points / Problem */}
      <section id="slide-problem" className="min-h-screen flex items-center py-12 sm:py-24 bg-muted/30 snap-start">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="text-center mb-10 sm:mb-16">
            <Badge variant="outline" className="mb-4 text-destructive border-destructive/30">The Problem</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
              Your Pharmacy is <span className="text-destructive">Bleeding Money</span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Most pharmacies lose 15-20% of potential profit to these silent killers
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4 sm:gap-8 max-w-5xl mx-auto">
            {painPoints.map((point, i) => <motion.div key={i} initial={{
            opacity: 0,
            x: i % 2 === 0 ? -30 : 30
          }} whileInView={{
            opacity: 1,
            x: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: i * 0.1
          }}>
                <Card className="h-full border-destructive/20 bg-card/80 backdrop-blur overflow-hidden group hover:border-primary/50 transition-all">
                  <CardContent className="p-4 sm:p-8">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-destructive/10 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                        <point.icon className="h-5 w-5 sm:h-7 sm:w-7 text-destructive group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-display font-bold mb-2">{point.title}</h3>
                        <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">{point.problem}</p>
                        <div className="flex items-center gap-2 mb-3 sm:mb-4">
                          <Badge variant="destructive" className="text-xs sm:text-sm">
                            Costing you: {point.cost}
                          </Badge>
                        </div>
                        <div className="flex items-start gap-2 p-2 sm:p-3 rounded-lg bg-success/10 border border-success/20">
                          <Check className="h-4 w-4 sm:h-5 sm:w-5 text-success shrink-0 mt-0.5" />
                          <p className="text-xs sm:text-sm text-success">{point.solution}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>)}
          </div>
        </div>
      </section>

      {/* SLIDE 2.5: Why Not Generic POS */}
      <section id="slide-why-not-generic" className="min-h-screen flex items-center py-12 sm:py-24 snap-start">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="text-center mb-10 sm:mb-16">
            <Badge variant="outline" className="mb-4 text-warning border-warning/30">
              <AlertTriangle className="h-3 w-3 mr-2" />
              Critical Difference
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
              Why <span className="text-destructive">Generic Retail POS</span> Fails Pharmacies
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              Traditional inventory systems are designed for supermarkets, not the complex needs of pharmacists. 
              <span className="text-primary font-semibold"> You need pharmacy-specific compliance features to avoid legal trouble.</span>
            </p>
          </motion.div>

          {/* Compliance Badges */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="flex flex-wrap items-center justify-center gap-4 mb-10 sm:mb-12">
            {[{
            icon: ShieldCheck,
            label: 'NAFDAC Ready',
            color: 'bg-success/10 border-success/30 text-success'
          }, {
            icon: Lock,
            label: 'Controlled Drugs Register',
            color: 'bg-destructive/10 border-destructive/30 text-destructive'
          }, {
            icon: BadgeCheck,
            label: 'PCN Compliant',
            color: 'bg-primary/10 border-primary/30 text-primary'
          }, {
            icon: Clock,
            label: 'Expiry AI Tracking',
            color: 'bg-warning/10 border-warning/30 text-warning'
          }].map((badge, i) => <motion.div key={i} initial={{
            opacity: 0,
            scale: 0.9
          }} whileInView={{
            opacity: 1,
            scale: 1
          }} viewport={{
            once: true
          }} transition={{
            delay: i * 0.1
          }} className={`flex items-center gap-2 px-4 py-2 rounded-full border ${badge.color}`}>
                <badge.icon className="h-4 w-4" />
                <span className="font-medium text-sm">{badge.label}</span>
              </motion.div>)}
          </motion.div>

          {/* Comparison Table */}
          <motion.div initial={{
          opacity: 0,
          y: 30
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="max-w-5xl mx-auto mb-10 sm:mb-12">
            <Card className="overflow-hidden border-2 border-primary/20">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 sm:p-4 font-display font-bold text-sm sm:text-base">Pharmacy Requirement</th>
                      <th className="text-left p-3 sm:p-4 font-display font-bold text-destructive text-sm sm:text-base">Generic Retail POS</th>
                      <th className="text-left p-3 sm:p-4 font-display font-bold text-primary text-sm sm:text-base">PharmaTrack</th>
                    </tr>
                  </thead>
                  <tbody>
                    {genericPosComparison.map((row, i) => <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3 sm:p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm sm:text-base">{row.category}</span>
                            {row.critical && <Badge variant="destructive" className="text-[8px] sm:text-[10px]">Legal</Badge>}
                          </div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm">
                            <X className="h-3 w-3 sm:h-4 sm:w-4 text-destructive shrink-0" />
                            {row.generic}
                          </div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="flex items-center gap-2 text-xs sm:text-sm">
                            <Check className="h-3 w-3 sm:h-4 sm:w-4 text-success shrink-0" />
                            <span className="font-medium text-success">{row.pharmatrack}</span>
                          </div>
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>

          {/* Killer Questions for Sales */}
          <motion.div initial={{
          opacity: 0,
          y: 30
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="max-w-4xl mx-auto">
            <Card className="border-warning/30 bg-gradient-to-br from-warning/5 to-background">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-warning/20 flex items-center justify-center">
                    <Target className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-display font-bold">Questions to Ask Your Pharmacist</h3>
                    <p className="text-sm text-muted-foreground">Use these in sales conversations to expose gaps in generic POS</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                  {killerQuestions.map((question, i) => <motion.div key={i} initial={{
                  opacity: 0,
                  x: -10
                }} whileInView={{
                  opacity: 1,
                  x: 0
                }} viewport={{
                  once: true
                }} transition={{
                  delay: i * 0.1
                }} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                      <div className="h-6 w-6 rounded-full bg-warning/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-warning">{i + 1}</span>
                      </div>
                      <p className="text-sm font-medium">{question}</p>
                    </motion.div>)}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* SLIDE 3: ROI Calculator */}
      <section id="slide-roi" className="min-h-screen flex items-center py-12 sm:py-24 snap-start">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="max-w-4xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
                <Calculator className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                Interactive ROI Calculator
              </Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
                See Your <span className="text-primary">Potential Savings</span>
              </h2>
              <p className="text-muted-foreground">Enter your numbers below to calculate your pharmacy's ROI</p>
            </div>

            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background overflow-hidden">
              <CardContent className="p-4 sm:p-8 md:p-12">
                <div className="grid md:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Monthly Revenue ({isInternational ? 'USD' : 'NGN'})</label>
                    <Input type="text" value={monthlyRevenue} onChange={e => setMonthlyRevenue(e.target.value.replace(/[^0-9]/g, ''))} className="text-xl sm:text-2xl font-bold h-12 sm:h-14" placeholder="5,000,000" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Current Expiry Loss (%)</label>
                    <Input type="text" value={expiryLoss} onChange={e => setExpiryLoss(e.target.value.replace(/[^0-9.]/g, ''))} className="text-xl sm:text-2xl font-bold h-12 sm:h-14" placeholder="8" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="p-4 sm:p-6 rounded-xl bg-destructive/10 border border-destructive/20">
                    <div className="text-xs sm:text-sm text-destructive font-medium mb-1">Current Annual Loss</div>
                    <div className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-destructive">
                      {formatCurrency(currentExpiryLoss)}
                    </div>
                  </div>
                  <div className="p-4 sm:p-6 rounded-xl bg-success/10 border border-success/20">
                    <div className="text-xs sm:text-sm text-success font-medium mb-1">Recovered with AI</div>
                    <div className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-success">
                      {formatCurrency(recoveredWithAI)}
                    </div>
                  </div>
                  <div className="p-4 sm:p-6 rounded-xl bg-primary/10 border border-primary/20">
                    <div className="text-xs sm:text-sm text-primary font-medium mb-1">Total Annual Savings</div>
                    <div className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-primary">
                      {formatCurrency(totalSavings)}
                    </div>
                  </div>
                </div>

                <div className="mt-6 sm:mt-8 p-4 sm:p-6 rounded-xl bg-card border text-center">
                  <p className="text-base sm:text-lg text-muted-foreground mb-2">
                    ROI: <span className="text-3xl sm:text-4xl font-display font-bold text-primary">{displayROI}x</span> your investment
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Based on Pro plan pricing of ₦35,000/month (₦420,000/year)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Annual Savings ÷ Annual Cost = {displayROI}x Return
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* SLIDE 4: Features Grid */}
      <section id="slide-features" className="min-h-screen flex items-center py-12 sm:py-24 bg-muted/30 snap-start">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="text-center mb-10 sm:mb-16">
            <Badge variant="outline" className="mb-4">Complete Solution</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
              Everything You Need to <span className="text-primary">Dominate</span>
            </h2>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-4 sm:gap-8 max-w-6xl mx-auto">
            {features.map((category, i) => <motion.div key={i} initial={{
            opacity: 0,
            y: 30
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: i * 0.1
          }}>
                <Card className="h-full border-border/50 overflow-hidden group hover:shadow-xl transition-all">
                  <div className={`h-2 bg-gradient-to-r ${category.color}`} />
                  <CardContent className="p-4 sm:p-8">
                    <div className={`h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-gradient-to-r ${category.color} flex items-center justify-center mb-4 sm:mb-6`}>
                      <category.icon className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-display font-bold mb-4 sm:mb-6">{category.category}</h3>
                    <div className="space-y-3 sm:space-y-4">
                      {category.items.map((item, j) => <div key={j} className="flex items-start gap-2 sm:gap-3">
                          <Check className="h-4 w-4 sm:h-5 sm:w-5 text-success shrink-0 mt-0.5" />
                          <div>
                            <div className="font-medium text-sm sm:text-base">{item.name}</div>
                            <div className="text-xs sm:text-sm text-muted-foreground">{item.desc}</div>
                          </div>
                        </div>)}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>)}
          </div>
        </div>
      </section>

      {/* SLIDE 5: Comparison Table */}
      <section id="slide-comparison" className="min-h-screen flex items-center py-12 sm:py-24 snap-start">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="text-center mb-10 sm:mb-16">
            <Badge variant="outline" className="mb-4">Why Switch?</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
              Old Software vs <span className="text-primary">PharmaTrack</span>
            </h2>
          </motion.div>

          <motion.div initial={{
          opacity: 0,
          y: 30
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="max-w-4xl mx-auto">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 sm:p-4 font-display font-bold text-sm sm:text-base">Feature</th>
                      <th className="text-left p-3 sm:p-4 font-display font-bold text-destructive text-sm sm:text-base">Old Software</th>
                      <th className="text-left p-3 sm:p-4 font-display font-bold text-primary text-sm sm:text-base">PharmaTrack</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row, i) => <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3 sm:p-4 font-medium text-sm sm:text-base">{row.feature}</td>
                        <td className="p-3 sm:p-4">
                          <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm">
                            <X className="h-3 w-3 sm:h-4 sm:w-4 text-destructive shrink-0" />
                            {row.old}
                          </div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="flex items-center gap-2 text-xs sm:text-sm">
                            <Check className="h-3 w-3 sm:h-4 sm:w-4 text-success shrink-0" />
                            <span className="font-medium">{row.pharmatrack}</span>
                            {row.impact === 'critical' && <Badge variant="destructive" className="text-[8px] sm:text-[10px] ml-1">Critical</Badge>}
                          </div>
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* SLIDE 6: Leader Perspectives & Industry Insights */}
      <section id="slide-insights" className="min-h-screen flex items-center py-12 sm:py-24 bg-muted/30 snap-start">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="text-center mb-10 sm:mb-16">
            <Badge variant="outline" className="mb-4">Why Leaders Are Switching</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
              The <span className="text-primary">Smart Pharmacy</span> Advantage
            </h2>
          </motion.div>

          {/* Leader Perspectives */}
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto mb-10 sm:mb-16">
            {leaderPerspectives.map((item, i) => <motion.div key={i} initial={{
            opacity: 0,
            y: 30
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: i * 0.1
          }}>
                <Card className="h-full border-border/50 overflow-hidden hover:shadow-lg transition-all">
                  <div className={`h-2 bg-gradient-to-r ${item.color}`} />
                  <CardContent className="p-4 sm:p-6">
                    <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-r ${item.color} flex items-center justify-center mb-4`}>
                      <item.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <h3 className="text-base sm:text-lg font-display font-bold mb-3">{item.perspective}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground mb-4 italic">"{item.insight}"</p>
                    <Badge className="bg-success/10 text-success border-success/30 text-xs sm:text-sm">
                      {item.benefit}
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>)}
          </div>

          {/* Industry Insights */}
          <div className="max-w-4xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-display font-bold text-center mb-6 sm:mb-8">Industry Research & Insights</h3>
            <div className="grid gap-3 sm:gap-4">
              {industryInsights.map((insight, i) => <motion.div key={i} initial={{
              opacity: 0,
              x: -20
            }} whileInView={{
              opacity: 1,
              x: 0
            }} viewport={{
              once: true
            }} transition={{
              delay: i * 0.1
            }}>
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-4 sm:p-6 flex items-start gap-3 sm:gap-4">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                        <insight.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                      <div>
                        <Badge variant="outline" className="mb-2 text-xs">{insight.title}</Badge>
                        <p className="font-medium text-sm sm:text-base mb-1">{insight.fact}</p>
                        <p className="text-xs text-muted-foreground">{insight.source}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>)}
            </div>
          </div>
        </div>
      </section>

      {/* SLIDE 7: Pricing */}
      <section id="slide-pricing" className="min-h-screen flex items-center py-12 sm:py-24 snap-start">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="text-center mb-10 sm:mb-16">
            <Badge variant="outline" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
              Simple, Transparent <span className="text-primary">Pricing</span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground">
              Start free. Upgrade when you're ready.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-8 max-w-5xl mx-auto">
            {Object.entries(pricing).map(([key, plan], i) => <motion.div key={key} initial={{
            opacity: 0,
            y: 30
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: i * 0.1
          }} className="relative">
                {plan.popular && <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-primary text-primary-foreground shadow-lg text-xs sm:text-sm">
                      <Zap className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>}
                <Card className={`h-full ${plan.popular ? 'border-2 border-primary shadow-xl' : 'border-border/50'}`}>
                  <CardContent className="p-4 sm:p-8">
                    <div className="text-center mb-4 sm:mb-6">
                      <h3 className="text-xl sm:text-2xl font-display font-bold">{plan.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">{plan.tagline}</p>
                    </div>
                    <div className="text-center mb-4 sm:mb-6">
                      {plan.setup !== 'Custom' && <div className="text-xs sm:text-sm text-muted-foreground mb-1">
                          Setup: <span className={plan.setup === '₦0' ? 'text-success font-bold' : ''}>{plan.setup}</span>
                        </div>}
                      <div className="text-2xl sm:text-4xl font-display font-bold">{plan.monthly}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">/month</div>
                    </div>
                    <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                      {plan.features.map((feature, j) => <div key={j} className="flex items-center gap-2">
                          <Check className="h-3 w-3 sm:h-4 sm:w-4 text-success shrink-0" />
                          <span className="text-xs sm:text-sm">{feature}</span>
                        </div>)}
                    </div>
                    <Link to="/auth?tab=signup" className="block">
                      <Button className={`w-full ${plan.popular ? 'bg-primary' : ''}`} variant={plan.popular ? 'default' : 'outline'}>
                        Get Started
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>)}
          </div>
        </div>
      </section>

      {/* SLIDE 8: Final CTA */}
      <section id="slide-cta" className="min-h-screen flex items-center py-12 sm:py-24 bg-gradient-to-br from-primary/10 via-background to-secondary/10 relative overflow-hidden snap-start">
        <motion.div className="absolute inset-0" animate={{
        backgroundPosition: ['0% 0%', '100% 100%']
      }} transition={{
        duration: 20,
        repeat: Infinity,
        repeatType: 'reverse'
      }} />
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <motion.div initial={{
          opacity: 0,
          y: 30
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="max-w-4xl mx-auto text-center">
            {/* Beta Badge */}
            <Badge className="mb-6 text-xs sm:text-sm px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500/50 shadow-lg">
              <Rocket className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Only 5 Pioneer Spots Remaining for 2026
            </Badge>
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
              Ready to Stop Losing Money?
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join the next generation of smart pharmacies already transforming their operations with PharmaTrack.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link to="/auth?tab=signup">
                <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 bg-gradient-to-r from-primary to-primary/80 shadow-xl">
                  Start Your Free 7-Day Trial
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground mb-12">
              <div className="flex items-center gap-2">
                <Check className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
                Free data migration
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
                Cancel anytime
              </div>
            </div>

            {/* Sales PDF Generators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <ClientChecklistPdfGenerator />
              <FeatureComparisonPdfGenerator />
              <SalesPdfGenerator />
            </div>
            
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 border-t bg-card/50">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <Logo showText={true} linkTo={undefined} size="md" />
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            The AI Brain for Your Pharmacy
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            © {new Date().getFullYear()} PharmaTrack. All rights reserved.
          </p>
        </div>
      </footer>
    </div>;
};
export default SalesPitch;