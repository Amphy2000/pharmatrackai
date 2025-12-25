import jsPDF from 'jspdf';

// Color palette
const COLORS = {
  primary: [30, 64, 175] as [number, number, number],
  secondary: [234, 179, 8] as [number, number, number],
  dark: [15, 23, 42] as [number, number, number],
  light: [248, 250, 252] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const drawCheckmark = (doc: jsPDF, x: number, y: number) => {
  doc.setFillColor(...COLORS.success);
  doc.circle(x, y - 1, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('✓', x - 1.5, y + 0.5);
};

const drawX = (doc: jsPDF, x: number, y: number) => {
  doc.setFillColor(...COLORS.danger);
  doc.circle(x, y - 1, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('✗', x - 1.5, y + 0.5);
};

export const generateFeatureComparisonPdf = (): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = 0;

  // ========== HEADER ==========
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('PharmaTrack', margin, 18);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('vs Traditional Pharmacy Management', margin, 28);

  // Right side tagline
  doc.setFontSize(10);
  doc.text('Stop Losing Money.', pageWidth - margin, 15, { align: 'right' });
  doc.text('Start Growing Profits.', pageWidth - margin, 22, { align: 'right' });

  y = 45;

  // ========== COMPARISON TABLE HEADER ==========
  const col1 = margin;
  const col2 = 90;
  const col3 = 145;
  const colWidth1 = 75;
  const colWidth2 = 50;
  const colWidth3 = 50;

  // Table header background
  doc.setFillColor(...COLORS.secondary);
  doc.rect(margin, y, pageWidth - margin * 2, 10, 'F');

  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Business Challenge', col1 + 3, y + 7);
  doc.text('Old Way', col2 + colWidth2 / 2, y + 7, { align: 'center' });
  doc.text('PharmaTrack', col3 + colWidth3 / 2, y + 7, { align: 'center' });

  y += 14;

  // ========== COMPARISON ROWS ==========
  const comparisons = [
    {
      challenge: 'Price Manipulation by Staff',
      oldWay: 'No protection - staff can sell at any price',
      newWay: 'Price Shield locks prices, alerts on changes',
      oldBad: true,
      newGood: true,
    },
    {
      challenge: 'Expired Products',
      oldWay: 'Manual checking, often missed',
      newWay: 'Automatic 90/60/30 day alerts',
      oldBad: true,
      newGood: true,
    },
    {
      challenge: 'Stock Entry (Invoices)',
      oldWay: '2-3 hours manual typing per invoice',
      newWay: 'AI scans invoice photo in 30 seconds',
      oldBad: true,
      newGood: true,
    },
    {
      challenge: 'Knowing What\'s Selling',
      oldWay: 'End of month guesswork',
      newWay: 'Real-time analytics dashboard',
      oldBad: true,
      newGood: true,
    },
    {
      challenge: 'Staff Time Tracking',
      oldWay: 'Paper sign-in (easily faked)',
      newWay: 'Digital clock-in with WiFi/QR verification',
      oldBad: true,
      newGood: true,
    },
    {
      challenge: 'NAFDAC Compliance',
      oldWay: 'Manual record keeping, audit stress',
      newWay: 'Automatic reports, one-click compliance',
      oldBad: true,
      newGood: true,
    },
    {
      challenge: 'Low Stock Alerts',
      oldWay: 'Discover when customer asks',
      newWay: 'SMS/App alerts before stockout',
      oldBad: true,
      newGood: true,
    },
    {
      challenge: 'Multiple Branches',
      oldWay: 'Call each branch, inconsistent data',
      newWay: 'One dashboard for all locations',
      oldBad: true,
      newGood: true,
    },
    {
      challenge: 'Customer History',
      oldWay: 'No records, missed repeat sales',
      newWay: 'Full purchase history, refill reminders',
      oldBad: true,
      newGood: true,
    },
    {
      challenge: 'Drug Interactions',
      oldWay: 'Rely on memory, risk patient safety',
      newWay: 'AI warns at point of sale',
      oldBad: true,
      newGood: true,
    },
  ];

  doc.setFontSize(8);
  comparisons.forEach((item, index) => {
    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(...COLORS.light);
      doc.rect(margin, y - 3, pageWidth - margin * 2, 14, 'F');
    }

    // Challenge (bold)
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(item.challenge, col1 + 3, y + 3);

    // Old way
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    const oldWayLines = doc.splitTextToSize(item.oldWay, colWidth2 - 10);
    doc.text(oldWayLines, col2 + 8, y + 3);
    if (item.oldBad) drawX(doc, col2 + 3, y + 4);

    // New way
    doc.setTextColor(...COLORS.dark);
    const newWayLines = doc.splitTextToSize(item.newWay, colWidth3 - 10);
    doc.text(newWayLines, col3 + 8, y + 3);
    if (item.newGood) drawCheckmark(doc, col3 + 3, y + 4);

    y += 14;
  });

  y += 5;

  // ========== MONEY IMPACT SECTION ==========
  doc.setFillColor(...COLORS.secondary);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 28, 3, 3, 'F');

  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('THE MONEY IMPACT', pageWidth / 2, y + 8, { align: 'center' });

  // Three columns of stats
  const statsY = y + 18;
  const statCol1 = pageWidth / 6;
  const statCol2 = pageWidth / 2;
  const statCol3 = (pageWidth * 5) / 6;

  doc.setFontSize(16);
  doc.setTextColor(...COLORS.primary);
  doc.text('₦50K+', statCol1, statsY, { align: 'center' });
  doc.text('40%', statCol2, statsY, { align: 'center' });
  doc.text('3 hrs', statCol3, statsY, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(...COLORS.dark);
  doc.text('saved/month on losses', statCol1, statsY + 5, { align: 'center' });
  doc.text('less expired products', statCol2, statsY + 5, { align: 'center' });
  doc.text('saved daily on admin', statCol3, statsY + 5, { align: 'center' });

  y += 35;

  // ========== PRICING ROW ==========
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Start FREE for 14 days', margin + 10, y + 8);
  doc.text('Then from ₦10,000/month', margin + 10, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('No credit card required • Cancel anytime', pageWidth - margin - 10, y + 11, { align: 'right' });

  y += 22;

  // ========== CTA ==========
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Start Your FREE Trial Today', pageWidth / 2, y + 5, { align: 'center' });

  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('pharmatrack.app/auth', pageWidth / 2, y + 12, { align: 'center' });

  // ========== FOOTER ==========
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');

  doc.setTextColor(200, 200, 200);
  doc.setFontSize(8);
  doc.text('PharmaTrack - Built for Nigerian Pharmacies', pageWidth / 2, pageHeight - 5, { align: 'center' });

  return doc;
};

export const downloadFeatureComparisonPdf = (): void => {
  const pdf = generateFeatureComparisonPdf();
  pdf.save('PharmaTrack-Feature-Comparison.pdf');
};
