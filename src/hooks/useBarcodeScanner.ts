import { useEffect, useCallback, useRef } from 'react';

interface UseBarcodesScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  minLength?: number;
  maxDelay?: number;
}

/**
 * Auto-detect barcode scanner input
 * Barcode scanners typically input characters rapidly followed by Enter
 */
export const useBarcodeScanner = ({
  onScan,
  enabled = true,
  minLength = 3,
  maxDelay = 50, // ms between keystrokes
}: UseBarcodesScannerOptions) => {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Ignore if focus is on an input/textarea (manual typing)
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    const now = Date.now();
    const timeSinceLastKey = now - lastKeyTimeRef.current;

    // Reset buffer if too much time has passed
    if (timeSinceLastKey > maxDelay && bufferRef.current.length > 0) {
      bufferRef.current = '';
    }

    lastKeyTimeRef.current = now;

    if (event.key === 'Enter') {
      // Submit the barcode if buffer has enough characters
      if (bufferRef.current.length >= minLength) {
        event.preventDefault();
        onScan(bufferRef.current);
      }
      bufferRef.current = '';
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      // Add printable characters to buffer
      bufferRef.current += event.key;
    }
  }, [enabled, minLength, maxDelay, onScan]);

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);
};
