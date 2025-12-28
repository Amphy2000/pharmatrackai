import { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface DrugSuggestion {
  id: string;
  product_name: string;
  category: string;
  manufacturer: string | null;
}

interface DrugSearchAutocompleteProps {
  value: string;
  onSelect: (name: string, category: string) => void;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const DrugSearchAutocomplete = ({
  value,
  onSelect,
  onChange,
  placeholder = "Search or type medication name...",
  className,
}: DrugSearchAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<DrugSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const searchDrugs = async () => {
      if (!value || value.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('master_barcode_library')
          .select('id, product_name, category, manufacturer')
          .ilike('product_name', `%${value}%`)
          .limit(10);

        if (error) throw error;
        setSuggestions(data || []);
        setIsOpen(true);
      } catch (error) {
        console.error('Error searching drugs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchDrugs, 300);
    return () => clearTimeout(debounce);
  }, [value]);

  const handleSelect = (suggestion: DrugSuggestion) => {
    onSelect(suggestion.product_name, suggestion.category);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          <div className="p-2 text-xs text-muted-foreground border-b border-border">
            Common Nigerian medications
          </div>
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              onClick={() => handleSelect(suggestion)}
              className={cn(
                "px-3 py-2 cursor-pointer transition-colors",
                highlightedIndex === index
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              )}
            >
              <div className="font-medium">{suggestion.product_name}</div>
              <div className="text-xs text-muted-foreground flex gap-2">
                <span className="bg-muted px-1.5 py-0.5 rounded">{suggestion.category}</span>
                {suggestion.manufacturer && (
                  <span>by {suggestion.manufacturer}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};