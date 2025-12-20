import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, Loader2 } from 'lucide-react';
import { Medication } from '@/types/medication';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface AIInsightsPanelProps {
  medications: Medication[];
}

interface Insight {
  id: string;
  type: 'warning' | 'suggestion' | 'info';
  message: string;
  icon: typeof AlertTriangle;
}

export const AIInsightsPanel = ({ medications }: AIInsightsPanelProps) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateInsights = async () => {
      if (medications.length === 0) {
        setInsights([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('generate-insights', {
          body: { medications }
        });

        if (error) throw error;

        const mappedInsights: Insight[] = (data.insights || []).map((insight: { id: string; type: string; message: string }, index: number) => ({
          id: insight.id || `insight-${index}`,
          type: insight.type as 'warning' | 'suggestion' | 'info',
          message: insight.message,
          icon: insight.type === 'warning' ? AlertTriangle : 
                insight.type === 'suggestion' ? TrendingUp : Lightbulb,
        }));

        setInsights(mappedInsights.slice(0, 3));
      } catch (error) {
        console.error('Failed to generate AI insights:', error);
        // Fallback to static insights if AI fails
        const fallbackInsights = generateFallbackInsights(medications);
        setInsights(fallbackInsights);
      } finally {
        setIsLoading(false);
      }
    };

    generateInsights();
  }, [medications]);

  const generateFallbackInsights = (meds: Medication[]): Insight[] => {
    const insights: Insight[] = [];
    const today = new Date();

    // Check for expired items
    const expired = meds.filter(m => new Date(m.expiry_date) < today);
    if (expired.length > 0) {
      insights.push({
        id: '1',
        type: 'warning',
        message: `${expired.length} medication(s) have expired and require immediate attention. Consider disposing of ${expired[0]?.name} batch ${expired[0]?.batch_number}.`,
        icon: AlertTriangle,
      });
    }

    // Check for low stock items
    const lowStock = meds.filter(m => m.current_stock <= m.reorder_level);
    if (lowStock.length > 0) {
      insights.push({
        id: '2',
        type: 'suggestion',
        message: `${lowStock[0]?.name} stock is running low (${lowStock[0]?.current_stock} units remaining). Consider placing a reorder soon to maintain adequate supply.`,
        icon: TrendingUp,
      });
    }

    // General optimization suggestion
    if (meds.length > 0) {
      const avgStock = meds.reduce((sum, m) => sum + m.current_stock, 0) / meds.length;
      insights.push({
        id: '3',
        type: 'info',
        message: `Average inventory level is ${Math.round(avgStock)} units per SKU. Review fast-moving items to optimize stock levels.`,
        icon: Lightbulb,
      });
    }

    return insights.slice(0, 3);
  };

  const typeStyles = {
    warning: 'border-l-alert-red bg-alert-red-light',
    suggestion: 'border-l-teal bg-teal-light',
    info: 'border-l-medical-blue bg-medical-blue-light',
  };

  const iconStyles = {
    warning: 'text-alert-red',
    suggestion: 'text-teal',
    info: 'text-medical-blue',
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <h2 className="text-lg font-semibold font-display text-foreground">AI Insights</h2>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Analyzing inventory...</span>
        </div>
      ) : insights.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <Lightbulb className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">No insights available. Add more inventory data.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div
              key={insight.id}
              className={cn(
                'rounded-lg border-l-4 p-4 transition-all duration-300 hover:shadow-md animate-fade-in',
                typeStyles[insight.type]
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-3">
                <insight.icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', iconStyles[insight.type])} />
                <p className="text-sm text-foreground leading-relaxed">{insight.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
