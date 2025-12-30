import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ensureNotoSansFonts } from './pdf/notoSansFonts';

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
  pharmacyLogoUrl?: string;
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
  const digits = currency === 'NGN' ? 0 : 2;
  return `${symbol}${amount.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
};

// Helper function to load image as base64
const loadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
};

// POS Receipt format (58mm thermal paper = ~48mm printable width for better compatibility)
export const generatePurchaseOrder = async ({
  orders,
  pharmacyName,
  pharmacyPhone,
  pharmacyLogoUrl,
  orderNumber,
  date,
  currency = 'NGN',
}: PurchaseOrderData): Promise<jsPDF> => {
  // 58mm thermal receipt paper (common POS width).
  // Many printers have ~48mm printable width, so we keep generous side margins.
  const receiptWidth = 58;
  const printableWidth = 48;
  const margin = (receiptWidth - printableWidth) / 2;
  const contentWidth = receiptWidth - margin * 2;
  
  // Calculate total height needed (dynamic based on content)
  let totalHeight = 0;
  orders.forEach(order => {
    totalHeight += 70 + (order.items.length * 10) + 35; // Header + items + footer
  });
  totalHeight = Math.max(totalHeight, 120);

  const doc = new jsPDF({
    unit: 'mm',
    format: [receiptWidth, totalHeight],
    orientation: 'portrait',
  });

  await ensureNotoSansFonts(doc);
  doc.setFont('NotoSans', 'normal');

  let y = 6;

  // Helper for centering text
  const centerText = (text: string, yPos: number, fontSize: number = 9) => {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (receiptWidth - textWidth) / 2, yPos);
  };

  // Helper for right-aligned text within content area
  const rightAlignText = (text: string, yPos: number) => {
    const textWidth = doc.getTextWidth(text);
    doc.text(text, receiptWidth - margin - textWidth, yPos);
  };

  // Helper for dashed line (auto-fit within printable width)
  const drawDashedLine = (yPos: number) => {
    doc.setFontSize(6);
    doc.setTextColor(100);
    const dashWidth = doc.getTextWidth('-');
    const dashCount = Math.max(1, Math.floor(contentWidth / Math.max(dashWidth, 0.1)));
    doc.text('-'.repeat(dashCount), margin, yPos);
    doc.setTextColor(0);
  };

  // Process each supplier order
  for (let orderIndex = 0; orderIndex < orders.length; orderIndex++) {
    const order = orders[orderIndex];
    if (orderIndex > 0) {
      y += 8;
      drawDashedLine(y);
      y += 6;
    }

    // Header - Add logo if available (smaller for thermal)
    if (pharmacyLogoUrl && orderIndex === 0) {
      try {
        const logoImg = await loadImage(pharmacyLogoUrl);
        const logoSize = 10; // Smaller logo for 58mm paper
        doc.addImage(logoImg, 'PNG', (receiptWidth - logoSize) / 2, y, logoSize, logoSize);
        y += logoSize + 2;
      } catch (error) {
        console.error('Failed to load logo for purchase order:', error);
      }
    }

    // Header - Pharmacy name (truncate if needed)
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(10);
    let displayName = pharmacyName.toUpperCase();
    while (doc.getTextWidth(displayName) > contentWidth && displayName.length > 0) {
      displayName = displayName.slice(0, -1);
    }
    if (displayName !== pharmacyName.toUpperCase()) displayName += '..';
    centerText(displayName, y, 10);
    y += 4;
    
    if (pharmacyPhone) {
      doc.setFont('NotoSans', 'normal');
      centerText(pharmacyPhone, y, 7);
      y += 3;
    }
    
    y += 2;
    drawDashedLine(y);
    y += 5;

    // Title
    doc.setFont('NotoSans', 'bold');
    centerText('PURCHASE ORDER', y, 9);
    y += 4;
    
    // Order number and date on separate lines for clarity
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(7);
    doc.text(`Order: ${orderNumber}-${orderIndex + 1}`, margin, y);
    y += 3;
    doc.text(`Date: ${format(date, 'dd/MM/yy HH:mm')}`, margin, y);
    y += 5;

    drawDashedLine(y);
    y += 5;

    // Supplier info
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(7);
    doc.text('SUPPLIER:', margin, y);
    y += 3;
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(8);
    
    // Truncate supplier name if needed
    let supplierDisplay = order.supplierName;
    while (doc.getTextWidth(supplierDisplay) > contentWidth && supplierDisplay.length > 0) {
      supplierDisplay = supplierDisplay.slice(0, -1);
    }
    if (supplierDisplay !== order.supplierName) supplierDisplay += '..';
    doc.text(supplierDisplay, margin, y);
    y += 3;
    
    if (order.supplierPhone) {
      doc.setFontSize(7);
      doc.text(`Tel: ${order.supplierPhone}`, margin, y);
      y += 3;
    }
    if (order.supplierAddress) {
      doc.setFontSize(6);
      const addressLines = doc.splitTextToSize(order.supplierAddress, contentWidth);
      doc.text(addressLines.slice(0, 2), margin, y); // Max 2 lines
      y += Math.min(addressLines.length, 2) * 2.5;
    }
    
    y += 2;
    drawDashedLine(y);
    y += 4;

    // Items header - simplified layout
    // Column positions tuned for ~48mm printable width.
    const colItem = margin;
    const colQty = margin + 29;

    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(7);
    doc.text('ITEM', colItem, y);
    doc.text('QTY', colQty, y);
    rightAlignText('PRICE', y);
    y += 4;

    // Items
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(7);
    
    order.items.forEach((item) => {
      // Item name (truncate to fit column)
      let itemName = item.medicationName;
      const maxItemWidth = colQty - colItem - 2;
      while (doc.getTextWidth(itemName + '..') > maxItemWidth && itemName.length > 0) {
        itemName = itemName.slice(0, -1);
      }
      if (itemName !== item.medicationName) itemName += '..';
      
      doc.text(itemName, colItem, y);
      doc.text(`x${item.quantity}`, colQty, y);
      
      const priceText = formatCurrency(item.totalPrice, currency);
      rightAlignText(priceText, y);
      y += 4;
    });

    y += 2;
    drawDashedLine(y);
    y += 4;

    // Total
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(9);
    doc.text('TOTAL:', margin, y);
    rightAlignText(formatCurrency(order.totalAmount, currency), y);
    y += 6;

    drawDashedLine(y);
    y += 4;

    // Footer notes
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(80);
    centerText('Please supply items listed above', y);
    y += 2.5;
    centerText('Thank you for your service', y);
    doc.setTextColor(0);
    y += 5;
  }

  // Final footer
  y += 2;
  doc.setFontSize(6);
  doc.setTextColor(100);
  centerText(`Generated: ${format(date, 'dd/MM/yyyy HH:mm')}`, y);
  
  return doc;
};

export const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `PO${timestamp}${random}`;
};
