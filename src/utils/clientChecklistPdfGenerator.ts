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

export const generateClientChecklistPdf = (pharmacyName?: string): jsPDF => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Header background
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Logo/Brand
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('PharmaTrack AI', margin, 28);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Installation Checklist', margin, 40);

  yPos = 65;

  // Personalized greeting if pharmacy name provided
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  if (pharmacyName) {
    doc.text(`Prepared for: ${pharmacyName}`, margin, yPos);
    yPos += 10;
  }

  // Introduction
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.gray);
  const intro = 'To get your branches live in under 20 minutes, please have the following information ready before our onboarding session:';
  const introLines = doc.splitTextToSize(intro, pageWidth - margin * 2);
  doc.text(introLines, margin, yPos);
  yPos += introLines.length * 6 + 10;

  // Section 1: Branch Details
  doc.setFillColor(...COLORS.lightGray);
  doc.rect(margin - 5, yPos - 5, pageWidth - margin * 2 + 10, 8, 'F');
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Branch Details', margin, yPos);
  yPos += 12;

  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const branchItems = [
    'List of all branch names',
    'Physical address for each branch (for receipt branding)',
    'Contact phone number for each branch',
    'Email address for each branch (optional)',
  ];

  branchItems.forEach((item) => {
    drawCheckbox(doc, margin, yPos - 4);
    doc.text(item, margin + 10, yPos);
    yPos += 8;
  });

  yPos += 8;

  // Section 2: Staff Information
  doc.setFillColor(...COLORS.lightGray);
  doc.rect(margin - 5, yPos - 5, pageWidth - margin * 2 + 10, 8, 'F');
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Staff Information', margin, yPos);
  yPos += 12;

  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const staffItems = [
    'Names of Branch Managers (one per branch)',
    'Phone numbers for each Manager',
    'Names of Cashiers/Staff members',
    'Phone numbers for each Staff member',
    'Which staff should be assigned to which branch',
  ];

  staffItems.forEach((item) => {
    drawCheckbox(doc, margin, yPos - 4);
    doc.text(item, margin + 10, yPos);
    yPos += 8;
  });

  yPos += 8;

  // Section 3: Inventory Data
  doc.setFillColor(...COLORS.lightGray);
  doc.rect(margin - 5, yPos - 5, pageWidth - margin * 2 + 10, 8, 'F');
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Inventory Data', margin, yPos);
  yPos += 12;

  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const inventoryItems = [
    'Current stock list in CSV or Excel format',
    'Required columns: Product Name, Category, Quantity',
    'Optional: Cost Price, Selling Price, Expiry Date, Batch Number',
    'Supplier information (name, contact) if available',
  ];

  inventoryItems.forEach((item) => {
    drawCheckbox(doc, margin, yPos - 4);
    doc.text(item, margin + 10, yPos);
    yPos += 8;
  });

  yPos += 8;

  // Section 4: Account Setup
  doc.setFillColor(...COLORS.lightGray);
  doc.rect(margin - 5, yPos - 5, pageWidth - margin * 2 + 10, 8, 'F');
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('4. Account Setup', margin, yPos);
  yPos += 12;

  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const accountItems = [
    'Owner\'s email address (for Super Admin account)',
    'Pharmacy license/registration number',
    'Preferred admin PIN (4-6 digits) for sensitive operations',
    'Logo image file (PNG or JPG) for receipts - optional',
  ];

  accountItems.forEach((item) => {
    drawCheckbox(doc, margin, yPos - 4);
    doc.text(item, margin + 10, yPos);
    yPos += 8;
  });

  yPos += 12;

  // Helpful Tips Box
  doc.setFillColor(240, 253, 244); // Light green
  doc.roundedRect(margin - 5, yPos - 5, pageWidth - margin * 2 + 10, 45, 3, 3, 'F');
  
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('💡 Pro Tips for a Smooth Onboarding', margin, yPos + 3);
  yPos += 10;

  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const tips = [
    '• Export your current inventory from your existing system if possible',
    '• Have all branch managers available during the setup call',
    '• Prepare a test product to verify barcode scanning works',
    '• Clear 30-45 minutes for the complete setup process',
  ];

  tips.forEach((tip) => {
    doc.text(tip, margin, yPos + 3);
    yPos += 6;
  });

  yPos += 20;

  // Pricing Summary
  doc.setFillColor(...COLORS.dark);
  doc.roundedRect(margin - 5, yPos - 5, pageWidth - margin * 2 + 10, 35, 3, 3, 'F');
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Pricing Overview', margin, yPos + 3);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Base Subscription (includes Main Branch): ₦35,000/month', margin, yPos + 3);
  yPos += 6;
  doc.text('Additional Branch Fee: ₦15,000/month per branch', margin, yPos + 3);
  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('14-Day Free Trial • No Credit Card Required', margin, yPos + 3);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Questions? Contact us at support@pharmatrack.app', margin, footerY);
  doc.text('www.pharmatrack.app', pageWidth - margin - 35, footerY);

  return doc;
};

export const downloadClientChecklistPdf = (pharmacyName?: string): void => {
  const doc = generateClientChecklistPdf(pharmacyName);
  const filename = pharmacyName 
    ? `PharmaTrack-Checklist-${pharmacyName.replace(/\s+/g, '-')}.pdf`
    : 'PharmaTrack-Client-Checklist.pdf';
  doc.save(filename);
};
