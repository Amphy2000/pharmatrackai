import { useState, useCallback } from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface AISearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

// 0ms Autopilot Natural Language Clinical Query Expansion Dictionary
const CLINICAL_INTENT_MAP: Array<{ keywords: string[]; searchExpand: string; label: string }> = [
  {
    keywords: ['fever', 'headache', 'body pain', 'analgesic', 'painkiller', 'pain', 'temperature'],
    searchExpand: 'paracetamol ibuprofen diclofenac panadol acetaminophen analgesics',
    label: 'Analgesics & Antipyretics'
  },
  {
    keywords: ['malaria', 'fever antimalarial', 'typhoid'],
    searchExpand: 'artemether lumefantrine amatem coartem lonart artesunate antimalarial',
    label: 'Antimalarials'
  },
  {
    keywords: ['cough', 'cold', 'catarrh', 'flu', 'runny nose', 'sore throat'],
    searchExpand: 'cough syrup emzolyn benadryl piriton procold flutabs lozenges',
    label: 'Cold & Cough Remedies'
  },
  {
    keywords: ['antibiotic', 'infection', 'bacterial'],
    searchExpand: 'amoxicillin ciprofloxacin ciprotab augmentin azithromycin doxycycline flagyl metronidazole',
    label: 'Antibiotics & Anti-infectives'
  },
  {
    keywords: ['hypertension', 'blood pressure', 'bp', 'high bp', 'heart'],
    searchExpand: 'amlodipine lisinopril losartan atenolol nifedipine antihypertensive',
    label: 'Antihypertensives'
  },
  {
    keywords: ['diabetes', 'sugar', 'blood sugar', 'diabetic'],
    searchExpand: 'metformin glibenclamide glimepiride insulin antidiabetic',
    label: 'Antidiabetic Agents'
  },
  {
    keywords: ['ulcer', 'stomach', 'heartburn', 'acid', 'indigestion'],
    searchExpand: 'gestid omeprazole antacid pantoprazole nexium gastrogel',
    label: 'Gastrointestinal & Antacids'
  },
  {
    keywords: ['fungal', 'ringworm', 'candidiasis', 'itching', 'skin'],
    searchExpand: 'fluconazole ketoconazole flucosten clotrimazole cream antifungal',
    label: 'Antifungals & Dermatologicals'
  },
  {
    keywords: ['vitamin', 'supplement', 'booster', 'blood tonic', 'blood'],
    searchExpand: 'vitamin c multivitamin iron ferrous B-complex zinc supplement',
    label: 'Vitamins & Supplements'
  }
];

export const AISearchBar = ({ onSearch, placeholder = "Search medications, conditions (e.g., 'fever', 'cough', 'malaria')..." }: AISearchBarProps) => {
  const [query, setQuery] = useState('');
  const { toast } = useToast();

  const handleAISearch = useCallback(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return;

    // 0ms Autopilot Intent Matching
    const intentMatch = CLINICAL_INTENT_MAP.find(intent =>
      intent.keywords.some(kw => cleanQuery.includes(kw))
    );

    if (intentMatch) {
      onSearch(intentMatch.searchExpand);
      toast({
        title: '✨ Autopilot Smart Search',
        description: `Searching category: ${intentMatch.label}`,
      });
    } else {
      onSearch(cleanQuery);
      toast({
        title: '✨ Smart Search',
        description: `Filtered by "${query.trim()}"`,
      });
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
        disabled={!query.trim()}
        className="gap-2 bg-gradient-primary hover:opacity-90 transition-all duration-300"
      >
        <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
        Smart Search
      </Button>
    </div>
  );
};