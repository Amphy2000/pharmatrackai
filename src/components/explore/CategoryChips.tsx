import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Pill, Thermometer, Wind, Heart, Sparkles, Baby, Eye, Bone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface CategoryChipsProps {
  onCategorySelect: (category: string) => void;
  selectedCategory: string | null;
}

const categories = [
  { id: 'pain-relief', label: 'Pain Relief', icon: Pill, keywords: ['paracetamol', 'ibuprofen', 'analgesic', 'pain'] },
  { id: 'malaria', label: 'Malaria Care', icon: Thermometer, keywords: ['antimalarial', 'artemether', 'malaria'] },
  { id: 'cough-cold', label: 'Cough & Cold', icon: Wind, keywords: ['cough', 'cold', 'antitussive', 'decongestant'] },
  { id: 'vitamins', label: 'Vitamins', icon: Sparkles, keywords: ['vitamin', 'supplement', 'multivitamin'] },
  { id: 'antibiotics', label: 'Antibiotics', icon: Heart, keywords: ['antibiotic', 'amoxicillin', 'ciprofloxacin'] },
  { id: 'maternal', label: 'Maternal Care', icon: Baby, keywords: ['prenatal', 'folic', 'maternal', 'pregnancy'] },
  { id: 'eye-care', label: 'Eye Care', icon: Eye, keywords: ['eye', 'drops', 'ophthalmic'] },
  { id: 'bone-joint', label: 'Bone & Joint', icon: Bone, keywords: ['calcium', 'glucosamine', 'bone', 'joint'] },
];

export const CategoryChips = ({ onCategorySelect, selectedCategory }: CategoryChipsProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleCategoryClick = (category: typeof categories[0]) => {
    if (selectedCategory === category.id) {
      onCategorySelect(''); // Deselect
    } else {
      onCategorySelect(category.keywords[0]); // Search by first keyword
    }
  };

  return (
    <div className="relative mb-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => scroll('left')}
          className="h-8 w-8 shrink-0 hidden sm:flex"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide flex-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categories.map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.keywords[0];
            
            return (
              <Badge
                key={category.id}
                variant={isSelected ? "default" : "outline"}
                className={`
                  cursor-pointer whitespace-nowrap px-4 py-2 text-sm font-medium
                  flex items-center gap-2 transition-all shrink-0
                  ${isSelected 
                    ? 'bg-marketplace text-marketplace-foreground hover:bg-marketplace/90' 
                    : 'hover:bg-marketplace/10 hover:border-marketplace/30'
                  }
                `}
                onClick={() => handleCategoryClick(category)}
              >
                <Icon className="h-4 w-4" />
                {category.label}
              </Badge>
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => scroll('right')}
          className="h-8 w-8 shrink-0 hidden sm:flex"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export { categories };
