import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Lock, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// External Supabase URL for edge functions
const EXTERNAL_FUNCTIONS_URL = 'https://sdejkpweecasdzsixxbd.supabase.co/functions/v1';

interface AdminPinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  pharmacyId: string;
  title?: string;
  description?: string;
}

export const AdminPinModal = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  pharmacyId,
  title = 'Admin Authorization Required',
  description = 'Enter admin PIN to proceed with this action'
}: AdminPinModalProps) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [noPinSet, setNoPinSet] = useState(false);

  const handleSubmit = async () => {
    if (!pharmacyId) {
      setError('Pharmacy not found');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // Get auth token for the request
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const fetchResponse = await fetch(`${EXTERNAL_FUNCTIONS_URL}/verify-admin-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          pharmacyId,
          pin,
          action: 'verify'
        }),
      });

      const data = await fetchResponse.json();
      const funcError = !fetchResponse.ok ? { message: data?.error || 'Request failed' } : null;

      if (funcError) {
        console.error('PIN verification error:', funcError);
        setError('Failed to verify PIN. Please try again.');
        return;
      }

      if (data.noPinSet) {
        // No PIN configured, allow action
        setNoPinSet(true);
        setPin('');
        setError(null);
        onSuccess();
        onOpenChange(false);
        return;
      }

      if (data.valid) {
        setPin('');
        setError(null);
        setRemainingAttempts(null);
        onSuccess();
        onOpenChange(false);
        toast.success('Admin PIN verified');
      } else {
        setRemainingAttempts(data.remainingAttempts ?? null);
        
        if (data.remainingAttempts === 0) {
          setError('Too many failed attempts. Please try again in 15 minutes.');
          setTimeout(() => {
            onOpenChange(false);
          }, 3000);
        } else {
          setError(`Incorrect PIN. ${data.remainingAttempts} attempts remaining.`);
        }
        setPin('');
      }
    } catch (err) {
      console.error('PIN verification exception:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setPin('');
    setError(null);
    setRemainingAttempts(null);
    setNoPinSet(false);
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
                if (e.key === 'Enter' && pin.length >= 4 && !isVerifying) {
                  handleSubmit();
                }
              }}
              className="text-center text-2xl tracking-widest"
              autoFocus
              disabled={isVerifying || remainingAttempts === 0}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {noPinSet && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              No admin PIN has been set. Go to Settings to configure Price Shield protection.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isVerifying}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={pin.length < 4 || isVerifying || remainingAttempts === 0}
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify PIN'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
