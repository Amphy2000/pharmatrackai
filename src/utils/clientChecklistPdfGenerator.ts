import jsPDF from 'jspdf';

const COLORS = {
  primary: [34, 197, 94] as [number, number, number],
  dark: [17, 24, 39] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  lightGray: [243, 244, 246] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const drawCheckbox = (doc: jsPDF, x: number, y: number) => {
  doc.setDrawColor(...COLORS.gray);
  doc.setLineWidth(0.5);
  doc.rect(x, y, 5, 5);
};

const checkPageBreak = (doc: jsPDF, yPos: number, requiredSpace: number, margin: number): number => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (yPos + requiredSpace > pageHeight - 25) {
    doc.addPage();
    return margin + 10;
  }
  return yPos;
};

export const generateClientChecklistPdf = (pharmacyName?: string): jsPDF => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Header background
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Logo/Brand
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('PharmaTrack AI', margin, 25);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('New Client Installation Checklist', margin, 36);

  yPos = 55;

  // Personalized greeting if pharmacy name provided
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  if (pharmacyName) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Prepared for: ${pharmacyName}`, margin, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 8;
  }

  // Introduction
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gray);
  const intro = 'To get your pharmacy live in under 20 minutes, please have the following information ready before our onboarding session:';
  const introLines = doc.splitTextToSize(intro, pageWidth - margin * 2);
  doc.text(introLines, margin, yPos);
  yPos += introLines.length * 5 + 8;

  // Section 1: Branch Details
  yPos = checkPageBreak(doc, yPos, 50, margin);
  doc.setFillColor(...COLORS.lightGray);
  doc.rect(margin - 5, yPos - 4, pageWidth - margin * 2 + 10, 7, 'F');
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Branch Details', margin, yPos);
  yPos += 10;

  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const branchItems = [
    'List of all branch names',
    'Physical address for each branch',
    'Contact phone number for each branch',
    'Email address for each branch (optional)',
  ];

  branchItems.forEach((item) => {
    drawCheckbox(doc, margin, yPos - 3);
    doc.text(item, margin + 8, yPos);
    yPos += 6;
  });

  yPos += 6;

  // Section 2: Staff Information
  yPos = checkPageBreak(doc, yPos, 55, margin);
  doc.setFillColor(...COLORS.lightGray);
  doc.rect(margin - 5, yPos - 4, pageWidth - margin * 2 + 10, 7, 'F');
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Staff Information', margin, yPos);
  yPos += 10;

  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const staffItems = [
    'Names of Branch Managers (one per branch)',
    'Phone numbers for each Manager',
    'Names of Cashiers/Staff members',
    'Phone numbers for each Staff member',
    'Which staff should be assigned to which branch',
  ];

  staffItems.forEach((item) => {
    drawCheckbox(doc, margin, yPos - 3);
    doc.text(item, margin + 8, yPos);
    yPos += 6;
  });

  yPos += 6;

  // Section 3: Inventory Data
  yPos = checkPageBreak(doc, yPos, 65, margin);
  doc.setFillColor(...COLORS.lightGray);
  doc.rect(margin - 5, yPos - 4, pageWidth - margin * 2 + 10, 7, 'F');
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Inventory Data', margin, yPos);
  yPos += 10;

  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const inventoryItems = [
    'Current stock list in CSV or Excel format',
    'Required columns: Product Name, Category, Quantity',
    'Optional: Cost Price, Selling Price, Expiry Date, Batch Number',
    'Supplier information (name, contact) if available',
  ];

  inventoryItems.forEach((item) => {
    drawCheckbox(doc, margin, yPos - 3);
    doc.text(item, margin + 8, yPos);
    yPos += 6;
  });

  yPos += 4;
  
  // Alternative for clients without digital inventory
  doc.setFillColor(254, 249, 195); // Light yellow
  doc.roundedRect(margin - 2, yPos - 3, pageWidth - margin * 2 + 4, 18, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.text("📷 No digital file? No problem!", margin + 2, yPos + 2);
  doc.setFont('helvetica', 'normal');
  const altText = "Take clear photos of your supplier invoices - we can import stock directly from invoice images using our AI scanner.";
  const altLines = doc.splitTextToSize(altText, pageWidth - margin * 2 - 8);
  doc.text(altLines, margin + 2, yPos + 7);
  yPos += 22;

  // Section 4: Account Setup
  yPos = checkPageBreak(doc, yPos, 50, margin);
  doc.setFillColor(...COLORS.lightGray);
  doc.rect(margin - 5, yPos - 4, pageWidth - margin * 2 + 10, 7, 'F');
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('4. Account Setup', margin, yPos);
  yPos += 10;

  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const accountItems = [
    "Owner's email address (for Super Admin account)",
    'Pharmacy license/registration number',
    'Preferred admin PIN (4-6 digits) for sensitive operations',
    'Logo image file (PNG or JPG) for receipts - optional',
  ];

  accountItems.forEach((item) => {
    drawCheckbox(doc, margin, yPos - 3);
    doc.text(item, margin + 8, yPos);
    yPos += 6;
  });

  yPos += 8;

  // Helpful Tips Box
  yPos = checkPageBreak(doc, yPos, 40, margin);
  doc.setFillColor(240, 253, 244); // Light green
  doc.roundedRect(margin - 5, yPos - 4, pageWidth - margin * 2 + 10, 38, 2, 2, 'F');
  
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Pro Tips for a Smooth Onboarding', margin, yPos + 2);
  yPos += 8;

  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const tips = [
    '• Export your current inventory from your existing system if possible',
    '• Have all branch managers available during the setup call',
    '• Prepare a test product to verify barcode scanning works',
    '• Clear 30-45 minutes for the complete setup process',
  ];

  tips.forEach((tip) => {
    doc.text(tip, margin, yPos + 2);
    yPos += 5;
  });

  yPos += 12;

  // Pricing Summary
  yPos = checkPageBreak(doc, yPos, 35, margin);
  doc.setFillColor(...COLORS.dark);
  doc.roundedRect(margin - 5, yPos - 4, pageWidth - margin * 2 + 10, 28, 2, 2, 'F');
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Pricing Overview', margin, yPos + 2);
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Base Subscription (includes Main Branch): N35,000/month', margin, yPos);
  yPos += 5;
  doc.text('Additional Branch Fee: N15,000/month per branch', margin, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('7-Day Free Trial  •  No Credit Card Required', margin, yPos);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFillColor(...COLORS.lightGray);
  doc.rect(0, footerY - 5, pageWidth, 20, 'F');
  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Questions? Contact us at support@pharmatrack.com.ng', margin, footerY);
  doc.text('www.pharmatrack.com.ng', pageWidth - margin - 38, footerY);

  return doc;
};

export const downloadClientChecklistPdf = (pharmacyName?: string): void => {
  const doc = generateClientChecklistPdf(pharmacyName);
  const filename = pharmacyName 
    ? `PharmaTrack-Checklist-${pharmacyName.replace(/\s+/g, '-')}.pdf`
    : 'PharmaTrack-Client-Checklist.pdf';
  doc.save(filename);
};
