import jsPDF from 'jspdf';
import { format } from 'date-fns';

type CurrencyCode = 'USD' | 'NGN' | 'GBP';

interface OrderItem {
  medicationName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface SupplierOrder {
  supplierName: string;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierAddress?: string;
  items: OrderItem[];
  totalAmount: number;
}

interface PurchaseOrderData {
  orders: SupplierOrder[];
  pharmacyName: string;
  pharmacyAddress?: string;
  pharmacyPhone?: string;
  pharmacyEmail?: string;
  orderNumber: string;
  date: Date;
  currency?: CurrencyCode;
}

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  NGN: '₦',
  GBP: '£',
};

const CURRENCY_LOCALES: Record<CurrencyCode, string> = {
  USD: 'en-US',
  NGN: 'en-NG',
  GBP: 'en-GB',
};

const formatCurrency = (amount: number, currency: CurrencyCode = 'NGN'): string => {
  const symbol = CURRENCY_SYMBOLS[currency];
  const locale = CURRENCY_LOCALES[currency];
  return `${symbol}${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const generatePurchaseOrder = ({
  orders,
  pharmacyName,
  pharmacyAddress,
  pharmacyPhone,
  pharmacyEmail,
  orderNumber,
  date,
  currency = 'NGN',
}: PurchaseOrderData): jsPDF => {
  // Create A4 PDF
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let currentPage = 0;

  const addNewPage = () => {
    if (currentPage > 0) {
      doc.addPage();
    }
    currentPage++;
    return 25; // Starting Y position for content
  };

  // Helper functions
  const drawLine = (y: number) => {
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
  };

  // Process each supplier order on a separate page
  orders.forEach((order, orderIndex) => {
    let y = addNewPage();

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(41, 128, 185);
    doc.text('PURCHASE ORDER', margin, y);
    
    // PO Number badge
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`PO-${orderNumber}-${orderIndex + 1}`, pageWidth - margin - 40, y);
    
    y += 15;
    drawLine(y);
    y += 10;

    // Two column layout for pharmacy and supplier info
    doc.setFontSize(9);
    doc.setTextColor(80);
    
    // FROM (Pharmacy) - Left column
    doc.setFont('helvetica', 'bold');
    doc.text('FROM:', margin, y);
    doc.setFont('helvetica', 'normal');
    y += 5;
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(pharmacyName, margin, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(80);
    if (pharmacyAddress) {
      doc.text(pharmacyAddress, margin, y);
      y += 4;
    }
    if (pharmacyPhone) {
      doc.text(`Tel: ${pharmacyPhone}`, margin, y);
      y += 4;
    }
    if (pharmacyEmail) {
      doc.text(`Email: ${pharmacyEmail}`, margin, y);
      y += 4;
    }
    
    // TO (Supplier) - Right column
    const rightCol = pageWidth / 2 + 10;
    let supplierY = y - (pharmacyAddress ? 13 : 9);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80);
    doc.text('TO:', rightCol, supplierY);
    doc.setFont('helvetica', 'normal');
    supplierY += 5;
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(order.supplierName, rightCol, supplierY);
    supplierY += 5;
    doc.setFontSize(9);
    doc.setTextColor(80);
    if (order.supplierAddress) {
      doc.text(order.supplierAddress, rightCol, supplierY);
      supplierY += 4;
    }
    if (order.supplierPhone) {
      doc.text(`Tel: ${order.supplierPhone}`, rightCol, supplierY);
      supplierY += 4;
    }
    if (order.supplierEmail) {
      doc.text(`Email: ${order.supplierEmail}`, rightCol, supplierY);
      supplierY += 4;
    }

    y = Math.max(y, supplierY) + 8;

    // Date
    doc.setTextColor(80);
    doc.setFontSize(9);
    doc.text(`Date: ${format(date, 'MMMM dd, yyyy')}`, margin, y);
    y += 8;
    
    drawLine(y);
    y += 8;

    // Table header
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, y - 4, contentWidth, 10, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(60);
    doc.text('#', margin + 3, y + 2);
    doc.text('ITEM DESCRIPTION', margin + 15, y + 2);
    doc.text('QTY', margin + 110, y + 2);
    doc.text('UNIT PRICE', margin + 130, y + 2);
    doc.text('TOTAL', margin + 160, y + 2);
    
    y += 12;
    drawLine(y);
    y += 6;

    // Items
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    
    order.items.forEach((item, index) => {
      // Check if we need a new page
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 25;
      }

      doc.setFontSize(10);
      doc.text(`${index + 1}`, margin + 3, y);
      
      // Truncate long item names
      let itemName = item.medicationName;
      doc.setFontSize(10);
      const maxNameWidth = 90;
      if (doc.getTextWidth(itemName) > maxNameWidth) {
        while (doc.getTextWidth(itemName + '...') > maxNameWidth && itemName.length > 0) {
          itemName = itemName.slice(0, -1);
        }
        itemName += '...';
      }
      doc.text(itemName, margin + 15, y);
      doc.text(`${item.quantity}`, margin + 110, y);
      doc.text(formatCurrency(item.unitPrice, currency), margin + 130, y);
      doc.text(formatCurrency(item.totalPrice, currency), margin + 160, y);
      
      y += 8;
    });

    y += 4;
    drawLine(y);
    y += 8;

    // Total section
    doc.setFillColor(41, 128, 185);
    doc.rect(margin + 120, y - 4, 60, 12, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255);
    doc.text('TOTAL:', margin + 125, y + 3);
    doc.text(formatCurrency(order.totalAmount, currency), margin + 155, y + 3);
    
    y += 20;

    // Notes section
    doc.setTextColor(80);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('Please supply the items listed above at your earliest convenience.', margin, y);
    y += 5;
    doc.text('For any queries, please contact us at the address above.', margin, y);
    
    // Footer
    y = pageHeight - 25;
    drawLine(y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Page ${orderIndex + 1} of ${orders.length}`, margin, y);
    doc.text(`Generated by PharmaTrack`, pageWidth - margin - 40, y);
    
    // Signature area
    y += 10;
    doc.setTextColor(80);
    doc.text('Authorized Signature: _____________________________', margin, y);
    doc.text(`Date: ${format(date, 'dd/MM/yyyy')}`, margin + 120, y);
  });

  return doc;
};

export const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${timestamp}${random}`;
};
