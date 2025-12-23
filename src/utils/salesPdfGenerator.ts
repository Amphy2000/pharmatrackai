import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface SalesPdfData {
  pharmacyName?: string;
  logoUrl?: string;
  signupUrl: string;
  contactPhone?: string;
  contactEmail?: string;
  contactWhatsApp?: string;
}

// Color palette matching PharmaTrack branding
const COLORS = {
  primary: [30, 64, 175] as [number, number, number], // Deep blue
  secondary: [234, 179, 8] as [number, number, number], // Gold accent
  dark: [15, 23, 42] as [number, number, number],
  light: [248, 250, 252] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
};

const generateQRCodeDataUrl = async (url: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(url, {
      width: 200,
      margin: 2,
      color: {
        dark: '#1e40af',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('QR Code generation failed:', err);
    throw err;
  }
};

const drawRoundedRect = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillColor?: [number, number, number]
) => {
  if (fillColor) {
    doc.setFillColor(...fillColor);
  }
  doc.roundedRect(x, y, width, height, radius, radius, fillColor ? 'F' : 'S');
};

export const generateSalesPdf = async (data: SalesPdfData): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  // ========== HEADER SECTION ==========
  // Blue header background
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Logo/Brand name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('PharmaTrack', margin, 25);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Pharmacy Management System', margin, 35);

  // Tagline on right
  doc.setFontSize(11);
  doc.text('Protect Your Profits.', pageWidth - margin, 25, { align: 'right' });
  doc.text('Automate Your Success.', pageWidth - margin, 32, { align: 'right' });

  y = 60;

  // ========== PROBLEM SECTION ==========
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Are You Losing Money Without Knowing It?', pageWidth / 2, y, { align: 'center' });

  y += 12;

  // Pain points with icons (using emojis as text)
  const painPoints = [
    { icon: '⚠️', text: 'Staff selling at unauthorized prices (Price Manipulation)' },
    { icon: '💊', text: 'Medications expiring before you can sell them' },
    { icon: '📋', text: 'Hours wasted on manual stock counting & invoices' },
    { icon: '🔍', text: 'No visibility into what\'s really happening in your pharmacy' },
  ];

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  painPoints.forEach((point) => {
    doc.setTextColor(...COLORS.danger);
    doc.text(point.icon, margin + 5, y);
    doc.setTextColor(...COLORS.dark);
    doc.text(point.text, margin + 15, y);
    y += 8;
  });

  y += 8;

  // ========== SOLUTION SECTION ==========
  // Gold accent bar
  doc.setFillColor(...COLORS.secondary);
  doc.rect(margin, y, pageWidth - margin * 2, 2, 'F');
  y += 10;

  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PharmaTrack Solves These Problems Automatically', pageWidth / 2, y, { align: 'center' });

  y += 12;

  // Feature boxes
  const features = [
    {
      title: '🛡️ Price Shield Technology',
      desc: 'Lock selling prices. Get instant alerts if anyone tries to change them. Stop staff manipulation.',
      stat: 'Saves ₦50,000+/month',
    },
    {
      title: '📸 AI Invoice Scanner',
      desc: 'Snap a photo of supplier invoices. AI extracts all data in seconds. No more manual entry.',
      stat: '90% faster stock entry',
    },
    {
      title: '⏰ Smart Expiry Alerts',
      desc: 'Automatic notifications before products expire. AI suggests discount pricing to prevent waste.',
      stat: 'Reduces waste by 40%',
    },
    {
      title: '📊 Live Dashboard',
      desc: 'See sales, stock levels, and staff performance in real-time from anywhere.',
      stat: '24/7 visibility',
    },
  ];

  features.forEach((feature) => {
    // Feature box
    drawRoundedRect(doc, margin, y, pageWidth - margin * 2, 24, 3, COLORS.light);

    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(feature.title, margin + 5, y + 7);

    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(feature.desc, margin + 5, y + 14, { maxWidth: pageWidth - margin * 2 - 50 });

    // Stat badge
    doc.setFillColor(...COLORS.success);
    drawRoundedRect(doc, pageWidth - margin - 40, y + 5, 35, 10, 2, COLORS.success);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(feature.stat, pageWidth - margin - 22.5, y + 11.5, { align: 'center' });

    y += 28;
  });

  y += 5;

  // ========== ROI SECTION ==========
  doc.setFillColor(...COLORS.secondary);
  drawRoundedRect(doc, margin, y, pageWidth - margin * 2, 30, 4, COLORS.secondary);

  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Your Potential Annual Savings', pageWidth / 2, y + 10, { align: 'center' });

  doc.setFontSize(24);
  doc.setTextColor(...COLORS.primary);
  doc.text('₦600,000 - ₦1,200,000+', pageWidth / 2, y + 22, { align: 'center' });

  y += 38;

  // ========== PRICING TEASER ==========
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Plans Starting From:', margin, y);

  doc.setFontSize(18);
  doc.setTextColor(...COLORS.primary);
  doc.text('₦10,000/month', margin + 45, y);

  doc.setFontSize(10);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.text('(14-day FREE trial included)', margin + 95, y);

  y += 15;

  // ========== QR CODE SECTION ==========
  try {
    const qrDataUrl = await generateQRCodeDataUrl(data.signupUrl);

    // QR code box
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(1);
    drawRoundedRect(doc, margin, y, pageWidth - margin * 2, 50, 4);

    // QR code
    doc.addImage(qrDataUrl, 'PNG', margin + 10, y + 5, 40, 40);

    // CTA text
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Start Your FREE Trial Today!', margin + 60, y + 15);

    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Scan this QR code or visit:', margin + 60, y + 25);

    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text(data.signupUrl, margin + 60, y + 33);

    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('No credit card required • Setup in 5 minutes', margin + 60, y + 42);
  } catch (err) {
    console.error('Failed to add QR code:', err);
  }

  y += 58;

  // ========== CONTACT SECTION ==========
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, pageHeight - 35, pageWidth, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Questions? Contact Us:', margin, pageHeight - 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  let contactX = margin;
  if (data.contactPhone) {
    doc.text(`📞 ${data.contactPhone}`, contactX, pageHeight - 15);
    contactX += 50;
  }
  if (data.contactWhatsApp) {
    doc.text(`💬 WhatsApp: ${data.contactWhatsApp}`, contactX, pageHeight - 15);
    contactX += 60;
  }
  if (data.contactEmail) {
    doc.text(`✉️ ${data.contactEmail}`, contactX, pageHeight - 15);
  }

  // Footer tagline
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text('PharmaTrack - Built for Nigerian Pharmacies', pageWidth / 2, pageHeight - 5, { align: 'center' });

  return doc;
};

export const downloadSalesPdf = async (data: SalesPdfData): Promise<void> => {
  const pdf = await generateSalesPdf(data);
  pdf.save('PharmaTrack-Sales-Brochure.pdf');
};
