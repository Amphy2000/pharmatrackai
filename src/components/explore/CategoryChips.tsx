import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Pill, Thermometer, Wind, Heart, Sparkles, Baby, Eye, Bone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface CategoryChipsProps {
  onCategorySelect: (category: string) => void;
  selectedCategory: string | null;
}

const categories = [
  { id: 'pain-relief', label: 'Pain Relief', icon: Pill, keywords: ['paracetamol', 'ibuprofen', 'analgesic', 'pain'], color: 'from-red-500 to-orange-500' },
  { id: 'malaria', label: 'Malaria Care', icon: Thermometer, keywords: ['antimalarial', 'artemether', 'malaria'], color: 'from-purple-500 to-pink-500' },
  { id: 'cough-cold', label: 'Cough & Cold', icon: Wind, keywords: ['cough', 'cold', 'antitussive', 'decongestant'], color: 'from-blue-500 to-cyan-500' },
  { id: 'vitamins', label: 'Vitamins', icon: Sparkles, keywords: ['vitamin', 'supplement', 'multivitamin'], color: 'from-yellow-500 to-orange-400' },
  { id: 'antibiotics', label: 'Antibiotics', icon: Heart, keywords: ['antibiotic', 'amoxicillin', 'ciprofloxacin'], color: 'from-green-500 to-emerald-500' },
  { id: 'maternal', label: 'Maternal', icon: Baby, keywords: ['prenatal', 'folic', 'maternal', 'pregnancy'], color: 'from-pink-500 to-rose-500' },
  { id: 'eye-care', label: 'Eye Care', icon: Eye, keywords: ['eye', 'drops', 'ophthalmic'], color: 'from-indigo-500 to-blue-500' },
  { id: 'bone-joint', label: 'Bone & Joint', icon: Bone, keywords: ['calcium', 'glucosamine', 'bone', 'joint'], color: 'from-amber-500 to-yellow-500' },
];

export const CategoryChips = ({ onCategorySelect, selectedCategory }: CategoryChipsProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkArrows = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkArrows();
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkArrows);
      return () => scrollElement.removeEventListener('scroll', checkArrows);
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 150;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleCategoryClick = (category: typeof categories[0]) => {
    if (selectedCategory === category.keywords[0]) {
      onCategorySelect(''); // Deselect
    } else {
      onCategorySelect(category.keywords[0]); // Search by first keyword
    }
  };

  return (
    <div className="relative mb-4 md:mb-6">
      {/* Gradient fade indicators */}
      {showLeftArrow && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none md:hidden" />
      )}
      {showRightArrow && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none md:hidden" />
      )}

      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Left Arrow - Desktop only */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => scroll('left')}
          className={`h-8 w-8 shrink-0 hidden md:flex transition-opacity ${showLeftArrow ? 'opacity-100' : 'opacity-0'}`}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide flex-1 py-1 -my-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categories.map((category, index) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.keywords[0];
            
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
              >
                <Badge
                  variant={isSelected ? "default" : "outline"}
                  className={`
                    cursor-pointer whitespace-nowrap px-3 md:px-4 py-2 text-xs md:text-sm font-medium
                    flex items-center gap-1.5 md:gap-2 transition-all shrink-0 rounded-full
                    active:scale-95 touch-manipulation select-none
                    ${isSelected 
                      ? `bg-gradient-to-r ${category.color} text-white border-0 shadow-md` 
                      : 'hover:bg-muted/80 hover:border-marketplace/30 bg-background/80 backdrop-blur-sm'
                    }
                  `}
                  onClick={() => handleCategoryClick(category)}
                >
                  <Icon className={`h-3.5 w-3.5 md:h-4 md:w-4 ${isSelected ? '' : 'text-muted-foreground'}`} />
                  <span className={isSelected ? '' : 'text-foreground'}>{category.label}</span>
                </Badge>
              </motion.div>
            );
          })}
        </div>

        {/* Right Arrow - Desktop only */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => scroll('right')}
          className={`h-8 w-8 shrink-0 hidden md:flex transition-opacity ${showRightArrow ? 'opacity-100' : 'opacity-0'}`}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export { categories };
