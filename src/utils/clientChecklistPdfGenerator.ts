import jsPDF from 'jspdf';

// Premium color palette
const COLORS = {
  navy: [15, 23, 42] as [number, number, number],
  slate: [51, 65, 85] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  emeraldDark: [5, 150, 105] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  gray100: [243, 244, 246] as [number, number, number],
  gray200: [229, 231, 235] as [number, number, number],
  gray300: [209, 213, 219] as [number, number, number],
  gray400: [156, 163, 175] as [number, number, number],
  gray600: [75, 85, 99] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  amberLight: [254, 243, 199] as [number, number, number],
};

const drawCheckbox = (doc: jsPDF, x: number, y: number) => {
  doc.setDrawColor(...COLORS.gray300);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y - 3.5, 4.5, 4.5, 1, 1, 'S');
};

const checkPageBreak = (doc: jsPDF, yPos: number, requiredSpace: number, margin: number): number => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (yPos + requiredSpace > pageHeight - 30) {
    doc.addPage();
    return margin + 15;
  }
  return yPos;
};

export const generateClientChecklistPdf = (pharmacyName?: string): jsPDF => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // === PREMIUM HEADER ===
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, pageWidth, 48, 'F');
  
  // Accent line
  doc.setFillColor(...COLORS.emerald);
  doc.rect(0, 46, pageWidth, 2, 'F');

  // Logo/Brand
  doc.setTextColor(...COLORS.emerald);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('PHARMATRACK', margin, 16);

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('New Client Setup Checklist', margin, 30);

  doc.setTextColor(...COLORS.gray400);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Everything you need for a smooth onboarding', margin, 40);

  y = 58;

  // Personalized greeting
  if (pharmacyName) {
    doc.setFillColor(...COLORS.emerald);
    doc.roundedRect(margin, y, contentWidth, 14, 3, 3, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Prepared for: ${pharmacyName}`, margin + 8, y + 9);
    y += 22;
  }

  // Introduction
  doc.setTextColor(...COLORS.gray600);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const intro = 'To get your pharmacy live in under 20 minutes, please have the following information ready before our onboarding session:';
  const introLines = doc.splitTextToSize(intro, contentWidth);
  doc.text(introLines, margin, y);
  y += introLines.length * 5 + 10;

  // Section helper function
  const drawSection = (title: string, number: string, items: string[]) => {
    y = checkPageBreak(doc, y, 45, margin);
    
    // Section header
    doc.setFillColor(...COLORS.gray100);
    doc.roundedRect(margin, y - 4, contentWidth, 10, 2, 2, 'F');
    
    doc.setTextColor(...COLORS.emeraldDark);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${number}. ${title}`, margin + 6, y + 2);
    y += 12;

    doc.setTextColor(...COLORS.slate);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    items.forEach((item) => {
      drawCheckbox(doc, margin + 4, y);
      doc.text(item, margin + 14, y);
      y += 7;
    });

    y += 6;
  };

  // Section 1: Branch Details
  drawSection('Branch Details', '1', [
    'List of all branch names',
    'Physical address for each branch',
    'Contact phone number for each branch',
    'Email address for each branch (optional)',
  ]);

  // Section 2: Staff Information
  drawSection('Staff Information', '2', [
    'Names of Branch Managers (one per branch)',
    'Phone numbers for each Manager',
    'Names of Cashiers/Staff members',
    'Phone numbers for each Staff member',
    'Which staff should be assigned to which branch',
  ]);

  // Section 3: Inventory Data
  y = checkPageBreak(doc, y, 60, margin);
  doc.setFillColor(...COLORS.gray100);
  doc.roundedRect(margin, y - 4, contentWidth, 10, 2, 2, 'F');
  
  doc.setTextColor(...COLORS.emeraldDark);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Inventory Data', margin + 6, y + 2);
  y += 12;

  doc.setTextColor(...COLORS.slate);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const inventoryItems = [
    'Current stock list in CSV or Excel format',
    'Required columns: Product Name, Category, Quantity',
    'Optional: Cost Price, Selling Price, Expiry Date, Batch Number',
    'Supplier information (name, contact) if available',
  ];

  inventoryItems.forEach((item) => {
    drawCheckbox(doc, margin + 4, y);
    doc.text(item, margin + 14, y);
    y += 7;
  });

  y += 4;

  // Invoice photo tip box
  doc.setFillColor(...COLORS.amberLight);
  doc.roundedRect(margin, y, contentWidth, 16, 3, 3, 'F');
  doc.setFillColor(...COLORS.amber);
  doc.roundedRect(margin, y, 4, 16, 2, 2, 'F');
  
  doc.setTextColor(...COLORS.slate);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('NO DIGITAL FILE? NO PROBLEM!', margin + 10, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text('Take clear photos of your supplier invoices - we import stock directly using AI.', margin + 10, y + 12);
  y += 24;

  // Section 4: Account Setup
  drawSection('Account Setup', '4', [
    "Owner's email address (for Super Admin account)",
    'Pharmacy license/registration number',
    'Preferred admin PIN (4-6 digits) for sensitive operations',
    'Logo image file (PNG or JPG) for receipts - optional',
  ]);

  // Pro Tips Box
  y = checkPageBreak(doc, y, 45, margin);
  doc.setFillColor(...COLORS.gray100);
  doc.roundedRect(margin, y, contentWidth, 40, 4, 4, 'F');
  
  doc.setTextColor(...COLORS.emeraldDark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Pro Tips for a Smooth Onboarding', margin + 8, y + 10);

  doc.setTextColor(...COLORS.slate);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const tips = [
    'Export your current inventory from your existing system if possible',
    'Have all branch managers available during the setup call',
    'Prepare a test product to verify barcode scanning works',
    'Clear 30-45 minutes for the complete setup process',
  ];

  let tipY = y + 18;
  tips.forEach((tip) => {
    doc.setFillColor(...COLORS.emerald);
    doc.circle(margin + 11, tipY - 1, 1.2, 'F');
    doc.text(tip, margin + 16, tipY);
    tipY += 5;
  });

  y += 50;

  // Pricing Box
  y = checkPageBreak(doc, y, 30, margin);
  doc.setFillColor(...COLORS.navy);
  doc.roundedRect(margin, y, contentWidth, 28, 4, 4, 'F');

  doc.setTextColor(...COLORS.emerald);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PRICING OVERVIEW', margin + 8, y + 9);

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Base Subscription (includes Main Branch): N35,000/month', margin + 8, y + 17);
  doc.text('Additional Branch Fee: N15,000/month per branch', margin + 8, y + 23);

  doc.setTextColor(...COLORS.emerald);
  doc.setFont('helvetica', 'bold');
  doc.text('7-DAY FREE TRIAL  •  NO CREDIT CARD REQUIRED', pageWidth - margin - 8, y + 17, { align: 'right' });

  // === FOOTER ===
  const footerY = pageHeight - 18;
  doc.setDrawColor(...COLORS.gray200);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setTextColor(...COLORS.gray400);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Questions? Contact us at support@pharmatrack.com.ng', margin, footerY);

  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('pharmatrack.com.ng', pageWidth - margin, footerY, { align: 'right' });

  return doc;
};

export const downloadClientChecklistPdf = (pharmacyName?: string): void => {
  const doc = generateClientChecklistPdf(pharmacyName);
  const filename = pharmacyName 
    ? `PharmaTrack-Checklist-${pharmacyName.replace(/\s+/g, '-')}.pdf`
    : 'PharmaTrack-Client-Checklist.pdf';
  doc.save(filename);
};
