import jsPDF from 'jspdf';
import { format } from 'date-fns';
import type { Medication } from '@/types/medication';

// POS Receipt format for stock count sheet (80mm thermal paper)
export const generateStockCountSheet = (medications: Medication[]): jsPDF => {
  const receiptWidth = 80;
  const margin = 4;
  const lineHeight = 5;
  
  // Sort by category then name
  const sorted = [...medications].sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });
  
  // Calculate height: header + items + footer
  const itemsPerPage = sorted.length;
  const headerHeight = 35;
  const footerHeight = 20;
  const itemHeight = 6;
  const categoryHeaderHeight = 8;
  
  // Count unique categories for headers
  const categories = [...new Set(sorted.map(m => m.category))];
  const totalHeight = headerHeight + (itemsPerPage * itemHeight) + (categories.length * categoryHeaderHeight) + footerHeight + 20;
  
  const doc = new jsPDF({
    unit: 'mm',
    format: [receiptWidth, Math.max(totalHeight, 150)],
    orientation: 'portrait',
  });

  let y = 8;

  // Helper for centering text
  const centerText = (text: string, yPos: number, fontSize: number = 10) => {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (receiptWidth - textWidth) / 2, yPos);
  };

  // Helper for dashed line
  const drawDashedLine = (yPos: number) => {
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('-'.repeat(45), margin, yPos);
    doc.setTextColor(0);
  };

  // Header
  doc.setFont('helvetica', 'bold');
  centerText('STOCK COUNT SHEET', y, 12);
  y += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  centerText(format(new Date(), 'EEEE, dd MMMM yyyy'), y);
  y += 4;
  centerText(format(new Date(), 'HH:mm'), y);
  y += 6;
  
  drawDashedLine(y);
  y += 6;
  
  // Column headers
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('ITEM', margin, y);
  doc.text('SYS', margin + 50, y);
  doc.text('COUNT', margin + 60, y);
  y += 2;
  drawDashedLine(y);
  y += 5;

  // Items grouped by category
  let currentCategory = '';
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  sorted.forEach((med) => {
    // Category header
    if (med.category !== currentCategory) {
      currentCategory = med.category;
      y += 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(60);
      doc.text(`▸ ${currentCategory.toUpperCase()}`, margin, y);
      doc.setTextColor(0);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }
    
    // Truncate name if needed
    let itemName = med.name;
    const maxWidth = 45;
    while (doc.getTextWidth(itemName) > maxWidth && itemName.length > 0) {
      itemName = itemName.slice(0, -1);
    }
    if (itemName !== med.name) itemName += '..';
    
    // Item row
    doc.text(itemName, margin, y);
    doc.text(String(med.current_stock), margin + 50, y);
    
    // Empty count box
    doc.setDrawColor(150);
    doc.rect(margin + 59, y - 3, 12, 4);
    doc.setDrawColor(0);
    
    y += itemHeight;
  });
  
  y += 4;
  drawDashedLine(y);
  y += 6;
  
  // Footer
  doc.setFontSize(7);
  doc.setTextColor(80);
  centerText(`Total items: ${sorted.length}`, y);
  y += 4;
  centerText('Write counted qty in boxes', y);
  y += 3;
  centerText('Then import to system', y);
  doc.setTextColor(0);
  
  return doc;
};
