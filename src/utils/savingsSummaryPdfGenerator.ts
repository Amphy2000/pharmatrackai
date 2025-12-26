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

// Color palette
const COLORS = {
  primary: [37, 99, 235] as [number, number, number],
  primaryLight: [239, 246, 255] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  successLight: [240, 253, 244] as [number, number, number],
  warning: [234, 179, 8] as [number, number, number],
  warningLight: [254, 252, 232] as [number, number, number],
  info: [59, 130, 246] as [number, number, number],
  infoLight: [239, 246, 255] as [number, number, number],
  dark: [15, 23, 42] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  lightBg: [248, 250, 252] as [number, number, number],
};

// Format currency properly for PDF (without special characters that break)
const formatCurrency = (amount: number): string => {
  const formatted = new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `N${formatted}`;
};

export const generateSavingsSummaryPdf = (metrics: SavingsMetrics, _formatPrice?: (amount: number) => string) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  
  let y = 0;

  // === HEADER BANNER ===
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Pharmacy name
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(metrics.pharmacyName, margin, 20);

  // Branch info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(metrics.branchInfo, margin, 30);

  // Month badge on right
  const monthText = metrics.monthName;
  const monthWidth = doc.getTextWidth(monthText) + 16;
  doc.setFillColor(...COLORS.white);
  doc.roundedRect(pageWidth - margin - monthWidth, 12, monthWidth, 12, 4, 4, 'F');
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(monthText, pageWidth - margin - monthWidth + 8, 20);

  // ROI badge
  const roiText = `${metrics.savingsMultiple}x ROI`;
  const roiWidth = doc.getTextWidth(roiText) + 16;
  doc.setFillColor(...COLORS.success);
  doc.roundedRect(pageWidth - margin - roiWidth, 28, roiWidth, 12, 4, 4, 'F');
  doc.setTextColor(...COLORS.white);
  doc.text(roiText, pageWidth - margin - roiWidth + 8, 36);

  y = 62;

  // === TOTAL SAVINGS BOX ===
  doc.setFillColor(...COLORS.successLight);
  doc.setDrawColor(...COLORS.success);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, y, contentWidth, 45, 6, 6, 'FD');
  
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Total Money Saved This Month', pageWidth / 2, y + 12, { align: 'center' });

  doc.setTextColor(...COLORS.success);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(metrics.totalSavings), pageWidth / 2, y + 28, { align: 'center' });

  doc.setTextColor(...COLORS.success);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${metrics.savingsMultiple}x your subscription cost`, pageWidth / 2, y + 38, { align: 'center' });

  y += 55;

  // === SAVINGS BREAKDOWN HEADER ===
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Savings Breakdown', margin, y);
  y += 8;

  // Grid of 4 cards (2x2)
  const cardWidth = (contentWidth - 8) / 2;
  const cardHeight = 35;
  const gap = 8;

  // Card 1: Loss Prevented (top-left)
  doc.setFillColor(...COLORS.successLight);
  doc.setDrawColor(...COLORS.success);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 4, 4, 'FD');
  
  // Icon circle
  doc.setFillColor(...COLORS.success);
  doc.circle(margin + 14, y + cardHeight / 2, 8, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('N', margin + 11.5, y + cardHeight / 2 + 4);
  
  // Text
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Loss Prevented', margin + 26, y + 10);
  doc.setTextColor(...COLORS.success);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(metrics.lossPrevented), margin + 26, y + 20);
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`${metrics.itemsSaved} near-expiry items sold`, margin + 26, y + 28);

  // Card 2: Time Saved (top-right)
  const card2X = margin + cardWidth + gap;
  doc.setFillColor(...COLORS.infoLight);
  doc.setDrawColor(...COLORS.info);
  doc.roundedRect(card2X, y, cardWidth, cardHeight, 4, 4, 'FD');
  
  doc.setFillColor(...COLORS.info);
  doc.circle(card2X + 14, y + cardHeight / 2, 8, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('HR', card2X + 10, y + cardHeight / 2 + 3);
  
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Time Saved', card2X + 26, y + 10);
  doc.setTextColor(...COLORS.info);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${metrics.timeSavedHours} hours`, card2X + 26, y + 20);
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Worth ${formatCurrency(metrics.timeSavedValue)}`, card2X + 26, y + 28);

  y += cardHeight + gap;

  // Card 3: Theft Blocked (bottom-left)
  doc.setFillColor(...COLORS.warningLight);
  doc.setDrawColor(...COLORS.warning);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 4, 4, 'FD');
  
  doc.setFillColor(...COLORS.warning);
  doc.circle(margin + 14, y + cardHeight / 2, 8, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('!', margin + 12.5, y + cardHeight / 2 + 3.5);
  
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Theft Blocked', margin + 26, y + 10);
  doc.setTextColor(180, 130, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${metrics.theftBlocked} attempts`, margin + 26, y + 20);
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formatCurrency(metrics.theftValueProtected)} protected`, margin + 26, y + 28);

  // Card 4: Stock Protected (bottom-right)
  doc.setFillColor(...COLORS.primaryLight);
  doc.setDrawColor(...COLORS.primary);
  doc.roundedRect(card2X, y, cardWidth, cardHeight, 4, 4, 'FD');
  
  doc.setFillColor(...COLORS.primary);
  doc.circle(card2X + 14, y + cardHeight / 2, 8, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('OK', card2X + 10, y + cardHeight / 2 + 3);
  
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Stock Protected', card2X + 26, y + 10);
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(metrics.atRiskValue), card2X + 26, y + 20);
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`${metrics.atRiskItems} items monitored`, card2X + 26, y + 28);

  y += cardHeight + 15;

  // === ROI SUMMARY BOX ===
  doc.setFillColor(...COLORS.lightBg);
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 40, 6, 6, 'FD');
  
  // Left side - Total Value
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PharmaTrack ROI Value', margin + 10, y + 12);
  
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(18);
  doc.text(formatCurrency(metrics.totalSavings), margin + 10, y + 26);

  // Right side - vs cost comparison
  const rightX = pageWidth / 2 + 20;
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('vs. Monthly Cost', rightX, y + 10);
  
  // Savings vs Cost
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.success);
  doc.setFont('helvetica', 'bold');
  const savingsText = formatCurrency(metrics.totalSavings);
  doc.text(savingsText, rightX, y + 19);
  
  const dividerX = rightX + doc.getTextWidth(savingsText) + 3;
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.text(' / ', dividerX, y + 19);
  
  doc.setTextColor(220, 38, 38);
  doc.text(formatCurrency(metrics.monthlyCost), dividerX + 8, y + 19);
  
  // ROI badge in the box
  doc.setFillColor(...COLORS.success);
  doc.roundedRect(rightX, y + 24, 60, 10, 3, 3, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`App pays for itself ${metrics.savingsMultiple}x`, rightX + 4, y + 31);

  y += 50;

  // === HOW WE CALCULATED ===
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('How We Calculated Your Savings', margin, y);
  y += 7;

  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const calculations = [
    `Loss Prevented: Value of ${metrics.itemsSaved} near-expiry drugs sold before expiration`,
    `Time Saved: ${metrics.timeSavedHours} hours x N1,500/hour (average staff cost)`,
    `Theft Blocked: ${metrics.theftBlocked} unauthorized price change attempts detected`,
    `Stock Protected: Value of ${metrics.atRiskItems} items being monitored for expiry`,
  ];

  calculations.forEach((line, index) => {
    const bullet = String.fromCharCode(8226); // •
    doc.text(`${bullet}  ${line}`, margin, y);
    y += 5;
  });

  // === FOOTER ===
  const footerY = pageHeight - 20;
  
  // Divider line
  doc.setDrawColor(...COLORS.muted);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8);

  // Left side - Verification
  doc.setFillColor(...COLORS.success);
  doc.circle(margin + 3, footerY - 2, 2, 'F');
  doc.setTextColor(...COLORS.success);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Verified by PharmaTrack', margin + 8, footerY);
  
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${metrics.generatedAt}`, margin, footerY + 6);

  // Right side - Branding
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('pharmatrack.com.ng', pageWidth - margin, footerY, { align: 'right' });
  
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Smart Pharmacy Management', pageWidth - margin, footerY + 6, { align: 'right' });

  // Download
  const fileName = `${metrics.pharmacyName.replace(/\s+/g, '_')}_Savings_${metrics.monthName.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
};
