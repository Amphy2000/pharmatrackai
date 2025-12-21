import { useEffect, useCallback, useRef } from 'react';

interface UseBarcodesScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  minLength?: number;
  maxDelay?: number;
  /**
   * If true, scanner will work even when input/textarea is focused
   * The barcode will be captured and the input's value will be cleared
   */
  captureInInputs?: boolean;
  /**
   * Optional: specific input ref to monitor for barcode scans
   */
  inputRef?: React.RefObject<HTMLInputElement>;
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
  captureInInputs = false,
  inputRef,
}: UseBarcodesScannerOptions) => {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const isCapturingRef = useRef<boolean>(false);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const target = event.target as HTMLElement;
    const isInputField = 
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.isContentEditable;

    // If we're in an input and captureInInputs is false, ignore
    if (isInputField && !captureInInputs) {
      return;
    }

    // If inputRef is specified, only capture when that input is focused
    if (inputRef?.current && document.activeElement !== inputRef.current) {
      // Still allow global scanning when no input is focused
      if (isInputField) return;
    }

    const now = Date.now();
    const timeSinceLastKey = now - lastKeyTimeRef.current;

    // Detect rapid input (barcode scanner characteristic)
    const isRapidInput = timeSinceLastKey <= maxDelay;

    // Reset buffer if too much time has passed (manual typing)
    if (!isRapidInput && bufferRef.current.length > 0) {
      bufferRef.current = '';
      isCapturingRef.current = false;
    }

    lastKeyTimeRef.current = now;

    if (event.key === 'Enter') {
      // Submit the barcode if buffer has enough characters and was rapid input
      if (bufferRef.current.length >= minLength && isCapturingRef.current) {
        event.preventDefault();
        event.stopPropagation();
        
        const barcode = bufferRef.current;
        
        // Clear the input field if we captured in an input
        if (isInputField && captureInInputs) {
          const inputElement = target as HTMLInputElement;
          // Remove the scanned characters from the input
          if (inputElement.value.endsWith(barcode)) {
            inputElement.value = inputElement.value.slice(0, -barcode.length);
          } else {
            inputElement.value = '';
          }
        }
        
        onScan(barcode);
      }
      bufferRef.current = '';
      isCapturingRef.current = false;
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      // Add printable characters to buffer
      bufferRef.current += event.key;
      
      // Mark as capturing if this is rapid input
      if (isRapidInput || bufferRef.current.length === 1) {
        if (bufferRef.current.length > 1 && isRapidInput) {
          isCapturingRef.current = true;
        }
      }
    }
  }, [enabled, minLength, maxDelay, onScan, captureInInputs, inputRef]);

  useEffect(() => {
    if (enabled) {
      // Use capture phase to intercept before input receives the character
      window.addEventListener('keydown', handleKeyDown, { capture: captureInInputs });
      return () => window.removeEventListener('keydown', handleKeyDown, { capture: captureInInputs });
    }
  }, [enabled, handleKeyDown, captureInInputs]);
};
