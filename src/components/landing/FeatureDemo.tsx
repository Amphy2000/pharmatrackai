import { motion } from 'framer-motion';
import { Camera, Package, Lock, Shield, Bell, Check, X, Scan, MessageCircle, Smartphone, Clock, AlertTriangle, Timer, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

// Invoice Scanner Animation
const InvoiceScannerDemo = () => {
  return (
    <div className="relative h-48 overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
      {/* Phone Frame */}
      <motion.div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-36 rounded-xl bg-background border-2 border-border shadow-xl"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Camera flash effect */}
        <motion.div
          className="absolute inset-0 bg-white rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.3, delay: 1, repeat: Infinity, repeatDelay: 4 }}
        />
        {/* Scanning line */}
        <motion.div
          className="absolute left-1 right-1 h-0.5 bg-primary"
          initial={{ top: '10%' }}
          animate={{ top: ['10%', '90%', '10%'] }}
          transition={{ duration: 2, delay: 1.5, repeat: Infinity, repeatDelay: 2.5 }}
        />
        <Scan className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 text-primary" />
      </motion.div>

      {/* Invoice flying to inventory */}
      <motion.div
        className="absolute left-[15%] top-1/2 -translate-y-1/2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: [0, 1, 1, 0], x: [-20, 0, 60, 60] }}
        transition={{ duration: 2, delay: 2, repeat: Infinity, repeatDelay: 2.5 }}
      >
        <div className="w-8 h-10 bg-white rounded shadow-lg border border-border flex items-center justify-center">
          <div className="space-y-0.5">
            <div className="w-5 h-0.5 bg-muted-foreground/30 rounded" />
            <div className="w-4 h-0.5 bg-muted-foreground/30 rounded" />
            <div className="w-5 h-0.5 bg-muted-foreground/30 rounded" />
          </div>
        </div>
      </motion.div>

      {/* Items flying to grid */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute right-[20%] bg-success/20 rounded-lg p-1"
          style={{ top: `${25 + i * 22}%` }}
          initial={{ opacity: 0, x: -40, scale: 0.5 }}
          animate={{ opacity: [0, 1], x: [-40, 0], scale: [0.5, 1] }}
          transition={{ duration: 0.5, delay: 2.5 + i * 0.2, repeat: Infinity, repeatDelay: 4 }}
        >
          <Package className="w-4 h-4 text-success" />
        </motion.div>
      ))}

      {/* Check mark */}
      <motion.div
        className="absolute right-4 bottom-4 bg-success rounded-full p-1"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }}
        transition={{ duration: 0.4, delay: 3.5, repeat: Infinity, repeatDelay: 4 }}
      >
        <Check className="w-3 h-3 text-white" />
      </motion.div>

      {/* Label */}
      <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground font-medium">
        50+ items in 10 seconds
      </div>
    </div>
  );
};

