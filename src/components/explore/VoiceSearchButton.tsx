import { useState, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface VoiceSearchButtonProps {
  onResult: (transcript: string) => void;
  className?: string;
}

export const VoiceSearchButton = ({ onResult, className = '' }: VoiceSearchButtonProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const startListening = useCallback(() => {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        title: "Voice search not supported",
        description: "Your browser doesn't support voice search. Try Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-NG'; // Nigerian English
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setIsProcessing(false);
    };

    recognition.onresult = (event: any) => {
      setIsListening(false);
      setIsProcessing(true);
      
      const transcript = event.results[0][0].transcript;
      console.log('Voice transcript:', transcript);
      
      // Process the transcript for natural language
      const processedQuery = processNaturalLanguage(transcript);
      
      setTimeout(() => {
        setIsProcessing(false);
        onResult(processedQuery);
        toast({
          title: "Voice captured",
          description: `Searching for "${processedQuery}"`,
        });
      }, 300);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      setIsProcessing(false);
      console.error('Speech recognition error:', event.error);
      
      let errorMessage = "Couldn't hear you. Please try again.";
      if (event.error === 'not-allowed') {
        errorMessage = "Microphone access denied. Please enable it in your browser settings.";
      } else if (event.error === 'no-speech') {
        errorMessage = "No speech detected. Tap and speak clearly.";
      }
      
      toast({
        title: "Voice search failed",
        description: errorMessage,
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      if (isListening) {
        setIsListening(false);
      }
    };

    recognition.start();
  }, [onResult, toast, isListening]);

  // Process natural language queries to extract medication intent
  const processNaturalLanguage = (transcript: string): string => {
    const lower = transcript.toLowerCase().trim();
    
    // Common phrase patterns that indicate symptom-based search
    const symptomPatterns = [
      { patterns: ['drug for', 'medicine for', 'medication for', 'something for', 'what can i take for', 'need something for'], extractAfter: true },
      { patterns: ['i have', 'i\'m having', 'i have a', 'suffering from', 'feeling'], extractAfter: true },
      { patterns: ['for my', 'to treat', 'to cure', 'to help with'], extractAfter: true },
    ];

    // Try to extract the symptom/condition from natural language
    for (const { patterns, extractAfter } of symptomPatterns) {
      for (const pattern of patterns) {
        const index = lower.indexOf(pattern);
        if (index !== -1 && extractAfter) {
          const extracted = lower.slice(index + pattern.length).trim();
          // Clean up common trailing words
          const cleaned = extracted
            .replace(/please$/i, '')
            .replace(/thanks$/i, '')
            .replace(/thank you$/i, '')
            .trim();
          if (cleaned.length > 0) {
            return cleaned;
          }
        }
      }
    }

    // Return original transcript if no pattern matched
    return transcript.trim();
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={startListening}
      disabled={isListening || isProcessing}
      className={`relative ${className} ${isListening ? 'text-destructive animate-pulse' : 'text-muted-foreground hover:text-foreground'}`}
      title="Voice search"
    >
      {isProcessing ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : isListening ? (
        <>
          <MicOff className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive animate-ping" />
        </>
      ) : (
        <Mic className="h-5 w-5" />
      )}
    </Button>
  );
};
