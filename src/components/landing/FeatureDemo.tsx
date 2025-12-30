import { motion } from 'framer-motion';
import { Camera, Package, Lock, Shield, Bell, Check, X, Scan, MessageCircle, Smartphone, Clock, AlertTriangle, Timer, Zap, Sparkles, TrendingUp, ShoppingCart, FileSearch, Users, Globe, MapPin, Search, Navigation } from 'lucide-react';
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

// AI Smart Upsell Animation
const AIUpsellDemo = () => {
  return (
    <div className="relative h-48 overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/5 to-pink-500/10 border border-purple-500/20">
      {/* Cart items */}
      <div className="absolute left-[15%] top-1/4 space-y-2">
        <motion.div
          className="flex items-center gap-1 bg-background/80 rounded-lg px-2 py-1 border border-border shadow-sm"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Package className="w-3 h-3 text-primary" />
          <span className="text-[8px] font-medium">Paracetamol</span>
        </motion.div>
        <motion.div
          className="flex items-center gap-1 bg-background/80 rounded-lg px-2 py-1 border border-border shadow-sm"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Package className="w-3 h-3 text-primary" />
          <span className="text-[8px] font-medium">Vitamin C</span>
        </motion.div>
      </div>

      {/* AI Brain thinking */}
      <motion.div 
        className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="relative">
          <motion.div
            className="absolute inset-0 bg-purple-500/20 rounded-full blur-md"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </div>
      </motion.div>

      {/* Suggestion appearing */}
      <motion.div
        className="absolute right-[10%] top-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-2"
        initial={{ opacity: 0, scale: 0.8, x: 20 }}
        animate={{ opacity: [0, 1, 1, 1, 0], scale: [0.8, 1, 1, 1, 0.9], x: [20, 0, 0, 0, 0] }}
        transition={{ duration: 3, delay: 1, repeat: Infinity, repeatDelay: 1.5 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 0.5, delay: 1.5, repeat: Infinity, repeatDelay: 4 }}
          >
            <TrendingUp className="w-3 h-3 text-purple-500" />
          </motion.div>
          <span className="text-[9px] font-semibold text-purple-700 dark:text-purple-300">Suggested</span>
        </div>
        <div className="flex items-center gap-1 bg-white/50 dark:bg-background/50 rounded px-1.5 py-0.5">
          <Package className="w-3 h-3 text-success" />
          <span className="text-[8px] font-medium">Zinc Tablets</span>
        </div>
        <div className="text-[7px] text-muted-foreground mt-1">Often bought together</div>
      </motion.div>

      {/* Money indicator */}
      <motion.div
        className="absolute right-4 bottom-4 bg-success/20 rounded-full px-2 py-1 flex items-center gap-1"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: [0, 1], y: [10, 0] }}
        transition={{ duration: 0.4, delay: 2.5, repeat: Infinity, repeatDelay: 4 }}
      >
        <span className="text-[9px] font-bold text-success">+₦850</span>
      </motion.div>

      {/* Label */}
      <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground font-medium">
        AI boosts every sale
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

