import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { isBefore, parseISO } from 'date-fns';
import { 
  ArrowLeft, 
  ShoppingCart, 
  CreditCard, 
  Trash2,
  Check,
  Pause,
  Clock,
  Zap,
  Building2,
  Eye,
  Keyboard,
  HelpCircle,
  User,
  Camera,
  ChevronDown,
  WifiOff
} from 'lucide-react';
import { useBranchInventory } from '@/hooks/useBranchInventory';
import { useCart } from '@/hooks/useCart';
import { useSales } from '@/hooks/useSales';
import { useShifts } from '@/hooks/useShifts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { useHeldTransactions } from '@/hooks/useHeldTransactions';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useAuth } from '@/contexts/AuthContext';
import { usePendingTransactions } from '@/hooks/usePendingTransactions';
import { useBranchContext } from '@/contexts/BranchContext';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { supabase } from '@/integrations/supabase/client';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { CartPanel } from '@/components/pos/CartPanel';
import { HeldTransactionsPanel } from '@/components/pos/HeldTransactionsPanel';
import { DrugInteractionWarning } from '@/components/pos/DrugInteractionWarning';
import { ReceiptPreviewModal } from '@/components/pos/ReceiptPreviewModal';
import { PatientSelector } from '@/components/pos/PatientSelector';
import { PrescriptionImageUpload } from '@/components/pos/PrescriptionImageUpload';
import { KeyboardShortcutsOverlay } from '@/components/pos/KeyboardShortcutsOverlay';
import { ExpiredBatchWarningDialog } from '@/components/pos/ExpiredBatchWarningDialog';
import { SmartUpsellPanel } from '@/components/pos/SmartUpsellPanel';
import { useSmartUpsell } from '@/hooks/useSmartUpsell';
import { Customer } from '@/types/customer';
import { Button } from '@/components/ui/button';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { generateReceipt, PaymentMethod } from '@/utils/receiptGenerator';
import { printHtmlReceipt } from '@/utils/htmlReceiptPrinter';
import jsPDF from 'jspdf';
import { FileText, Banknote, CreditCard as CreditCardIcon, Landmark } from 'lucide-react';

