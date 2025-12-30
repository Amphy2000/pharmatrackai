import { useState } from 'react';
import { QrCode, Download, Smartphone, MessageCircle, Search, DollarSign, X, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import { useEffect } from 'react';
interface ExploreFlyerProps {
  exploreUrl?: string;
}
export const ExploreFlyer = ({
  exploreUrl = 'https://pharmatrack.com.ng/explore'
}: ExploreFlyerProps) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    // Generate QR code
    QRCode.toDataURL(exploreUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#059669',
        // emerald-600
        light: '#ffffff'
      }
    }).then(setQrCodeDataUrl);
  }, [exploreUrl]);
  const handleDownloadFlyer = () => {
    // Create a canvas to draw the flyer
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
    gradient.addColorStop(0, '#059669');
    gradient.addColorStop(1, '#047857');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    // White card area
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(60, 200, 960, 1520, 40);
    ctx.fill();

    // Draw text
    ctx.fillStyle = '#1f2937';
    ctx.textAlign = 'center';

    // Headline
    ctx.font = 'bold 72px system-ui';
    ctx.fillText('🤒 Sick?', 540, 320);
    ctx.font = 'bold 52px system-ui';
    ctx.fillText("Don't Walk From", 540, 400);
    ctx.fillText('Pharmacy to Pharmacy!', 540, 470);

    // Features
    ctx.font = '36px system-ui';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#374151';
    const features = ['📱 Scan & Search: Find medication in stock now', '💰 Compare Prices: See real-time prices nearby', '💬 Order via WhatsApp: Message directly'];
    features.forEach((feature, i) => {
      ctx.fillText(feature, 100, 600 + i * 80);
    });

    // QR Code placeholder text
    ctx.textAlign = 'center';
    ctx.font = 'bold 42px system-ui';
    ctx.fillStyle = '#059669';
    ctx.fillText('Scan to Find Medicine', 540, 950);

    // QR Code (if available)
    if (qrCodeDataUrl) {
      const qrImg = new Image();
      qrImg.onload = () => {
        ctx.drawImage(qrImg, 340, 1000, 400, 400);

        // Website URL below QR
        ctx.font = '32px system-ui';
        ctx.fillStyle = '#374151';
        ctx.fillText('Or visit:', 540, 1450);
        ctx.font = 'bold 36px system-ui';
        ctx.fillStyle = '#059669';
        ctx.fillText('www.pharmatrack.com.ng', 540, 1500);

        // Footer
        ctx.fillStyle = '#6b7280';
        ctx.font = '28px system-ui';
        ctx.fillText('Powered by PharmaTrack', 540, 1600);
        ctx.fillText('Connecting Patients to Pharmacies', 540, 1650);

        // Download
        const link = document.createElement('a');
        link.download = 'pharmatrack-find-medicine-flyer.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      qrImg.src = qrCodeDataUrl;
    }
  };
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Find Medicine Near You',
          text: 'Check drug availability and prices in your neighborhood with PharmaTrack',
          url: exploreUrl
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(exploreUrl);
    }
  };
  return <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-xs h-8 rounded-full border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-500">
          <QrCode className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Get Flyer</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-emerald-600" />
            Find It Near You - Flyer
          </DialogTitle>
        </DialogHeader>

        {/* Flyer Preview */}
        <motion.div initial={{
        opacity: 0,
        y: 10
      }} animate={{
        opacity: 1,
        y: 0
      }}>
          <Card className="overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-700 border-0">
            <CardContent className="p-4">
              <div className="bg-white rounded-2xl p-4 space-y-4">
                {/* Headline */}
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 mb-1">🤒 Sick?</p>
                  <p className="text-sm font-semibold text-gray-700">
                    Don't Walk From Pharmacy to Pharmacy!
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <Search className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">Scan & Search</p>
                      <p className="text-gray-600">Find if your medication is in stock right now</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">Compare Prices</p>
                      <p className="text-gray-600">See real-time prices from nearby pharmacies</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MessageCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">Order via WhatsApp</p>
                      <p className="text-gray-600">Message the pharmacist directly</p>
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                <div className="text-center pt-2">
                  <p className="text-xs font-semibold text-emerald-600 mb-2">
                    Scan to Find Medicine Near You
                  </p>
                  {qrCodeDataUrl && <img src={qrCodeDataUrl} alt="Scan to find medicine" className="mx-auto w-32 h-32" />}
                  <p className="text-[10px] text-gray-500 mt-2">
                    Or visit: <span className="font-semibold text-emerald-600">www.pharmatrack.com.ng</span>
                  </p>
                </div>

                {/* Footer */}
                <div className="text-center pt-2 border-t">
                  <p className="text-[10px] text-gray-500">
                    Powered by <span className="font-semibold text-emerald-600">PharmaTrack</span>
                  </p>
                  <p className="text-[9px] text-gray-400">
                    Connecting Patients to Pharmacies
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button onClick={handleDownloadFlyer} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
            <Download className="h-4 w-4 mr-2" />
            Download Flyer
          </Button>
          <Button variant="outline" onClick={handleShare} className="flex-1">
            <Share2 className="h-4 w-4 mr-2" />
            Share Link
          </Button>
        </div>

        {/* Sales Script Tip */}
        
      </DialogContent>
    </Dialog>;
};