import jsPDF from 'jspdf';
import { CartItem } from '@/types/medication';
import { format } from 'date-fns';

type CurrencyCode = 'USD' | 'NGN' | 'GBP';

interface ReceiptData {
  items: CartItem[];
  total: number;
  customerName?: string;
  pharmacyName?: string;
  pharmacyAddress?: string;
  pharmacyPhone?: string;
  pharmacyLogoUrl?: string;
  receiptNumber: string;
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

export const generateReceipt = async ({
  items,
  total,
  customerName,
  pharmacyName = 'PharmaTrack Pharmacy',
  pharmacyAddress,
  pharmacyPhone,
  pharmacyLogoUrl,
  receiptNumber,
  date,
  currency = 'NGN',
}: ReceiptData): Promise<jsPDF> => {
  // Calculate dynamic height based on items
  const baseHeight = 140;
  const itemHeight = items.length * 12;
  const addressHeight = pharmacyAddress ? 8 : 0;
  const phoneHeight = pharmacyPhone ? 6 : 0;
  const customerHeight = customerName ? 6 : 0;
  const logoHeight = pharmacyLogoUrl ? 20 : 0;
  const totalHeight = baseHeight + itemHeight + addressHeight + phoneHeight + customerHeight + logoHeight;

  // Create PDF optimized for thermal printers (80mm width = ~226.77 points at 72 DPI)
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, Math.max(totalHeight, 120)],
    orientation: 'portrait',
  });

  const pageWidth = 80;
  const margin = 5;
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

  // ============ PHARMACY BRANDING HEADER ============
  // Add logo if available
  if (pharmacyLogoUrl) {
    try {
      const logoImg = await loadImage(pharmacyLogoUrl);
      const logoSize = 15; // 15mm square
      doc.addImage(logoImg, 'PNG', (pageWidth - logoSize) / 2, y, logoSize, logoSize);
      y += logoSize + 3;
    } catch (error) {
      console.error('Failed to load logo for receipt:', error);
    }
  }

  doc.setFont('helvetica', 'bold');
  centerText(pharmacyName.toUpperCase(), y, 14);
  y += 6;

  // Pharmacy address (if provided)
  if (pharmacyAddress) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const addressLines = doc.splitTextToSize(pharmacyAddress, pageWidth - (margin * 2));
    addressLines.forEach((line: string) => {
      centerText(line, y, 7);
      y += 3.5;
    });
    y += 2;
  }

  // Pharmacy phone (if provided)
  if (pharmacyPhone) {
    doc.setFont('helvetica', 'normal');
    centerText(`Tel: ${pharmacyPhone}`, y, 8);
    y += 5;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  centerText('Your Health, Our Priority', y);
  y += 6;

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
    rightText(formatCurrency(itemTotal, currency), y);
    y += 5;

    // Unit price on second line
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(`@ ${formatCurrency(price, currency)}`, margin, y);
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
  rightText(formatCurrency(total, currency), y);
  y += 8;

  // Footer
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  centerText('Thank you for your purchase!', y);
  y += 4;
  centerText('Get well soon. Visit us again!', y);
  y += 5;

  // Powered by branding
  doc.setFontSize(7);
  doc.setTextColor(120);
  centerText('Powered by PharmaTrack AI', y);
  doc.setTextColor(0);
  y += 6;

  // Barcode area (placeholder lines simulating barcode)
  doc.setDrawColor(50);
  doc.setLineWidth(0.5);
  const barcodeStart = margin + 10;
  for (let i = 0; i < 30; i++) {
    const width = (i % 3 === 0) ? 0.8 : 0.4;
    doc.setLineWidth(width);
    doc.line(barcodeStart + i * 2, y, barcodeStart + i * 2, y + 10);
  }

  return doc;
};

export const generateReceiptNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RX-${timestamp}-${random}`;
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
