import { useState, useCallback } from 'react';
import { Search, Sparkles, Loader2, X, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { usePharmacy } from '@/hooks/usePharmacy';

// External Supabase project URL
const EXTERNAL_SUPABASE_URL = 'https://sdejkpweecasdzsixxbd.supabase.co';

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
      // Get auth token if available
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${EXTERNAL_SUPABASE_URL}/functions/v1/ai-search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          query: query.trim(),
          pharmacy_id: pharmacyId 
        }),
      });

      if (response.status === 429) {
        setIsRateLimited(true);
        toast({
          title: 'System Busy',
          description: 'AI is processing many requests. Please wait a few seconds and try again.',
          variant: 'default',
        });
        // Fallback to regular search
        onSearch(query);
        return;
      }

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data.rateLimited) {
        setIsRateLimited(true);
        toast({
          title: 'System Busy',
          description: 'AI is processing many requests. Please wait a few seconds and try again.',
          variant: 'default',
        });
        onSearch(query);
        return;
      }

      // The AI returns interpreted search terms
      if (data.searchTerms) {
        onSearch(data.searchTerms);
        toast({
          title: 'AI Search',
          description: `Interpreted as: "${data.searchTerms}"`,
        });
      } else {
        onSearch(query);
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