// Automated Alerts Animation - Owner's Peace of Mind
const AutomatedAlertsDemo = () => {
  return (
    <div className="relative h-48 overflow-hidden rounded-xl bg-gradient-to-br from-success/5 to-success/10 border border-success/20">
      {/* Phone showing WhatsApp/SMS */}
      <motion.div 
        className="absolute left-[20%] top-1/2 -translate-y-1/2 w-16 h-28 rounded-xl bg-background border-2 border-border shadow-xl overflow-hidden"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Phone screen */}
        <div className="absolute inset-1 bg-muted/50 rounded-lg">
          {/* Notification */}
          <motion.div
            className="absolute top-2 left-1 right-1 bg-success/20 rounded p-1"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: [0, 1, 1, 0], y: [-10, 0, 0, 0] }}
            transition={{ duration: 0.5, delay: 1, repeat: Infinity, repeatDelay: 4 }}
          >
            <div className="flex items-center gap-1">
              <MessageCircle className="w-2 h-2 text-success" />
              <div className="w-6 h-0.5 bg-success/50 rounded" />
            </div>
          </motion.div>
          
          {/* Second notification */}
          <motion.div
            className="absolute top-8 left-1 right-1 bg-warning/20 rounded p-1"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: [0, 1, 1, 0], y: [-10, 0, 0, 0] }}
            transition={{ duration: 0.5, delay: 2, repeat: Infinity, repeatDelay: 4 }}
          >
            <div className="flex items-center gap-1">
              <Bell className="w-2 h-2 text-warning" />
              <div className="w-5 h-0.5 bg-warning/50 rounded" />
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Inventory Issue Icons */}
      <div className="absolute right-[15%] top-1/4 space-y-3">
        {/* Low Stock Alert */}
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: [0, 1], x: [20, 0] }}
          transition={{ duration: 0.4, delay: 0.5, repeat: Infinity, repeatDelay: 4.5 }}
        >
          <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center">
            <Package className="w-3 h-3 text-destructive" />
          </div>
          <div className="text-[8px] text-muted-foreground">Low Stock</div>
        </motion.div>

        {/* Expiry Alert */}
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: [0, 1], x: [20, 0] }}
          transition={{ duration: 0.4, delay: 1.5, repeat: Infinity, repeatDelay: 4.5 }}
        >
          <div className="w-6 h-6 rounded-full bg-warning/20 flex items-center justify-center">
            <Clock className="w-3 h-3 text-warning" />
          </div>
          <div className="text-[8px] text-muted-foreground">Expiring</div>
        </motion.div>
      </div>

      {/* Arrow showing alert flow */}
      <motion.div
        className="absolute left-[45%] top-1/2 -translate-y-1/2"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0, 1, 1, 1] }}
        transition={{ duration: 0.3, delay: 2.5, repeat: Infinity, repeatDelay: 4.2 }}
      >
        <svg width="24" height="12" viewBox="0 0 24 12" className="text-success">
          <motion.path
            d="M0 6 L20 6 M14 1 L20 6 L14 11"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 2.5, repeat: Infinity, repeatDelay: 4 }}
          />
        </svg>
      </motion.div>

      {/* Owner relaxing indicator */}
      <motion.div
        className="absolute right-3 bottom-8 bg-success/20 rounded-full px-2 py-1 flex items-center gap-1"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 1], scale: [0, 1] }}
        transition={{ duration: 0.3, delay: 3, repeat: Infinity, repeatDelay: 4.2 }}
      >
        <Check className="w-3 h-3 text-success" />
        <span className="text-[8px] font-medium text-success">Alerted!</span>
      </motion.div>

      {/* Vibration effect on phone */}
      <motion.div
        className="absolute left-[20%] top-1/2 -translate-y-1/2 w-16 h-28"
        animate={{ x: [0, -2, 2, -2, 2, 0] }}
        transition={{ duration: 0.3, delay: 1.2, repeat: Infinity, repeatDelay: 4.2 }}
      />

      {/* Label */}
      <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground font-medium">
        Alerts while you sleep
      </div>
    </div>
  );
};

// Price Lock Animation
const PriceLockDemo = () => {
  return (
    <div className="relative h-48 overflow-hidden rounded-xl bg-gradient-to-br from-destructive/5 to-destructive/10 border border-destructive/20">
      {/* Price Field */}
      <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2">
        <motion.div 
          className="bg-background border-2 border-border rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg"
          animate={{ borderColor: ['hsl(var(--border))', 'hsl(var(--destructive))', 'hsl(var(--border))'] }}
          transition={{ duration: 2, delay: 1, repeat: Infinity, repeatDelay: 2 }}
        >
          <span className="text-sm font-mono font-bold">₦2,500</span>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.5, delay: 1.2, repeat: Infinity, repeatDelay: 3.5 }}
          >
            <X className="w-4 h-4 text-destructive" />
          </motion.div>
        </motion.div>
        
        {/* Cursor trying to click */}
        <motion.div
          className="absolute -right-6 top-1/2"
          initial={{ x: 10, opacity: 0 }}
          animate={{ x: [10, 0, -5, 10], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.5, delay: 0.5, repeat: Infinity, repeatDelay: 2.5 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" className="text-foreground fill-current">
            <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.94a.5.5 0 00.35-.85L6.35 2.79a.5.5 0 00-.85.42z"/>
          </svg>
        </motion.div>
      </div>

      {/* Lock Icon Appears */}
      <motion.div
        className="absolute left-1/2 top-[55%] -translate-x-1/2"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 0.6, delay: 1.5, repeat: Infinity, repeatDelay: 3.4 }}
      >
        <div className="bg-destructive/20 rounded-full p-3">
          <Lock className="w-6 h-6 text-destructive" />
        </div>
      </motion.div>

      {/* Admin Approval Badge */}
      <motion.div
        className="absolute left-1/2 bottom-8 -translate-x-1/2 bg-success/20 border border-success/30 rounded-full px-3 py-1 flex items-center gap-1"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: [20, 0], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 0.5, delay: 2.5, repeat: Infinity, repeatDelay: 3.5 }}
      >
        <Shield className="w-3 h-3 text-success" />
        <span className="text-[10px] font-medium text-success">Admin Only</span>
      </motion.div>

      {/* Label */}
      <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground font-medium">
        Zero price manipulation
      </div>
    </div>
  );
};

