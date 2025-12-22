import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  ShoppingCart, 
  CreditCard, 
  Printer, 
  Trash2,
  Check,
  Pause,
  Clock,
  Zap,
  Building2,
  Eye
} from 'lucide-react';
import { useMedications } from '@/hooks/useMedications';
import { useCart } from '@/hooks/useCart';
import { useSales } from '@/hooks/useSales';
import { useShifts } from '@/hooks/useShifts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { useHeldTransactions } from '@/hooks/useHeldTransactions';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useAuth } from '@/contexts/AuthContext';
import { usePendingTransactions } from '@/hooks/usePendingTransactions';
import { supabase } from '@/integrations/supabase/client';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { CartPanel } from '@/components/pos/CartPanel';
import { HeldTransactionsPanel } from '@/components/pos/HeldTransactionsPanel';
import { DrugInteractionWarning } from '@/components/pos/DrugInteractionWarning';
import { ReceiptPreviewModal } from '@/components/pos/ReceiptPreviewModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { generateReceipt, generateReceiptNumber, generateInvoiceNumber, PaymentMethod } from '@/utils/receiptGenerator';
import { printHtmlReceipt } from '@/utils/htmlReceiptPrinter';
import jsPDF from 'jspdf';
import { FileText, Banknote, CreditCard as CreditCardIcon, Landmark } from 'lucide-react';

