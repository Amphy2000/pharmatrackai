import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  CreditCard,
  Banknote,
  Landmark,
  Check,
  Package,
  QrCode,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { usePendingTransactions } from '@/hooks/usePendingTransactions';
import { useSales } from '@/hooks/useSales';
import { useShifts } from '@/hooks/useShifts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/hooks/use-toast';
import { CartItem } from '@/types/medication';
import { generateHtmlReceipt, printHtmlReceipt } from '@/utils/htmlReceiptPrinter';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/hooks/usePermissions';

type PaymentMethod = 'cash' | 'transfer' | 'pos';

interface FoundTransaction {
  id: string;
  short_code: string;
  barcode: string;
  items: CartItem[];
  total_amount: number;
  created_at: string;
}

const PaymentTerminal = () => {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundTransaction, setFoundTransaction] = useState<FoundTransaction | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { findTransaction, completePendingTransaction, pendingTransactions, pendingCount } = usePendingTransactions();
  const { completeSale } = useSales();
  const { activeShift } = useShifts();
  const { formatPrice, currency } = useCurrency();
  const { pharmacy } = usePharmacy();
  const { user } = useAuth();
  const { toast } = useToast();
  const { userRole } = usePermissions();

  // Determine back navigation based on role
  const getBackPath = () => {
    if (userRole === 'staff') {
      return '/cashier-dashboard';
    }
    return '/dashboard';
  };

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

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleSearch = async () => {
    if (!searchValue.trim()) return;

    setIsSearching(true);
    try {
      const transaction = await findTransaction(searchValue.trim());
      if (transaction) {
        setFoundTransaction(transaction);
        setSearchValue('');
      } else {
        toast({
          title: 'Not Found',
          description: 'No pending invoice found with that code.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search Error',
        description: 'Failed to search for invoice.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleCompleteSale = async () => {
    if (!foundTransaction || !selectedPayment) return;

    setIsProcessing(true);
    
    // Store transaction info before clearing state
    const transactionToPrint = { ...foundTransaction };
    const paymentMethodToUse = selectedPayment;
    
    try {
      // Complete the sale (deduct stock) with staff name and payment method
      await completeSale.mutateAsync({
        items: transactionToPrint.items,
        shiftId: activeShift?.id,
        staffName: userProfile?.full_name || undefined,
        paymentMethod: paymentMethodToUse,
      });

      // Mark the pending transaction as completed
      await completePendingTransaction.mutateAsync({
        transactionId: transactionToPrint.id,
        paymentMethod: paymentMethodToUse,
      });

      // Reset state IMMEDIATELY after successful sale - BEFORE print dialog
      // This way button shows "Complete Sale" again right away
      setFoundTransaction(null);
      setSelectedPayment(null);
      setIsProcessing(false);
      
      // Show success toast
      toast({
        title: 'Sale Complete',
        description: `Transaction ${transactionToPrint.short_code} completed successfully.`,
      });

      // Generate and print receipt AFTER resetting state
      const html = generateHtmlReceipt({
        items: transactionToPrint.items,
        total: transactionToPrint.total_amount,
        pharmacyName: pharmacy?.name,
        pharmacyAddress: pharmacy?.address || undefined,
        pharmacyPhone: pharmacy?.phone || undefined,
        receiptNumber: transactionToPrint.short_code,
        shortCode: transactionToPrint.short_code,
        staffName: userProfile?.full_name || undefined,
        date: new Date(),
        currency: currency as 'USD' | 'NGN' | 'GBP',
        paymentStatus: 'paid',
        paymentMethod: paymentMethodToUse,
      });

      // Print receipt - this opens print dialog
      printHtmlReceipt(html);

      // Focus search input for next transaction
      searchInputRef.current?.focus();
    } catch (error: any) {
      console.error('Complete sale error:', error);
      setIsProcessing(false);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to complete the sale. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleClear = () => {
    setFoundTransaction(null);
    setSelectedPayment(null);
    setSearchValue('');
    searchInputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex h-14 sm:h-16 items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-xl h-9 w-9"
                onClick={() => navigate(getBackPath())}
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div>
                <h1 className="text-base sm:text-xl font-bold font-display flex items-center gap-2">
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Payment Terminal
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Scan invoice or enter code
                </p>
              </div>
            </div>

            <Badge variant="secondary" className="gap-1">
              <Package className="h-3 w-3" />
              {pendingCount} Pending
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 max-w-2xl">
        {/* Search Section */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Scan Invoice or Enter Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                ref={searchInputRef}
                placeholder="Enter invoice code (e.g., PH-A1B)"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className="text-lg h-12"
                disabled={isSearching}
              />
              <Button
                onClick={handleSearch}
                disabled={isSearching || !searchValue.trim()}
                className="h-12 px-6"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Found Transaction */}
        {foundTransaction && (
          <Card className="border-primary/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  Invoice: {foundTransaction.short_code}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={handleClear}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items List */}
              <div className="space-y-2">
                {foundTransaction.items.map((item, index) => {
                  const price = item.medication.selling_price || item.medication.unit_price;
                  const itemTotal = price * item.quantity;
                  const unitLabel = item.medication.dispensing_unit && item.medication.dispensing_unit !== 'unit'
                    ? ` (${item.medication.dispensing_unit})`
                    : '';

                  return (
                    <div
                      key={index}
                      className="flex justify-between items-center p-2 rounded-lg bg-muted/30"
                    >
                      <div>
                        <span className="font-medium">{item.medication.name}{unitLabel}</span>
                        <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                      </div>
                      <span className="font-semibold">{formatPrice(itemTotal)}</span>
                    </div>
                  );
                })}
              </div>

              <Separator />

              {/* Total */}
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total</span>
                <span className="text-primary">{formatPrice(foundTransaction.total_amount)}</span>
              </div>

              <Separator />

              {/* Payment Methods */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Select Payment Method</p>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={selectedPayment === 'cash' ? 'default' : 'outline'}
                    onClick={() => setSelectedPayment('cash')}
                    className="h-16 flex-col gap-1"
                  >
                    <Banknote className="h-5 w-5" />
                    <span className="text-xs">Cash</span>
                  </Button>
                  <Button
                    variant={selectedPayment === 'transfer' ? 'default' : 'outline'}
                    onClick={() => setSelectedPayment('transfer')}
                    className="h-16 flex-col gap-1"
                  >
                    <Landmark className="h-5 w-5" />
                    <span className="text-xs">Transfer</span>
                  </Button>
                  <Button
                    variant={selectedPayment === 'pos' ? 'default' : 'outline'}
                    onClick={() => setSelectedPayment('pos')}
                    className="h-16 flex-col gap-1"
                  >
                    <CreditCard className="h-5 w-5" />
                    <span className="text-xs">POS</span>
                  </Button>
                </div>
              </div>

              {/* Complete Button */}
              <Button
                onClick={handleCompleteSale}
                disabled={!selectedPayment || isProcessing}
                className="w-full h-14 text-lg font-bold gap-2 bg-gradient-primary hover:opacity-90"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    Complete Sale
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent Pending Transactions */}
        {!foundTransaction && pendingTransactions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recent Pending Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingTransactions.slice(0, 5).map((transaction) => (
                  <button
                    key={transaction.id}
                    onClick={() => setFoundTransaction(transaction)}
                    className="w-full p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors flex justify-between items-center text-left"
                  >
                    <div>
                      <span className="font-bold text-primary">{transaction.short_code}</span>
                      <span className="text-muted-foreground text-sm ml-2">
                        {transaction.items.length} item(s)
                      </span>
                    </div>
                    <span className="font-semibold">{formatPrice(transaction.total_amount)}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default PaymentTerminal;
