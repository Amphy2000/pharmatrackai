import jsPDF from 'jspdf';

const COLORS = {
  navy: [15, 23, 42] as const,
  emerald: [16, 185, 129] as const,
  red: [239, 68, 68] as const,
  gold: [245, 158, 11] as const,
  slate: [100, 116, 139] as const,
  white: [255, 255, 255] as const,
};

interface ROIData {
  monthlyRevenue: number;
  expiryLossPercent: number;
  staffLeakagePercent: number;
  phoneNumber: string;
}

const formatNaira = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const generateROIBattleCardPdf = (data: ROIData): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 15;

  // === HEADER ===
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('PharmaTrack ROI Battle Card', pageWidth / 2, 18, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Close More Deals with Money-Focused Selling', pageWidth / 2, 28, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gold);
  doc.text(`WhatsApp: ${data.phoneNumber}`, pageWidth / 2, 38, { align: 'center' });

  y = 55;

  // === SHOCKING STATISTIC ===
  doc.setFillColor(254, 226, 226); // Light red background
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 25, 3, 3, 'F');

  doc.setTextColor(...COLORS.red);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('THE SHOCKING TRUTH', margin + 5, y + 8);

  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nigerian pharmacies lose 8-15% of annual revenue to expiry + theft.`, margin + 5, y + 16);
  doc.text(`That's ${formatNaira(data.monthlyRevenue * 12 * 0.10)} gone EVERY YEAR for a ${formatNaira(data.monthlyRevenue)}/mo pharmacy.`, margin + 5, y + 22);

  y += 32;

  // === ROI CALCULATOR ===
  doc.setFillColor(...COLORS.navy);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 45, 3, 3, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('YOUR PROSPECT\'S NUMBERS (Customize Before Visit)', margin + 5, y + 10);

  const annualRevenue = data.monthlyRevenue * 12;
  const expiryLoss = annualRevenue * (data.expiryLossPercent / 100);
  const staffLeakage = annualRevenue * (data.staffLeakagePercent / 100);
  const totalLoss = expiryLoss + staffLeakage;
  const recovered = totalLoss * 0.70;
  const annualCost = 35000 * 12;
  const netSavings = recovered - annualCost;
  const roiMultiple = Math.round(recovered / annualCost);

  doc.setTextColor(...COLORS.gold);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Monthly Revenue: ${formatNaira(data.monthlyRevenue)}`, margin + 5, y + 20);
  doc.text(`Expiry Loss (${data.expiryLossPercent}%): ${formatNaira(expiryLoss)}/yr`, margin + 5, y + 27);
  doc.text(`Staff Leakage (${data.staffLeakagePercent}%): ${formatNaira(staffLeakage)}/yr`, margin + 5, y + 34);

  doc.setTextColor(...COLORS.emerald);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Recoverable: ${formatNaira(recovered)}/yr`, margin + 95, y + 20);
  doc.text(`ROI: ${roiMultiple}x Return`, margin + 95, y + 30);
  doc.text(`Net Savings: ${formatNaira(netSavings)}/yr`, margin + 95, y + 40);

  y += 52;

  // === 6 KILLER QUESTIONS ===
  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('6 KILLER QUESTIONS (Ask Before Demo)', margin, y);
  y += 8;

  const killerQuestions = [
    { q: 'Does your current app generate NAFDAC audit reports?', trap: 'Their app can\'t. Ours can in 1 click.' },
    { q: 'Can staff change prices during a sale?', trap: 'That\'s where your profit disappears.' },
    { q: 'Does it warn about dangerous drug interactions?', trap: 'Patient safety = legal protection.' },
    { q: 'Can customers find your pharmacy in a public marketplace?', trap: 'PharmaTrack lists you online.' },
    { q: 'Can patients search by distance (1km, 5km, 10km)?', trap: 'Our marketplace shows nearby stock.' },
    { q: 'Can it scan your invoice and stock 50 drugs in 30 seconds?', trap: 'This is our "wow" moment.' },
  ];

  doc.setFontSize(9);
  killerQuestions.forEach((item, index) => {
    doc.setTextColor(...COLORS.navy);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${item.q}`, margin, y);
    doc.setTextColor(...COLORS.slate);
    doc.setFont('helvetica', 'italic');
    doc.text(`    → ${item.trap}`, margin, y + 4);
    y += 10;
  });

  y += 5;

  // === MONEY-FOCUSED COMPARISON ===
  doc.setTextColor(...COLORS.red);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('WHAT THEY\'RE LOSING (Generic POS)', margin, y);
  y += 6;

  const losses = [
    { issue: 'No expiry prediction', cost: `${formatNaira(expiryLoss)}/yr thrown away` },
    { issue: 'Staff can edit prices', cost: `${formatNaira(staffLeakage)}/yr in theft` },
    { issue: 'No NAFDAC reports', cost: 'Risk of license suspension' },
    { issue: 'No drug interaction warnings', cost: 'Risk of malpractice lawsuit' },
    { issue: 'Manual inventory entry', cost: '40+ hours/month wasted' },
  ];

  doc.setFontSize(9);
  losses.forEach((item) => {
    doc.setTextColor(...COLORS.red);
    doc.setFont('helvetica', 'bold');
    doc.text(`✗ ${item.issue}:`, margin, y);
    doc.setTextColor(...COLORS.slate);
    doc.setFont('helvetica', 'normal');
    doc.text(item.cost, margin + 50, y);
    y += 6;
  });

  y += 5;

  doc.setTextColor(...COLORS.emerald);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('WHAT WE RECOVER (PharmaTrack AI)', margin, y);
  y += 6;

  const recoveries = [
    { feature: 'AI predicts expiry 60 days early', value: `Recover 70% of expiring stock` },
    { feature: 'Locked pricing (admin only)', value: `Stop ${formatNaira(staffLeakage)}/yr theft` },
    { feature: 'Public marketplace listing', value: 'Patients find you first' },
    { feature: 'Distance-based search', value: 'Nearby customers come to you' },
    { feature: 'Invoice scanner', value: 'Stock 50 items in 30 seconds' },
  ];

  doc.setFontSize(9);
  recoveries.forEach((item) => {
    doc.setTextColor(...COLORS.emerald);
    doc.setFont('helvetica', 'bold');
    doc.text(`✓ ${item.feature}:`, margin, y);
    doc.setTextColor(...COLORS.slate);
    doc.setFont('helvetica', 'normal');
    doc.text(item.value, margin + 60, y);
    y += 6;
  });

  y += 8;

  // === OBJECTION HANDLER ===
  doc.setFillColor(240, 253, 244); // Light green
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 35, 3, 3, 'F');

  doc.setTextColor(...COLORS.emerald);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('WHEN THEY SAY: "I already have an app that tracks expiry"', margin + 5, y + 8);

  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const objectionResponse = `"Sir, those are General POS apps. They tell you what you sold. PharmaTrack tells you what you're LOSING. Can their app scan your invoice and stock 50 drugs in 10 seconds? Can it generate NAFDAC Batch Traceability reports? Can it lock prices so staff can't steal? Those apps are for supermarkets. You're a Healthcare Professional—you deserve a tool built for your license."`;
  
  const objectionLines = doc.splitTextToSize(objectionResponse, pageWidth - 2 * margin - 10);
  doc.text(objectionLines, margin + 5, y + 15);

  y += 42;

  // === CTA ===
  doc.setFillColor(...COLORS.navy);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 25, 3, 3, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('READY TO CLOSE?', margin + 5, y + 10);

  doc.setTextColor(...COLORS.gold);
  doc.setFontSize(11);
  doc.text(`WhatsApp: ${data.phoneNumber}`, margin + 5, y + 18);
  
  doc.setTextColor(...COLORS.white);
  doc.text('pharmat.lovable.app', pageWidth - margin - 45, y + 14);

  return doc;
};

export const downloadROIBattleCardPdf = (data?: Partial<ROIData>): void => {
  const defaultData: ROIData = {
    monthlyRevenue: 5000000,
    expiryLossPercent: 8,
    staffLeakagePercent: 3,
    phoneNumber: '+2349169153129',
    ...data,
  };

  const doc = generateROIBattleCardPdf(defaultData);
  doc.save('PharmaTrack-ROI-Battle-Card.pdf');
};
