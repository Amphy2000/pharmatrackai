import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  FileDown, Copy, Check, MessageCircle, Phone, Target, 
  Lightbulb, Play, ArrowRight, ChevronDown, ChevronUp,
  FileText, Calculator, Zap, Users, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Logo } from '@/components/Logo';
import { toast } from 'sonner';
import { downloadROIBattleCardPdf } from '@/utils/roiBattleCardPdfGenerator';
import { downloadKillerQuestionsPdf } from '@/utils/killerQuestionsPdfGenerator';
import { downloadFeatureComparisonPdf } from '@/utils/featureComparisonPdfGenerator';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const SalesResources = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isGeneratingROI, setIsGeneratingROI] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isGeneratingComparison, setIsGeneratingComparison] = useState(false);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownloadROI = async () => {
    setIsGeneratingROI(true);
    try {
      downloadROIBattleCardPdf();
      toast.success('ROI Battle Card downloaded!');
    } catch (error) {
      toast.error('Failed to generate PDF');
    }
    setIsGeneratingROI(false);
  };

  const handleDownloadQuestions = async () => {
    setIsGeneratingQuestions(true);
    try {
      downloadKillerQuestionsPdf();
      toast.success('Killer Questions flyer downloaded!');
    } catch (error) {
      toast.error('Failed to generate PDF');
    }
    setIsGeneratingQuestions(false);
  };

  const handleDownloadComparison = async () => {
    setIsGeneratingComparison(true);
    try {
      downloadFeatureComparisonPdf();
      toast.success('Feature Comparison downloaded!');
    } catch (error) {
      toast.error('Failed to generate PDF');
    }
    setIsGeneratingComparison(false);
  };

  // WhatsApp Templates
  const whatsappTemplates = [
    {
      title: 'Initial Outreach',
      emoji: '👋',
      message: `Good morning! 👋

I noticed you run a pharmacy and wanted to share something that might interest you.

Did you know the average Nigerian pharmacy loses ₦800,000+ annually to drug expiry alone?

I have a quick tool that can show you exactly how much YOUR pharmacy might be losing—and how to recover it.

Can I send you a 2-minute calculator? No obligation.

Best,
[Your Name]
PharmaTrack AI
📞 +2349169153129`,
    },
    {
      title: 'After Demo Follow-up',
      emoji: '🎯',
      message: `Hi [Name]! 👋

Thank you for taking time to see PharmaTrack today!

Quick recap of what you saw:
✅ Invoice scanner (50 drugs in 30 seconds)
✅ AI expiry prediction (60 days in advance)
✅ Locked pricing (staff can't change)
✅ NAFDAC-ready reports (1-click)

Based on your ₦[X]M monthly revenue, you could recover up to ₦[Y]M annually.

Ready to start your 7-day free trial? I can set it up in 5 minutes.

WhatsApp: +2349169153129`,
    },
    {
      title: 'Objection: "I Have an App"',
      emoji: '🤔',
      message: `I understand! Most pharmacies have some form of POS.

But here's the difference:

❌ Generic POS tells you what you SOLD
✅ PharmaTrack tells you what you're LOSING

Quick question: Does your current app...
• Generate NAFDAC Batch Traceability reports?
• Lock prices so staff can't manipulate?
• Predict expiry 60 days in advance?
• Warn about drug interactions at checkout?

If not, you're leaving money on the table.

Want me to show you the difference in 10 minutes?

📞 +2349169153129`,
    },
    {
      title: 'Objection: "Too Expensive"',
      emoji: '💰',
      message: `I hear you on the cost concern! Let me share some quick math:

Your current loss (if doing ₦5M/month):
• Expiry waste: ~₦480,000/year
• Staff leakage: ~₦180,000/year
• Total: ₦660,000+ gone

PharmaTrack Pro: ₦35,000/month = ₦420,000/year

Even if we recover just 50% of your losses, you're ahead by ₦240,000/year.

Plus: NAFDAC compliance, drug interaction warnings, and peace of mind.

The question isn't "Can I afford PharmaTrack?"
It's "Can I afford NOT to have it?"

Free trial available: +2349169153129`,
    },
    {
      title: 'Referral Request',
      emoji: '🌟',
      message: `Hi [Name]!

I hope PharmaTrack is serving you well! 🙏

Quick favor: Do you know any fellow pharmacy owners who might benefit from the same AI tools you're using?

For every referral that signs up:
🎁 You get 1 month FREE
🎁 They get 50% off their first month

Just send me their WhatsApp number and I'll reach out professionally.

Thank you for being part of the PharmaTrack family!

📞 +2349169153129`,
    },
  ];

  // Demo Script
  const demoScript = {
    duration: '60-90 seconds',
    steps: [
      {
        time: '0-10s',
        action: 'Hook',
        script: '"Let me show you something that takes most pharmacies 40 hours a month... done in 30 seconds."',
        visual: 'Show invoice photo on phone'
      },
      {
        time: '10-30s',
        action: 'Invoice Scanner Demo',
        script: '"Watch this: I take a photo of your supplier invoice... [snap]... and boom—50 drugs are stocked with expiry dates, batch numbers, prices. Done."',
        visual: 'Demo the AI Invoice Scanner'
      },
      {
        time: '30-45s',
        action: 'Price Lock Demo',
        script: '"Now, here\'s where it gets serious. Try to change this drug\'s price... [click]... See that? LOCKED. Only you, the admin, can change prices. Your staff cannot steal from you."',
        visual: 'Show locked price attempt'
      },
      {
        time: '45-55s',
        action: 'NAFDAC Report',
        script: '"And when NAFDAC visits? [click] Professional batch traceability report. Print or email. Done in 2 seconds, not 2 hours."',
        visual: 'Generate compliance report'
      },
      {
        time: '55-70s',
        action: 'Drug Interaction',
        script: '"One more thing—if a customer brings a prescription that could interact dangerously... [demo]... instant warning. You just protected a life AND your license."',
        visual: 'Show interaction warning'
      },
      {
        time: '70-90s',
        action: 'Close',
        script: '"This is what General POS can\'t do. 7-day free trial, no credit card. Can I set you up right now?"',
        visual: 'Hand them your phone to sign up'
      },
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur-xl bg-background/90">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo showText={true} linkTo="/" size="sm" />
          <div className="flex items-center gap-4">
            <Link to="/pitch">
              <Button variant="outline" size="sm">Sales Pitch</Button>
            </Link>
            <Link to="/auth?tab=signup">
              <Button size="sm" className="bg-gradient-to-r from-primary to-primary/80">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 pt-24 pb-16">
        {/* Hero */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="text-center mb-12"
        >
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">
            <Target className="h-3 w-3 mr-2" />
            Sales Toolkit
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Close More Pharmacy Deals
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to sell PharmaTrack: PDFs, scripts, templates, and objection handlers.
          </p>
        </motion.div>

        {/* Quick Downloads */}
        <motion.div 
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-3 gap-6 mb-12"
        >
          <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-destructive/10 text-destructive">HOT</Badge>
                <Calculator className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">ROI Battle Card</CardTitle>
              <CardDescription>
                One-page PDF with ROI calculator, killer questions, and objection handlers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleDownloadROI} 
                disabled={isGeneratingROI}
                className="w-full"
              >
                <FileDown className="h-4 w-4 mr-2" />
                {isGeneratingROI ? 'Generating...' : 'Download PDF'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-amber-500/20 hover:border-amber-500/40 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-amber-500/10 text-amber-600">A5 FLYER</Badge>
                <Lightbulb className="h-5 w-5 text-amber-500" />
              </div>
              <CardTitle className="text-lg">6 Killer Questions</CardTitle>
              <CardDescription>
                Printable A5 flyer to expose competitor weaknesses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleDownloadQuestions} 
                disabled={isGeneratingQuestions}
                variant="outline"
                className="w-full"
              >
                <FileDown className="h-4 w-4 mr-2" />
                {isGeneratingQuestions ? 'Generating...' : 'Download Flyer'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-500/10 text-emerald-600">COMPARISON</Badge>
                <FileText className="h-5 w-5 text-emerald-500" />
              </div>
              <CardTitle className="text-lg">Feature Comparison</CardTitle>
              <CardDescription>
                Side-by-side comparison with generic POS systems
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleDownloadComparison} 
                disabled={isGeneratingComparison}
                variant="outline"
                className="w-full"
              >
                <FileDown className="h-4 w-4 mr-2" />
                {isGeneratingComparison ? 'Generating...' : 'Download PDF'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs for other resources */}
        <Tabs defaultValue="whatsapp" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px] mx-auto">
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              WhatsApp Templates
            </TabsTrigger>
            <TabsTrigger value="demo" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Demo Script
            </TabsTrigger>
          </TabsList>

          {/* WhatsApp Templates */}
          <TabsContent value="whatsapp">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">WhatsApp Sales Templates</h2>
                <Badge variant="outline" className="text-xs">
                  Click to copy
                </Badge>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {whatsappTemplates.map((template, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{template.emoji}</span>
                        <CardTitle className="text-base">{template.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md max-h-48 overflow-y-auto mb-3">
                        {template.message}
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(template.message, index)}
                        className="w-full"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="h-4 w-4 mr-2 text-green-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Message
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Demo Script */}
          <TabsContent value="demo">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>60-Second "Wow" Demo Script</CardTitle>
                    <CardDescription>
                      Memorize this for in-person pharmacy visits
                    </CardDescription>
                  </div>
                  <Badge className="bg-primary/10 text-primary">
                    {demoScript.duration}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {demoScript.steps.map((step, index) => (
                    <Collapsible key={index}>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-16 text-xs font-mono text-muted-foreground">
                              {step.time}
                            </div>
                            <Badge variant="outline">{step.action}</Badge>
                          </div>
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-4 pb-4">
                        <div className="pt-4 space-y-3 border-l-2 border-primary/20 ml-8 pl-4">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">SAY:</p>
                            <p className="text-sm italic">{step.script}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">SHOW:</p>
                            <p className="text-sm text-primary">{step.visual}</p>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-700">Pro Tip</p>
                      <p className="text-sm text-muted-foreground">
                        Always end by handing them YOUR phone to sign up. Remove friction—don't make them use their own device.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Contact CTA */}
        <motion.div 
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.3 }}
          className="mt-16 text-center"
        >
          <Card className="max-w-xl mx-auto bg-gradient-to-r from-primary/10 to-emerald-500/10 border-primary/20">
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-2">Need Help Closing a Deal?</h3>
              <p className="text-muted-foreground mb-4">
                Stuck on an objection? Have a hot lead? I can help.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="https://wa.me/2349169153129" target="_blank" rel="noopener noreferrer">
                  <Button className="bg-green-600 hover:bg-green-700">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp Me
                  </Button>
                </a>
                <a href="tel:+2349169153129">
                  <Button variant="outline">
                    <Phone className="h-4 w-4 mr-2" />
                    +234 916 915 3129
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default SalesResources;
