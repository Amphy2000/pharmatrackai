import jsPDF from 'jspdf';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Medication } from '@/types/medication';

interface PharmacyInfo {
  name: string;
  address?: string | null;
  phone?: string | null;
  license_number?: string | null;
  pharmacist_in_charge?: string | null;
}

interface ReportOptions {
  regulatory: {
    abbreviation: string;
    name: string;
    licenseLabel: string;
  };
  filter: 'all' | 'expiring_soon' | 'controlled';
}

export const generateNAFDACComplianceReport = (
  medications: Medication[],
  pharmacy: PharmacyInfo,
  options: ReportOptions
): jsPDF => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  
  // Filter medications based on selected filter
  const filteredMeds = filterMedications(medications, options.filter);
  
  let y = 15;
  
  // === OFFICIAL HEADER ===
  // Top border
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  
  // Pharmacy Name (Official Header)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(pharmacy.name.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 6;
  
  // Address
  if (pharmacy.address) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(pharmacy.address, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }
  
  // Phone & License
  if (pharmacy.phone || pharmacy.license_number) {
    doc.setFontSize(8);
    const details = [
      pharmacy.phone ? `Tel: ${pharmacy.phone}` : '',
      pharmacy.license_number ? `License: ${pharmacy.license_number}` : ''
    ].filter(Boolean).join(' | ');
    doc.text(details, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }
  
  // Pharmacist in Charge
  if (pharmacy.pharmacist_in_charge) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`Pharmacist-in-Charge: ${pharmacy.pharmacist_in_charge}`, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }
  
  // Bottom border
  y += 2;
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;
  
  // === REPORT TITLE ===
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const reportTitle = getReportTitle(options.filter, options.regulatory.abbreviation);
  doc.text(reportTitle, pageWidth / 2, y, { align: 'center' });
  y += 6;
  
  // Generated timestamp
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${format(new Date(), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}`, pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  // === SUMMARY SECTION ===
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, contentWidth, 18, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, contentWidth, 18, 'S');
  
  const summaryStats = calculateSummaryStats(filteredMeds);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMARY', margin + 3, y + 5);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Items: ${filteredMeds.length}`, margin + 3, y + 11);
  doc.text(`Compliant: ${summaryStats.compliant}`, margin + 45, y + 11);
  doc.text(`Expired: ${summaryStats.expired}`, margin + 85, y + 11);
  doc.text(`Expiring (90 days): ${summaryStats.expiringSoon}`, margin + 120, y + 11);
  
  y += 25;
  
  // === TABLE ===
  const colWidths = [12, 48, 28, 28, 26, 26, 22];
  const headers = ['S/N', 'Product Name', 'Batch No', `${options.regulatory.abbreviation} Reg`, 'Mfg Date', 'Exp Date', 'Stock'];
  
  // Table Header
  doc.setFillColor(40, 40, 40);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  
  let x = margin + 2;
  headers.forEach((header, i) => {
    doc.text(header, x, y + 5.5);
    x += colWidths[i];
  });
  y += 10;
  doc.setTextColor(0, 0, 0);
  
  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  
  filteredMeds.forEach((med, index) => {
    // Page break if needed
    if (y > 265) {
      addFooter(doc, pageWidth, options.regulatory.abbreviation);
      doc.addPage();
      y = 20;
      
      // Re-add header on new page
      doc.setFillColor(40, 40, 40);
      doc.rect(margin, y, contentWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      x = margin + 2;
      headers.forEach((header, i) => {
        doc.text(header, x, y + 5.5);
        x += colWidths[i];
      });
      y += 10;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
    }
    
    const expiryDate = parseISO(med.expiry_date);
    const today = new Date();
    const daysUntilExpiry = differenceInDays(expiryDate, today);
    const isExpired = daysUntilExpiry < 0;
    const isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 90;
    
    // Row background based on status
    if (isExpired) {
      doc.setFillColor(255, 220, 220); // Light red
    } else if (isExpiringSoon) {
      doc.setFillColor(255, 245, 220); // Light amber
    } else if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(margin, y - 3, contentWidth, 7, 'F');
    
    // Draw row border
    doc.setDrawColor(230, 230, 230);
    doc.rect(margin, y - 3, contentWidth, 7, 'S');
    
    x = margin + 2;
    
    // S/N
    doc.text((index + 1).toString(), x, y);
    x += colWidths[0];
    
    // Product Name (with status indicator)
    let productName = med.name;
    if (productName.length > 24) productName = productName.substring(0, 24) + '...';
    
    // Add status marker
    if (isExpired) {
      doc.setTextColor(180, 0, 0);
      doc.text('●', x, y);
      doc.setTextColor(0, 0, 0);
      doc.text(productName, x + 3, y);
    } else if (isExpiringSoon) {
      doc.setTextColor(180, 120, 0);
      doc.text('●', x, y);
      doc.setTextColor(0, 0, 0);
      doc.text(productName, x + 3, y);
    } else {
      doc.text(productName, x, y);
    }
    x += colWidths[1];
    
    // Batch No
    doc.text(med.batch_number.slice(0, 14), x, y);
    x += colWidths[2];
    
    // NAFDAC Reg (use actual field if available)
    const nafdacReg = med.nafdac_reg_number || '-';
    doc.text(nafdacReg.slice(0, 12), x, y);
    x += colWidths[3];
    
    // Mfg Date (use actual manufacturing_date if available)
    if (med.manufacturing_date) {
      doc.text(format(parseISO(med.manufacturing_date), 'MM/yyyy'), x, y);
    } else {
      // Estimate as 2 years before expiry if not available
      const mfgDate = new Date(expiryDate);
      mfgDate.setFullYear(mfgDate.getFullYear() - 2);
      doc.text(format(mfgDate, 'MM/yyyy'), x, y);
    }
    x += colWidths[4];
    
    // Expiry Date
    doc.text(format(expiryDate, 'MM/yyyy'), x, y);
    x += colWidths[5];
    
    // Stock Level
    doc.text(med.current_stock.toString(), x, y);
    
    y += 7;
  });
  
  // === LEGEND ===
  y += 5;
  if (y > 270) {
    addFooter(doc, pageWidth, options.regulatory.abbreviation);
    doc.addPage();
    y = 20;
  }
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Status Legend:', margin, y);
  doc.setFont('helvetica', 'normal');
  
  doc.setTextColor(180, 0, 0);
  doc.text('● Expired', margin + 25, y);
  doc.setTextColor(180, 120, 0);
  doc.text('● Expiring within 90 days', margin + 50, y);
  doc.setTextColor(0, 0, 0);
  
  // === SIGNATURE SECTION ===
  y += 15;
  if (y > 255) {
    addFooter(doc, pageWidth, options.regulatory.abbreviation);
    doc.addPage();
    y = 20;
  }
  
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.2);
  
  // Left signature
  doc.line(margin, y + 10, margin + 60, y + 10);
  doc.setFontSize(7);
  doc.text('Prepared By', margin, y + 14);
  doc.text('Date: _______________', margin, y + 18);
  
  // Right signature
  doc.line(pageWidth - margin - 60, y + 10, pageWidth - margin, y + 10);
  doc.text('Verified By (Pharmacist-in-Charge)', pageWidth - margin - 60, y + 14);
  doc.text('Date: _______________', pageWidth - margin - 60, y + 18);
  
  // Footer
  addFooter(doc, pageWidth, options.regulatory.abbreviation);
  
  return doc;
};

