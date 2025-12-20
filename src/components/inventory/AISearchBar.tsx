import { useState, useCallback } from 'react';
import { Search, Sparkles, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AISearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export const AISearchBar = ({ onSearch, placeholder = "Search medications..." }: AISearchBarProps) => {
  const [query, setQuery] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const { toast } = useToast();

  const handleAISearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsAIProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-search', {
        body: { query: query.trim() }
      });

      if (error) throw error;

      // The AI returns interpreted search terms
      if (data.searchTerms) {
        onSearch(data.searchTerms);
        toast({
          title: 'AI Search',
          description: `Interpreted as: "${data.searchTerms}"`,
        });
      }
    } catch (error) {
      console.error('AI search failed:', error);
      // Fallback to regular search
      onSearch(query);
      toast({
        title: 'Using regular search',
        description: 'AI search unavailable, using standard search instead.',
        variant: 'default',
      });
    } finally {
      setIsAIProcessing(false);
    }
  }, [query, onSearch, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAISearch();
    }
  };

  const handleClear = () => {
    setQuery('');
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
          'bg-gradient-primary hover:opacity-90'
        )}
      >
        {isAIProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        AI Search
      </Button>
    </div>
  );
};
