import { formatDistanceToNow } from 'date-fns';
import { Clock, Trash2, RotateCcw, User } from 'lucide-react';
import { HeldTransaction } from '@/hooks/useHeldTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface HeldTransactionsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: HeldTransaction[];
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}

export const HeldTransactionsPanel = ({
  open,
  onOpenChange,
  transactions,
  onResume,
  onDelete,
}: HeldTransactionsPanelProps) => {
  const { formatPrice } = useCurrency();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Held Transactions
          </SheetTitle>
          <SheetDescription>
            Resume incomplete sales from where you left off
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {transactions.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">No held transactions</p>
              <p className="text-xs text-muted-foreground mt-1">
                Use "Hold Sale" to save a transaction for later
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-3 pr-4">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {transaction.customerName ? (
                            <>
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              {transaction.customerName}
                            </>
                          ) : (
                            <span className="text-muted-foreground">Walk-in Customer</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(transaction.heldAt), { addSuffix: true })}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-primary">
                        {formatPrice(transaction.total)}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground mb-3">
                      {transaction.items.length} item{transaction.items.length !== 1 ? 's' : ''}: {' '}
                      {transaction.items.slice(0, 2).map(i => i.medication.name).join(', ')}
                      {transaction.items.length > 2 && ` +${transaction.items.length - 2} more`}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => onResume(transaction.id)}
                        size="sm"
                        className="flex-1 gap-1.5 bg-gradient-primary hover:opacity-90"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Resume
                      </Button>
                      <Button
                        onClick={() => onDelete(transaction.id)}
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
