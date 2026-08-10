import { HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ButtonHelpHintProps {
  title: string;
  description: string;
  tip?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const ButtonHelpHint = ({
  title,
  description,
  tip,
  side = 'top',
  className = '',
}: ButtonHelpHintProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={`text-muted-foreground/60 hover:text-primary transition-colors p-0.5 rounded-full hover:bg-primary/10 inline-flex items-center justify-center focus:outline-none shrink-0 ${className}`}
          title={`Help: ${title}`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} align="center" className="w-72 p-3 text-xs space-y-1.5 shadow-xl border-border/80 z-50">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <HelpCircle className="h-4 w-4 text-primary shrink-0" />
          <span>{title}</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
        {tip && (
          <div className="pt-1.5 text-[11px] text-primary font-medium border-t border-border/40">
            💡 <strong>Pro Tip:</strong> {tip}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
