import jsPDF from 'jspdf';

// Premium color palette
const COLORS = {
  navy: [15, 23, 42] as [number, number, number],
  slate: [51, 65, 85] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  emeraldDark: [5, 150, 105] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  redLight: [254, 226, 226] as [number, number, number],
  greenLight: [220, 252, 231] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  gray100: [243, 244, 246] as [number, number, number],
  gray200: [229, 231, 235] as [number, number, number],
  gray300: [209, 213, 219] as [number, number, number],
  gray400: [156, 163, 175] as [number, number, number],
  gray600: [75, 85, 99] as [number, number, number],
  gold: [245, 158, 11] as [number, number, number],
  goldLight: [254, 243, 199] as [number, number, number],
};

const drawCheckIcon = (doc: jsPDF, x: number, y: number) => {
  doc.setFillColor(...COLORS.emerald);
  doc.circle(x, y, 3.5, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('✓', x - 1.8, y + 2);
};

const drawXIcon = (doc: jsPDF, x: number, y: number) => {
  doc.setFillColor(...COLORS.red);
  doc.circle(x, y, 3.5, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('✗', x - 1.8, y + 2);
};

export const generateFeatureComparisonPdf = (): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // === PREMIUM HEADER ===
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Accent line
  doc.setFillColor(...COLORS.emerald);
  doc.rect(0, 40, pageWidth, 2, 'F');

  // Brand
  doc.setTextColor(...COLORS.emerald);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('PHARMATRACK', margin, 14);

  // Main headline
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PharmaTrack vs Traditional Management', margin, 28);

  // Right side tagline
  doc.setTextColor(...COLORS.gold);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Stop Losing Money.', pageWidth - margin, 18, { align: 'right' });
  doc.setTextColor(...COLORS.emerald);
  doc.text('Start Growing Profits.', pageWidth - margin, 26, { align: 'right' });

  y = 50;

  // === COMPARISON TABLE ===
  const col1X = margin;
  const col2X = 85;
  const col3X = 140;
  const colWidth1 = 68;
  const colWidth2 = 52;
  const colWidth3 = 52;

  // Table header
  doc.setFillColor(...COLORS.goldLight);
  doc.roundedRect(margin, y, contentWidth, 11, 2, 2, 'F');

  doc.setTextColor(...COLORS.slate);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('BUSINESS CHALLENGE', col1X + 4, y + 7);
  doc.text('OLD WAY', col2X + colWidth2 / 2, y + 7, { align: 'center' });
  doc.text('PHARMATRACK', col3X + colWidth3 / 2, y + 7, { align: 'center' });

  y += 14;

  // Comparison data
  const comparisons = [
    {
      challenge: 'Price Manipulation',
      oldWay: 'No protection - staff sell at any price',
      newWay: 'Price Shield locks prices, alerts on changes',
    },
    {
      challenge: 'Expired Products',
      oldWay: 'Manual checking, often missed',
      newWay: 'Automatic 90/60/30 day alerts',
    },
    {
      challenge: 'Stock Entry',
      oldWay: '2-3 hours manual typing per invoice',
      newWay: 'AI scans invoice photo in 30 seconds',
    },
    {
      challenge: 'Sales Insights',
      oldWay: 'End of month guesswork',
      newWay: 'Real-time analytics dashboard',
    },
    {
      challenge: 'Staff Time Tracking',
      oldWay: 'Paper sign-in (easily faked)',
      newWay: 'Digital clock-in with WiFi/QR verify',
    },
    {
      challenge: 'NAFDAC Compliance',
      oldWay: 'Manual records, audit stress',
      newWay: 'Automatic reports, one-click compliance',
    },
    {
      challenge: 'Low Stock Alerts',
      oldWay: 'Discover when customer asks',
      newWay: 'SMS/App alerts before stockout',
    },
    {
      challenge: 'Multiple Branches',
      oldWay: 'Call each branch, inconsistent data',
      newWay: 'One dashboard for all locations',
    },
    {
      challenge: 'Customer History',
      oldWay: 'No records, missed repeat sales',
      newWay: 'Full purchase history, refill reminders',
    },
    {
      challenge: 'Drug Interactions',
      oldWay: 'Rely on memory, risk patient safety',
      newWay: 'AI warns at point of sale',
    },
  ];

  doc.setFontSize(8);
  comparisons.forEach((item, index) => {
    const rowHeight = 13;
    
    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(...COLORS.gray100);
      doc.rect(margin, y - 2, contentWidth, rowHeight, 'F');
    }

    // Challenge (bold)
    doc.setTextColor(...COLORS.navy);
    doc.setFont('helvetica', 'bold');
    doc.text(item.challenge, col1X + 4, y + 5);

    // Old way with X icon
    drawXIcon(doc, col2X + 4, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray600);
    const oldWayLines = doc.splitTextToSize(item.oldWay, colWidth2 - 14);
    doc.text(oldWayLines, col2X + 12, y + 5);

    // New way with check icon
    drawCheckIcon(doc, col3X + 4, y + 4);
    doc.setTextColor(...COLORS.slate);
    const newWayLines = doc.splitTextToSize(item.newWay, colWidth3 - 14);
    doc.text(newWayLines, col3X + 12, y + 5);

    y += rowHeight;
  });

  y += 8;

  // === MONEY IMPACT SECTION ===
  doc.setFillColor(...COLORS.goldLight);
  doc.roundedRect(margin, y, contentWidth, 30, 4, 4, 'F');

  doc.setTextColor(...COLORS.slate);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('THE MONEY IMPACT', pageWidth / 2, y + 10, { align: 'center' });

  // Stats row
  const statsY = y + 22;
  const stat1X = pageWidth / 6;
  const stat2X = pageWidth / 2;
  const stat3X = (pageWidth * 5) / 6;

  doc.setFontSize(18);
  doc.setTextColor(...COLORS.emeraldDark);
  doc.text('N50K+', stat1X, statsY, { align: 'center' });
  doc.text('40%', stat2X, statsY, { align: 'center' });
  doc.text('3 hrs', stat3X, statsY, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(...COLORS.gray600);
  doc.text('saved/month on losses', stat1X, statsY + 6, { align: 'center' });
  doc.text('less expired products', stat2X, statsY + 6, { align: 'center' });
  doc.text('saved daily on admin', stat3X, statsY + 6, { align: 'center' });

  y += 38;

  // === PRICING CTA ===
  doc.setFillColor(...COLORS.emerald);
  doc.roundedRect(margin, y, contentWidth, 22, 4, 4, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Start FREE for 7 Days', margin + 10, y + 9);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Then from N10,000/month', margin + 10, y + 17);

  doc.setFontSize(9);
  doc.text('No credit card required • Cancel anytime', pageWidth - margin - 10, y + 13, { align: 'right' });

  y += 30;

  // === FINAL CTA ===
  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Start Your FREE Trial Today', pageWidth / 2, y + 4, { align: 'center' });

  doc.setTextColor(...COLORS.emeraldDark);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('pharmatrack.com.ng/auth', pageWidth / 2, y + 12, { align: 'center' });

  // === FOOTER ===
  const footerY = pageHeight - 14;
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, footerY - 4, pageWidth, 18, 'F');

  doc.setTextColor(...COLORS.gray400);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('PharmaTrack - Built for Nigerian Pharmacies', pageWidth / 2, footerY + 4, { align: 'center' });

  doc.setTextColor(...COLORS.emerald);
  doc.text('pharmatrack.com.ng', pageWidth / 2, footerY + 10, { align: 'center' });

  return doc;
};

export const downloadFeatureComparisonPdf = (): void => {
  const pdf = generateFeatureComparisonPdf();
  pdf.save('PharmaTrack-Feature-Comparison.pdf');
};