const Checkout = () => {
  const { medications, isLoading } = useMedications();
  const { completeSale } = useSales();
  const { activeShift } = useShifts();
  const cart = useCart();
  const { formatPrice, currency } = useCurrency();
  const { isSimpleMode, regulatory } = useRegionalSettings();
  const { pharmacy } = usePharmacy();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    heldTransactions,
    holdTransaction,
    resumeTransaction,
    deleteTransaction,
    count: heldCount,
  } = useHeldTransactions();

  // Get current user's profile for staff name
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
  
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [heldPanelOpen, setHeldPanelOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saleComplete, setSaleComplete] = useState(false);
  const [lastReceiptNumber, setLastReceiptNumber] = useState('');
  const [lastReceiptItems, setLastReceiptItems] = useState(cart.items);
  const [lastReceiptTotal, setLastReceiptTotal] = useState(0);
  const [lastPaymentMethod, setLastPaymentMethod] = useState<PaymentMethod>('cash');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<jsPDF | null>(null);

  // Helper to get receipt params
  const getReceiptParams = (isPaid: boolean = true, isDigital: boolean = false, method: PaymentMethod = paymentMethod) => ({
    pharmacyName: pharmacy?.name || 'PharmaTrack Pharmacy',
    pharmacyAddress: pharmacy?.address || undefined,
    pharmacyPhone: pharmacy?.phone || undefined,
    pharmacyLogoUrl: pharmacy?.logo_url || undefined,
    pharmacistInCharge: (pharmacy as any)?.pharmacist_in_charge || undefined,
    staffName: userProfile?.full_name || undefined,
    currency: currency as 'USD' | 'NGN' | 'GBP',
    paymentStatus: isPaid ? 'paid' : 'unpaid' as 'paid' | 'unpaid',
    paymentMethod: method,
    enableLogoOnPrint: (pharmacy as any)?.enable_logo_on_print !== false,
    isDigitalReceipt: isDigital,
  });

  const handleHoldSale = () => {
    if (cart.items.length === 0) return;
    
    holdTransaction(cart.items, customerName, cart.getTotal());
    cart.clearCart();
    setCustomerName('');
    
    toast({
      title: 'Sale held',
      description: 'Transaction saved. Resume it anytime from the Held button.',
    });
  };

  const handleResumeSale = (id: string) => {
    const transaction = resumeTransaction(id);
    if (transaction) {
      // Clear current cart and load held items
      cart.clearCart();
      transaction.items.forEach(item => {
        cart.addItem(item.medication, item.quantity);
      });
      setCustomerName(transaction.customerName);
      setHeldPanelOpen(false);
      
      toast({
        title: 'Sale resumed',
        description: 'Transaction loaded into cart.',
      });
    }
  };

  const printReceipt = async (items: typeof cart.items, total: number, receiptNumber: string, _custName?: string, isPaid: boolean = true) => {
    try {
      const receipt = await generateReceipt({
        items,
        total,
        receiptNumber,
        date: new Date(),
        ...getReceiptParams(isPaid, false),
      });

      // Create an iframe for printing instead of opening a new window
      const pdfBlob = receipt.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      
      // Create hidden iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.src = url;
      
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.print();
          // Clean up after printing
          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(url);
          }, 1000);
        }, 500);
      };
    } catch (error) {
      console.error('Failed to print receipt:', error);
      toast({
        title: 'Print failed',
        description: 'Could not generate receipt. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteSale = async () => {
    if (cart.items.length === 0) return;

    setIsProcessing(true);
    
    // Store cart items before clearing
    const currentItems = [...cart.items];
    const currentTotal = cart.getTotal();
    const currentCustomer = customerName;
    const currentPaymentMethod = paymentMethod;
    
    try {
      const result = await completeSale.mutateAsync({
        items: currentItems,
        customerName: currentCustomer || undefined,
        shiftId: activeShift?.id,
        staffName: userProfile?.full_name || undefined,
        paymentMethod: currentPaymentMethod || undefined,
      });

      // Use the receipt ID from the sale result
      const receiptId = result.receiptId;
      setLastReceiptNumber(receiptId);
      setLastReceiptItems(currentItems);
      setLastReceiptTotal(currentTotal);
      setLastPaymentMethod(currentPaymentMethod);
      
      // Generate receipt for preview (digital version for preview always shows logo)
      const receipt = await generateReceipt({
        items: currentItems,
        total: currentTotal,
        receiptNumber: receiptId,
        date: new Date(),
        ...getReceiptParams(true, true, currentPaymentMethod), // isPaid=true, isDigital=true for preview
      });
      
      setPreviewReceipt(receipt);
      setPreviewOpen(true);
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
    setPaymentMethod('cash');
    setSaleComplete(false);
    setCheckoutOpen(false);
    setPreviewOpen(false);
    setPreviewReceipt(null);
  };

  const handlePrintLastReceipt = async () => {
    if (!lastReceiptNumber || lastReceiptItems.length === 0) return;
    
    // Digital version for preview
    const receipt = await generateReceipt({
      items: lastReceiptItems,
      total: lastReceiptTotal,
      receiptNumber: lastReceiptNumber,
      date: new Date(),
      ...getReceiptParams(true, true, lastPaymentMethod),
    });
    
    setPreviewReceipt(receipt);
    setPreviewOpen(true);
  };

  // Generate Invoice (credit sale - unpaid) - saves to pending_transactions
  const { createPendingTransaction } = usePendingTransactions();
  
  const handleGenerateInvoice = async () => {
    if (cart.items.length === 0) return;

    setIsProcessing(true);

    // Store cart items
    const currentItems = [...cart.items];
    const currentTotal = cart.getTotal();

    try {
      // Create pending transaction in database
      const pendingTx = await createPendingTransaction.mutateAsync({
        items: currentItems,
        total: currentTotal,
      });
      
      if (!pendingTx) {
        throw new Error('Failed to create pending transaction');
      }

      const invoiceNumber = `INV-${pendingTx.short_code}`;
      setLastReceiptNumber(invoiceNumber);
      setLastReceiptItems(currentItems);
      setLastReceiptTotal(currentTotal);

      // Generate HTML and print invoice slip with barcode (instant)
      const { generateHtmlReceipt } = await import('@/utils/htmlReceiptPrinter');
      const html = generateHtmlReceipt({
        items: currentItems,
        total: currentTotal,
        receiptNumber: invoiceNumber,
        date: new Date(),
        pharmacyName: pharmacy?.name || 'PharmaTrack Pharmacy',
        pharmacyAddress: pharmacy?.address || undefined,
        pharmacyPhone: pharmacy?.phone || undefined,
        currency: currency as 'USD' | 'NGN' | 'GBP',
        paymentStatus: 'unpaid',
        shortCode: pendingTx.short_code,
        barcode: pendingTx.barcode,
      });
      
      await printHtmlReceipt(html);

      // Clear cart after generating invoice
      cart.clearCart();
      setCustomerName('');

      toast({
        title: 'Invoice Generated',
        description: `Invoice ${pendingTx.short_code} created. Customer can pay at cashier.`,
      });
    } catch (error) {
      console.error('Invoice generation failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate invoice.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePreviewPrintComplete = () => {
    // Close preview after printing
    setPreviewOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex h-14 sm:h-16 items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9">
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-base sm:text-xl font-bold font-display flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Point of Sale
                  {isSimpleMode ? (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Zap className="h-3 w-3" />
                      Simple
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Building2 className="h-3 w-3" />
                      Enterprise
                    </Badge>
                  )}
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground hidden xs:block">
                  {isSimpleMode ? 'Fast checkout mode' : `Full ${regulatory.abbreviation} compliance tracking`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Held Transactions Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHeldPanelOpen(true)}
                className="gap-1.5 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm relative"
              >
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Held</span>
                {heldCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary">
                    {heldCount}
                  </Badge>
                )}
              </Button>

              <Badge variant="secondary" className="gap-1 px-2 sm:px-3 py-1 text-xs">
                <ShoppingCart className="h-3 w-3" />
                {cart.getTotalItems()}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Product Grid */}
          <div className="lg:col-span-2">
            <div className="glass-card rounded-2xl p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-bold font-display mb-4">Select Products</h2>
              <ProductGrid
                medications={medications}
                onAddToCart={cart.addItem}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Cart Panel */}
          <div className="lg:col-span-1">
            <div className="glass-card rounded-2xl p-4 sm:p-6 lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-bold font-display">Cart</h2>
                {cart.items.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cart.clearCart}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">Clear</span>
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

              {/* Drug Interaction Warning */}
              {cart.items.length >= 2 && (
                <div className="mt-4">
                  <DrugInteractionWarning cartItems={cart.items} />
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 mt-4 sm:mt-6">
                {/* Hold Sale Button */}
                {cart.items.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleHoldSale}
                      variant="outline"
                      className="h-10 sm:h-11 gap-2 text-sm"
                    >
                      <Pause className="h-4 w-4" />
                      Hold Sale
                    </Button>
                    <Button
                      onClick={handleGenerateInvoice}
                      variant="outline"
                      disabled={isProcessing}
                      className="h-10 sm:h-11 gap-2 text-sm border-amber-500/50 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    >
                      <FileText className="h-4 w-4" />
                      Invoice
                    </Button>
                  </div>
                )}

                {/* Checkout Button */}
                <Button
                  onClick={() => setCheckoutOpen(true)}
                  disabled={cart.items.length === 0}
                  className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold gap-2 sm:gap-3 bg-gradient-primary hover:opacity-90 shadow-glow-primary btn-glow rounded-xl"
                >
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                  Complete Sale
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Held Transactions Panel */}
      <HeldTransactionsPanel
        open={heldPanelOpen}
        onOpenChange={setHeldPanelOpen}
        transactions={heldTransactions}
        onResume={handleResumeSale}
        onDelete={deleteTransaction}
      />

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md mx-4">
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

                {/* Payment Method Selector */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border transition-all ${
                        paymentMethod === 'cash'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/50 hover:border-primary/50 hover:bg-primary/5'
                      }`}
                    >
                      <Banknote className="h-5 w-5" />
                      <span className="text-xs font-medium">Cash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transfer')}
                      className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border transition-all ${
                        paymentMethod === 'transfer'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/50 hover:border-primary/50 hover:bg-primary/5'
                      }`}
                    >
                      <Landmark className="h-5 w-5" />
                      <span className="text-xs font-medium">Transfer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pos')}
                      className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border transition-all ${
                        paymentMethod === 'pos'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/50 hover:border-primary/50 hover:bg-primary/5'
                      }`}
                    >
                      <CreditCardIcon className="h-5 w-5" />
                      <span className="text-xs font-medium">POS</span>
                    </button>
                  </div>
                </div>

                {/* Enterprise mode additional fields */}
                {!isSimpleMode && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5" />
                      {regulatory.abbreviation} batch tracking enabled for this sale
                    </p>
                  </div>
                )}
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
                      <Eye className="h-4 w-4" />
                      Complete & Preview
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
                  onClick={handlePrintLastReceipt}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  View Receipt
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

      {/* Receipt Preview Modal */}
      <ReceiptPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        receipt={previewReceipt}
        receiptNumber={lastReceiptNumber}
        onPrint={handlePreviewPrintComplete}
      />
    </div>
  );
};

export default Checkout;