// Speed Comparison Animation
const SpeedComparisonDemo = () => {
  return (
    <div className="relative h-48 overflow-hidden rounded-xl bg-gradient-to-br from-success/5 to-success/10 border border-success/20">
      <div className="absolute inset-4 flex gap-4">
        {/* Competitor Side */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-[9px] text-muted-foreground mb-2 font-medium">Others</div>
          <div className="w-12 h-12 rounded-lg bg-muted/50 border border-border flex items-center justify-center relative">
            <motion.div
              className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
          <motion.div 
            className="mt-2 text-[10px] text-muted-foreground"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Loading...
          </motion.div>
          <div className="mt-1 flex items-center gap-1 text-destructive">
            <Timer className="w-3 h-3" />
            <span className="text-[10px] font-medium">12+ sec</span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-border" />

        {/* PharmaTrack Side */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-[9px] text-primary mb-2 font-medium">PharmaTrack</div>
          <motion.div 
            className="w-12 h-12 rounded-lg bg-success/20 border border-success/30 flex items-center justify-center"
            initial={{ scale: 0.8 }}
            animate={{ scale: [0.8, 1] }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.8 }}
            >
              <Check className="w-5 h-5 text-success" />
            </motion.div>
          </motion.div>
          <motion.div 
            className="mt-2 text-[10px] text-success font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            Ready!
          </motion.div>
          <div className="mt-1 flex items-center gap-1 text-success">
            <Zap className="w-3 h-3" />
            <span className="text-[10px] font-medium">&lt;1 sec</span>
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground font-medium">
        Instant on any network
      </div>
    </div>
  );
};

interface FeatureDemoProps {
  isInternational?: boolean;
}

export const FeatureDemo = ({ isInternational = false }: FeatureDemoProps) => {
  const demos = [
    {
      title: 'AI Invoice Scanner',
      description: 'Snap a photo of your wholesale invoice. Our AI extracts all items, batch numbers, and expiry dates instantly.',
      icon: Camera,
      demo: <InvoiceScannerDemo />,
      color: 'primary'
    },
    {
      title: 'Price Lock Shield',
      description: 'Staff cannot modify prices at checkout. Only admin PIN can unlock—stopping profit leakage at the source.',
      icon: Lock,
      demo: <PriceLockDemo />,
      color: 'destructive'
    },
    {
      title: 'Automated Alerts',
      description: 'Get SMS & WhatsApp alerts when stock runs low or items expire. Stay informed even when you are away from the shop.',
      icon: Bell,
      demo: <AutomatedAlertsDemo />,
      color: 'success'
    }
  ];

  return (
    <section className="py-16 sm:py-24 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <motion.div 
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6"
          >
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">See It In Action</span>
          </motion.div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-4">
            Watch How <span className="text-gradient-premium">PharmaTrack</span> Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            No complex training needed. See exactly how our features save you time and money.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {demos.map((demo, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden group hover:border-primary/30 transition-all">
                <CardContent className="p-0">
                  {/* Demo Animation Area */}
                  <div className="p-4">
                    {demo.demo}
                  </div>
                  
                  {/* Content */}
                  <div className="p-4 pt-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`h-8 w-8 rounded-lg bg-${demo.color}/10 flex items-center justify-center`}>
                        <demo.icon className={`h-4 w-4 text-${demo.color}`} />
                      </div>
                      <h3 className="font-display font-bold">{demo.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{demo.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
