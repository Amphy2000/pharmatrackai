import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileDown, Table, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { downloadFeatureComparisonPdf } from '@/utils/featureComparisonPdfGenerator';
import { toast } from 'sonner';

export const FeatureComparisonPdfGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setIsGenerated(false);

    try {
      // Small delay for UX
      setTimeout(() => {
        downloadFeatureComparisonPdf();
        setIsGenerated(true);
        setIsGenerating(false);
        toast.success('Feature comparison sheet downloaded!');
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
          <Table className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">Feature Comparison Sheet</CardTitle>
        <CardDescription>
          One-page comparison of PharmaTrack vs traditional pharmacy management
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
          <p className="font-medium text-foreground">Perfect for pharmacy visits:</p>
          <ul className="text-muted-foreground space-y-1 ml-4">
            <li>• Side-by-side comparison table</li>
            <li>• Focus on money saved, not features</li>
            <li>• 10 key business challenges addressed</li>
            <li>• Clear pricing and CTA</li>
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
                Download Comparison Sheet
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
            Print copies for your next pharmacy visit!
          </motion.p>
        )}
      </CardContent>
    </Card>
  );
};
