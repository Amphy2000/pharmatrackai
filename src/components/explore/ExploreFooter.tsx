import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Package, 
  Store, 
  Phone, 
  MessageCircle, 
  Shield, 
  CheckCircle, 
  Zap,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Users,
  Clock,
  Star,
  Building2,
  MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const ExploreFooter = () => {
  return (
    <footer className="mt-16 relative overflow-hidden">
      {/* Pharmacy Owner CTA Section - The Hero Banner */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="relative py-16 sm:py-20 bg-gradient-to-br from-primary via-primary/95 to-primary/90"
      >
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute top-1/2 left-0 w-32 h-32 bg-white/5 rounded-full blur-xl" />
          
          {/* Floating Pills Animation */}
          <motion.div 
            animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-10 right-[15%] opacity-20"
          >
            <Package className="h-16 w-16 text-white" />
          </motion.div>
          <motion.div 
            animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-20 left-[10%] opacity-15"
          >
            <Store className="h-12 w-12 text-white" />
          </motion.div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-6"
            >
              <Sparkles className="h-4 w-4 text-yellow-300" />
              <span className="text-sm font-medium text-white">Free for Early Adopters</span>
            </motion.div>

            {/* Headline */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white mb-4 leading-tight"
            >
              Own a Pharmacy?
              <br />
              <span className="text-yellow-300">Join the Revolution.</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl mx-auto"
            >
              List your pharmacy on Nigeria's fastest-growing medicine marketplace. 
              Get discovered by customers in your neighborhood — <span className="font-semibold text-yellow-300">completely free</span>.
            </motion.p>

            {/* Stats Row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-3 gap-4 sm:gap-8 max-w-lg mx-auto mb-10"
            >
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white">500+</div>
                <div className="text-xs sm:text-sm text-white/70">Daily Searches</div>
              </div>
              <div className="text-center border-x border-white/20">
                <div className="text-2xl sm:text-3xl font-bold text-white">50+</div>
                <div className="text-xs sm:text-sm text-white/70">Pharmacies</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white">24/7</div>
                <div className="text-xs sm:text-sm text-white/70">Visibility</div>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link to="/auth">
                <Button 
                  size="lg" 
                  className="bg-white text-primary hover:bg-white/90 font-semibold px-8 py-6 text-lg rounded-xl shadow-2xl shadow-black/20 group"
                >
                  <Building2 className="h-5 w-5 mr-2" />
                  Register Your Pharmacy
                  <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a 
                href="https://wa.link/jsn5d9" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/90 hover:text-white transition-colors font-medium"
              >
                <MessageCircle className="h-5 w-5" />
                <span>Talk to Our Team</span>
              </a>
            </motion.div>

            {/* Trust Line */}
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="mt-8 text-sm text-white/60"
            >
              ✓ No credit card required &nbsp;•&nbsp; ✓ Setup in 5 minutes &nbsp;•&nbsp; ✓ Cancel anytime
            </motion.p>
          </div>
        </div>
      </motion.section>

      {/* Features for Pharmacy Owners */}
      <section className="py-12 bg-gradient-to-b from-muted/50 to-background border-t border-border/40">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h3 className="text-xl sm:text-2xl font-display font-bold mb-2">
              Why Pharmacies Choose PharmaTrack
            </h3>
            <p className="text-muted-foreground">Everything you need to grow your pharmacy business</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {[
              { icon: MapPin, title: "Local Discovery", desc: "Get found by nearby customers" },
              { icon: TrendingUp, title: "Analytics", desc: "See what's trending" },
              { icon: Clock, title: "Real-time Stock", desc: "Auto-sync inventory" },
              { icon: Users, title: "More Customers", desc: "Grow your reach" },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center p-4 rounded-xl bg-card/50 border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-semibold text-sm mb-1">{feature.title}</h4>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Footer */}
      <div className="py-12 border-t border-border/40 bg-card/30">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand Column */}
            <motion.div 
              initial={{ opacity: 0 }} 
              whileInView={{ opacity: 1 }} 
              viewport={{ once: true }}
              className="md:col-span-1"
            >
              <Link to="/" className="flex items-center gap-2 mb-4 group">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
                  <Package className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <span className="font-display font-bold text-lg block">PharmaTrack</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Nigeria's Medicine Finder</span>
                </div>
              </Link>
              <p className="text-sm text-muted-foreground mb-4">
                Find medicines near you instantly. Connecting patients to verified pharmacies across Nigeria.
              </p>
              <div className="flex gap-2">
                <div className="flex items-center gap-1 text-xs bg-success/10 text-success px-2 py-1 rounded-full">
                  <Star className="h-3 w-3 fill-current" />
                  <span>Trusted</span>
                </div>
                <div className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  <Shield className="h-3 w-3" />
                  <span>Verified</span>
                </div>
              </div>
            </motion.div>
            
            {/* Quick Links */}
            <div className="md:col-span-1">
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">For Customers</h4>
              <div className="flex flex-col gap-3 text-sm">
                <button 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="text-left hover:text-primary transition-colors flex items-center gap-2 group"
                >
                  <ArrowRight className="h-3 w-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  Search Medicines
                </button>
                <Link to="/" className="hover:text-primary transition-colors flex items-center gap-2 group">
                  <ArrowRight className="h-3 w-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  How It Works
                </Link>
                <a href="https://wa.link/jsn5d9" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-2 group">
                  <ArrowRight className="h-3 w-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  Get Help
                </a>
              </div>
            </div>

            {/* For Pharmacies */}
            <div className="md:col-span-1">
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">For Pharmacies</h4>
              <div className="flex flex-col gap-3 text-sm">
                <Link to="/auth" className="hover:text-primary transition-colors flex items-center gap-2 group">
                  <ArrowRight className="h-3 w-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  Register Pharmacy
                </Link>
                <Link to="/auth" className="hover:text-primary transition-colors flex items-center gap-2 group">
                  <ArrowRight className="h-3 w-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  Pharmacy Login
                </Link>
                <Link to="/" className="hover:text-primary transition-colors flex items-center gap-2 group">
                  <ArrowRight className="h-3 w-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  Pricing & Plans
                </Link>
              </div>
            </div>

            {/* Contact & Trust */}
            <div className="md:col-span-1">
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Get In Touch</h4>
              <div className="flex flex-col gap-3 text-sm">
                <a href="mailto:pharmatrackai@gmail.com" className="flex items-center gap-2 hover:text-primary transition-colors group">
                  <Store className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  <span>pharmatrackai@gmail.com</span>
                </a>
                <a href="tel:+2349169153129" className="flex items-center gap-2 hover:text-primary transition-colors group">
                  <Phone className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  <span>+234 916 915 3129</span>
                </a>
                <a href="https://wa.link/jsn5d9" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-success hover:text-success/80 transition-colors">
                  <MessageCircle className="h-4 w-4" />
                  <span className="font-medium">WhatsApp Us</span>
                </a>
              </div>

              {/* Trust Badges */}
              <div className="mt-6 pt-4 border-t border-border/40">
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3 text-success" />
                    <span>Verified</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCircle className="h-3 w-3 text-success" />
                    <span>Real-time</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Zap className="h-3 w-3 text-success" />
                    <span>Instant</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-border/40 gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} PharmaTrack AI. Made with ❤️ in Nigeria.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Service</span>
              <span>•</span>
              <span className="text-primary font-medium">v2.0</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
