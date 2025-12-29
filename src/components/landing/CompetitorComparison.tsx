import { motion } from 'framer-motion';
import { Check, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CompetitorComparisonProps {
  isInternational?: boolean;
}

export const CompetitorComparison = ({ isInternational = false }: CompetitorComparisonProps) => {
  const formatCurrency = (ngnAmount: number) => {
    if (isInternational) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(ngnAmount / 750);
    }
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(ngnAmount);
  };

  const comparisonPoints = [
    {
      question: "Can patients find your pharmacy online by distance?",
      genericPOS: false,
      pharmatrack: true,
      moneyImpact: "Invisible to customers searching RIGHT NOW",
      critical: true,
    },
    {
      question: "Does it have a public marketplace for patient discovery?",
      genericPOS: false,
      pharmatrack: true,
      moneyImpact: "Zero online presence = lost sales daily",
      critical: true,
    },
    {
      question: "Does it generate NAFDAC audit reports?",
      genericPOS: false,
      pharmatrack: true,
      moneyImpact: "Risk of license suspension = TOTAL business loss",
      critical: true,
    },
    {
      question: "Can staff change prices during a sale?",
      genericPOS: true, // Bad thing - they CAN change
      pharmatrack: false, // Good thing - locked
      moneyImpact: `Staff theft costs ${formatCurrency(180000)}/year avg`,
      critical: true,
      invertColors: true, // Invert because "No" is good here
    },
    {
      question: "Does it detect prescription fraud patterns?",
      genericPOS: false,
      pharmatrack: true,
      moneyImpact: "Prevent controlled drug abuse & legal liability",
      critical: true,
    },
    {
      question: "Does it warn about drug interactions?",
      genericPOS: false,
      pharmatrack: true,
      moneyImpact: "One lawsuit > lifetime of savings",
      critical: true,
    },
    {
      question: "Can it predict expiry 60 days in advance?",
      genericPOS: false,
      pharmatrack: true,
      moneyImpact: `Recover ${formatCurrency(480000)}/year in wasted stock`,
      critical: true,
    },
    {
      question: "Can it scan an invoice & stock 50 items in 30 sec?",
      genericPOS: false,
      pharmatrack: true,
      moneyImpact: "40+ hours/month saved = 2 extra staff days",
      critical: false,
    },
    {
      question: "Does it suggest upsells at checkout?",
      genericPOS: false,
      pharmatrack: true,
      moneyImpact: `+${formatCurrency(120000)}/month from smart suggestions`,
      critical: false,
    },
    {
      question: "Does it track controlled drugs legally?",
      genericPOS: false,
      pharmatrack: true,
      moneyImpact: "PCN compliance requirement",
      critical: false,
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background pointer-events-none" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge className="mb-4 bg-destructive/10 text-destructive border-destructive/30">
            <X className="h-3 w-3 mr-2" />
            "I Already Have an App"
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-4">
            What Your Current App <span className="text-destructive">Can't Do</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Most "pharmacy apps" are just generic retail POS with an expiry date field. Here's what you're missing.
          </p>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="max-w-4xl mx-auto"
        >
          <Card className="overflow-hidden border-2 border-border/50">
            {/* Header */}
            <div className="grid grid-cols-12 bg-muted/50 border-b border-border">
              <div className="col-span-6 p-4 font-semibold text-sm">
                Question to Ask Your Vendor
              </div>
              <div className="col-span-3 p-4 text-center font-semibold text-sm text-destructive">
                Generic POS
              </div>
              <div className="col-span-3 p-4 text-center font-semibold text-sm text-primary">
                PharmaTrack
              </div>
            </div>

            {/* Rows */}
            {comparisonPoints.map((point, index) => (
              <div 
                key={index} 
                className={`grid grid-cols-12 border-b border-border/50 last:border-0 ${point.critical ? 'bg-destructive/5' : ''}`}
              >
                <div className="col-span-6 p-4">
                  <p className="text-sm font-medium mb-1">{point.question}</p>
                  <p className="text-xs text-muted-foreground">💰 {point.moneyImpact}</p>
                </div>
                <div className="col-span-3 p-4 flex items-center justify-center">
                  {point.invertColors ? (
                    // For "Can staff change prices" - YES is bad
                    <div className="flex items-center gap-1.5 text-destructive">
                      <div className="h-6 w-6 rounded-full bg-destructive/20 flex items-center justify-center">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-medium">Yes</span>
                    </div>
                  ) : point.genericPOS ? (
                    <div className="flex items-center gap-1.5 text-success">
                      <div className="h-6 w-6 rounded-full bg-success/20 flex items-center justify-center">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-medium">Yes</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-destructive">
                      <div className="h-6 w-6 rounded-full bg-destructive/20 flex items-center justify-center">
                        <X className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-medium">No</span>
                    </div>
                  )}
                </div>
                <div className="col-span-3 p-4 flex items-center justify-center">
                  {point.invertColors ? (
                    // For "Can staff change prices" - NO is good (locked)
                    <div className="flex items-center gap-1.5 text-success">
                      <div className="h-6 w-6 rounded-full bg-success/20 flex items-center justify-center">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-medium">Locked</span>
                    </div>
                  ) : point.pharmatrack ? (
                    <div className="flex items-center gap-1.5 text-success">
                      <div className="h-6 w-6 rounded-full bg-success/20 flex items-center justify-center">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-medium">Yes</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-destructive">
                      <div className="h-6 w-6 rounded-full bg-destructive/20 flex items-center justify-center">
                        <X className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-medium">No</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </Card>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-10 text-center"
        >
          <p className="text-muted-foreground mb-6">
            Still not sure? Let's talk about how PharmaTrack can help your pharmacy.
          </p>
          <div className="flex justify-center">
            <a href="https://wa.me/2349169153129?text=Hi%2C%20I%20want%20to%20learn%20more%20about%20PharmaTrack" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                <MessageCircle className="h-4 w-4 mr-2" />
                Chat on WhatsApp
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
