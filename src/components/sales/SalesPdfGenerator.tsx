import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileDown, QrCode, Phone, Mail, MessageCircle, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { downloadSalesPdf } from '@/utils/salesPdfGenerator';
import { toast } from 'sonner';

interface SalesPdfGeneratorProps {
  defaultSignupUrl?: string;
}

export const SalesPdfGenerator = ({ defaultSignupUrl = 'https://pharmatrack.app/auth' }: SalesPdfGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [formData, setFormData] = useState({
    signupUrl: defaultSignupUrl,
    contactPhone: '',
    contactEmail: '',
    contactWhatsApp: '',
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    setIsGenerated(false);

    try {
      await downloadSalesPdf({
        signupUrl: formData.signupUrl || defaultSignupUrl,
        contactPhone: formData.contactPhone || undefined,
        contactEmail: formData.contactEmail || undefined,
        contactWhatsApp: formData.contactWhatsApp || undefined,
      });
      setIsGenerated(true);
      toast.success('Sales PDF generated successfully!');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <QrCode className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">Generate Sales Brochure</CardTitle>
        <CardDescription>
          Create a professional leave-behind PDF with QR code for pharmacy visits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signupUrl">Signup URL (for QR code)</Label>
          <Input
            id="signupUrl"
            placeholder="https://pharmatrack.app/auth"
            value={formData.signupUrl}
            onChange={(e) => setFormData({ ...formData, signupUrl: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              Phone Number
            </Label>
            <Input
              id="phone"
              placeholder="+234 XXX XXX XXXX"
              value={formData.contactPhone}
              onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp" className="flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </Label>
            <Input
              id="whatsapp"
              placeholder="+234 XXX XXX XXXX"
              value={formData.contactWhatsApp}
              onChange={(e) => setFormData({ ...formData, contactWhatsApp: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="sales@pharmatrack.app"
            value={formData.contactEmail}
            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
          />
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
                Generating PDF...
              </>
            ) : isGenerated ? (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Download Again
              </>
            ) : (
              <>
                <FileDown className="h-5 w-5 mr-2" />
                Generate & Download PDF
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
            Your sales brochure has been downloaded. Print it for your pharmacy visits!
          </motion.p>
        )}
      </CardContent>
    </Card>
  );
};
