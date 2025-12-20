import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShoppingCart, 
  CreditCard, 
  Printer, 
  Trash2,
  Check
} from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { useCart } from '@/hooks/useCart';
import { useSales } from '@/hooks/useSales';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { CartPanel } from '@/components/pos/CartPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { generateReceipt, generateReceiptNumber } from '@/utils/receiptGenerator';

const Checkout = () => {
  const { medications, isLoading } = useMedications();
  const { completeSale } = useSales();
  const cart = useCart();
  const { formatPrice, currency } = useCurrency();
  
  const [customerName, setCustomerName] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saleComplete, setSaleComplete] = useState(false);
  const [lastReceiptNumber, setLastReceiptNumber] = useState('');

  const handleCompleteSale = async () => {
    if (cart.items.length === 0) return;

    setIsProcessing(true);
    
    try {
      await completeSale.mutateAsync({
        items: cart.items,
        customerName: customerName || undefined,
      });

      // Generate and print receipt
      const receiptNumber = generateReceiptNumber();
      setLastReceiptNumber(receiptNumber);
      
      const receipt = generateReceipt({
        items: cart.items,
        total: cart.getTotal(),
        customerName: customerName || undefined,
        receiptNumber,
        date: new Date(),
        currency,
      });

      // Open print dialog
      const pdfBlob = receipt.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }

      setSaleComplete(true);
    } catch (error) {
      console.error('Sale failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewSale = () => {
    cart.clearCart();
    setCustomerName('');
    setSaleComplete(false);
    setCheckoutOpen(false);
  };

  const printLastReceipt = () => {
    if (!lastReceiptNumber) return;
    
    const receipt = generateReceipt({
      items: cart.items,
      total: cart.getTotal(),
      customerName: customerName || undefined,
      receiptNumber: lastReceiptNumber,
      date: new Date(),
      currency,
    });

    receipt.autoPrint();
    window.open(receipt.output('bloburl'), '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold font-display flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  Point of Sale
                </h1>
                <p className="text-xs text-muted-foreground">Fast checkout with barcode scanning</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="gap-1 px-3 py-1">
                <ShoppingCart className="h-3 w-3" />
                {cart.getTotalItems()} items
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Product Grid */}
          <div className="lg:col-span-2">
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-bold font-display mb-4">Select Products</h2>
              <ProductGrid
                medications={medications}
                onAddToCart={cart.addItem}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Cart Panel */}
          <div className="lg:col-span-1">
            <div className="glass-card rounded-2xl p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-display">Cart</h2>
                {cart.items.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cart.clearCart}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              <CartPanel
                items={cart.items}
                onIncrement={cart.incrementQuantity}
                onDecrement={cart.decrementQuantity}
                onRemove={cart.removeItem}
                total={cart.getTotal()}
              />

              {/* Checkout Button */}
              <Button
                onClick={() => setCheckoutOpen(true)}
                disabled={cart.items.length === 0}
                className="w-full h-14 mt-6 text-lg font-bold gap-3 bg-gradient-primary hover:opacity-90 shadow-glow-primary btn-glow rounded-xl"
              >
                <CreditCard className="h-5 w-5" />
                Complete Sale
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          {!saleComplete ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Complete Sale</DialogTitle>
                <DialogDescription>
                  Review the order and complete the transaction
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="p-4 rounded-xl bg-muted/30 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items</span>
                    <span>{cart.getTotalItems()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(cart.getTotal())}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Customer Name (Optional)
                  </label>
                  <Input
                    placeholder="Enter customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCheckoutOpen(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCompleteSale}
                  disabled={isProcessing}
                  className="gap-2 bg-gradient-primary hover:opacity-90"
                >
                  {isProcessing ? (
                    'Processing...'
                  ) : (
                    <>
                      <Printer className="h-4 w-4" />
                      Complete & Print
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="mx-auto w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
                  <Check className="h-8 w-8 text-success" />
                </div>
                <DialogTitle className="font-display text-xl text-center">
                  Sale Complete!
                </DialogTitle>
                <DialogDescription className="text-center">
                  Receipt #{lastReceiptNumber} has been generated
                </DialogDescription>
              </DialogHeader>

              <DialogFooter className="gap-2 sm:flex-col">
                <Button
                  variant="outline"
                  onClick={printLastReceipt}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print Again
                </Button>
                <Button
                  onClick={handleNewSale}
                  className="gap-2 bg-gradient-primary hover:opacity-90"
                >
                  New Sale
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Checkout;
