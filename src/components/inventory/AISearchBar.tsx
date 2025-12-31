import { useState, useCallback } from 'react';
import { Search, Sparkles, Loader2, X, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { usePharmacy } from '@/hooks/usePharmacy';
import { callPharmacyAi, PharmacyAiError } from '@/lib/pharmacyAiClient';

interface AISearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export const AISearchBar = ({ onSearch, placeholder = "Search medications..." }: AISearchBarProps) => {
  const [query, setQuery] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const { toast } = useToast();
  const { pharmacyId } = usePharmacy();

  const handleAISearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsAIProcessing(true);
    setIsRateLimited(false);

    try {
      const data = await callPharmacyAi<{ searchTerms?: string; rateLimited?: boolean }>({
        action: 'ai_search',
        payload: { query: query.trim() },
        pharmacy_id: pharmacyId,
      });

      if (data?.rateLimited) {
        setIsRateLimited(true);
        toast({
          title: 'System Busy',
          description: 'AI is processing many requests. Please wait a few seconds and try again.',
          variant: 'default',
        });
        onSearch(query);
        return;
      }

      if (data?.searchTerms) {
        onSearch(data.searchTerms);
        toast({
          title: 'AI Search',
          description: `Interpreted as: "${data.searchTerms}"`,
        });
      } else {
        onSearch(query);
      }
    } catch (error) {
      if (error instanceof PharmacyAiError && error.status === 429) {
        setIsRateLimited(true);
        toast({
          title: 'System Busy',
          description: 'AI is processing many requests. Please wait a few seconds and try again.',
          variant: 'default',
        });
        onSearch(query);
        return;
      }

      console.error('AI search failed:', error);
      onSearch(query);
      toast({
        title: 'Using regular search',
        description: 'AI search unavailable, using standard search instead.',
        variant: 'default',
      });
    } finally {
      setIsAIProcessing(false);
    }
  }, [query, onSearch, toast, pharmacyId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAISearch();
    }
  };

  const handleClear = () => {
    setQuery('');
    setIsRateLimited(false);
    onSearch('');
  };

  return (
    <div className="relative flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsRateLimited(false);
            if (!e.target.value) onSearch('');
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Button
        onClick={handleAISearch}
        disabled={!query.trim() || isAIProcessing}
        className={cn(
          'gap-2 transition-all duration-300',
          isRateLimited ? 'bg-warning hover:bg-warning/90' : 'bg-gradient-primary hover:opacity-90'
        )}
      >
        {isAIProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRateLimited ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {isRateLimited ? 'Busy' : 'AI Search'}
      </Button>
    </div>
  );
};