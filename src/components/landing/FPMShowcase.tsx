import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, ShieldCheck, DollarSign, ArrowRight, Zap, CheckCircle2, Sparkles, Smartphone, Lock, TrendingUp, BellRing, PackageCheck, FileSpreadsheet, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

export interface FPMShowcaseProps {
  isInternational?: boolean;
}

export const FPMShowcase = ({ isInternational }: FPMShowcaseProps) => {
  const [activePillar, setActivePillar] = useState<'freedom' | 'power' | 'money'>('freedom');

  const pillars = {
    freedom: {
      id: 'freedom',
      tag: 'FREEDOM',
      title: 'Work ON Your Pharmacy, Not IN It',
      subtitle: 'Reclaim your time and run your pharmacy remotely without being chained to the counter 14 hours a day.',
      icon: Compass,
      color: 'from-blue-500/20 to-indigo-500/20',
      borderColor: 'border-blue-500/40',
      badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
      accentColor: 'text-blue-500',
      bgGlow: 'bg-blue-500/10',
      metrics: [
        { label: 'Time Saved Daily', value: '3.5 Hours' },
        { label: 'Remote Visibility', value: '100% Mobile' },
        { label: 'Manual Tasks Automated', value: '95%' },
      ],
      features: [
        {
          title: 'AI Opening & Closing Briefings',
          description: 'Get instant morning briefings and closing summary reports delivered straight to your phone via WhatsApp & Push.',
          icon: BellRing,
        },
        {
          title: 'Auto-Pilot Restock Orders',
          description: 'Generate 1-click supplier purchase orders based on AI demand forecasts without manual stock counts.',
          icon: PackageCheck,
        },
        {
          title: 'Remote Multi-Branch Control',
          description: 'Monitor live sales, inventory movements, and cashier shifts across all branches from anywhere in the world.',
          icon: Smartphone,
        },
      ],
      quote: '"I used to spend 14 hours daily at my main branch just monitoring cashiers. Now I travel freely while keeping full tabs on my phone."',
      author: 'Pharm. Kenneth O. — Lagos, 3 Branches',
    },
    power: {
      id: 'power',
      tag: 'POWER',
      title: 'Total Command Over Stock, Staff & Compliance',
      subtitle: 'Eliminate staff theft, enforce locked pricing, and generate audit-ready NAFDAC reports in one click.',
      icon: ShieldCheck,
      color: 'from-amber-500/20 to-orange-500/20',
      borderColor: 'border-amber-500/40',
      badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
      accentColor: 'text-amber-500',
      bgGlow: 'bg-amber-500/10',
      metrics: [
        { label: 'Staff Leakage Prevented', value: '100%' },
        { label: 'NAFDAC Report Time', value: '10 Seconds' },
        { label: 'Price Manipulation', value: 'Zero Risk' },
      ],
      features: [
        {
          title: 'Locked Cashier Pricing & Shift Locks',
          description: 'Cashiers cannot modify selling prices or hide transactions. Admin PIN required for discounts or inventory adjustments.',
          icon: Lock,
        },
        {
          title: 'Automated FEFO & Expiry Queue',
          description: 'First-Expiry-First-Out enforcement prevents staff from selling new stock while old stock rots on the shelf.',
          icon: ShieldCheck,
        },
        {
          title: '1-Click NAFDAC Audit Compliance',
          description: 'Instantly export NAFDAC-compliant drug registers with batch numbers, manufacturing dates, and supplier audit trails.',
          icon: FileSpreadsheet,
        },
      ],
      quote: '"We caught a ₦350,000 inventory discrepancy in week one thanks to staff shift locks and locked pricing. Total peace of mind."',
      author: 'Dr. Amina Y. — Abuja Pharmacy Network',
    },
    money: {
      id: 'money',
      tag: 'MORE MONEY',
      title: 'Plug Profit Leaks & Scale Net Revenue',
      subtitle: 'Stop wasting millions on expired drugs, eliminate lost stockout sales, and double your margins with AI.',
      icon: DollarSign,
      color: 'from-emerald-500/20 to-green-500/20',
      borderColor: 'border-emerald-500/40',
      badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
      accentColor: 'text-emerald-500',
      bgGlow: 'bg-emerald-500/10',
      metrics: [
        { label: 'Avg Expiry Savings', value: isInternational ? '$3,200/yr' : '₦1.8M/yr' },
        { label: 'Stockout Sales Saved', value: '+35%' },
        { label: 'AI Invoice Scanning Speed', value: '10 Secs' },
      ],
      features: [
        {
          title: 'AI Invoice Scanner (Snap & Stock)',
          description: 'Snap supplier invoices with your phone camera. AI automatically extracts 50+ items, batch numbers & costs into inventory in 10 seconds.',
          icon: Zap,
        },
        {
          title: 'Expiry Clearance Queue',
          description: 'Automatically flags drugs expiring in 60-90 days and suggests bundle discounts to clear stock before loss.',
          icon: TrendingUp,
        },
        {
          title: 'Public Patient Marketplace',
          description: 'Patients within 5km find your pharmacy on the PharmaTrack marketplace and order directly via WhatsApp.',
          icon: UserCheck,
        },
      ],
      quote: '"PharmaTrack saved us over ₦2.4 Million in expired drugs last year alone. It paid for itself in the first 2 weeks!"',
      author: 'Pharm. Emeka N. — Port Harcourt',
    },
  };

  const currentPillar = pillars[activePillar];

  return (
    <section className="py-20 sm:py-28 relative overflow-hidden bg-background">
      {/* Dynamic Background Glow */}
      <div className={`absolute inset-0 transition-colors duration-700 ${currentPillar.bgGlow} opacity-30 blur-3xl pointer-events-none`} />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <Badge variant="outline" className="mb-4 border-primary/40 text-primary px-3 py-1 text-xs uppercase tracking-widest font-semibold">
            The FPM Transformation Promise
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold leading-tight mb-4">
            Freedom. Power. <span className="text-gradient-primary">More Money.</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            We built PharmaTrack around one core mission: freeing pharmacy owners from operational chaos while maximizing their net profit.
          </p>
        </div>

        {/* 3 Pillar Selector Tabs */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex p-1.5 rounded-2xl bg-muted/60 border border-border/50 backdrop-blur-xl gap-2 w-full max-w-2xl">
            {(['freedom', 'power', 'money'] as const).map((key) => {
              const item = pillars[key];
              const isActive = activePillar === key;
              const Icon = item.icon;
              return (
                <button
                  key={key}
                  onClick={() => setActivePillar(key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 sm:px-5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 ${
                    isActive
                      ? 'bg-background shadow-lg text-foreground border border-border/80 ring-1 ring-black/5 dark:ring-white/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? item.accentColor : ''}`} />
                  <span className="hidden xs:inline">{item.tag}</span>
                  <span className="xs:hidden capitalize">{key}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pillar Content Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activePillar}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="max-w-5xl mx-auto"
          >
            <div className={`relative rounded-3xl border ${currentPillar.borderColor} bg-gradient-to-br ${currentPillar.color} p-6 sm:p-10 shadow-2xl backdrop-blur-xl`}>
              
              {/* Top Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-border/40">
                <div>
                  <Badge variant="outline" className={`mb-3 ${currentPillar.badgeColor} font-bold text-xs`}>
                    {currentPillar.tag} PILLAR
                  </Badge>
                  <h3 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                    {currentPillar.title}
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-xl">
                    {currentPillar.subtitle}
                  </p>
                </div>

                {/* Live Key Metrics */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0 bg-background/80 p-3.5 sm:p-4 rounded-2xl border border-border/50">
                  {currentPillar.metrics.map((m, idx) => (
                    <div key={idx} className="text-center">
                      <p className={`text-base sm:text-xl font-bold font-display ${currentPillar.accentColor}`}>
                        {m.value}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 font-medium">
                        {m.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {currentPillar.features.map((feat, idx) => {
                  const FeatIcon = feat.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-background/90 rounded-2xl p-5 border border-border/60 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        <div className={`h-10 w-10 rounded-xl bg-muted/80 flex items-center justify-center mb-4 ${currentPillar.accentColor}`}>
                          <FeatIcon className="h-5 w-5" />
                        </div>
                        <h4 className="font-bold text-sm sm:text-base text-foreground mb-2">
                          {feat.title}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {feat.description}
                        </p>
                      </div>
                      <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-primary">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Included in AI Powerhouse</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Verified Owner Testimonial Quote */}
              <div className="bg-background/80 rounded-2xl p-5 sm:p-6 border border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="italic text-xs sm:text-sm text-foreground/90 max-w-2xl">
                  {currentPillar.quote}
                  <p className="not-italic font-bold text-xs text-primary mt-1.5">
                    — {currentPillar.author}
                  </p>
                </div>

                <Link to="/auth?tab=signup" className="w-full sm:w-auto shrink-0">
                  <Button className="w-full sm:w-auto gap-2 bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold text-xs h-10 px-5">
                    Experience {currentPillar.tag}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};
