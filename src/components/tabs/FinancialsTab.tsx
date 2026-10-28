import React, { useMemo, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Download,
  CreditCard,
  PieChart as PieIcon,
  ArrowUpRight,
  Receipt,
  Search,
  Sparkles,
  Layers,
  Calendar,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useCafeData } from '../../context/CafeDataContext';
import { GraphDetailsModal } from '../common/GraphDetailsModal';
import { generateGraphReport } from '../../lib/graphReports';

const BLUE_PALETTE = ['#2563eb', '#38bdf8', '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8'];

export const FinancialsTab: React.FC = () => {
  const { earnings, payments, sessions, units, pythonAnalytics } = useCafeData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGraph, setSelectedGraph] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<'grouped' | 'stacked'>('grouped');
  const [daysCount, setDaysCount] = useState<number>(14);

  // Calculations
  const totalGross = earnings.reduce((acc, curr) => acc + (Number(curr.gross_income) || 0), 0);
  const totalNet = earnings.reduce((acc, curr) => acc + (Number(curr.net_profit) || 0), 0);
  const totalExpenses = earnings.reduce((acc, curr) => acc + (Number(curr.expenses) || 0), 0);
  const profitMargin = totalGross > 0 ? ((totalNet / totalGross) * 100).toFixed(1) : '0';

  // Providers breakdown from payments
  const providerData = useMemo(() => {
    const map = new Map<string, number>();
    payments.forEach((p) => {
      const prov = p.provider || 'Other';
      map.set(prov, (map.get(prov) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [payments]);

  // Payment methods breakdown
  const methodData = useMemo(() => {
    const map = new Map<string, number>();
    payments.forEach((p) => {
      const meth = p.payment_method || 'Other';
      map.set(meth, (map.get(meth) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [payments]);

  // Daily aggregations for chart - chronologically sorted (earliest to newest)
  const dailyEarnings = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        rawDate: string;
        formattedDate: string;
        gross: number;
        expenses: number;
        profit: number;
      }
    >();
    earnings.forEach((e) => {
      if (!e.date) return;
      const existing = map.get(e.date) || {
        date: e.date.substring(5), // e.g. "01-01"
        rawDate: e.date,
        formattedDate: new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        gross: 0,
        expenses: 0,
        profit: 0,
      };
      existing.gross += Number(e.gross_income) || 0;
      existing.expenses += Number(e.expenses) || 0;
      existing.profit += Number(e.net_profit) || 0;
      map.set(e.date, existing);
    });

    // Chronological order from oldest to newest (e.g. 01-01 -> 01-21)
    const sorted = Array.from(map.values()).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
    return daysCount > 0 ? sorted.slice(-daysCount) : sorted;
  }, [earnings, daysCount]);

  // Aggregates for the visible chart period
  const chartPeriodStats = useMemo(() => {
    const totalPeriodGross = dailyEarnings.reduce((acc, d) => acc + d.gross, 0);
    const totalPeriodExpenses = dailyEarnings.reduce((acc, d) => acc + d.expenses, 0);
    const totalPeriodNet = totalPeriodGross - totalPeriodExpenses;
    const periodMargin = totalPeriodGross > 0 ? ((totalPeriodNet / totalPeriodGross) * 100).toFixed(1) : '0';
    const maxGrossDay = dailyEarnings.reduce(
      (max, d) => (d.gross > max.gross ? d : max),
      { date: '-', gross: 0 }
    );
    return {
      gross: totalPeriodGross,
      expenses: totalPeriodExpenses,
      net: totalPeriodNet,
      margin: periodMargin,
      maxDay: maxGrossDay,
    };
  }, [dailyEarnings]);

  // Filtered earnings ledger
  const filteredEarnings = useMemo(() => {
    return earnings.filter((e) => {
      const term = searchTerm.toLowerCase();
      const prov = e.payments?.provider ? e.payments.provider.toLowerCase() : '';
      const meth = e.payments?.payment_method ? e.payments.payment_method.toLowerCase() : '';
      return (
        !term ||
        e.earnings_id.toString().includes(term) ||
        (e.date && e.date.includes(term)) ||
        prov.includes(term) ||
        meth.includes(term)
      );
    });
  }, [earnings, searchTerm]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Earnings_ID', 'Payment_ID', 'Date', 'Gross_Income', 'Expenses', 'Net_Profit', 'Payment_Method', 'Provider'];
    const rows = earnings.map((e) => [
      e.earnings_id,
      e.payment_id,
      e.date,
      e.gross_income,
      e.expenses,
      e.net_profit,
      e.payments?.payment_method || 'N/A',
      e.payments?.provider || 'N/A',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ethereal_cafe_earnings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Financials &amp; Earnings Intelligence
          </h1>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <Download className="h-3.5 w-3.5 text-blue-400" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4">
          <span className="text-xs text-slate-400">Gross Income (Total)</span>
          <div className="mt-2 text-2xl font-bold font-mono text-white tabular-nums">
            ₱{totalGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="mt-1 block text-[11px] text-slate-500 font-mono">140 verified audit cycles</span>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4">
          <span className="text-xs text-slate-400">Operating Expenses</span>
          <div className="mt-2 text-2xl font-bold font-mono text-rose-400 tabular-nums">
            ₱{totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="mt-1 block text-[11px] text-slate-500 font-mono">Electricity, bandwidth, maintenance</span>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4">
          <span className="text-xs text-slate-400">Net Profit</span>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            ₱{totalNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
            <ArrowUpRight className="h-3 w-3" />
            <span>Retained Operating Surplus</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4">
          <span className="text-xs text-slate-400">Net Profit Margin</span>
          <div className="mt-2 text-2xl font-bold font-mono text-blue-400 tabular-nums">
            {profitMargin}%
          </div>
          <span className="mt-1 block text-[11px] text-slate-500 font-mono">Highly optimized cafe unit economics</span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        {/* Daily Profit Breakdown - Full width desktop layout */}
        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-5 shadow-xl">
          {/* Header Controls & Metadata */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800/70 mb-4">
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Daily Gross vs Expenses Breakdown
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Stacked financial volume by day
              </p>
            </div>

            {/* Desktop Controls & Legend Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Minimal Timeframe selector */}
              <div className="flex items-center bg-[#060a12] rounded-lg border border-slate-800 p-0.5 text-xs font-mono">
                {[
                  { label: '7D', value: 7 },
                  { label: '14D', value: 14 },
                  { label: '21D', value: 21 },
                  { label: 'All', value: 0 },
                ].map((tf) => (
                  <button
                    key={tf.label}
                    onClick={() => setDaysCount(tf.value)}
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                      daysCount === tf.value
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              {/* View Graph Details Deep-Dive Report Button */}
              <button
                onClick={() => setSelectedGraph('financials_breakdown')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 hover:text-white text-xs transition-all font-medium shadow-sm shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <span>View Graph Details</span>
              </button>

              {/* Simplistic Dots Legend */}
              <div className="flex items-center gap-3 text-xs font-sans pl-1">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span>Gross</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span>Expenses</span>
                </span>
              </div>
            </div>
          </div>

          {/* Recharts Canvas - Desktop Optimized Height (360px) */}
          <div className="h-80 sm:h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyEarnings}
                margin={{ top: 12, right: 16, left: -10, bottom: 8 }}
                barGap={chartMode === 'grouped' ? 4 : 0}
                barCategoryGap="22%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.4} />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={6}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₱${v}`}
                  dx={-4}
                />
                <Tooltip
                  cursor={false}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0]?.payload;
                    const gross = data?.gross || 0;
                    const expenses = data?.expenses || 0;
                    const profit = gross - expenses;
                    const margin = gross > 0 ? ((profit / gross) * 100).toFixed(1) : '0';

                    return (
                      <div className="rounded-xl border border-slate-700/80 bg-[#0c1322]/95 backdrop-blur-md p-3.5 shadow-2xl min-w-[200px] font-sans">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                            <Calendar className="h-3 w-3 text-cyan-400" />
                            <span>{data?.formattedDate || label}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {data?.rawDate}
                          </span>
                        </div>
                        <div className="space-y-1.5 text-xs font-mono">
                          <div className="flex items-center justify-between text-blue-400">
                            <span className="flex items-center gap-1.5 text-slate-400 font-sans">
                              <span className="h-2 w-2 rounded-full bg-blue-500" />
                              Gross Income:
                            </span>
                            <span className="font-semibold tabular-nums">₱{gross.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between text-rose-400">
                            <span className="flex items-center gap-1.5 text-slate-400 font-sans">
                              <span className="h-2 w-2 rounded-full bg-rose-500" />
                              Operating Exp:
                            </span>
                            <span className="font-semibold tabular-nums">₱{expenses.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between text-emerald-400 pt-1.5 border-t border-slate-800/80">
                            <span className="flex items-center gap-1.5 text-slate-400 font-sans">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              Net Profit:
                            </span>
                            <span className="font-semibold tabular-nums">
                              ₱{profit.toFixed(2)} ({margin}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="gross"
                  name="Gross Income"
                  fill="#3b82f6"
                  stroke="none"
                  stackId={chartMode === 'stacked' ? 'daily' : undefined}
                  radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                  maxBarSize={chartMode === 'grouped' ? 24 : 32}
                />
                <Bar
                  dataKey="expenses"
                  name="Operating Expenses"
                  fill="#f43f5e"
                  stroke="none"
                  stackId={chartMode === 'stacked' ? 'daily' : undefined}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={chartMode === 'grouped' ? 24 : 32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Financial Breakdowns Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Payment Channels Pie */}
          <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-5 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/70 mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-white tracking-tight">Payment Providers</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Distribution across provider channels</p>
                </div>
                <button
                  onClick={() => setSelectedGraph('financials_providers')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 hover:text-white text-xs transition-all font-medium shadow-sm shrink-0"
                >
                  <Sparkles className="h-3 w-3 text-cyan-400" />
                  <span>View Graph Details</span>
                </button>
              </div>

              <div className="h-64 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={providerData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {providerData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={BLUE_PALETTE[index % BLUE_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0c1322',
                        borderColor: '#1e293b',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-1.5 pt-3 border-t border-slate-800 text-xs">
              {providerData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between font-mono text-[11px]">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: BLUE_PALETTE[idx % BLUE_PALETTE.length] }}
                    />
                    <span className="text-slate-300 font-sans">{item.name}</span>
                  </div>
                  <span className="text-slate-400">{item.value} tx</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-5 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/70 mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-white tracking-tight">Payment Method Distribution</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Cash vs digital settlement ratio</p>
                </div>
                <button
                  onClick={() => setSelectedGraph('financials_providers')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 hover:text-white text-xs transition-all font-medium shadow-sm shrink-0"
                >
                  <Sparkles className="h-3 w-3 text-cyan-400" />
                  <span>View Graph Details</span>
                </button>
              </div>

              <div className="h-64 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={methodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {methodData.map((_, index) => (
                        <Cell
                          key={`cell-meth-${index}`}
                          fill={['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'][index % 4]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0c1322',
                        borderColor: '#1e293b',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-1.5 pt-3 border-t border-slate-800 text-xs">
              {methodData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between font-mono text-[11px]">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'][idx % 4],
                      }}
                    />
                    <span className="text-slate-300 font-sans">{item.name}</span>
                  </div>
                  <span className="text-slate-400">{item.value} tx</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Earnings Ledger Table */}
      <div className="rounded-xl border border-slate-800/80 bg-[#090d16] overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Earnings Ledger</h2>
            <p className="text-xs text-slate-400">All registered ledger entries</p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ID, date, provider..."
              className="w-full rounded-lg border border-slate-800 bg-[#060a12] pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#070b13] border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-2.5 px-4 font-medium">Record ID</th>
                <th className="py-2.5 px-4 font-medium">Date</th>
                <th className="py-2.5 px-4 font-medium">Linked Payment</th>
                <th className="py-2.5 px-4 font-medium">Provider Channel</th>
                <th className="py-2.5 px-4 font-medium text-right">Gross Income</th>
                <th className="py-2.5 px-4 font-medium text-right">Expenses</th>
                <th className="py-2.5 px-4 font-medium text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-mono text-[11px]">
              {filteredEarnings.map((e) => (
                <tr key={e.earnings_id} className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-4 text-slate-400">#{e.earnings_id}</td>
                  <td className="py-2.5 px-4 text-slate-300">{e.date}</td>
                  <td className="py-2.5 px-4 text-blue-400">Pay #{e.payment_id}</td>
                  <td className="py-2.5 px-4 font-sans text-slate-200">
                    {e.payments?.provider || 'Direct'} ({e.payments?.payment_method || 'Cash'})
                  </td>
                  <td className="py-2.5 px-4 text-right text-white tabular-nums">
                    ₱{Number(e.gross_income).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-rose-400 tabular-nums">
                    ₱{Number(e.expenses).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-emerald-400 font-semibold tabular-nums">
                    ₱{Number(e.net_profit).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Embedded Deep-Dive Graph Details Modal */}
      {selectedGraph && (
        <GraphDetailsModal
          report={generateGraphReport(selectedGraph, {
            earnings,
            sessions,
            units,
            payments,
            pythonAnalytics,
          })}
          onClose={() => setSelectedGraph(null)}
        />
      )}
    </div>
  );
};
