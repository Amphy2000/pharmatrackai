import { useMedications } from '@/hooks/useMedications';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const ProfitMarginAnalyzer = () => {
  const { medications } = useMedications();
  const { formatPrice } = useCurrency();

  // Calculate profit margins for each product
  const productsWithMargin = (medications || [])
    .filter(med => med.selling_price && med.selling_price > 0)
    .map(med => {
      const costPrice = med.unit_price;
      const sellingPrice = med.selling_price || med.unit_price;
      const margin = ((sellingPrice - costPrice) / sellingPrice) * 100;
      const profit = sellingPrice - costPrice;
      
      return {
        id: med.id,
        name: med.name,
        costPrice,
        sellingPrice,
        margin: Math.round(margin * 10) / 10,
        profit,
        stock: med.current_stock,
        potentialProfit: profit * med.current_stock,
      };
    })
    .sort((a, b) => b.margin - a.margin);

  // Top 20% most profitable
  const top20Percent = productsWithMargin.slice(0, Math.ceil(productsWithMargin.length * 0.2));
  
  // Average margin
  const avgMargin = productsWithMargin.length > 0
    ? productsWithMargin.reduce((sum, p) => sum + p.margin, 0) / productsWithMargin.length
    : 0;

  // Total potential profit
  const totalPotentialProfit = productsWithMargin.reduce((sum, p) => sum + p.potentialProfit, 0);

  // Chart data - top 10 by margin
  const chartData = productsWithMargin.slice(0, 10).map(p => ({
    name: p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name,
    margin: p.margin,
    profit: p.profit,
  }));

  const getMarginColor = (margin: number) => {
    if (margin >= 30) return 'hsl(var(--success))';
    if (margin >= 20) return 'hsl(var(--primary))';
    if (margin >= 10) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-success/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <CardTitle className="text-lg">Profit Margin Analyzer</CardTitle>
              <CardDescription>Identify your most profitable products</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
            <DollarSign className="h-3 w-3 mr-1" />
            {formatPrice(totalPotentialProfit)} potential
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-muted/50">
            <p className="text-sm text-muted-foreground">Avg Margin</p>
            <p className="text-2xl font-bold">{avgMargin.toFixed(1)}%</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50">
            <p className="text-sm text-muted-foreground">Top Performers</p>
            <p className="text-2xl font-bold">{top20Percent.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50">
            <p className="text-sm text-muted-foreground">Products Analyzed</p>
            <p className="text-2xl font-bold">{productsWithMargin.length}</p>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 'dataMax']} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Margin']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="margin" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getMarginColor(entry.margin)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top 5 Products */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Top 5 Most Profitable</h4>
          {top20Percent.slice(0, 5).map((product, index) => (
            <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                <div>
                  <p className="font-medium text-sm">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Cost: {formatPrice(product.costPrice)} → Sell: {formatPrice(product.sellingPrice)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge 
                  variant="outline" 
                  className={`${product.margin >= 25 ? 'bg-success/10 text-success border-success/20' : 'bg-primary/10 text-primary border-primary/20'}`}
                >
                  {product.margin}% margin
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatPrice(product.profit)} per unit
                </p>
              </div>
            </div>
          ))}
        </div>

        {productsWithMargin.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Add selling prices to your products to see margin analysis</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
