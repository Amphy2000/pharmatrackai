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
}: ReceiptData): string => {
  const statusColor = paymentStatus === 'paid' ? '#22c55e' : '#dc2626';
  const statusText = paymentStatus === 'paid' ? 'PAID' : 'UNPAID - PAY AT CASHIER';

  const itemsHtml = items.map((item, index) => {
    const price = item.medication.selling_price || item.medication.unit_price;
    const itemTotal = price * item.quantity;
    const unitLabel = item.medication.dispensing_unit && item.medication.dispensing_unit !== 'unit' 
      ? ` (${item.medication.dispensing_unit})` 
      : '';

    return `
      <tr>
        <td style="padding: 4px 0; border-bottom: 1px dashed #ddd;">${index + 1}</td>
        <td style="padding: 4px 0; border-bottom: 1px dashed #ddd;">${item.medication.name}${unitLabel}</td>
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
  <title>Receipt ${receiptNumber}</title>
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
    .status { 
      text-align: center; 
      font-weight: bold; 
      font-size: 14px; 
      padding: 5px; 
      margin: 5px 0;
      color: ${statusColor};
      border: 2px solid ${statusColor};
    }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { text-align: left; padding: 4px 0; border-bottom: 1px solid #000; }
    .total-row { font-size: 14px; font-weight: bold; }
    .footer { text-align: center; margin-top: 10px; font-size: 10px; }
    .short-code { 
      font-size: 24px; 
      font-weight: bold; 
      text-align: center; 
      padding: 10px;
      background: #f5f5f5;
      margin: 10px 0;
    }
    .barcode-text {
      font-size: 10px;
      text-align: center;
      font-family: monospace;
      letter-spacing: 2px;
    }
  </style>
</head>
<body>
  <div class="header">
    ${pharmacyLogoUrl ? `<img src="${pharmacyLogoUrl}" class="logo" alt="Logo">` : ''}
    <div class="pharmacy-name">${pharmacyName.toUpperCase()}</div>
    ${pharmacyAddress ? `<div style="font-size: 10px;">${pharmacyAddress}</div>` : ''}
    ${pharmacyPhone ? `<div style="font-size: 10px;">Tel: ${pharmacyPhone}</div>` : ''}
  </div>

  <div class="divider"></div>

  <div style="display: flex; justify-content: space-between; font-size: 11px;">
    <span>#${receiptNumber}</span>
    <span>${format(date, 'dd/MM/yy HH:mm')}</span>
  </div>

  ${shortCode ? `<div class="short-code">${shortCode}</div>` : ''}
  ${barcode ? `<div class="barcode-text">${barcode}</div>` : ''}

  <div class="status">${statusText}</div>

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

  <div class="divider"></div>

  <div class="footer">
    <div>Thank you for your purchase!</div>
    <div>Get well soon. Visit us again!</div>
    ${staffName ? `<div style="margin-top: 5px;">Served by: ${staffName}</div>` : ''}
    <div style="margin-top: 5px; color: #888;">Powered by PharmaTrack AI</div>
  </div>
</body>
</html>
  `;
};

export const printHtmlReceipt = (html: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Create a hidden iframe for printing
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

    // Wait for content to load then print
    iframe.onload = () => {
      try {
        const iframeWindow = iframe.contentWindow;
        if (!iframeWindow) {
          throw new Error('No iframe window');
        }

        // Focus for Edge browser compatibility
        iframeWindow.focus();
        
        // Small delay for Edge browser
        setTimeout(() => {
          iframeWindow.print();
          
          // Keep iframe alive for Edge until user closes print dialog
          // Edge needs the stream to remain open
          const cleanup = () => {
            try {
              document.body.removeChild(iframe);
            } catch {
              // Already removed
            }
            resolve();
          };

          // Use afterprint event if available (better for Edge)
          if ('onafterprint' in iframeWindow) {
            iframeWindow.onafterprint = cleanup;
            // Fallback timeout in case afterprint doesn't fire
            setTimeout(cleanup, 30000);
          } else {
            // Fallback for browsers without afterprint
            setTimeout(cleanup, 3000);
          }
        }, 100);
      } catch (error) {
        document.body.removeChild(iframe);
        reject(error);
      }
    };

    iframe.onerror = () => {
      document.body.removeChild(iframe);
      reject(new Error('Failed to load print content'));
    };
  });
};
