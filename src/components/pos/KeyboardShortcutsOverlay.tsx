import { useEffect, useState } from 'react';
import { X, Keyboard, Plus, Minus, Search, ShoppingCart, Pause, FileText, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShortcutItem {
  keys: string[];
  description: string;
  icon: React.ReactNode;
}

const shortcuts: ShortcutItem[] = [
  { keys: ['+'], description: 'Increase quantity', icon: <Plus className="h-4 w-4" /> },
  { keys: ['-'], description: 'Decrease quantity', icon: <Minus className="h-4 w-4" /> },
  { keys: ['Enter'], description: 'Open checkout', icon: <ShoppingCart className="h-4 w-4" /> },
  { keys: ['H'], description: 'Hold sale', icon: <Pause className="h-4 w-4" /> },
  { keys: ['I'], description: 'Invoice', icon: <FileText className="h-4 w-4" /> },
  { keys: ['/'], description: 'Toggle help', icon: <HelpCircle className="h-4 w-4" /> },
];

interface KeyboardShortcutsOverlayProps {
  open: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsOverlay = ({ open, onClose }: KeyboardShortcutsOverlayProps) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
      
      {/* Modal */}
      <div 
        className={cn(
          "relative w-full max-w-lg bg-card rounded-2xl shadow-elevated border border-border/50",
          "animate-scale-in"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Keyboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Keyboard Shortcuts</h2>
              <p className="text-xs text-muted-foreground">Speed up your workflow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-5 space-y-2 max-h-[60vh] overflow-y-auto">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-muted-foreground">
                  {shortcut.icon}
                </div>
                <span className="text-sm font-medium">{shortcut.description}</span>
              </div>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-muted-foreground text-xs mx-1">/</span>}
                    <kbd className="px-2 py-1 text-xs font-mono font-semibold bg-background border border-border rounded-md shadow-sm">
                      {key}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50 bg-muted/20 rounded-b-2xl">
          <p className="text-xs text-center text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background border border-border rounded">/</kbd> anytime to toggle this overlay
          </p>
        </div>
      </div>
    </div>
  );
};