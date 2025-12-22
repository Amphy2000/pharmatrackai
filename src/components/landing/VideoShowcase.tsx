import { motion } from 'framer-motion';
import { Play, Clock, Users, Star, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
interface Testimonial {
  name: string;
  role: string;
  pharmacy: string;
  location: string;
  quote: string;
  metric: string;
  metricLabel: string;
  avatar?: string;
}
const testimonials: Testimonial[] = [{
  name: 'Pharm. Adebayo Okonkwo',
  role: 'Owner',
  pharmacy: 'HealthPlus Pharmacy',
  location: 'Lagos, Nigeria',
  quote: "Before PharmaTrack, we lost ₦800,000 yearly to expired drugs. Now our AI predicts demand and auto-discounts items 30 days before expiry. We've recovered that entire loss.",
  metric: '₦800K',
  metricLabel: 'Recovered yearly'
}, {
  name: 'Pharm. Chioma Eze',
  role: 'Manager',
  pharmacy: 'MediCare Plus',
  location: 'Abuja, Nigeria',
  quote: "Staff used to give discounts to friends without my knowledge. The Price Lock feature stopped that immediately. My margins increased by 12% in the first month.",
  metric: '12%',
  metricLabel: 'Margin increase'
}, {
  name: 'Pharm. Ibrahim Musa',
  role: 'Owner',
  pharmacy: 'Sunrise Pharmacy',
  location: 'Kano, Nigeria',
  quote: "NAFDAC inspection used to stress me for days. Now I generate compliance reports in 2 minutes. The batch tracking saved my license during the last audit.",
  metric: '2 min',
  metricLabel: 'Audit prep time'
}, {
  name: 'Pharm. Ngozi Uche',
  role: 'Owner',
  pharmacy: 'Unity Pharmacy',
  location: 'Port Harcourt, Nigeria',
  quote: "The invoice scanner changed everything. I used to spend 2 hours entering stock from wholesaler deliveries. Now it takes 5 minutes. That's time I spend with customers.",
  metric: '95%',
  metricLabel: 'Time saved on stock entry'
}];
const fadeInUp = {
  hidden: {
    opacity: 0,
    y: 20
  },
  visible: {
    opacity: 1,
    y: 0
  }
};
export const VideoShowcase = () => {
  return <section id="testimonials" className="py-16 sm:py-24 relative bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Video Section */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} className="text-center mb-12">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">
            <Play className="h-3 w-3 mr-2" />
            Product Demo
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-4">
            See <span className="text-gradient-premium">PharmaTrack</span> in Action
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Watch how Nigerian pharmacists are transforming their operations with AI-powered inventory management.
          </p>
        </motion.div>

        {/* Video Placeholder */}
        <motion.div initial={{
        opacity: 0,
        scale: 0.95
      }} whileInView={{
        opacity: 1,
        scale: 1
      }} viewport={{
        once: true
      }} className="max-w-4xl mx-auto mb-20">
          <Card className="overflow-hidden border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-0">
              <div className="relative aspect-video flex items-center justify-center">
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-secondary/10" />
                
                {/* Decorative Elements */}
                <motion.div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/10 rounded-full blur-2xl" animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5]
              }} transition={{
                duration: 4,
                repeat: Infinity
              }} />
                <motion.div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-secondary/10 rounded-full blur-2xl" animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.8, 0.5, 0.8]
              }} transition={{
                duration: 4,
                repeat: Infinity,
                delay: 2
              }} />
                
                {/* Play Button */}
                <motion.div className="relative z-10 flex flex-col items-center gap-4" whileHover={{
                scale: 1.05
              }}>
                  <motion.div className="w-20 h-20 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30 flex items-center justify-center cursor-pointer group" whileHover={{
                  boxShadow: '0 0 30px hsl(var(--primary) / 0.4)'
                }}>
                    <Play className="w-8 h-8 text-primary ml-1 group-hover:scale-110 transition-transform" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-lg font-display font-bold text-foreground">Full Demo Coming Soon</p>
                    <p className="text-sm text-muted-foreground">3-minute walkthrough of all features</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" /> 3 min
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" /> For Pharmacists
                    </span>
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Testimonials Section */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} className="text-center mb-12">
          <Badge className="mb-4 bg-success/10 text-success border-success/30">
            <Star className="h-3 w-3 mr-2" />
            Real Results
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-4">
            Nigerian Pharmacists <span className="text-gradient-premium">Love PharmaTrack</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Don't just take our word for it. See the real ROI numbers from pharmacists across Nigeria.
          </p>
        </motion.div>

        {/* Testimonial Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, i) => <motion.div key={i} initial={{
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
              <Card className="h-full bg-card/80 backdrop-blur-sm border-border/50 overflow-hidden group hover:border-primary/30 transition-all">
                <CardContent className="p-6">
                  {/* Metric Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar Placeholder */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                          {testimonial.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{testimonial.name}</p>
                        
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-display font-bold text-success">{testimonial.metric}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{testimonial.metricLabel}</p>
                    </div>
                  </div>

                  {/* Quote */}
                  <div className="relative">
                    <MessageSquare className="absolute -top-1 -left-1 w-5 h-5 text-primary/20" />
                    <p className="text-sm text-muted-foreground italic pl-5">
                      "{testimonial.quote}"
                    </p>
                  </div>

                  {/* Location */}
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-success" />
                      {testimonial.location}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>)}
        </div>

        {/* CTA */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} className="text-center mt-12">
          <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-glow-primary">
            Start Your Free Trial Today
          </Button>
        </motion.div>
      </div>
    </section>;
};