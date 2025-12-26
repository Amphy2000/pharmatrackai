import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileDown, ClipboardList, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { downloadClientChecklistPdf } from '@/utils/clientChecklistPdfGenerator';
import { toast } from 'sonner';

export const ClientChecklistPdfGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [pharmacyName, setPharmacyName] = useState('');

  const handleGenerate = () => {
    setIsGenerating(true);
    setIsGenerated(false);

    try {
      setTimeout(() => {
        downloadClientChecklistPdf(pharmacyName || undefined);
        setIsGenerated(true);
        setIsGenerating(false);
        toast.success('Client checklist downloaded!');
      }, 500);
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF. Please try again.');
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center mb-4">
          <ClipboardList className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">New Client Checklist</CardTitle>
        <CardDescription>
          Send this to clients 24 hours before your onboarding meeting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pharmacyName">Client Pharmacy Name (optional)</Label>
          <Input
            id="pharmacyName"
            placeholder="e.g., HealthPlus Pharmacy"
            value={pharmacyName}
            onChange={(e) => setPharmacyName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Personalizes the checklist with the client's name
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
          <p className="font-medium text-foreground">Checklist includes:</p>
          <ul className="text-muted-foreground space-y-1 ml-4">
            <li>• Branch details requirements</li>
            <li>• Staff information needed</li>
            <li>• Inventory data format</li>
            <li>• Account setup essentials</li>
            <li>• Pro tips for smooth onboarding</li>
            <li>• Pricing overview</li>
          </ul>
        </div>

        <motion.div
          initial={false}
          animate={isGenerated ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full h-12 text-base"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : isGenerated ? (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Download Again
              </>
            ) : (
              <>
                <FileDown className="h-5 w-5 mr-2" />
                Download Checklist
              </>
            )}
          </Button>
        </motion.div>

        {isGenerated && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-sm text-muted-foreground"
          >
            Send this to your client before the meeting!
          </motion.p>
        )}
      </CardContent>
    </Card>
  );
};