const filterMedications = (medications: Medication[], filter: string): Medication[] => {
  const today = new Date();
  
  switch (filter) {
    case 'expiring_soon':
      return medications.filter(med => {
        const expiryDate = parseISO(med.expiry_date);
        const daysUntilExpiry = differenceInDays(expiryDate, today);
        return daysUntilExpiry >= 0 && daysUntilExpiry <= 90;
      });
    case 'controlled':
      // Filter using the is_controlled flag
      return medications.filter(med => med.is_controlled === true);
    default:
      return medications;
  }
};

const getReportTitle = (filter: string, abbreviation: string): string => {
  switch (filter) {
    case 'expiring_soon':
      return `${abbreviation} COMPLIANCE REPORT - EXPIRING INVENTORY`;
    case 'controlled':
      return `${abbreviation} CONTROLLED DRUGS REGISTER`;
    default:
      return `${abbreviation} COMPLIANCE REPORT - FULL INVENTORY`;
  }
};

const calculateSummaryStats = (medications: Medication[]) => {
  const today = new Date();
  let expired = 0;
  let expiringSoon = 0;
  
  medications.forEach(med => {
    const expiryDate = parseISO(med.expiry_date);
    const daysUntilExpiry = differenceInDays(expiryDate, today);
    
    if (daysUntilExpiry < 0) expired++;
    else if (daysUntilExpiry <= 90) expiringSoon++;
  });
  
  return {
    expired,
    expiringSoon,
    compliant: medications.length - expired - expiringSoon
  };
};

const addFooter = (doc: jsPDF, pageWidth: number, abbreviation: string) => {
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `This document is generated for ${abbreviation} inspection purposes. Retain for regulatory compliance records.`,
    pageWidth / 2,
    285,
    { align: 'center' }
  );
  doc.text(
    `Page ${doc.getNumberOfPages()}`,
    pageWidth / 2,
    290,
    { align: 'center' }
  );
  doc.setTextColor(0, 0, 0);
};
