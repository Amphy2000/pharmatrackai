import { useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, DollarSign, TrendingUp, ShoppingBag, Package, AlertTriangle, Printer, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DailyClosingReport } from '@/services/autopilotEngine';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface DailyClosingReportCardProps {
  report: DailyClosingReport;
  onRecordAction?: (route: string) => void;
}

export const DailyClosingReportCard = ({ report, onRecordAction }: DailyClosingReportCardProps) => {
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  if (!report) return null;

  // Collapsed View (Sleek 1-line bar)
  if (!isExpanded) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/25 p-3.5 text-white shadow-md flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                Autopilot Daily Closing Report
              </span>
              <Badge className="bg-emerald-500/20 border-emerald-400/30 text-emerald-300 text-[10px] py-0 h-4">
                Auto-Generated
              </Badge>
            </div>
            <p className="text-xs font-semibold text-white truncate">
              Today's Sales: <span className="text-emerald-400">{formatPrice(report.sales.totalRevenue)}</span> ({report.sales.totalOrders} orders)
              {report.bestSeller && (
                <span className="hidden md:inline text-slate-300"> • Best Seller: <strong>{report.bestSeller.name}</strong> ({report.bestSeller.unitsSold} sold)</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <Button
            size="sm"
            onClick={() => setIsExpanded(true)}
            className="h-8 text-xs font-semibold bg-indigo-500 hover:bg-indigo-600 text-white gap-1 px-3 shadow-sm"
          >
            <span>View Closing Report</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // Expanded Executive Report View
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white shadow-xl border border-indigo-500/30 transition-all print:bg-white print:text-black print:border-none print:shadow-none">
      <div className="relative z-10">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4 pb-4 border-b border-white/10 print:border-black/20">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-400/30 print:hidden">
              <BarChart3 className="h-5 w-5 text-indigo-300" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-indigo-300 tracking-widest uppercase block print:text-slate-600">
                Autopilot — End-Of-Day Executive Summary
              </span>
              <h3 className="text-lg font-bold text-white leading-tight print:text-black">
                Daily Closing Report ({report.reportDate})
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="h-8 border-white/20 text-slate-200 hover:bg-white/10 text-xs font-medium gap-1.5"
            >
              <Printer className="h-3.5 w-3.5 text-indigo-300" /> Print / Export PDF
            </Button>
          </div>
        </div>

        {/* Financial & Operational Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 print:border-black/20 print:bg-slate-50">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider print:text-slate-600">Total Sales</p>
            <p className="text-lg font-bold text-emerald-400 tabular-nums print:text-emerald-700">{formatPrice(report.sales.totalRevenue)}</p>
            <p className="text-[10px] text-slate-400">{report.sales.totalOrders} total receipts</p>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 print:border-black/20 print:bg-slate-50">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider print:text-slate-600">Est. Profit</p>
            <p className="text-lg font-bold text-indigo-300 tabular-nums print:text-indigo-800">{formatPrice(report.sales.estimatedProfit)}</p>
            <p className="text-[10px] text-slate-400">Gross margin</p>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 print:border-black/20 print:bg-slate-50">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider print:text-slate-600">Avg. Order Value</p>
            <p className="text-lg font-bold text-white tabular-nums print:text-black">{formatPrice(report.sales.averageOrderValue)}</p>
            <p className="text-[10px] text-slate-400">{report.sales.totalUnitsSold} units sold</p>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 print:border-black/20 print:bg-slate-50">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider print:text-slate-600">Today's Best Seller</p>
            <p className="text-sm font-bold text-white truncate print:text-black">
              {report.bestSeller ? report.bestSeller.name : 'None yet'}
            </p>
            <p className="text-[10px] text-emerald-400 print:text-emerald-700">
              {report.bestSeller ? `${report.bestSeller.unitsSold} units (${formatPrice(report.bestSeller.revenue)})` : 'No sales today'}
            </p>
          </div>
        </div>

        {/* Key Recommendations for Tomorrow */}
        <div className="p-4 rounded-xl bg-indigo-500/15 border border-indigo-400/30 mb-4 print:bg-slate-100 print:border-black/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-indigo-300 print:text-indigo-800" />
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 print:text-indigo-900">
              Autopilot Key Recommendations For Tomorrow
            </span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-200 print:text-black">
            {report.keyRecommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between gap-2 print:hidden">
          <Button
            size="sm"
            onClick={() => {
              if (onRecordAction) onRecordAction('/sales');
              navigate('/sales');
            }}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs gap-1.5"
          >
            <TrendingUp className="h-3.5 w-3.5" /> View Sales History
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(false)}
            className="text-xs text-slate-400 hover:text-white gap-1"
          >
            Collapse Report <ChevronUp className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