const Checkout = () => {
  const { medications: branchMedications, isLoading, isOffline, updateLocalStock } = useBranchInventory();
  
  // Map branch medications to match expected Medication type with current_stock from branch_stock
  // Filter to only show items with stock > 0 (for POS, we only want sellable items)
  const medications = branchMedications
    .filter(m => m.branch_stock > 0) // Only show items that can be sold
    .map(m => ({
      ...m,
      current_stock: m.branch_stock, // Use branch-specific stock
    })) as unknown as import('@/types/medication').Medication[];
  const { completeSale } = useSales();
  const { activeShift } = useShifts();
  const cart = useCart();
  
  // Smart Upsell - AI-powered product suggestions
  const { 
    suggestions: upsellSuggestions, 
    isLoading: isLoadingUpsells, 
    dismissSuggestion 
  } = useSmartUpsell({
    cartItems: cart.items,
    availableMedications: medications,
    enabled: cart.items.length > 0,
    debounceMs: 2000, // Wait 2 seconds after last cart change
  });
  const { formatPrice, currency } = useCurrency();
  const { isSimpleMode, regulatory } = useRegionalSettings();
  const { pharmacy } = usePharmacy();
  const { currentBranchId, currentBranchName, isMainBranch } = useBranchContext();
  const { plan } = usePlanLimits();
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
  const [selectedPatient, setSelectedPatient] = useState<Customer | null>(null);
  const [prescriptionImages, setPrescriptionImages] = useState<string[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [expiredWarning, setExpiredWarning] = useState<{ open: boolean; name: string; expiry: string; id: string }>({
    open: false,
    name: '',
    expiry: '',
    id: '',
  });

  // Global barcode scanner - works without focusing search bar
  const isExpired = (expiryDate: string): boolean => {
    return isBefore(parseISO(expiryDate), new Date());
  };

  const handleBarcodeScan = useCallback((barcode: string) => {
    const medication = medications.find(
      (med) => med.barcode_id === barcode || med.batch_number === barcode
    );

    if (medication) {
      if (medication.current_stock > 0 && !isExpired(medication.expiry_date)) {
        cart.addItem(medication);
        toast({
          title: 'Added to cart',
          description: `${medication.name} scanned and added`,
        });
      } else if (isExpired(medication.expiry_date)) {
        toast({
          title: 'Cannot add expired item',
          description: medication.name,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Out of stock',
          description: medication.name,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Item not found',
        description: `Barcode: ${barcode}`,
      });
    }
  }, [medications, cart, toast]);

  // Enable global scanner (works even without focus on search)
  useBarcodeScanner({
    onScan: handleBarcodeScan,
    enabled: !checkoutOpen && !previewOpen && !heldPanelOpen,
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // / key to toggle shortcuts overlay (works anywhere except input fields)
      if (e.key === '/' && !isInputField) {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
        return;
      }
      
      // Don't process other shortcuts if dialogs are open or in input fields
      if (isInputField || checkoutOpen || previewOpen || heldPanelOpen || showShortcuts) return;

      const lastItemId = cart.getLastItemId();

      // Quantity shortcuts
      if ((e.key === '+' || e.key === '=') && lastItemId) {
        e.preventDefault();
        cart.incrementQuantity(lastItemId);
      } else if ((e.key === '-' || e.key === '_') && lastItemId) {
        e.preventDefault();
        cart.decrementQuantity(lastItemId);
      }
      // Enter to checkout
      else if (e.key === 'Enter' && cart.items.length > 0) {
        e.preventDefault();
        setCheckoutOpen(true);
      }
      // H to hold sale
      else if (e.key.toLowerCase() === 'h' && cart.items.length > 0) {
        e.preventDefault();
        handleHoldSale();
      }
      // I to generate invoice
      else if (e.key.toLowerCase() === 'i' && cart.items.length > 0) {
        e.preventDefault();
        handleGenerateInvoice();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, checkoutOpen, previewOpen, heldPanelOpen, showShortcuts]);
  // Get current branch details for receipts
  const { data: currentBranchDetails } = useQuery({
    queryKey: ['branch-details', currentBranchId],
    queryFn: async () => {
      if (!currentBranchId) return null;
      const { data, error } = await supabase
        .from('branches')
        .select('name, address, phone')
        .eq('id', currentBranchId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentBranchId,
  });

  // Helper to get receipt params - includes branch-specific branding
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
    // Branch-specific branding - overrides pharmacy defaults
    branchName: currentBranchDetails?.name || undefined,
    branchAddress: currentBranchDetails?.address || undefined,
    branchPhone: currentBranchDetails?.phone || undefined,
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

    // FEFO Check: Verify no expired items are in the cart
    const expiredItem = cart.items.find(item => isExpired(item.medication.expiry_date));
    if (expiredItem) {
      setExpiredWarning({
        open: true,
        name: expiredItem.medication.name,
        expiry: expiredItem.medication.expiry_date,
        id: expiredItem.medication.id,
      });
      return;
    }

    setIsProcessing(true);
    
    // Store cart items before clearing
    const currentItems = [...cart.items];
    const currentCustomer = customerName;
    const currentPaymentMethod = paymentMethod;
    
    try {
      // Skip stock validation when offline - trust local cache
      if (!isOffline) {
        // SAFEGUARD 1: Verify stock availability before processing (online only)
        const stockIssues: string[] = [];
        const priceChanges: { name: string; oldPrice: number; newPrice: number }[] = [];
        
        for (const item of currentItems) {
          const freshMed = branchMedications.find(m => m.id === item.medication.id);
          if (!freshMed) {
            stockIssues.push(`${item.medication.name} is no longer available`);
            continue;
          }
          
          // Check stock
          if (freshMed.branch_stock < item.quantity) {
            if (freshMed.branch_stock === 0) {
              stockIssues.push(`${item.medication.name} is now out of stock`);
            } else {
              stockIssues.push(`${item.medication.name}: only ${freshMed.branch_stock} left (you have ${item.quantity} in cart)`);
            }
          }
          
          // SAFEGUARD 2: Check for price changes since item was added to cart
          const cartPrice = item.medication.selling_price || item.medication.unit_price;
          const currentPrice = freshMed.selling_price || freshMed.unit_price;
          if (cartPrice !== currentPrice) {
            priceChanges.push({
              name: item.medication.name,
              oldPrice: cartPrice,
              newPrice: currentPrice,
            });
          }
        }
        
        // Show stock issues as error
        if (stockIssues.length > 0) {
          toast({
            title: 'Stock Changed',
            description: stockIssues.join('. ') + '. Please update your cart.',
            variant: 'destructive',
          });
          setIsProcessing(false);
          return;
        }
        
        // Warn about price changes but allow proceeding
        if (priceChanges.length > 0) {
          const priceMsg = priceChanges.map(p => 
            `${p.name}: ${formatPrice(p.oldPrice)} → ${formatPrice(p.newPrice)}`
          ).join(', ');
          toast({
            title: 'Price Updated',
            description: `Prices changed: ${priceMsg}. Sale will use current prices.`,
          });
          // Update cart items with fresh prices for accurate receipt
          currentItems.forEach(item => {
            const fresh = branchMedications.find(m => m.id === item.medication.id);
            if (fresh) {
              item.medication.selling_price = fresh.selling_price;
              item.medication.unit_price = fresh.unit_price;
            }
          });
        }
      }
      
      // Recalculate total with verified prices
      const currentTotal = currentItems.reduce((sum, item) => {
        const price = item.medication.selling_price || item.medication.unit_price;
        return sum + (price * item.quantity);
      }, 0);
      
      const result = await completeSale.mutateAsync({
        items: currentItems,
        customerName: selectedPatient?.full_name || currentCustomer || undefined,
        customerId: selectedPatient?.id || undefined,
        shiftId: activeShift?.id,
        staffName: userProfile?.full_name || undefined,
        paymentMethod: currentPaymentMethod || undefined,
        prescriptionImages: prescriptionImages.length > 0 ? prescriptionImages : undefined,
        forceOffline: isOffline,
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

      // Update local stock cache for offline mode
      if (isOffline) {
        currentItems.forEach(item => {
          updateLocalStock(item.medication.id, item.quantity);
        });
      }
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
    setSelectedPatient(null);
    setPrescriptionImages([]);
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

  const handleRemoveExpiredFromCart = () => {
    if (expiredWarning.id) {
      cart.removeItem(expiredWarning.id);
      setExpiredWarning({ open: false, name: '', expiry: '', id: '' });
      toast({
        title: 'Expired item removed',
        description: `${expiredWarning.name} has been removed from the cart.`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Expired Batch Warning Dialog */}
      <ExpiredBatchWarningDialog
        open={expiredWarning.open}
        onOpenChange={(open) => setExpiredWarning(prev => ({ ...prev, open }))}
        medicationName={expiredWarning.name}
        expiryDate={expiredWarning.expiry}
        onConfirmRemove={handleRemoveExpiredFromCart}
      />

      {/* Keyboard Shortcuts Overlay */}
      <KeyboardShortcutsOverlay 
        open={showShortcuts} 
        onClose={() => setShowShortcuts(false)} 
      />

      {/* Premium Header */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/70 backdrop-blur-2xl">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex h-14 sm:h-16 items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 hover:bg-muted/80">
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-base sm:text-lg font-bold font-display flex items-center gap-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-sm">
                    <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                  </div>
                  Point of Sale
                  {isSimpleMode ? (
                    <Badge variant="secondary" className="text-[10px] gap-1 ml-1">
                      <Zap className="h-3 w-3" />
                      Simple
                    </Badge>
                  ) : plan !== 'starter' ? (
                    <Badge variant="outline" className="text-[10px] gap-1 ml-1 border-primary/30 text-primary">
                      <Building2 className="h-3 w-3" />
                      {currentBranchName}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] gap-1 ml-1 border-primary/30 text-primary">
                      <Building2 className="h-3 w-3" />
                      Enterprise
                    </Badge>
                  )}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Offline Mode Indicator */}
              {isOffline && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-warning/10 border border-warning/30">
                  <WifiOff className="h-3.5 w-3.5 text-warning" />
                  <span className="text-xs font-medium text-warning hidden sm:inline">Offline Mode</span>
                </div>
              )}

              {/* Keyboard Shortcuts Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowShortcuts(true)}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg text-muted-foreground hover:text-foreground"
                title="Keyboard shortcuts (/)"
              >
                <Keyboard className="h-4 w-4" />
              </Button>

              {/* Held Transactions Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHeldPanelOpen(true)}
                className="gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 text-xs sm:text-sm relative rounded-xl border-border/50"
              >
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Held</span>
                {heldCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary shadow-sm">
                    {heldCount}
                  </Badge>
                )}
              </Button>

              {/* Cart Count */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
                <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-bold text-primary tabular-nums">{cart.getTotalItems()}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Premium single-screen layout */}
      <main className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Product Grid - Takes 2/3 */}
          <div className="lg:col-span-2">
            <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 border border-border/40 shadow-sm h-[calc(100vh-7rem)]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold font-display">Select Products</h2>
                <span className="text-xs text-muted-foreground">
                  {medications.length} items
                </span>
              </div>
              <ProductGrid
                medications={medications}
                onAddToCart={cart.addItem}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Cart Panel - taller than products, but NEVER grows with item count */}
          <div className="lg:col-span-1">
            <div className="bg-card/90 backdrop-blur-sm rounded-2xl p-4 border border-border/40 shadow-sm lg:sticky lg:top-20">
              {/* Cart Header */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold font-display">Cart</h2>
                  {cart.items.length > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                      {cart.items.length}
                    </Badge>
                  )}
                </div>
                {cart.items.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cart.clearCart}
                    className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 h-7 px-2 text-[10px]"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
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

              {/* Smart Upsell Suggestions - AI-powered */}
              {cart.items.length > 0 && (
                <SmartUpsellPanel
                  suggestions={upsellSuggestions}
                  isLoading={isLoadingUpsells}
                  onAddToCart={cart.addItem}
                  onDismiss={dismissSuggestion}
                  cartItems={cart.items}
                />
              )}

              {/* Collapsible extras */}
              {cart.items.length > 0 && (
                <div className="mt-3 space-y-1">
                  {/* Drug Interaction Warning */}
                  {cart.items.length >= 2 && (
                    <DrugInteractionWarning cartItems={cart.items} />
                  )}

                  {/* Patient & Prescription Accordion */}
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          {selectedPatient ? selectedPatient.full_name : 'Select Patient (Optional)'}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <PatientSelector
                        selectedPatient={selectedPatient}
                        onSelectPatient={(patient) => {
                          setSelectedPatient(patient);
                          if (patient) {
                            setCustomerName(patient.full_name);
                          }
                        }}
                        onSkip={() => setCustomerName('')}
                      />
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
                        <span className="flex items-center gap-1.5">
                          <Camera className="h-3.5 w-3.5" />
                          {prescriptionImages.length > 0 ? `${prescriptionImages.length} image(s) attached` : 'Attach Prescription (Optional)'}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <PrescriptionImageUpload images={prescriptionImages} onImagesChange={setPrescriptionImages} />
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 mt-4">
                {cart.items.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={handleHoldSale} variant="outline" size="sm" className="h-9 gap-1.5 text-xs rounded-xl">
                      <Pause className="h-3.5 w-3.5" />
                      Hold
                    </Button>
                    <Button
                      onClick={handleGenerateInvoice}
                      variant="outline"
                      size="sm"
                      disabled={isProcessing}
                      className="h-9 gap-1.5 text-xs rounded-xl border-amber-500/40 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Invoice
                    </Button>
                  </div>
                )}

                <Button
                  onClick={() => setCheckoutOpen(true)}
                  disabled={cart.items.length === 0}
                  className="w-full h-11 text-sm font-bold gap-2 bg-gradient-primary hover:opacity-90 shadow-md rounded-xl transition-all hover:shadow-lg"
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
