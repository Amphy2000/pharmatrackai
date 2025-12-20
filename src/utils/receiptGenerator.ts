import jsPDF from 'jspdf';
import { CartItem } from '@/types/medication';
import { format } from 'date-fns';

interface ReceiptData {
  items: CartItem[];
  total: number;
  customerName?: string;
  pharmacyName?: string;
  receiptNumber: string;
  date: Date;
}

export const generateReceipt = ({
  items,
  total,
  customerName,
  pharmacyName = 'PharmaTrack Pharmacy',
  receiptNumber,
  date,
}: ReceiptData): jsPDF => {
  // Create PDF optimized for thermal printers (80mm width = ~226.77 points at 72 DPI)
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 200], // 80mm width, variable height
    orientation: 'portrait',
  });

  const pageWidth = 80;
  const margin = 5;
  const contentWidth = pageWidth - margin * 2;
  let y = 10;

  // Helper function for centered text
  const centerText = (text: string, yPos: number, fontSize: number = 10) => {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, yPos);
  };

  // Helper function for right-aligned text
  const rightText = (text: string, yPos: number) => {
    const textWidth = doc.getTextWidth(text);
    doc.text(text, pageWidth - margin - textWidth, yPos);
  };

  // Header
  doc.setFont('helvetica', 'bold');
  centerText(pharmacyName, y, 14);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  centerText('Enterprise Inventory Management', y);
  y += 8;

  // Divider
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Receipt info
  doc.setFontSize(9);
  doc.text(`Receipt #: ${receiptNumber}`, margin, y);
  y += 4;
  doc.text(`Date: ${format(date, 'MMM dd, yyyy HH:mm')}`, margin, y);
  y += 4;
  if (customerName) {
    doc.text(`Customer: ${customerName}`, margin, y);
    y += 4;
  }
  y += 4;

  // Divider
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Column headers
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Item', margin, y);
  doc.text('Qty', 45, y);
  rightText('Amount', y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Items
  items.forEach((item) => {
    const price = item.medication.selling_price || item.medication.unit_price;
    const itemTotal = price * item.quantity;

    // Item name (may need to truncate)
    let itemName = item.medication.name;
    doc.setFontSize(8);
    if (doc.getTextWidth(itemName) > 35) {
      while (doc.getTextWidth(itemName + '...') > 35 && itemName.length > 0) {
        itemName = itemName.slice(0, -1);
      }
      itemName += '...';
    }

    doc.text(itemName, margin, y);
    doc.text(`x${item.quantity}`, 45, y);
    rightText(`₦${itemTotal.toLocaleString()}`, y);
    y += 5;

    // Unit price on second line
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(`@ ₦${price.toLocaleString()}`, margin, y);
    doc.setTextColor(0);
    y += 5;
  });

  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL:', margin, y);
  rightText(`₦${total.toLocaleString()}`, y);
  y += 8;

  // Footer
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  centerText('Thank you for your purchase!', y);
  y += 4;
  centerText('Powered by PharmaTrack AI', y);
  y += 6;

  // Barcode area (placeholder line)
  doc.setDrawColor(150);
  doc.setLineWidth(0.5);
  for (let i = 0; i < 30; i++) {
    const barWidth = Math.random() > 0.5 ? 1 : 0.5;
    doc.line(
      margin + 10 + i * 2,
      y,
      margin + 10 + i * 2,
      y + 10
    );
  }

  return doc;
};

export const generateReceiptNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RX-${timestamp}-${random}`;
};
