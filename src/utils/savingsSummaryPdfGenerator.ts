import jsPDF from 'jspdf';

interface SavingsMetrics {
  pharmacyName: string;
  monthName: string;
  branchInfo: string;
  totalSavings: number;
  lossPrevented: number;
  itemsSaved: number;
  timeSavedHours: number;
  timeSavedValue: number;
  theftBlocked: number;
  theftValueProtected: number;
  atRiskValue: number;
  atRiskItems: number;
  savingsMultiple: string;
  generatedAt: string;
  monthlyCost: number;
}

// Premium color palette
const COLORS = {
  navy: [15, 23, 42] as [number, number, number],
  slate: [51, 65, 85] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  emeraldDark: [5, 150, 105] as [number, number, number],
  teal: [20, 184, 166] as [number, number, number],
  gold: [245, 158, 11] as [number, number, number],
  blue: [59, 130, 246] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  gray100: [243, 244, 246] as [number, number, number],
  gray200: [229, 231, 235] as [number, number, number],
  gray400: [156, 163, 175] as [number, number, number],
  gray600: [75, 85, 99] as [number, number, number],
};

const formatCurrency = (amount: number): string => {
  const formatted = new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `N${formatted}`;
};

export const generateSavingsSummaryPdf = (metrics: SavingsMetrics) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  
  let y = 0;

  // === PREMIUM HEADER WITH GRADIENT EFFECT ===
  // Dark navy header
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, pageWidth, 55, 'F');
  
  // Subtle accent line
  doc.setFillColor(...COLORS.emerald);
  doc.rect(0, 53, pageWidth, 2, 'F');

  // PHARMATRACK branding
  doc.setTextColor(...COLORS.emerald);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PHARMATRACK', margin, 18);

  // Pharmacy name - large and prominent
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(metrics.pharmacyName.toUpperCase(), margin, 32);

  // Branch info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray400);
  doc.text(metrics.branchInfo, margin, 42);

  // Month & Year badge (right side)
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(metrics.monthName.toUpperCase(), pageWidth - margin, 24, { align: 'right' });

  // ROI indicator
  doc.setFillColor(...COLORS.emerald);
  doc.roundedRect(pageWidth - margin - 45, 30, 45, 14, 7, 7, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(11);
  doc.text(`${metrics.savingsMultiple}x ROI`, pageWidth - margin - 22.5, 39, { align: 'center' });

  y = 68;

  // === HERO SAVINGS SECTION ===
  doc.setFillColor(...COLORS.gray100);
  doc.roundedRect(margin, y, contentWidth, 50, 4, 4, 'F');

  // Left side - Total savings
  doc.setTextColor(...COLORS.gray600);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL MONEY SAVED', margin + 12, y + 16);

  doc.setTextColor(...COLORS.emeraldDark);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(metrics.totalSavings), margin + 12, y + 36);

  // Right side - vs subscription
  const rightX = pageWidth - margin - 55;
  doc.setTextColor(...COLORS.gray600);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('vs. Monthly Subscription', rightX, y + 14);

  doc.setFontSize(11);
  doc.setTextColor(...COLORS.emeraldDark);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(metrics.totalSavings), rightX, y + 24);
  
  doc.setTextColor(...COLORS.gray400);
  doc.setFont('helvetica', 'normal');
  doc.text(' / ', rightX + doc.getTextWidth(formatCurrency(metrics.totalSavings)), y + 24);
  
  doc.setTextColor(220, 38, 38);
  doc.text(formatCurrency(metrics.monthlyCost), rightX + doc.getTextWidth(formatCurrency(metrics.totalSavings)) + 6, y + 24);

  // ROI pill
  doc.setFillColor(...COLORS.emerald);
  doc.roundedRect(rightX, y + 30, 50, 12, 6, 6, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`PAYS FOR ITSELF ${metrics.savingsMultiple}x`, rightX + 25, y + 38, { align: 'center' });

  y += 62;

  // === SAVINGS BREAKDOWN HEADER ===
  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SAVINGS BREAKDOWN', margin, y);
  y += 10;

  // === 4 METRIC CARDS (2x2 Grid) ===
  const cardWidth = (contentWidth - 10) / 2;
  const cardHeight = 42;
  const gap = 10;

  // Card helper function
  const drawMetricCard = (
    x: number, 
    yPos: number, 
    label: string, 
    value: string, 
    subtext: string, 
    iconColor: [number, number, number],
    iconText: string
  ) => {
    // Card background
    doc.setFillColor(...COLORS.white);
    doc.setDrawColor(...COLORS.gray200);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, yPos, cardWidth, cardHeight, 4, 4, 'FD');

    // Colored left accent
    doc.setFillColor(...iconColor);
    doc.roundedRect(x, yPos, 4, cardHeight, 2, 2, 'F');

    // Icon circle
    doc.setFillColor(...iconColor);
    doc.circle(x + 18, yPos + cardHeight / 2, 10, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const iconWidth = doc.getTextWidth(iconText);
    doc.text(iconText, x + 18 - iconWidth / 2, yPos + cardHeight / 2 + 3.5);

    // Label
    doc.setTextColor(...COLORS.gray600);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(label.toUpperCase(), x + 32, yPos + 12);

    // Value
    doc.setTextColor(...iconColor);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(value, x + 32, yPos + 26);

    // Subtext
    doc.setTextColor(...COLORS.gray400);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(subtext, x + 32, yPos + 35);
  };

  // Card 1: Loss Prevented
  drawMetricCard(
    margin, y,
    'Loss Prevented',
    formatCurrency(metrics.lossPrevented),
    `${metrics.itemsSaved} near-expiry items sold`,
    COLORS.emerald,
    'N'
  );

  // Card 2: Time Saved
  drawMetricCard(
    margin + cardWidth + gap, y,
    'Time Saved',
    `${metrics.timeSavedHours} hrs`,
    `Worth ${formatCurrency(metrics.timeSavedValue)}`,
    COLORS.blue,
    'T'
  );

  y += cardHeight + gap;

  // Card 3: Theft Blocked
  drawMetricCard(
    margin, y,
    'Theft Blocked',
    `${metrics.theftBlocked}`,
    `${formatCurrency(metrics.theftValueProtected)} protected`,
    COLORS.gold,
    '!'
  );

  // Card 4: Stock Protected
  drawMetricCard(
    margin + cardWidth + gap, y,
    'Stock Protected',
    formatCurrency(metrics.atRiskValue),
    `${metrics.atRiskItems} items monitored`,
    COLORS.teal,
    'OK'
  );

  y += cardHeight + 16;

  // === HOW WE CALCULATED SECTION ===
  doc.setFillColor(...COLORS.gray100);
  doc.roundedRect(margin, y, contentWidth, 48, 4, 4, 'F');

  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('HOW WE CALCULATED YOUR SAVINGS', margin + 10, y + 12);

  doc.setTextColor(...COLORS.gray600);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const calculations = [
    `Loss Prevented: Value of ${metrics.itemsSaved} near-expiry drugs sold before expiration`,
    `Time Saved: ${metrics.timeSavedHours} hours x N1,500/hour (average staff cost)`,
    `Theft Blocked: ${metrics.theftBlocked} unauthorized price change attempts detected`,
    `Stock Protected: Value of ${metrics.atRiskItems} items being monitored for expiry`,
  ];

  let calcY = y + 22;
  calculations.forEach((line) => {
    doc.setFillColor(...COLORS.emerald);
    doc.circle(margin + 13, calcY - 1.5, 1.5, 'F');
    doc.text(line, margin + 20, calcY);
    calcY += 7;
  });

  // === FOOTER ===
  const footerY = pageHeight - 25;
  
  // Top line
  doc.setDrawColor(...COLORS.gray200);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  // Verified badge
  doc.setFillColor(...COLORS.emerald);
  doc.circle(margin + 4, footerY + 10, 3, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(6);
  doc.text('✓', margin + 2.5, footerY + 12);

  doc.setTextColor(...COLORS.emeraldDark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Verified by PharmaTrack', margin + 10, footerY + 12);
  
  doc.setTextColor(...COLORS.gray400);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${metrics.generatedAt}`, margin, footerY + 20);

  // Right side branding
  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('pharmatrack.com.ng', pageWidth - margin, footerY + 10, { align: 'right' });
  
  doc.setTextColor(...COLORS.gray400);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Smart Pharmacy Management', pageWidth - margin, footerY + 18, { align: 'right' });

  // Download
  const fileName = `${metrics.pharmacyName.replace(/\s+/g, '_')}_Savings_${metrics.monthName.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
};
