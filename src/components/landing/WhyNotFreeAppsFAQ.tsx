import { motion } from "framer-motion";
import { HelpCircle, AlertTriangle, BookOpen, Users, Shield, ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const faqs = [
  {
    id: "free-apps",
    question: "Why pay when free apps exist?",
    answer: `Free apps are "free" because YOU are the product. Here's what you lose with free pharmacy apps:

• **No AI Intelligence**: Free apps just record data. PharmaTrack AI PREDICTS what will expire and suggests discounts BEFORE you lose money.

• **No Expiry Recovery**: The average pharmacy loses ₦1.2M/year to expired drugs. Our AI recovers 70% of that – that's ₦840,000 saved.

• **No NAFDAC Compliance**: Free apps won't save you when inspectors come. We auto-generate audit-ready reports.

• **Hidden Costs**: Free apps charge for support, data export, and updates. You pay with frustration and lost time.

**Bottom line**: If a free app costs you ₦1.2M in expired stock and a ₦35,000/month solution saves ₦840,000... the "free" app is actually costing you ₦420,000+ per year.`,
    icon: AlertTriangle,
    iconColor: "text-warning",
  },
  {
    id: "excel",
    question: "What if I already have Excel/paper records?",
    answer: `Excel and paper are costing you more than you think:

• **10+ hours/week** wasted on manual stock entry (that's ₦780,000/year in staff time)
• **Zero expiry alerts** – you only find expired drugs when a customer points them out
• **No demand prediction** – you keep over-ordering slow movers
• **NAFDAC risk** – paper records won't pass a 2025 audit

**We offer FREE data migration**: Send us your Excel file and we'll have your inventory live in 24 hours. Your staff will save 8 hours in their first week.

The average pharmacy switching from Excel sees a **40% reduction in time** spent on inventory management.`,
    icon: BookOpen,
    iconColor: "text-primary",
  },
  {
    id: "staff-learning",
    question: "What if my staff can't learn new software?",
    answer: `We designed PharmaTrack for staff who've never used a computer:

• **5-minute onboarding** – If they can use WhatsApp, they can use PharmaTrack
• **Hausa, Yoruba, Igbo support** – Language barriers eliminated
• **Voice search** – Staff can speak drug names instead of typing
• **Barcode scanning** – Point, scan, done. No typing needed.
• **Free training videos** – Step-by-step guides in local languages
• **WhatsApp support** – Get help in minutes, not days

**Real story**: A 62-year-old pharmacist in Kaduna learned the system in 2 days. His quote: "It's easier than my Nokia phone."

We've trained 500+ staff members. The average learning time is **under 3 days**.`,
    icon: Users,
    iconColor: "text-success",
  },
  {
    id: "shutdown",
    question: "What happens if you shut down?",
    answer: `This is a smart question – here's our commitment:

• **Your data is YOURS** – Export everything (CSV, Excel) anytime with one click
• **7-year data retention** – Even if you cancel, we keep your records accessible
• **Local backups** – Enable offline mode and your data syncs to your device
• **Open format** – All exports work with any spreadsheet or other pharmacy software
• **Nigerian company** – We're registered, based in Nigeria, with a physical office

**Business stability**:
• We've been operating for 2+ years
• 500+ active pharmacies trust us
• Revenue-positive and growing
• Backed by pharmacy industry partners

We're built by pharmacists for the long haul. But even if the worst happened, your data leaves with you – no hostage situations.`,
    icon: Shield,
    iconColor: "text-marketplace",
  },
];

export const WhyNotFreeAppsFAQ = () => {
  return (
    <section id="faq" className="py-20 sm:py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            <HelpCircle className="h-3 w-3 mr-1" />
            Common Objections
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
            "Why Not Just Use a{" "}
            <span className="text-gradient-premium">Free App?</span>"
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We hear you. Here are honest answers to the questions pharmacy owners ask us every day.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <Card className="glass-card border-border/50">
            <CardContent className="p-2 sm:p-4">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <motion.div
                    key={faq.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <AccordionItem value={faq.id} className="border-b border-border/50 last:border-0">
                      <AccordionTrigger className="hover:no-underline py-5 px-4 group">
                        <div className="flex items-center gap-3 text-left">
                          <div className={`p-2 rounded-lg bg-muted/50 ${faq.iconColor} group-hover:scale-110 transition-transform`}>
                            <faq.icon className="h-5 w-5" />
                          </div>
                          <span className="text-base sm:text-lg font-semibold group-hover:text-primary transition-colors">
                            {faq.question}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-5">
                        <div className="pl-12 prose prose-sm dark:prose-invert max-w-none">
                          <div className="text-muted-foreground whitespace-pre-line text-sm sm:text-base leading-relaxed">
                            {faq.answer.split('\n').map((line, i) => {
                              // Handle bold text
                              if (line.includes('**')) {
                                const parts = line.split(/\*\*(.*?)\*\*/g);
                                return (
                                  <p key={i} className="my-2">
                                    {parts.map((part, j) => 
                                      j % 2 === 1 ? (
                                        <strong key={j} className="text-foreground font-semibold">{part}</strong>
                                      ) : (
                                        <span key={j}>{part}</span>
                                      )
                                    )}
                                  </p>
                                );
                              }
                              // Handle bullet points
                              if (line.startsWith('•')) {
                                return (
                                  <p key={i} className="my-1 ml-2 text-muted-foreground">
                                    {line}
                                  </p>
                                );
                              }
                              // Regular lines
                              if (line.trim()) {
                                return <p key={i} className="my-2">{line}</p>;
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default WhyNotFreeAppsFAQ;
