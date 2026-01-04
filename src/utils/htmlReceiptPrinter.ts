import JsBarcode from 'jsbarcode';
import { CartItem } from '@/types/medication';
import { format } from 'date-fns';

type CurrencyCode = 'USD' | 'NGN' | 'GBP';
type PaymentStatus = 'paid' | 'unpaid';
export type PaymentMethod = 'cash' | 'transfer' | 'pos' | '';

interface ReceiptData {
  items: CartItem[];
  total: number;
  pharmacyName?: string;
  pharmacyAddress?: string;
  pharmacyPhone?: string;
  pharmacyLogoUrl?: string;
  staffName?: string;
  receiptNumber: string;
  shortCode?: string;
  barcode?: string;
  date: Date;
  currency?: CurrencyCode;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  // FEFO batch notes for multi-batch sales
  batchNotes?: string[];
}

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  NGN: '₦',
  GBP: '£',
};

const formatCurrency = (amount: number, currency: CurrencyCode = 'NGN'): string => {
  const symbol = CURRENCY_SYMBOLS[currency];
  return `${symbol}${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// HTML escape function to prevent XSS
const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const generateShortCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'PH-';
  for (let i = 0; i < 3; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const generateBarcode = (): string => {
  return Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 8).toUpperCase();
};

const generateBarcodeDataUrl = (value: string): string => {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, value, {
      format: 'CODE128',
      width: 2,
      height: 40,
      displayValue: false,
      margin: 5,
      background: '#ffffff',
      lineColor: '#000000',
    });
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Barcode generation error:', error);
    return '';
  }
};

export const generateHtmlReceipt = ({
  items,
  total,
  pharmacyName = 'PharmaTrack Pharmacy',
  pharmacyAddress,
  pharmacyPhone,
  pharmacyLogoUrl,
  staffName,
  receiptNumber,
  shortCode,
  barcode,
  date,
  currency = 'NGN',
  paymentStatus = 'paid',
  paymentMethod,
  batchNotes = [],
}: ReceiptData): string => {
  const statusColor = paymentStatus === 'paid' ? '#22c55e' : '#f59e0b';
  const statusText = paymentStatus === 'paid' ? 'PAID' : 'UNPAID';
  const barcodeValue = shortCode || barcode || receiptNumber;
  const barcodeDataUrl = generateBarcodeDataUrl(barcodeValue);

  // Escape dynamic values to prevent XSS
  const safePharmacyName = escapeHtml(pharmacyName);
  const safePharmacyAddress = pharmacyAddress ? escapeHtml(pharmacyAddress) : '';
  const safePharmacyPhone = pharmacyPhone ? escapeHtml(pharmacyPhone) : '';
  const safeStaffName = staffName ? escapeHtml(staffName) : '';
  const safeReceiptNumber = escapeHtml(receiptNumber);
  const safeShortCode = shortCode ? escapeHtml(shortCode) : '';
  
  const itemsHtml = items.map((item, index) => {
    const price = item.medication.selling_price || item.medication.unit_price;
    const itemTotal = price * item.quantity;
    const safeMedicationName = escapeHtml(item.medication.name);
    const safeUnitLabel = item.medication.dispensing_unit && item.medication.dispensing_unit !== 'unit' 
      ? ` (${escapeHtml(item.medication.dispensing_unit)})` 
      : '';

    return `
      <tr>
        <td style="padding: 4px 0; border-bottom: 1px dashed #ddd;">${index + 1}</td>
        <td style="padding: 4px 0; border-bottom: 1px dashed #ddd;">${safeMedicationName}${safeUnitLabel}</td>
        <td style="padding: 4px 0; border-bottom: 1px dashed #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 4px 0; border-bottom: 1px dashed #ddd; text-align: right;">${formatCurrency(price, currency)}</td>
        <td style="padding: 4px 0; border-bottom: 1px dashed #ddd; text-align: right;">${formatCurrency(itemTotal, currency)}</td>
      </tr>
    `;
  }).join('');

  const paymentMethodText = paymentMethod ? {
    cash: 'Cash',
    transfer: 'Bank Transfer',
    pos: 'POS',
  }[paymentMethod] : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${safeReceiptNumber}</title>
  <style>
    @media print {
      @page { margin: 0; size: 80mm auto; }
      body { margin: 0; }
    }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      width: 80mm;
      margin: 0 auto;
      padding: 8px;
      box-sizing: border-box;
    }
    .header { text-align: center; margin-bottom: 10px; }
    .logo { max-width: 50px; max-height: 50px; margin-bottom: 5px; }
    .pharmacy-name { font-size: 14px; font-weight: bold; margin: 5px 0; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .barcode-section {
      text-align: center;
      padding: 8px 0;
      margin: 8px 0;
      background: #f9f9f9;
      border-radius: 4px;
    }
    .barcode-img { max-width: 100%; height: auto; }
    .status { 
      text-align: center; 
      font-weight: bold; 
      font-size: 14px; 
      padding: 5px 10px; 
      margin: 5px auto;
      display: inline-block;
      color: white;
      background: ${statusColor};
      border-radius: 4px;
    }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { text-align: left; padding: 4px 0; border-bottom: 1px solid #000; }
    .total-row { font-size: 14px; font-weight: bold; }
    .footer { text-align: center; margin-top: 10px; font-size: 10px; }
    .short-code { 
      font-size: 20px; 
      font-weight: bold; 
      text-align: center; 
      letter-spacing: 2px;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="header">
    ${pharmacyLogoUrl ? `<img src="${pharmacyLogoUrl}" class="logo" alt="Logo">` : ''}
    <div class="pharmacy-name">${safePharmacyName.toUpperCase()}</div>
    ${safePharmacyAddress ? `<div style="font-size: 10px;">${safePharmacyAddress}</div>` : ''}
    ${safePharmacyPhone ? `<div style="font-size: 10px;">Tel: ${safePharmacyPhone}</div>` : ''}
  </div>

  <div class="divider"></div>

  <div style="display: flex; justify-content: space-between; font-size: 11px;">
    <span>#${safeReceiptNumber}</span>
    <span>${format(date, 'dd/MM/yy HH:mm')}</span>
  </div>

  <div class="barcode-section">
    ${barcodeDataUrl ? `<img src="${barcodeDataUrl}" class="barcode-img" alt="Barcode">` : ''}
    ${safeShortCode ? `<div class="short-code">${safeShortCode}</div>` : ''}
    <div class="status">${statusText}</div>
  </div>

  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th>S/N</th>
        <th>Item</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Price</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="total-row" style="display: flex; justify-content: space-between;">
    <span>TOTAL:</span>
    <span>${formatCurrency(total, currency)}</span>
  </div>

  ${paymentMethodText ? `<div style="text-align: center; margin-top: 5px;">Payment: ${paymentMethodText}</div>` : ''}

  ${batchNotes.length > 0 ? `
  <div style="text-align: center; margin-top: 8px; padding: 6px; background: #f0f9ff; border-radius: 4px; font-size: 9px; color: #666;">
    <div style="font-weight: bold; margin-bottom: 3px;">📦 Batch Info (FEFO)</div>
    ${batchNotes.map(note => `<div>${escapeHtml(note)}</div>`).join('')}
  </div>
  ` : ''}

  ${paymentStatus === 'unpaid' ? `
  <div style="text-align: center; margin-top: 10px; padding: 8px; background: #fff3cd; border-radius: 4px; font-weight: bold;">
    Please proceed to cashier for payment
  </div>
  ` : `
  <div class="barcode-section" style="margin-top: 10px;">
    ${barcodeDataUrl ? `<img src="${barcodeDataUrl}" class="barcode-img" alt="Barcode">` : ''}
    ${safeShortCode ? `<div style="font-size: 12px; font-weight: bold; margin-top: 3px;">${safeShortCode}</div>` : ''}
    <div style="font-size: 9px; color: #666; margin-top: 5px;">Official Transaction Record - pharmatrack.com.ng</div>
  </div>
  `}

  <div class="divider"></div>

  <div class="footer">
    <div>Thank you for your purchase!</div>
    <div>Get well soon. Visit us again!</div>
    ${safeStaffName ? `<div style="margin-top: 5px;">Served by: ${safeStaffName}</div>` : ''}
    <div style="margin-top: 5px; color: #888;">Powered by pharmatrack.com.ng</div>
  </div>
</body>
</html>
  `;
};

export const printHtmlReceipt = (html: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: none; visibility: hidden;';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      reject(new Error('Failed to create print document'));
      return;
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Wait for content and images to load
    setTimeout(() => {
      try {
        const iframeWindow = iframe.contentWindow;
        if (!iframeWindow) {
          throw new Error('No iframe window');
        }

        iframeWindow.focus();
        iframeWindow.print();
        
        const cleanup = () => {
          try {
            document.body.removeChild(iframe);
          } catch {
            // Already removed
          }
          resolve();
        };

        // Use afterprint event for Edge browser compatibility
        if ('onafterprint' in iframeWindow) {
          iframeWindow.onafterprint = cleanup;
          setTimeout(cleanup, 30000);
        } else {
          setTimeout(cleanup, 3000);
        }
      } catch (error) {
        document.body.removeChild(iframe);
        reject(error);
      }
    }, 300);
  });
};
