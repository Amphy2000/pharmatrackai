import { useState, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer, X, Plus, Minus, Download } from 'lucide-react';
import { Medication } from '@/types/medication';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface BarcodeLabelPrinterProps {
  medication: Medication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LabelSize = 'small' | 'medium' | 'large';

const LABEL_SIZES: Record<LabelSize, { width: number; height: number; fontSize: number }> = {
  small: { width: 38, height: 25, fontSize: 8 },
  medium: { width: 50, height: 30, fontSize: 10 },
  large: { width: 70, height: 40, fontSize: 12 },
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

export const BarcodeLabelPrinter = ({ medication, open, onOpenChange }: BarcodeLabelPrinterProps) => {
  const [labelCount, setLabelCount] = useState(1);
  const [labelSize, setLabelSize] = useState<LabelSize>('medium');
  const [showPrice, setShowPrice] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  if (!medication?.barcode_id) return null;

  const generateBarcodeDataUrl = (): string => {
    const canvas = document.createElement('canvas');
    try {
      JsBarcode(canvas, medication.barcode_id!, {
        format: medication.barcode_id!.startsWith('#') ? 'CODE128' : 'EAN13',
        width: 2,
        height: 40,
        displayValue: true,
        fontSize: LABEL_SIZES[labelSize].fontSize,
        margin: 5,
      });
      return canvas.toDataURL('image/png');
    } catch {
      // Fallback to CODE128 for any barcode format
      JsBarcode(canvas, medication.barcode_id!, {
        format: 'CODE128',
        width: 2,
        height: 40,
        displayValue: true,
        fontSize: LABEL_SIZES[labelSize].fontSize,
        margin: 5,
      });
      return canvas.toDataURL('image/png');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Error',
        description: 'Could not open print window. Please allow popups.',
        variant: 'destructive',
      });
      return;
    }

    const barcodeDataUrl = generateBarcodeDataUrl();
    const size = LABEL_SIZES[labelSize];
    
    // Escape medication name to prevent XSS
    const safeMedicationName = escapeHtml(medication.name);
    const safePrice = escapeHtml(Number(medication.selling_price || medication.unit_price).toLocaleString());
    
    const labelsHtml = Array(labelCount)
      .fill(0)
      .map(() => `
        <div class="label" style="
          width: ${size.width}mm;
          height: ${size.height}mm;
          border: 1px dashed #ccc;
          padding: 2mm;
          margin: 2mm;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          page-break-inside: avoid;
          box-sizing: border-box;
        ">
          <div style="font-size: ${size.fontSize}px; font-weight: bold; text-align: center; margin-bottom: 2px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${safeMedicationName}
          </div>
          <img src="${barcodeDataUrl}" style="max-width: 100%; height: auto;" />
          ${showPrice ? `<div style="font-size: ${size.fontSize}px; font-weight: bold; margin-top: 2px;">₦${safePrice}</div>` : ''}
        </div>
      `)
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode Labels - ${safeMedicationName}</title>
          <style>
            @page {
              size: A4;
              margin: 5mm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 10mm;
            }
            .labels-container {
              display: flex;
              flex-wrap: wrap;
              gap: 0;
            }
            @media print {
              .label {
                border: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="labels-container">
            ${labelsHtml}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    
    toast({
      title: 'Printing Labels',
      description: `Preparing ${labelCount} label(s) for ${medication.name}`,
    });
  };

  const handleDownload = () => {
    const barcodeDataUrl = generateBarcodeDataUrl();
    const link = document.createElement('a');
    link.download = `barcode-${medication.barcode_id}.png`;
    link.href = barcodeDataUrl;
    link.click();
    
    toast({
      title: 'Downloaded',
      description: 'Barcode image saved successfully',
    });
  };

  const barcodePreview = generateBarcodeDataUrl();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Barcode Labels
          </DialogTitle>
          <DialogDescription>
            Configure and print barcode labels for {medication.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="flex items-center justify-center p-4 bg-white rounded-lg border">
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900 mb-1">{medication.name}</p>
              <img src={barcodePreview} alt="Barcode preview" className="mx-auto" />
              {showPrice && (
                <p className="text-sm font-bold text-gray-900 mt-1">
                  ₦{Number(medication.selling_price || medication.unit_price).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Label Count */}
          <div className="flex items-center justify-between">
            <Label>Number of Labels</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setLabelCount(Math.max(1, labelCount - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                value={labelCount}
                onChange={(e) => setLabelCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="w-16 text-center"
                min={1}
                max={100}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setLabelCount(Math.min(100, labelCount + 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Label Size */}
          <div className="flex items-center justify-between">
            <Label>Label Size</Label>
            <Select value={labelSize} onValueChange={(v) => setLabelSize(v as LabelSize)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (38×25mm)</SelectItem>
                <SelectItem value="medium">Medium (50×30mm)</SelectItem>
                <SelectItem value="large">Large (70×40mm)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Show Price Toggle */}
          <div className="flex items-center justify-between">
            <Label>Show Price on Label</Label>
            <Button
              variant={showPrice ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowPrice(!showPrice)}
            >
              {showPrice ? 'Yes' : 'No'}
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download Image
            </Button>
            <Button className="flex-1" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print Labels
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
