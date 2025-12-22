import jsPDF from 'jspdf';
import { CartItem } from '@/types/medication';
import { format } from 'date-fns';

type CurrencyCode = 'USD' | 'NGN' | 'GBP';
type PaymentStatus = 'paid' | 'unpaid';
export type PaymentMethod = 'cash' | 'transfer' | 'pos' | '';

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
  paymentMethod?: PaymentMethod;
  enableLogoOnPrint?: boolean;
  isDigitalReceipt?: boolean;
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
  // Thermal receipts are typically whole numbers; keep it simple and consistent.
  return `${symbol}${amount.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const ensureReceiptFonts = async (doc: jsPDF) => {
  const anyDoc = doc as any;
  if (anyDoc.__receiptFontsLoaded) return;

  // Load fonts from /public/fonts to ensure ₦ renders correctly across browsers/PDF viewers.
  const [regularRes, boldRes] = await Promise.all([
    fetch('/fonts/NotoSans-Regular.ttf'),
    fetch('/fonts/NotoSans-Bold.ttf'),
  ]);

  if (!regularRes.ok || !boldRes.ok) {
    // Fallback to built-in fonts if fonts fail to load.
    return;
  }

  const [regularBuf, boldBuf] = await Promise.all([
    regularRes.arrayBuffer(),
    boldRes.arrayBuffer(),
  ]);

  const regularB64 = arrayBufferToBase64(regularBuf);
  const boldB64 = arrayBufferToBase64(boldBuf);

  doc.addFileToVFS('NotoSans-Regular.ttf', regularB64);
  doc.addFileToVFS('NotoSans-Bold.ttf', boldB64);
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');

  anyDoc.__receiptFontsLoaded = true;
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
  paymentMethod,
  enableLogoOnPrint = true,
  isDigitalReceipt = false,
}: ReceiptData): Promise<jsPDF> => {
  // Calculate dynamic height based on items
  const baseHeight = 115; // slight bump for payment method line
  const itemHeight = items.length * 7;
  const addressHeight = pharmacyAddress ? 8 : 0;
  const phoneHeight = pharmacyPhone ? 5 : 0;
  const customerHeight = customerName ? 5 : 0;
  const pharmacistHeight = pharmacistInCharge ? 5 : 0;
  const staffHeight = staffName ? 5 : 0;
  const paymentMethodHeight = paymentMethod ? 5 : 0;

  const shouldShowLogo = isDigitalReceipt || (enableLogoOnPrint && pharmacyLogoUrl);
  const logoHeight = shouldShowLogo ? 16 : 0;

  const totalHeight =
    baseHeight +
    itemHeight +
    addressHeight +
    phoneHeight +
    customerHeight +
    logoHeight +
    pharmacistHeight +
    staffHeight +
    paymentMethodHeight;

  // Create PDF optimized for thermal printers (80mm width)
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, Math.max(totalHeight, 100)],
    orientation: 'portrait',
  });

  await ensureReceiptFonts(doc);

  const pageWidth = 80;
  const margin = 4;
  let y = 6;

  // Helper functions
  const centerText = (text: string, yPos: number, fontSize: number = 10) => {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, yPos);
  };

  const rightText = (text: string, yPos: number) => {
    const textWidth = doc.getTextWidth(text);
    doc.text(text, pageWidth - margin - textWidth, yPos);
  };

  // Prefer custom font (for ₦). If not loaded, jsPDF will silently use a default font.
  doc.setFont('NotoSans', 'normal');

  // ============ HEADER ============
  if (shouldShowLogo && pharmacyLogoUrl) {
    try {
      const logoImg = await loadImage(pharmacyLogoUrl);
      const logoSize = 12;
      doc.addImage(logoImg, 'PNG', (pageWidth - logoSize) / 2, y, logoSize, logoSize);
      y += logoSize + 2;
    } catch (error) {
      console.error('Failed to load logo:', error);
    }
  }

  // Pharmacy Name
  doc.setFont('NotoSans', 'bold');
  centerText(pharmacyName.toUpperCase(), y, 11);
  y += 5;

  // Address
  if (pharmacyAddress) {
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(7);
    const addressLines = doc.splitTextToSize(pharmacyAddress, pageWidth - margin * 2);
    addressLines.forEach((line: string) => {
      centerText(line, y, 7);
      y += 3;
    });
  }

  // Phone
  if (pharmacyPhone) {
    doc.setFont('NotoSans', 'normal');
    centerText(`Tel: ${pharmacyPhone}`, y, 7);
    y += 4;
  }

  y += 2;

  // Divider
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Receipt info row
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(7);
  doc.text(`#${receiptNumber}`, margin, y);
  doc.setFont('NotoSans', 'normal');
  rightText(format(date, 'dd/MM/yy HH:mm'), y);
  y += 4;

  if (customerName) {
    doc.text(`Customer: ${customerName}`, margin, y);
    y += 4;
  }

  // Payment Status
  const statusText = paymentStatus === 'paid' ? 'PAID' : 'UNPAID';
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(9);
  if (paymentStatus === 'paid') {
    doc.setTextColor(0, 128, 0);
  } else {
    doc.setTextColor(220, 20, 60);
  }
  centerText(`[ ${statusText} ]`, y);
  doc.setTextColor(0);
  y += 6;

  // ============ TABLE HEADER ============
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Column positions
  const colSN = margin;
  const colItem = margin + 7;
  const colQty = 44;
  const colPrice = 54;
  const colTotal = pageWidth - margin;

  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(7);
  doc.text('S/N', colSN, y);
  doc.text('Item', colItem, y);
  doc.text('Qty', colQty, y);
  doc.text('Price', colPrice, y);
  rightText('Total', y);
  y += 3;

  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  // ============ TABLE ROWS ============
  doc.setFont('NotoSans', 'normal');

  items.forEach((item, index) => {
    const price = item.medication.selling_price || item.medication.unit_price;
    const itemTotal = price * item.quantity;

    // Truncate item name if needed
    let itemName = item.medication.name;
    doc.setFontSize(7);
    const maxItemWidth = colQty - colItem - 2;
    if (doc.getTextWidth(itemName) > maxItemWidth) {
      while (doc.getTextWidth(itemName + '..') > maxItemWidth && itemName.length > 0) {
        itemName = itemName.slice(0, -1);
      }
      itemName += '..';
    }

    // S/N
    doc.text(`${index + 1}`, colSN, y);
    // Item
    doc.text(itemName, colItem, y);
    // Qty
    doc.text(`${item.quantity}`, colQty, y);
    // Price
    doc.text(formatCurrency(price, currency), colPrice, y);
    // Total
    rightText(formatCurrency(itemTotal, currency), y);

    y += 5;
  });

  // ============ TOTAL ============
  y += 1;
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(10);
  doc.text('Total:', margin, y);
  rightText(formatCurrency(total, currency), y);
  y += 6;

  // Payment Method (if provided)
  if (paymentMethod) {
    const methodLabel: Record<string, string> = {
      cash: 'Cash',
      transfer: 'Bank Transfer',
      pos: 'POS',
    };
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(7);
    centerText(`Payment: ${methodLabel[paymentMethod] || paymentMethod.toUpperCase()}`, y);
    y += 5;
  }

  // ============ FOOTER ============
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(7);
  centerText('Thank you for your purchase!', y);
  y += 3;
  centerText('Get well soon. Visit us again!', y);
  y += 4;

  if (staffName) {
    doc.setFontSize(6);
    doc.setTextColor(80);
    centerText(`Served by: ${staffName}`, y);
    doc.setTextColor(0);
    y += 3;
  }

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

const loadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    fetch(url, { mode: 'cors' })
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch image');
        return response.blob();
      })
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image blob'));
        reader.readAsDataURL(blob);
      })
      .catch(() => {
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
