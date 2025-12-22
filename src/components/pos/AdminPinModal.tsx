import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Lock, AlertTriangle } from 'lucide-react';

interface AdminPinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  adminPinHash: string | null;
  title?: string;
  description?: string;
}

// Simple hash function for PIN verification (in production, use bcrypt on server)
const hashPin = (pin: string): string => {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
};

export const AdminPinModal = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  adminPinHash,
  title = 'Admin Authorization Required',
  description = 'Enter admin PIN to proceed with this action'
}: AdminPinModalProps) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = () => {
    if (!adminPinHash) {
      // No PIN set, allow action (first-time setup)
      onSuccess();
      onOpenChange(false);
      return;
    }

    const enteredHash = hashPin(pin);
    
    if (enteredHash === adminPinHash) {
      setPin('');
      setError(null);
      setAttempts(0);
      onSuccess();
      onOpenChange(false);
    } else {
      setAttempts(a => a + 1);
      setError(`Incorrect PIN. ${3 - attempts - 1} attempts remaining.`);
      setPin('');
      
      if (attempts >= 2) {
        setError('Too many failed attempts. Please contact admin.');
        setTimeout(() => {
          onOpenChange(false);
          setAttempts(0);
        }, 2000);
      }
    }
  };

  const handleClose = () => {
    setPin('');
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="admin-pin" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Admin PIN
            </Label>
            <Input
              id="admin-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="Enter 4-6 digit PIN"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ''));
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pin.length >= 4) {
                  handleSubmit();
                }
              }}
              className="text-center text-2xl tracking-widest"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          {!adminPinHash && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              No admin PIN has been set. Go to Settings to configure Price Shield protection.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={pin.length < 4 || attempts >= 3}
          >
            Verify PIN
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Export the hash function for setting PIN
export { hashPin };