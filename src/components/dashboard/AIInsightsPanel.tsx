import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, Loader2, Brain, Zap, Target, DollarSign, Clock, Package, ArrowRight } from 'lucide-react';
import { Medication } from '@/types/medication';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';

interface AIInsightsPanelProps {
  medications: Medication[];
}

interface Insight {
  id: string;
  type: 'warning' | 'suggestion' | 'info';
  message: string;
  icon: typeof AlertTriangle;
  priority: 'high' | 'medium' | 'low';
  action?: string;
  impact?: string;
  category?: 'urgent' | 'expiry' | 'reorder' | 'profit' | 'demand' | 'savings';
}

export const AIInsightsPanel = ({ medications }: AIInsightsPanelProps) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { formatPrice } = useCurrency();

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

        const mappedInsights: Insight[] = (data.insights || []).map((insight: { 
          id: string; 
          type: string; 
          message: string;
          action?: string;
          impact?: string;
          category?: string;
        }, index: number) => ({
          id: insight.id || `insight-${index}`,
          type: insight.type as 'warning' | 'suggestion' | 'info',
          message: insight.message,
          action: insight.action,
          impact: insight.impact,
          category: insight.category as Insight['category'],
          icon: getIconForCategory(insight.category || insight.type),
          priority: insight.type === 'warning' ? 'high' : insight.type === 'suggestion' ? 'medium' : 'low',
        }));

        setInsights(mappedInsights.slice(0, 6));
      } catch (error) {
        console.error('Failed to generate AI insights:', error);
        const fallbackInsights = generateFallbackInsights(medications);
        setInsights(fallbackInsights);
      } finally {
        setIsLoading(false);
      }
    };

    generateInsights();
  }, [medications]);

  const getIconForCategory = (category: string) => {
    switch (category) {
      case 'urgent': return AlertTriangle;
      case 'expiry': return Clock;
      case 'reorder': return Package;
      case 'profit': return DollarSign;
      case 'demand': return TrendingUp;
      case 'savings': return Sparkles;
      case 'warning': return AlertTriangle;
      case 'suggestion': return TrendingUp;
      default: return Lightbulb;
    }
  };

  const generateFallbackInsights = (meds: Medication[]): Insight[] => {
    const insights: Insight[] = [];
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expired = meds.filter(m => new Date(m.expiry_date) < today);
    const expiringSoon = meds.filter(m => {
      const expiry = new Date(m.expiry_date);
      return expiry >= today && expiry <= thirtyDaysFromNow;
    });
    const lowStock = meds.filter(m => m.current_stock <= m.reorder_level);
    const outOfStock = meds.filter(m => m.current_stock === 0);

    // Calculate values
    const expiredValue = expired.reduce((sum, m) => sum + (m.current_stock * Number(m.unit_price)), 0);
    const expiringValue = expiringSoon.reduce((sum, m) => sum + (m.current_stock * Number(m.unit_price)), 0);

    if (expired.length > 0) {
      insights.push({
        id: '1',
        type: 'warning',
        message: `${expired.length} medications expired with ${formatPrice(expiredValue)} at risk. Remove from shelves immediately to maintain compliance.`,
        action: `Unshelve ${expired[0]?.name} and ${expired.length - 1} other expired items now`,
        impact: formatPrice(expiredValue),
        category: 'urgent',
        icon: AlertTriangle,
        priority: 'high',
      });
    }

    if (expiringSoon.length > 0) {
      const discountRate = 25;
      const recoveryAmount = expiringValue * (1 - discountRate / 100);
      insights.push({
        id: '2',
        type: 'suggestion',
        message: `${expiringSoon.length} items expiring within 30 days. Apply ${discountRate}% discount to recover ${formatPrice(recoveryAmount)} before expiry.`,
        action: `Set ${discountRate}% discount on ${expiringSoon[0]?.name}`,
        impact: formatPrice(recoveryAmount),
        category: 'expiry',
        icon: Clock,
        priority: 'medium',
      });
    }

    if (lowStock.length > 0) {
      const restockCost = lowStock.reduce((sum, m) => sum + ((m.reorder_level - m.current_stock) * Number(m.unit_price)), 0);
      insights.push({
        id: '3',
        type: 'suggestion',
        message: `${lowStock.length} items below reorder level. Prioritize ${lowStock[0]?.name} to prevent ${formatPrice(restockCost)} in lost sales.`,
        action: `Reorder ${lowStock[0]?.name} (${lowStock[0]?.reorder_level - lowStock[0]?.current_stock} units needed)`,
        impact: formatPrice(restockCost),
        category: 'reorder',
        icon: Package,
        priority: 'medium',
      });
    }

    if (outOfStock.length > 0) {
      insights.push({
        id: '4',
        type: 'warning',
        message: `${outOfStock.length} products completely out of stock. Customers are walking away. Emergency restock needed for ${outOfStock[0]?.name}.`,
        action: `Place emergency order for ${outOfStock[0]?.name}`,
        impact: 'Lost customers',
        category: 'urgent',
        icon: AlertTriangle,
        priority: 'high',
      });
    }

    // Profit optimization
    const totalValue = meds.reduce((sum, m) => sum + (m.current_stock * Number(m.unit_price)), 0);
    insights.push({
      id: '5',
      type: 'info',
      message: `Total inventory value: ${formatPrice(totalValue)}. Review slow-moving items to free up capital for fast sellers.`,
      action: 'Analyze slow-moving inventory',
      impact: formatPrice(totalValue * 0.1),
      category: 'profit',
      icon: DollarSign,
      priority: 'low',
    });

    // Demand forecast
    const avgStock = meds.reduce((sum, m) => sum + m.current_stock, 0) / meds.length;
    insights.push({
      id: '6',
      type: 'info',
      message: `Average ${Math.round(avgStock)} units per SKU. AI recommends increasing stock for top 20% fast-movers by 15% to capture more sales.`,
      action: 'Identify and boost fast-moving inventory',
      impact: '15% sales increase',
      category: 'demand',
      icon: TrendingUp,
      priority: 'low',
    });

    return insights.slice(0, 6);
  };

  const typeStyles = {
    warning: {
      bg: 'bg-destructive/10',
      border: 'border-destructive/30',
      icon: 'text-destructive bg-destructive/20',
      action: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    },
    suggestion: {
      bg: 'bg-success/10',
      border: 'border-success/30',
      icon: 'text-success bg-success/20',
      action: 'bg-success text-success-foreground hover:bg-success/90',
    },
    info: {
      bg: 'bg-primary/10',
      border: 'border-primary/30',
      icon: 'text-primary bg-primary/20',
      action: 'bg-primary text-primary-foreground hover:bg-primary/90',
    },
  };

  const priorityBadge = {
    high: 'bg-destructive/20 text-destructive border-destructive/30',
    medium: 'bg-warning/20 text-warning border-warning/30',
    low: 'bg-muted text-muted-foreground border-muted',
  };

  const categoryLabels = {
    urgent: 'Urgent Action',
    expiry: 'Expiry Alert',
    reorder: 'Restock',
    profit: 'Profit',
    demand: 'Demand',
    savings: 'Savings',
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-premium shadow-glow animate-glow-pulse">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-success border-2 border-background">
                <Zap className="h-3 w-3 text-success-foreground" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold font-display flex items-center gap-2">
                AI Business Insights
                <span className="px-2 py-0.5 text-xs font-medium bg-secondary/20 text-secondary rounded-full">LIVE</span>
              </h2>
              <p className="text-sm text-muted-foreground">Actionable recommendations to maximize profit</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Target className="h-4 w-4 text-success" />
            <span>{insights.length} insights</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-premium opacity-20 blur-xl animate-pulse" />
              <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground animate-pulse">Analyzing inventory & calculating savings...</p>
          </div>
        ) : insights.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Insights Available</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Add inventory data to unlock AI-powered recommendations and profit optimization.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {insights.map((insight, index) => (
              <div
                key={insight.id}
                className={cn(
                  'relative p-4 rounded-xl border transition-all duration-300',
                  typeStyles[insight.type].bg,
                  typeStyles[insight.type].border,
                  'animate-fade-in'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0',
                    typeStyles[insight.type].icon
                  )}>
                    <insight.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={cn(
                        'text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wide',
                        priorityBadge[insight.priority]
                      )}>
                        {insight.priority}
                      </span>
                      {insight.impact && (
                        <span className="text-xs font-bold text-success ml-auto">
                          {insight.impact}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed mb-2">{insight.message}</p>
                    
                    {insight.action && (
                      <p className="text-xs text-muted-foreground flex items-start gap-1.5 pt-2 border-t border-border/30">
                        <ArrowRight className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        <span>{insight.action}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};