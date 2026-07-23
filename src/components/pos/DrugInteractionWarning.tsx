import { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, X, Shield } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Medication } from '@/types/medication';
import { usePharmacy } from '@/hooks/usePharmacy';
import { callPharmacyAiWithFallback } from '@/lib/pharmacyAiClient';
import { checkClinicalInteractions, type DrugInteractionResult } from '@/utils/clinicalInteractionEngine';

interface DrugInteractionWarningProps {
  cartItems: Array<{ medication: Medication; quantity: number }>;
}

const severityConfig = {
  low: {
    icon: Info,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    label: 'Low',
  },
  moderate: {
    icon: AlertCircle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    label: 'Moderate',
  },
  high: {
    icon: AlertTriangle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    label: 'High',
  },
  severe: {
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
    label: 'Severe',
  },
};

export const DrugInteractionWarning = ({ cartItems }: DrugInteractionWarningProps) => {
  const [interactions, setInteractions] = useState<DrugInteractionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [lastCheckedMeds, setLastCheckedMeds] = useState<string>('');
  const { pharmacyId } = usePharmacy();

  useEffect(() => {
    const currentMeds = cartItems
      .map(item => item.medication.name)
      .sort()
      .join('|');

    if (cartItems.length < 2) {
      setInteractions([]);
      setLastCheckedMeds('');
      return;
    }

    if (currentMeds === lastCheckedMeds) {
      return;
    }

    const checkInteractions = async () => {
      setIsLoading(true);
      setDismissed(false);

      // 1. Instant Local Clinical Engine Check (0ms)
      const localInteractions = checkClinicalInteractions(cartItems.map(item => item.medication));

      try {
        // 2. Secondary AI Check
        const data = await callPharmacyAiWithFallback<{ interactions?: DrugInteractionResult[]; error?: string }>({
          actions: ['interaction_check', 'check_drug_interactions'],
          payload: {
            medications: cartItems.map(item => ({
              name: item.medication.name,
              category: item.medication.category,
            })),
          },
          pharmacy_id: pharmacyId,
        });

        if (data?.interactions && Array.isArray(data.interactions) && data.interactions.length > 0) {
          // Merge AI interactions with local interactions avoiding duplicates
          const merged = [...localInteractions];
          const existingKeys = new Set(localInteractions.map(i => i.drugs.sort().join('+')));

          for (const aiInt of data.interactions) {
            const key = (aiInt.drugs || []).sort().join('+');
            if (key && !existingKeys.has(key)) {
              merged.push(aiInt);
              existingKeys.add(key);
            }
          }
          setInteractions(merged);
        } else {
          setInteractions(localInteractions);
        }
      } catch {
        // Safe failover: use local clinical rule engine on network/API failure
        setInteractions(localInteractions);
      } finally {
        setLastCheckedMeds(currentMeds);
        setIsLoading(false);
      }
    };

    const timeout = setTimeout(checkInteractions, 300);
    return () => clearTimeout(timeout);
  }, [cartItems, pharmacyId, lastCheckedMeds]);

  if (dismissed || (interactions.length === 0 && !isLoading)) {
    return null;
  }

  if (isLoading && interactions.length === 0) {
    return (
      <div className="p-3 rounded-lg bg-muted/30 border border-border/50 flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground animate-pulse" />
        <span className="text-sm text-muted-foreground">Checking drug interactions...</span>
      </div>
    );
  }

  const hasHighSeverity = interactions.some(i => i.severity === 'high' || i.severity === 'severe');

  return (
    <Alert className={`w-full ${hasHighSeverity ? 'border-destructive/50 bg-destructive/5' : 'border-orange-500/50 bg-orange-500/5'}`}>
      <div className="flex items-start justify-between w-full">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${hasHighSeverity ? 'text-destructive' : 'text-orange-500'}`} />
          <div className="space-y-2 flex-1 min-w-0">
            <AlertTitle className="text-sm font-semibold">
              Drug Interaction{interactions.length > 1 ? 's' : ''} Detected
            </AlertTitle>
            <AlertDescription className="w-full">
              <div className="max-h-[40vh] overflow-y-auto w-full pr-3">
                <div className="space-y-2">
                  {interactions.map((interaction, index) => {
                    const config = severityConfig[interaction.severity] || severityConfig.moderate;
                    const Icon = config.icon;

                    return (
                      <div
                        key={index}
                        className={`p-2 rounded-md ${config.bgColor} ${config.borderColor} border`}
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Icon className={`h-3 w-3 ${config.color}`} />
                          <span className="font-medium text-xs min-w-0 break-words">
                            {interaction.drugs.join(' + ')}
                          </span>
                          <Badge variant="outline" className={`text-[10px] ${config.color} border-current`}>
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground break-words">{interaction.description}</p>
                        <p className="text-xs font-medium mt-1 break-words">{interaction.recommendation}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </AlertDescription>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1" onClick={() => setDismissed(true)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </Alert>
  );
};
