import { useState, useMemo } from 'react';
import { Globe, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Medication } from '@/types/medication';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface CategoryMarketplaceToggleProps {
  medications: Medication[];
  onUpdate: () => void;
}

export const CategoryMarketplaceToggle = ({ medications, onUpdate }: CategoryMarketplaceToggleProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmCategory, setConfirmCategory] = useState<{ name: string; count: number; action: 'list' | 'remove' } | null>(null);

  // Get unique categories with their counts
  const categories = useMemo(() => {
    const categoryMap = new Map<string, { total: number; public: number; private: number }>();
    
    medications.forEach(med => {
      const existing = categoryMap.get(med.category) || { total: 0, public: 0, private: 0 };
      existing.total++;
      if (med.is_public) {
        existing.public++;
      } else {
        existing.private++;
      }
      categoryMap.set(med.category, existing);
    });

    return Array.from(categoryMap.entries())
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [medications]);

  const handleCategoryAction = async (categoryName: string, action: 'list' | 'remove') => {
    const categoryMeds = medications.filter(m => m.category === categoryName);
    const targetMeds = action === 'list' 
      ? categoryMeds.filter(m => !m.is_public)
      : categoryMeds.filter(m => m.is_public);

    if (targetMeds.length === 0) {
      toast.info(`All items in ${categoryName} are already ${action === 'list' ? 'listed' : 'removed'}`);
      return;
    }

    if (targetMeds.length > 50) {
      setConfirmCategory({ name: categoryName, count: targetMeds.length, action });
      return;
    }

    await executeAction(categoryName, action, targetMeds);
  };

  const executeAction = async (categoryName: string, action: 'list' | 'remove', meds?: Medication[]) => {
    setIsUpdating(true);
    try {
      const targetMeds = meds || medications.filter(m => 
        m.category === categoryName && 
        (action === 'list' ? !m.is_public : m.is_public)
      );

      const ids = targetMeds.map(m => m.id);
      
      const { error } = await supabase
        .from('medications')
        .update({ is_public: action === 'list' })
        .in('id', ids);

      if (error) throw error;

      toast.success(`${action === 'list' ? 'Listed' : 'Removed'} ${ids.length} ${categoryName} items`);
      onUpdate();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    } finally {
      setIsUpdating(false);
      setConfirmCategory(null);
    }
  };

  if (categories.length === 0) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2" disabled={isUpdating}>
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Globe className="h-4 w-4" />
            )}
            Category Marketplace
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 max-h-80 overflow-auto">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Toggle marketplace for entire category
          </div>
          <DropdownMenuSeparator />
          {categories.map(category => (
            <DropdownMenuItem
              key={category.name}
              className="flex items-center justify-between cursor-pointer"
              onSelect={(e) => e.preventDefault()}
            >
              <span className="flex items-center gap-2">
                <span className="font-medium">{category.name}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {category.total}
                </Badge>
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-marketplace hover:text-marketplace"
                  onClick={() => handleCategoryAction(category.name, 'list')}
                  disabled={category.private === 0}
                >
                  List ({category.private})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => handleCategoryAction(category.name, 'remove')}
                  disabled={category.public === 0}
                >
                  Remove ({category.public})
                </Button>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmCategory !== null} onOpenChange={() => setConfirmCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmCategory?.action === 'list' ? 'List' : 'Remove'} All {confirmCategory?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to {confirmCategory?.action === 'list' ? 'make' : 'remove'} {confirmCategory?.count} items {confirmCategory?.action === 'list' ? 'public' : 'from the marketplace'}. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmCategory && executeAction(confirmCategory.name, confirmCategory.action)}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