// Public Marketplace Animation - Patient Discovery Feature
const MarketplaceDiscoveryDemo = () => {
  return (
    <div className="relative h-48 overflow-hidden rounded-xl bg-gradient-to-br from-marketplace/5 to-marketplace/10 border border-marketplace/20">
      {/* Search Bar */}
      <motion.div
        className="absolute left-1/2 top-4 -translate-x-1/2 w-[70%] bg-background border border-border rounded-lg shadow-sm flex items-center gap-2 px-2 py-1.5"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Search className="w-3 h-3 text-muted-foreground" />
        <motion.div
          className="flex items-center"
          initial={{ width: 0 }}
          animate={{ width: 'auto' }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <motion.span 
            className="text-[9px] font-medium text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.5 }}
          >
            Panadol Extra
          </motion.span>
        </motion.div>
      </motion.div>

      {/* Map Background */}
      <div className="absolute inset-0 top-12 opacity-20">
        <svg className="w-full h-full" viewBox="0 0 100 60">
          {/* Road lines */}
          <motion.path d="M0 30 L100 30" stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground" />
          <motion.path d="M50 0 L50 60" stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground" />
          <motion.path d="M20 10 L80 50" stroke="currentColor" strokeWidth="0.3" className="text-muted-foreground" />
          <motion.path d="M80 10 L20 50" stroke="currentColor" strokeWidth="0.3" className="text-muted-foreground" />
        </svg>
      </div>

      {/* Patient Location Pulse */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <motion.div
          className="absolute inset-0 bg-primary/30 rounded-full"
          animate={{ scale: [1, 2, 2.5], opacity: [0.6, 0.3, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          style={{ width: 20, height: 20, marginLeft: -10, marginTop: -10 }}
        />
        <div className="w-5 h-5 rounded-full bg-primary border-2 border-background shadow-lg flex items-center justify-center">
          <Navigation className="w-2.5 h-2.5 text-primary-foreground" />
        </div>
      </motion.div>

      {/* Pharmacy Pins Appearing */}
      {[
        { left: '25%', top: '40%', delay: 2.5, distance: '0.5km' },
        { left: '70%', top: '35%', delay: 2.7, distance: '1.2km' },
        { left: '35%', top: '65%', delay: 2.9, distance: '0.8km' },
      ].map((pin, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: pin.left, top: pin.top }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: pin.delay, type: 'spring' }}
        >
          <div className="relative">
            <div className="w-6 h-6 rounded-full bg-marketplace border-2 border-background shadow-lg flex items-center justify-center">
              <MapPin className="w-3 h-3 text-white" />
            </div>
            <motion.div
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-background/90 rounded px-1 py-0.5 text-[6px] font-medium text-marketplace whitespace-nowrap border border-marketplace/30"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: pin.delay + 0.3 }}
            >
              {pin.distance}
            </motion.div>
          </div>
        </motion.div>
      ))}

      {/* Result Cards Appearing */}
      <motion.div
        className="absolute right-2 top-14 w-20 space-y-1"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 3.3, duration: 0.4 }}
      >
        {['HealthPlus', 'MedCare', 'PharmOne'].map((name, i) => (
          <motion.div
            key={i}
            className="bg-background/90 border border-border/50 rounded px-1.5 py-1 shadow-sm"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 3.5 + i * 0.15 }}
          >
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-marketplace/30" />
              <span className="text-[6px] font-medium truncate">{name}</span>
            </div>
            <div className="text-[5px] text-success">In Stock</div>
          </motion.div>
        ))}
      </motion.div>

      {/* WhatsApp Order Button */}
      <motion.div
        className="absolute left-2 bottom-6 bg-success/20 border border-success/30 rounded-lg px-2 py-1 flex items-center gap-1"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 4.2, type: 'spring' }}
      >
        <MessageCircle className="w-3 h-3 text-success" />
        <span className="text-[7px] font-medium text-success">Order via WhatsApp</span>
      </motion.div>

      {/* Label */}
      <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground font-medium">
        Patients find you online
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
      color: 'primary',
      badge: 'Time Saver'
    },
    {
      title: 'Smart Upsell AI',
      description: 'AI suggests complementary products at checkout. Staff click once to add—boosting every sale automatically.',
      icon: Sparkles,
      demo: <AIUpsellDemo />,
      color: 'purple-500',
      badge: 'Revenue Booster'
    },
    {
      title: 'Price Lock Shield',
      description: 'Staff cannot modify prices at checkout. Only admin PIN can unlock—stopping profit leakage at the source.',
      icon: Lock,
      demo: <PriceLockDemo />,
      color: 'destructive',
      badge: 'Anti-Theft'
    },
    {
      title: 'Automated Alerts',
      description: 'Get SMS & WhatsApp alerts when stock runs low or items expire. Stay informed even when you are away from the shop.',
      icon: Bell,
      demo: <AutomatedAlertsDemo />,
      color: 'success',
      badge: 'Peace of Mind'
    },
    {
      title: 'Lightning Fast',
      description: 'Works instantly on slow 2G networks. No waiting, no freezing—even during peak hours with multiple users.',
      icon: Zap,
      demo: <SpeedComparisonDemo />,
      color: 'success',
      badge: 'Performance'
    },
    {
      title: 'Public Marketplace',
      description: 'Patients search for drugs by distance and find YOUR pharmacy. Get free leads 24/7 without advertising.',
      icon: Globe,
      demo: <MarketplaceDiscoveryDemo />,
      color: 'marketplace',
      badge: 'Patient Discovery'
    }
  ];

  return (
    <section className="py-16 sm:py-24 relative" id="features">
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
            Features That <span className="text-gradient-premium">Close Deals</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            "I already have an app" — Not like this. See the AI-powered features that set PharmaTrack apart.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {demos.map((demo, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden group hover:border-primary/30 transition-all hover:shadow-lg">
                <CardContent className="p-0">
                  {/* Badge */}
                  <div className="px-4 pt-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-${demo.color}/10 text-${demo.color} border border-${demo.color}/20`}>
                      {demo.badge}
                    </span>
                  </div>
                  
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

        {/* Objection Handler */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 max-w-3xl mx-auto"
        >
          <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <h3 className="text-xl font-display font-bold mb-2">
                "I already have a POS app..."
              </h3>
              <p className="text-muted-foreground mb-4">
                Generic POS apps sell bread and soap. PharmaTrack is built specifically for pharmacies—with AI that prevents expiry loss, blocks theft, and protects your license.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  'NAFDAC Compliance Built-in',
                  'Drug Interaction Alerts',
                  'AI Expiry Predictions',
                  'Staff Theft Prevention'
                ].map((feature, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success/10 text-success text-sm">
                    <Check className="h-3 w-3" />
                    {feature}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};