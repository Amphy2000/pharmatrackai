import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  Award,
  Users,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCurrency } from '@/contexts/CurrencyContext';

interface ManagerKPI {
  title: string;
  value: string;
  change: number;
  target?: string;
  progress?: number;
  icon: React.ReactNode;
  variant: 'success' | 'warning' | 'primary' | 'secondary';
}

export const ManagerKPIPanel = () => {
  const { formatPrice } = useCurrency();
  
  // In a real app, these would come from API/database
  const kpis: ManagerKPI[] = [
    {
      title: "Today's Revenue",
      value: formatPrice(125000),
      change: 12.5,
      target: formatPrice(150000),
      progress: 83,
      icon: <DollarSign className="h-5 w-5" />,
      variant: 'success',
    },
    {
      title: 'Gross Margin',
      value: '32.4%',
      change: 2.1,
      target: '35%',
      progress: 92,
      icon: <TrendingUp className="h-5 w-5" />,
      variant: 'primary',
    },
    {
      title: 'Transactions',
      value: '48',
      change: 8,
      icon: <ShoppingBag className="h-5 w-5" />,
      variant: 'secondary',
    },
    {
      title: 'Avg. Basket',
      value: formatPrice(2604),
      change: -3.2,
      icon: <Target className="h-5 w-5" />,
      variant: 'warning',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-secondary">
            <BarChart3 className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display">Business Performance</h2>
            <p className="text-sm text-muted-foreground">Real-time KPIs and targets</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-success/10 text-success border-success/30">
          <span className="w-2 h-2 rounded-full bg-success mr-2 animate-pulse" />
          Live
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="metric-card group">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div 
                  className={`p-2.5 rounded-xl ${
                    kpi.variant === 'success'
                      ? 'bg-success/20 text-success'
                      : kpi.variant === 'warning'
                      ? 'bg-warning/20 text-warning'
                      : kpi.variant === 'primary'
                      ? 'bg-primary/20 text-primary'
                      : 'bg-secondary/20 text-secondary'
                  }`}
                >
                  {kpi.icon}
                </div>
                <div 
                  className={`flex items-center gap-1 text-xs font-medium ${
                    kpi.change >= 0 ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {kpi.change >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(kpi.change)}%
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{kpi.title}</p>
                <p className="text-xl font-bold tabular-nums">{kpi.value}</p>
              </div>
              
              {kpi.progress !== undefined && (
                <div className="mt-3 space-y-1">
                  <Progress value={kpi.progress} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    Target: {kpi.target}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
