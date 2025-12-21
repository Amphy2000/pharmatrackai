import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, BarChart3, Calendar } from 'lucide-react';
import { Medication } from '@/types/medication';
import { cn } from '@/lib/utils';
import { addDays, format, parseISO, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';

interface InventoryChartsProps {
  medications: Medication[];
}

export const InventoryCharts = ({ medications }: InventoryChartsProps) => {
  const { formatPrice } = useCurrency();
  const chartColors = {
    primary: 'hsl(186 100% 50%)',
    secondary: 'hsl(265 90% 65%)',
    success: 'hsl(152 82% 45%)',
    warning: 'hsl(38 100% 55%)',
    danger: 'hsl(0 90% 60%)',
  };

  // Expiry Timeline Data
  const expiryData = useMemo(() => {
    const today = new Date();
    const ranges = [
      { label: 'Expired', days: 0, color: chartColors.danger },
      { label: '0-30 days', days: 30, color: chartColors.warning },
      { label: '30-60 days', days: 60, color: chartColors.primary },
      { label: '60-90 days', days: 90, color: chartColors.secondary },
      { label: '90+ days', days: Infinity, color: chartColors.success },
    ];

    return ranges.map((range, index) => {
      const count = medications.filter(med => {
        const expiryDate = parseISO(med.expiry_date);
        const daysUntilExpiry = differenceInDays(expiryDate, today);
        
        if (index === 0) return daysUntilExpiry < 0;
        if (index === ranges.length - 1) return daysUntilExpiry >= ranges[index - 1].days;
        return daysUntilExpiry >= (ranges[index - 1]?.days || 0) && daysUntilExpiry < range.days;
      }).length;

      return {
        name: range.label,
        value: count,
        color: range.color,
      };
    });
  }, [medications]);

  // Category Distribution
  const categoryData = useMemo(() => {
    const categories: Record<string, { count: number; value: number }> = {};
    
    medications.forEach(med => {
      if (!categories[med.category]) {
        categories[med.category] = { count: 0, value: 0 };
      }
      categories[med.category].count += 1;
      categories[med.category].value += med.current_stock * Number(med.unit_price);
    });

    const colors = [chartColors.primary, chartColors.secondary, chartColors.success, chartColors.warning, chartColors.danger];
    
    return Object.entries(categories).map(([name, data], index) => ({
      name,
      count: data.count,
      value: Math.round(data.value),
      color: colors[index % colors.length],
    }));
  }, [medications]);

  // Stock Levels
  const stockData = useMemo(() => {
    return medications.slice(0, 8).map(med => ({
      name: med.name.length > 12 ? med.name.substring(0, 12) + '...' : med.name,
      stock: med.current_stock,
      reorder: med.reorder_level,
      fill: med.current_stock <= med.reorder_level ? chartColors.warning : chartColors.primary,
    }));
  }, [medications]);

  // Financial Impact Data
  const financialData = useMemo(() => {
    const today = new Date();
    let expiredValue = 0;
    let atRiskValue = 0;
    let safeValue = 0;

    medications.forEach(med => {
      const expiryDate = parseISO(med.expiry_date);
      const daysUntilExpiry = differenceInDays(expiryDate, today);
      const value = med.current_stock * Number(med.unit_price);

      if (daysUntilExpiry < 0) {
        expiredValue += value;
      } else if (daysUntilExpiry <= 30) {
        atRiskValue += value;
      } else {
        safeValue += value;
      }
    });

    return [
      { name: 'Expired', value: Math.round(expiredValue), color: chartColors.danger },
      { name: 'At Risk', value: Math.round(atRiskValue), color: chartColors.warning },
      { name: 'Safe', value: Math.round(safeValue), color: chartColors.success },
    ];
  }, [medications]);

  const totalValue = financialData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-3 rounded-xl border border-border/50">
          <p className="text-sm font-medium text-foreground">{label || payload[0]?.name}</p>
          <p className="text-lg font-bold text-primary">{payload[0]?.value?.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  if (medications.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 max-w-full overflow-hidden">
      {/* Expiry Timeline */}
      <div className="chart-container">
        <div className="section-header">
          <div className="section-icon">
            <Calendar className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold font-display">Expiry Timeline</h3>
            <p className="text-sm text-muted-foreground">Medications by expiry period</p>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={expiryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 18%)" />
              <XAxis type="number" stroke="hsl(215 20% 55%)" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="hsl(215 20% 55%)" fontSize={12} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {expiryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Distribution */}
      <div className="chart-container">
        <div className="section-header">
          <div className="section-icon">
            <PieChartIcon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold font-display">Category Distribution</h3>
            <p className="text-sm text-muted-foreground">Inventory by category</p>
          </div>
        </div>
        <div className="h-64 flex items-center gap-6">
          <div className="w-[180px] h-[180px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2">
            {categoryData.slice(0, 8).map((item, index) => (
              <div key={index} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground text-sm truncate">{item.name}</span>
                </div>
                <span className="font-semibold text-sm flex-shrink-0">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stock Levels */}
      <div className="chart-container">
        <div className="section-header">
          <div className="section-icon">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold font-display">Stock Levels</h3>
            <p className="text-sm text-muted-foreground">Current vs reorder levels</p>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stockData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 18%)" />
              <XAxis dataKey="name" stroke="hsl(215 20% 55%)" fontSize={11} angle={-45} textAnchor="end" height={60} />
              <YAxis stroke="hsl(215 20% 55%)" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="stock" name="Current Stock" radius={[8, 8, 0, 0]}>
                {stockData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
              <Bar dataKey="reorder" name="Reorder Level" fill="hsl(222 30% 25%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Financial Impact */}
      <div className="chart-container overflow-hidden">
        <div className="section-header">
          <div className="section-icon flex-shrink-0">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold font-display">Financial Impact</h3>
            <p className="text-sm text-muted-foreground">Inventory value at risk</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="text-center py-2">
            <p className="text-2xl sm:text-3xl font-bold font-display text-gradient truncate">{formatPrice(totalValue)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Inventory Value</p>
          </div>
          <div className="space-y-3">
            {financialData.map((item, index) => (
              <div key={index} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground truncate">{item.name}</span>
                  </div>
                  <span className="font-semibold flex-shrink-0 text-xs sm:text-sm" style={{ color: item.color }}>{formatPrice(item.value)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${totalValue > 0 ? (item.value / totalValue) * 100 : 0}%`,
                      backgroundColor: item.color 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};