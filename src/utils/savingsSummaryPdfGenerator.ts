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
}

export const generateSavingsSummaryPdf = (metrics: SavingsMetrics, formatPrice: (amount: number) => string) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  
  // Colors
  const primaryColor: [number, number, number] = [37, 99, 235]; // Blue
  const successColor: [number, number, number] = [22, 163, 74]; // Green
  const warningColor: [number, number, number] = [234, 179, 8]; // Yellow
  const infoColor: [number, number, number] = [59, 130, 246]; // Light Blue
  const textDark: [number, number, number] = [15, 23, 42];
  const textMuted: [number, number, number] = [100, 116, 139];

  // Helper to draw rounded rectangles
  const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number, fill?: [number, number, number], stroke?: [number, number, number]) => {
    if (fill) {
      doc.setFillColor(...fill);
    }
    if (stroke) {
      doc.setDrawColor(...stroke);
      doc.setLineWidth(0.5);
    }
    doc.roundedRect(x, y, w, h, r, r, fill && stroke ? 'FD' : fill ? 'F' : 'S');
  };

  let y = margin;

  // === HEADER BANNER ===
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 55, 'F');

  // Pharmacy name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(metrics.pharmacyName, margin, 25);

  // Branch info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(metrics.branchInfo, margin, 35);

  // Month badge on right
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const monthText = metrics.monthName;
  const monthWidth = doc.getTextWidth(monthText) + 12;
  doc.setFillColor(255, 255, 255, 0.2);
  drawRoundedRect(pageWidth - margin - monthWidth, 18, monthWidth, 10, 3, [255, 255, 255]);
  doc.setTextColor(...primaryColor);
  doc.text(monthText, pageWidth - margin - monthWidth + 6, 25);

  // ROI badge
  const roiText = `${metrics.savingsMultiple}x ROI`;
  const roiWidth = doc.getTextWidth(roiText) + 12;
  drawRoundedRect(pageWidth - margin - roiWidth, 32, roiWidth, 10, 3, successColor);
  doc.setTextColor(255, 255, 255);
  doc.text(roiText, pageWidth - margin - roiWidth + 6, 39);

  y = 75;

  // === TOTAL SAVINGS BOX ===
  drawRoundedRect(margin, y - 10, contentWidth, 50, 8, [240, 253, 244], successColor);
  
  doc.setTextColor(...textMuted);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Total Money Saved This Month', pageWidth / 2, y + 2, { align: 'center' });

  doc.setTextColor(...successColor);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text(formatPrice(metrics.totalSavings), pageWidth / 2, y + 22, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${metrics.savingsMultiple}x your subscription cost`, pageWidth / 2, y + 32, { align: 'center' });

  y += 60;

  // === SAVINGS BREAKDOWN ===
  doc.setTextColor(...textDark);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Savings Breakdown', margin, y);
  y += 10;

  const cardWidth = (contentWidth - 10) / 2;
  const cardHeight = 40;

  // Card 1: Loss Prevented
  drawRoundedRect(margin, y, cardWidth, cardHeight, 6, [240, 253, 244], successColor);
  doc.setFillColor(...successColor);
  doc.circle(margin + 15, y + cardHeight / 2, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text('₦', margin + 12, y + cardHeight / 2 + 5);
  
  doc.setTextColor(...textMuted);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Loss Prevented', margin + 28, y + 12);
  doc.setTextColor(...successColor);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(formatPrice(metrics.lossPrevented), margin + 28, y + 25);
  doc.setTextColor(...textMuted);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${metrics.itemsSaved} near-expiry items sold`, margin + 28, y + 33);

  // Card 2: Time Saved
  const card2X = margin + cardWidth + 10;
  drawRoundedRect(card2X, y, cardWidth, cardHeight, 6, [239, 246, 255], infoColor);
  doc.setFillColor(...infoColor);
  doc.circle(card2X + 15, y + cardHeight / 2, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('⏱', card2X + 11, y + cardHeight / 2 + 4);
  
  doc.setTextColor(...textMuted);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Time Saved', card2X + 28, y + 12);
  doc.setTextColor(...infoColor);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${metrics.timeSavedHours} hours`, card2X + 28, y + 25);
  doc.setTextColor(...textMuted);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`≈ ${formatPrice(metrics.timeSavedValue)}`, card2X + 28, y + 33);

  y += cardHeight + 10;

  // Card 3: Theft Blocked
  drawRoundedRect(margin, y, cardWidth, cardHeight, 6, [254, 252, 232], warningColor);
  doc.setFillColor(...warningColor);
  doc.circle(margin + 15, y + cardHeight / 2, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('🔒', margin + 10, y + cardHeight / 2 + 4);
  
  doc.setTextColor(...textMuted);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Theft Blocked', margin + 28, y + 12);
  doc.setTextColor(...warningColor);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${metrics.theftBlocked} attempts`, margin + 28, y + 25);
  doc.setTextColor(...textMuted);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`≈ ${formatPrice(metrics.theftValueProtected)} protected`, margin + 28, y + 33);

  // Card 4: Stock Protected
  drawRoundedRect(card2X, y, cardWidth, cardHeight, 6, [239, 246, 255], primaryColor);
  doc.setFillColor(...primaryColor);
  doc.circle(card2X + 15, y + cardHeight / 2, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('🛡', card2X + 10, y + cardHeight / 2 + 4);
  
  doc.setTextColor(...textMuted);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Stock Protected', card2X + 28, y + 12);
  doc.setTextColor(...primaryColor);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(formatPrice(metrics.atRiskValue), card2X + 28, y + 25);
  doc.setTextColor(...textMuted);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${metrics.atRiskItems} items expiring soon`, card2X + 28, y + 33);

  y += cardHeight + 20;

  // === ROI SUMMARY BOX ===
  drawRoundedRect(margin, y, contentWidth, 45, 8, [248, 250, 252], primaryColor);
  
  doc.setTextColor(...textDark);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PharmaTrack ROI Value', margin + 15, y + 15);
  
  doc.setTextColor(...primaryColor);
  doc.setFontSize(20);
  doc.text(formatPrice(metrics.totalSavings), margin + 15, y + 32);

  // Right side - vs cost
  const rightX = pageWidth - margin - 60;
  doc.setTextColor(...textMuted);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('vs. Monthly Cost', rightX, y + 12);
  
  doc.setFontSize(11);
  doc.setTextColor(...successColor);
  doc.setFont('helvetica', 'bold');
  doc.text(formatPrice(metrics.totalSavings), rightX, y + 22);
  doc.setTextColor(...textMuted);
  doc.setFont('helvetica', 'normal');
  doc.text(' ÷ ', rightX + doc.getTextWidth(formatPrice(metrics.totalSavings)), y + 22);
  doc.setTextColor(220, 38, 38);
  doc.text('₦35,000', rightX + doc.getTextWidth(formatPrice(metrics.totalSavings)) + 8, y + 22);
  
  doc.setTextColor(...successColor);
  doc.setFontSize(10);
  doc.text(`App pays for itself ${metrics.savingsMultiple}x over`, rightX, y + 35);

  y += 60;

  // === HOW WE CALCULATED ===
  doc.setTextColor(...textDark);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('How We Calculated Your Savings', margin, y);
  y += 8;

  doc.setTextColor(...textMuted);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const calculations = [
    `• Loss Prevented: Value of near-expiry drugs sold before they expired (${metrics.itemsSaved} items)`,
    `• Time Saved: ${metrics.timeSavedHours} hours × ₦1,500/hour average staff cost`,
    `• Theft Blocked: ${metrics.theftBlocked} unauthorized attempts × average transaction value`,
    `• Stock Protected: Current value of ${metrics.atRiskItems} items expiring within 30 days`,
  ];

  calculations.forEach(line => {
    doc.text(line, margin, y);
    y += 6;
  });

  // === FOOTER ===
  const footerY = pageHeight - 25;
  
  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);

  // Footer content
  doc.setTextColor(...successColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('✓ Verified by PharmaTrack', margin, footerY);

  doc.setTextColor(...textMuted);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${metrics.generatedAt}`, margin, footerY + 7);

  // Brand on right
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('pharmatrack.com.ng', pageWidth - margin, footerY, { align: 'right' });
  
  doc.setTextColor(...textMuted);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Smart Pharmacy Management', pageWidth - margin, footerY + 7, { align: 'right' });

  // Download
  const fileName = `${metrics.pharmacyName.replace(/\s+/g, '_')}_Savings_${metrics.monthName.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
};
