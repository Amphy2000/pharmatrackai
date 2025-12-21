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
  supplierAddress?: string;
  items: OrderItem[];
  totalAmount: number;
}

interface PurchaseOrderData {
  orders: SupplierOrder[];
  pharmacyName: string;
  pharmacyPhone?: string;
  orderNumber: string;
  date: Date;
  currency?: CurrencyCode;
}

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  NGN: '₦',
  GBP: '£',
};

const formatCurrency = (amount: number, currency: CurrencyCode = 'NGN'): string => {
  const symbol = CURRENCY_SYMBOLS[currency];
  return `${symbol}${amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// POS Receipt format (80mm thermal paper = ~72mm printable width)
export const generatePurchaseOrder = ({
  orders,
  pharmacyName,
  pharmacyPhone,
  orderNumber,
  date,
  currency = 'NGN',
}: PurchaseOrderData): jsPDF => {
  // 80mm thermal receipt paper (standard POS width)
  const receiptWidth = 80;
  const margin = 4;
  const contentWidth = receiptWidth - (margin * 2);
  
  // Calculate total height needed (dynamic based on content)
  let totalHeight = 0;
  orders.forEach(order => {
    totalHeight += 60 + (order.items.length * 12) + 30; // Header + items + footer
  });
  totalHeight = Math.max(totalHeight, 100);

  const doc = new jsPDF({
    unit: 'mm',
    format: [receiptWidth, totalHeight],
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

  // Process each supplier order
  orders.forEach((order, orderIndex) => {
    if (orderIndex > 0) {
      y += 10;
      drawDashedLine(y);
      y += 8;
    }

    // Header - Pharmacy name
    doc.setFont('helvetica', 'bold');
    centerText(pharmacyName.toUpperCase(), y, 12);
    y += 5;
    
    if (pharmacyPhone) {
      doc.setFont('helvetica', 'normal');
      centerText(pharmacyPhone, y, 8);
      y += 4;
    }
    
    y += 2;
    drawDashedLine(y);
    y += 6;

    // Title
    doc.setFont('helvetica', 'bold');
    centerText('PURCHASE ORDER', y, 11);
    y += 5;
    
    // Order number and date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Order: ${orderNumber}-${orderIndex + 1}`, margin, y);
    doc.text(format(date, 'dd/MM/yy HH:mm'), receiptWidth - margin - 25, y);
    y += 6;

    drawDashedLine(y);
    y += 6;

    // Supplier info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('SUPPLIER:', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(order.supplierName, margin, y);
    y += 4;
    
    if (order.supplierPhone) {
      doc.setFontSize(8);
      doc.text(`Tel: ${order.supplierPhone}`, margin, y);
      y += 4;
    }
    if (order.supplierAddress) {
      doc.setFontSize(8);
      const addressLines = doc.splitTextToSize(order.supplierAddress, contentWidth);
      doc.text(addressLines, margin, y);
      y += addressLines.length * 3.5;
    }
    
    y += 2;
    drawDashedLine(y);
    y += 6;

    // Items header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('ITEM', margin, y);
    doc.text('QTY', margin + 45, y);
    doc.text('PRICE', margin + 55, y);
    y += 5;

    // Items
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    order.items.forEach((item) => {
      // Item name (truncate if needed)
      let itemName = item.medicationName;
      const maxWidth = 42;
      while (doc.getTextWidth(itemName) > maxWidth && itemName.length > 0) {
        itemName = itemName.slice(0, -1);
      }
      if (itemName !== item.medicationName) itemName += '..';
      
      doc.text(itemName, margin, y);
      doc.text(`x${item.quantity}`, margin + 45, y);
      doc.text(formatCurrency(item.totalPrice, currency), margin + 55, y);
      y += 5;
    });

    y += 2;
    drawDashedLine(y);
    y += 6;

    // Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TOTAL:', margin, y);
    doc.text(formatCurrency(order.totalAmount, currency), receiptWidth - margin - doc.getTextWidth(formatCurrency(order.totalAmount, currency)), y);
    y += 8;

    drawDashedLine(y);
    y += 6;

    // Footer notes
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(80);
    centerText('Please supply items listed above', y);
    y += 3;
    centerText('Thank you for your service', y);
    doc.setTextColor(0);
    y += 6;
  });

  // Final footer
  y += 2;
  doc.setFontSize(7);
  doc.setTextColor(100);
  centerText(`Generated: ${format(date, 'dd/MM/yyyy HH:mm')}`, y);
  
  return doc;
};

export const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `PO${timestamp}${random}`;
};
