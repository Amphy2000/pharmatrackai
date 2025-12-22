import jsPDF from 'jspdf';
import { CartItem } from '@/types/medication';
import { format } from 'date-fns';

type CurrencyCode = 'USD' | 'NGN' | 'GBP';
type PaymentStatus = 'paid' | 'unpaid';

interface ReceiptData {
  items: CartItem[];
  total: number;
  customerName?: string;
  pharmacyName?: string;
  pharmacyAddress?: string;
  pharmacyPhone?: string;
  pharmacyLogoUrl?: string;
  pharmacistInCharge?: string;
  staffName?: string;
  receiptNumber: string;
  date: Date;
  currency?: CurrencyCode;
  paymentStatus?: PaymentStatus;
  enableLogoOnPrint?: boolean;
  isDigitalReceipt?: boolean; // For WhatsApp/PDF - always shows logo
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
  pharmacistInCharge,
  staffName,
  receiptNumber,
  date,
  currency = 'NGN',
  paymentStatus = 'paid',
  enableLogoOnPrint = true,
  isDigitalReceipt = false,
}: ReceiptData): Promise<jsPDF> => {
  // Calculate dynamic height based on items - optimized for paper saving
  const baseHeight = 100;
  const itemHeight = items.length * 8; // Reduced from 12
  const addressHeight = pharmacyAddress ? 6 : 0;
  const phoneHeight = pharmacyPhone ? 4 : 0;
  const customerHeight = customerName ? 4 : 0;
  const pharmacistHeight = pharmacistInCharge ? 4 : 0;
  const staffHeight = staffName ? 4 : 0;
  
  // Only add logo height if we're showing it
  const shouldShowLogo = isDigitalReceipt || (enableLogoOnPrint && pharmacyLogoUrl);
  const logoHeight = shouldShowLogo ? 16 : 0;
  
  const totalHeight = baseHeight + itemHeight + addressHeight + phoneHeight + customerHeight + logoHeight + pharmacistHeight + staffHeight;

  // Create PDF optimized for thermal printers (80mm width)
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, Math.max(totalHeight, 90)],
    orientation: 'portrait',
  });

  const pageWidth = 80;
  const margin = 4;
  let y = 6;

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
  // Add logo if enabled and available (digital receipts always show logo)
  if (shouldShowLogo && pharmacyLogoUrl) {
    try {
      const logoImg = await loadImage(pharmacyLogoUrl);
      const logoSize = 12;
      doc.addImage(logoImg, 'PNG', (pageWidth - logoSize) / 2, y, logoSize, logoSize);
      y += logoSize + 2;
    } catch (error) {
      console.error('Failed to load logo for receipt:', error);
      // Fall back to text header
    }
  }

  // Pharmacy Name (Bold H1 style)
  doc.setFont('helvetica', 'bold');
  centerText(pharmacyName.toUpperCase(), y, 12);
  y += 5;

  // Pharmacy address
  if (pharmacyAddress) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const addressLines = doc.splitTextToSize(pharmacyAddress, pageWidth - (margin * 2));
    addressLines.forEach((line: string) => {
      centerText(line, y, 7);
      y += 3;
    });
  }

  // Pharmacy phone
  if (pharmacyPhone) {
    doc.setFont('helvetica', 'normal');
    centerText(`Tel: ${pharmacyPhone}`, y, 7);
    y += 3;
  }

  // Pharmacist in Charge (optional)
  if (pharmacistInCharge) {
    doc.setFont('helvetica', 'italic');
    centerText(`Pharmacist: ${pharmacistInCharge}`, y, 7);
    y += 3;
  }

  y += 2;

  // Thin divider
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Receipt info - compact layout
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`#${receiptNumber}`, margin, y);
  rightText(format(date, 'dd/MM/yy HH:mm'), y);
  y += 3;

  if (customerName) {
    doc.text(`Customer: ${customerName}`, margin, y);
    y += 3;
  }

  // Payment Status Badge
  const statusText = paymentStatus === 'paid' ? 'PAID' : 'UNPAID';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  if (paymentStatus === 'paid') {
    doc.setTextColor(34, 139, 34); // Green
  } else {
    doc.setTextColor(220, 20, 60); // Red
  }
  centerText(`[ ${statusText} ]`, y);
  doc.setTextColor(0);
  y += 5;

  // Divider before items
  doc.setDrawColor(180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  // Column headers - compact
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Item', margin, y);
  doc.text('Qty', 48, y);
  rightText('Amt', y);
  y += 3;

  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  // Items - compact format
  items.forEach((item) => {
    const price = item.medication.selling_price || item.medication.unit_price;
    const itemTotal = price * item.quantity;

    // Item name (truncate if needed)
    let itemName = item.medication.name;
    doc.setFontSize(7);
    if (doc.getTextWidth(itemName) > 40) {
      while (doc.getTextWidth(itemName + '..') > 40 && itemName.length > 0) {
        itemName = itemName.slice(0, -1);
      }
      itemName += '..';
    }

    doc.text(itemName, margin, y);
    doc.text(`x${item.quantity}`, 48, y);
    rightText(formatCurrency(itemTotal, currency), y);
    y += 4;

    // Unit price on same line (smaller)
    doc.setFontSize(6);
    doc.setTextColor(100);
    doc.text(`@${formatCurrency(price, currency)}`, margin, y);
    doc.setTextColor(0);
    y += 4;
  });

  // Total section
  doc.setDrawColor(180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL:', margin, y);
  rightText(formatCurrency(total, currency), y);
  y += 6;

  // Footer
  doc.setDrawColor(180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  centerText('Thank you for your purchase!', y);
  y += 3;
  centerText('Get well soon. Visit us again!', y);
  y += 4;

  // Staff name at footer
  if (staffName) {
    doc.setFontSize(6);
    doc.setTextColor(80);
    centerText(`Served by: ${staffName}`, y);
    doc.setTextColor(0);
    y += 3;
  }

  // Powered by branding
  doc.setFontSize(6);
  doc.setTextColor(120);
  centerText('Powered by PharmaTrack AI', y);
  doc.setTextColor(0);

  return doc;
};

export const generateReceiptNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RX-${timestamp}-${random}`;
};

export const generateInvoiceNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${timestamp}-${random}`;
};

// Helper function to load image as base64
const loadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Use fetch to handle CORS properly for Supabase storage URLs
    fetch(url, { mode: 'cors' })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch image');
        }
        return response.blob();
      })
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = () => reject(new Error('Failed to read image blob'));
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        // Fallback to Image approach if fetch fails
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
  });
};
