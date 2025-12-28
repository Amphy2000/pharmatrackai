import jsPDF from 'jspdf';

// B&W-friendly color palette with high contrast
// Uses dark navy and teal tones that print well in grayscale
const COLORS = {
  navy: [15, 23, 42] as [number, number, number],
  slate: [51, 65, 85] as [number, number, number],
  teal: [13, 148, 136] as [number, number, number],         // Good B&W contrast
  tealDark: [15, 118, 110] as [number, number, number],     // Darker for emphasis
  red: [127, 29, 29] as [number, number, number],           // Dark red - prints dark in B&W
  redLight: [254, 242, 242] as [number, number, number],
  tealLight: [240, 253, 250] as [number, number, number],   // Very light teal
  white: [255, 255, 255] as [number, number, number],
  gray50: [249, 250, 251] as [number, number, number],
  gray100: [243, 244, 246] as [number, number, number],
  gray200: [229, 231, 235] as [number, number, number],
  gray400: [156, 163, 175] as [number, number, number],
  gray600: [75, 85, 99] as [number, number, number],
  gray700: [55, 65, 81] as [number, number, number],
  black: [0, 0, 0] as [number, number, number],
};

const drawCheckIcon = (doc: jsPDF, x: number, y: number) => {
  doc.setFillColor(...COLORS.tealDark);
  doc.circle(x, y, 3, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('✓', x - 1.5, y + 1.8);
};

const drawXIcon = (doc: jsPDF, x: number, y: number) => {
  doc.setFillColor(...COLORS.red);
  doc.circle(x, y, 3, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('✗', x - 1.5, y + 1.8);
};

export const generateFeatureComparisonPdf = (): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // === HEADER ===
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, pageWidth, 36, 'F');

  // Accent line
  doc.setFillColor(...COLORS.teal);
  doc.rect(0, 34, pageWidth, 2, 'F');

  // Brand
  doc.setTextColor(...COLORS.teal);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('PHARMATRACK', margin, 12);

  // Main headline
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PharmaTrack vs Traditional Management', margin, 24);

  // Right side tagline
  doc.setTextColor(...COLORS.gray200);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Stop Losing Money. Start Growing.', pageWidth - margin, 20, { align: 'right' });

  y = 42;

  // === COMPARISON TABLE ===
  const col1X = margin;
  const col2X = 80;
  const col3X = 135;
  const colWidth2 = 52;
  const colWidth3 = 55;

  // Table header
  doc.setFillColor(...COLORS.gray200);
  doc.roundedRect(margin, y, contentWidth, 10, 1.5, 1.5, 'F');

  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CHALLENGE', col1X + 3, y + 6.5);
  doc.text('OLD WAY', col2X + colWidth2 / 2, y + 6.5, { align: 'center' });
  doc.text('PHARMATRACK', col3X + colWidth3 / 2, y + 6.5, { align: 'center' });

  y += 12;

  // Comparison data - consolidated
  const comparisons = [
    {
      challenge: 'Price Manipulation',
      oldWay: 'No protection',
      newWay: 'Price Shield locks prices',
    },
    {
      challenge: 'Public Visibility',
      oldWay: 'No online presence',
      newWay: 'Marketplace lists your products',
    },
    {
      challenge: 'Patient Discovery',
      oldWay: 'Walk-in only',
      newWay: 'Patients find you by distance',
    },
    {
      challenge: 'Expired Products',
      oldWay: 'Manual checking',
      newWay: '90/60/30 day auto-alerts',
    },
    {
      challenge: 'Stock Entry',
      oldWay: '2-3 hrs manual typing',
      newWay: 'AI scans invoice in 30 sec',
    },
    {
      challenge: 'Upselling',
      oldWay: 'Missed opportunities',
      newWay: 'AI suggests at checkout',
    },
    {
      challenge: 'Sales Insights',
      oldWay: 'End of month guessing',
      newWay: 'Real-time analytics',
    },
    {
      challenge: 'Staff Time Tracking',
      oldWay: 'Paper sign-in (fakeable)',
      newWay: 'WiFi/QR verified clock-in',
    },
    {
      challenge: 'NAFDAC Compliance',
      oldWay: 'Manual audit stress',
      newWay: 'One-click reports',
    },
    {
      challenge: 'Low Stock Alerts',
      oldWay: 'Discover when asked',
      newWay: 'SMS alerts before stockout',
    },
    {
      challenge: 'Drug Interactions',
      oldWay: 'Memory-based risk',
      newWay: 'AI warns at sale',
    },
    {
      challenge: 'Multiple Branches',
      oldWay: 'Call each, inconsistent',
      newWay: 'One dashboard for all',
    },
  ];

  doc.setFontSize(7);
  const rowHeight = 11;

  comparisons.forEach((item, index) => {
    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(...COLORS.gray50);
      doc.rect(margin, y - 1.5, contentWidth, rowHeight, 'F');
    }

    // Challenge (bold)
    doc.setTextColor(...COLORS.navy);
    doc.setFont('helvetica', 'bold');
    doc.text(item.challenge, col1X + 3, y + 4.5);

    // Old way with X icon
    drawXIcon(doc, col2X + 3, y + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray700);
    const oldWayLines = doc.splitTextToSize(item.oldWay, colWidth2 - 12);
    doc.text(oldWayLines, col2X + 10, y + 4.5);

    // New way with check icon
    drawCheckIcon(doc, col3X + 3, y + 3.5);
    doc.setTextColor(...COLORS.slate);
    const newWayLines = doc.splitTextToSize(item.newWay, colWidth3 - 12);
    doc.text(newWayLines, col3X + 10, y + 4.5);

    y += rowHeight;
  });

  y += 6;

  // === MONEY IMPACT SECTION ===
  doc.setFillColor(...COLORS.tealLight);
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'F');

  // Border
  doc.setDrawColor(...COLORS.teal);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'S');

  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('THE MONEY IMPACT', pageWidth / 2, y + 8, { align: 'center' });

  // Stats row
  const statsY = y + 18;
  const stat1X = pageWidth / 6;
  const stat2X = pageWidth / 2;
  const stat3X = (pageWidth * 5) / 6;

  doc.setFontSize(14);
  doc.setTextColor(...COLORS.tealDark);
  doc.setFont('helvetica', 'bold');
  doc.text('₦50K+', stat1X, statsY, { align: 'center' });
  doc.text('40%', stat2X, statsY, { align: 'center' });
  doc.text('3 hrs', stat3X, statsY, { align: 'center' });

  doc.setFontSize(6);
  doc.setTextColor(...COLORS.gray600);
  doc.setFont('helvetica', 'normal');
  doc.text('saved/month on losses', stat1X, statsY + 5, { align: 'center' });
  doc.text('less expired products', stat2X, statsY + 5, { align: 'center' });
  doc.text('saved daily on admin', stat3X, statsY + 5, { align: 'center' });

  y += 32;

  // === PRICING CTA ===
  doc.setFillColor(...COLORS.tealDark);
  doc.roundedRect(margin, y, contentWidth, 18, 3, 3, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Start FREE for 7 Days', margin + 8, y + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Then from ₦10,000/month', margin + 8, y + 14);

  doc.setFontSize(8);
  doc.text('No credit card • Cancel anytime', pageWidth - margin - 8, y + 11, { align: 'right' });

  y += 24;

  // === FINAL CTA ===
  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Start Your FREE Trial Today', pageWidth / 2, y + 2, { align: 'center' });

  doc.setTextColor(...COLORS.tealDark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('pharmatrack.com.ng/auth', pageWidth / 2, y + 9, { align: 'center' });

  // Contact phone
  doc.setTextColor(...COLORS.slate);
  doc.setFontSize(9);
  doc.text('Call/WhatsApp: +2349169153129', pageWidth / 2, y + 16, { align: 'center' });

  y += 22;

  // === FOOTER ===
  doc.setFillColor(...COLORS.navy);
  doc.rect(margin, y, contentWidth, 12, 'F');

  doc.setTextColor(...COLORS.gray400);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('PharmaTrack - Built for Nigerian Pharmacies', pageWidth / 2, y + 5, { align: 'center' });

  doc.setTextColor(...COLORS.teal);
  doc.text('pharmatrack.com.ng | +2349169153129', pageWidth / 2, y + 10, { align: 'center' });

  return doc;
};

export const downloadFeatureComparisonPdf = (): void => {
  const pdf = generateFeatureComparisonPdf();
  pdf.save('PharmaTrack-Feature-Comparison.pdf');
};
