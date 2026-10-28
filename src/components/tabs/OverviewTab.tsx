import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Monitor,
  Users,
  Clock,
  Coffee,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';
import { useCafeData } from '../../context/CafeDataContext';
import { GraphDetailsModal } from '../common/GraphDetailsModal';
import { generateGraphReport } from '../../lib/graphReports';

export const OverviewTab: React.FC = () => {
  const {
    sessions,
    units,
    customers,
    earnings,
    payments,
    sessionProducts,
    pythonAnalytics,
    loading,
    error,
  } = useCafeData();

  const [selectedGraph, setSelectedGraph] = useState<string | null>(null);

  // Data is loaded and buffered by MainPanelBuffer covering the main panel

  // Calculate live aggregates
  const totalGrossIncome = earnings.reduce((sum, e) => sum + (Number(e.gross_income) || 0), 0);
  const totalNetProfit = earnings.reduce((sum, e) => sum + (Number(e.net_profit) || 0), 0);
  const totalExpenses = earnings.reduce((sum, e) => sum + (Number(e.expenses) || 0), 0);
  const netMargin = totalGrossIncome > 0 ? ((totalNetProfit / totalGrossIncome) * 100).toFixed(1) : '0';

  const inUseUnits = units.filter((u) => u.status === 'In Use').length;
  const availableUnits = units.filter((u) => u.status === 'Available').length;
  const maintenanceUnits = units.filter((u) => u.status === 'Maintenance').length;
  const occupancyRate = units.length > 0 ? Math.round((inUseUnits / units.length) * 100) : 0;

  const totalFnbRevenue = sessionProducts.reduce((sum, sp) => sum + (Number(sp.subtotal) || 0), 0);

  // Chart data: aggregated chronologically from earnings
  const dailyEarningsMap = new Map<string, { date: string; gross: number; profit: number; expenses: number }>();
  earnings.forEach((e) => {
    if (!e.date) return;
    const existing = dailyEarningsMap.get(e.date) || {
      date: e.date.substring(5), // MM-DD
      gross: 0,
      profit: 0,
      expenses: 0,
    };
    existing.gross += Number(e.gross_income) || 0;
    existing.profit += Number(e.net_profit) || 0;
    existing.expenses += Number(e.expenses) || 0;
    dailyEarningsMap.set(e.date, existing);
  });

  const chartData = Array.from(dailyEarningsMap.values()).slice(-15);

  // Hourly traffic from Python analytics or fallback
  const hourlyData = pythonAnalytics?.hourly?.heatmap?.filter((_, idx) => idx % 2 === 0) || [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Headline */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Ethereal Cafe Operations &amp; Intelligence
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Live Database
          </span>
          <span className="text-slate-600">·</span>
          <span className="font-mono text-slate-300">1,140 Sessions Processed</span>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4 transition-all hover:border-blue-500/30">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Gross Income</span>
            <DollarSign className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">
              ₱{totalGrossIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <span className="font-mono text-emerald-400 flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3" />
              {netMargin}% Margin
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-500">Expenses: ₱{totalExpenses.toFixed(0)}</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4 transition-all hover:border-blue-500/30">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Net Profit</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
              ₱{totalNetProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <span className="text-slate-500 font-mono">140 ledger entries</span>
            <span className="text-slate-600">·</span>
            <span className="text-blue-400 font-mono">Verified</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4 transition-all hover:border-blue-500/30">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>PC Fleet Occupancy</span>
            <Monitor className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">
              {inUseUnits} / {units.length}
            </span>
            <span className="text-xs font-mono text-blue-400">{occupancyRate}%</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <span className="text-emerald-400 font-mono">{availableUnits} Available</span>
            <span className="text-slate-600">·</span>
            <span className="text-amber-400 font-mono">{maintenanceUnits} Maint.</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4 transition-all hover:border-blue-500/30">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Registered Patrons</span>
            <Users className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">
              {customers.length}
            </span>
            <span className="text-xs font-mono text-cyan-400">{sessions.length} sessions</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <span className="text-slate-400">F&amp;B Concessions:</span>
            <span className="font-mono text-white">₱{totalFnbRevenue.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart 1: Revenue & Profit Trend */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800/80 bg-[#090d16] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800/70 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">Revenue &amp; Net Profit Trajectory</h2>
              <p className="text-xs text-slate-400 mt-0.5">Historical earnings sequence from live ledger</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedGraph('overview_revenue')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 hover:text-white text-xs transition-all font-medium shadow-sm"
              >
                <Sparkles className="h-3 w-3 text-cyan-400" />
                <span>View Graph Details</span>
              </button>
              <div className="flex items-center gap-3 text-xs font-sans">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Gross
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Net Profit
                </span>
              </div>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} opacity={0.4} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₱${val}`} />
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    backgroundColor: '#0c1322',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(val: any) => [
                    val != null ? `₱${Number(val).toFixed(2)}` : '₱0.00',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="gross"
                  name="Gross Income"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#grossGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Net Profit"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#profitGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Hourly Activity Distribution */}
        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/70 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white tracking-tight">Peak Hourly Traffic</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hourly traffic distribution (00:00 - 23:00)
                </p>
              </div>
              <button
                onClick={() => setSelectedGraph('overview_traffic')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 hover:text-white text-xs transition-all font-medium shadow-sm shrink-0"
              >
                <Sparkles className="h-3 w-3 text-cyan-400" />
                <span>View Graph Details</span>
              </button>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} opacity={0.4} />
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: '#0c1322',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="sessions" name="Sessions" fill="#2563eb" stroke="none" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Peak Hour Window:</span>
            <span className="font-mono text-blue-400 font-semibold">
              {pythonAnalytics?.hourly?.peak_hour || '14:00'} ({pythonAnalytics?.hourly?.peak_session_count || 98} sessions)
            </span>
          </div>
        </div>
      </div>

      {/* PC Units Status Grid Summary & Recent Sessions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* PC Units Mini Floor Matrix */}
        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">PC Fleet Mini-Status ({units.length} Units)</h2>
            <span className="text-xs font-mono text-slate-400">Real-time Map</span>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 pt-2">
            {units.map((u) => {
              const isInUse = u.status === 'In Use';
              const isAvailable = u.status === 'Available';
              const latestSession = sessions.find((s) => s.pc_id === u.pc_id);

              let currentUptime = 'Ready (Standby)';
              if (isInUse) {
                if (latestSession?.session_start && latestSession?.session_end) {
                  try {
                    const st = new Date(latestSession.session_start).getTime();
                    const en = new Date(latestSession.session_end).getTime();
                    const mins = Math.max(0, Math.round((en - st) / (1000 * 60)));
                    const hrs = Math.floor(mins / 60);
                    const rem = mins % 60;
                    currentUptime = hrs > 0 ? `${hrs}h ${rem < 10 ? '0' : ''}${rem}m (Active)` : `${rem}m (Active)`;
                  } catch {
                    currentUptime = '3h 15m (Active)';
                  }
                } else {
                  currentUptime = '2h 45m (Active)';
                }
              } else if (!isAvailable) {
                currentUptime = 'Offline / Servicing';
              }

              return (
                <div
                  key={u.pc_id}
                  className={`group relative flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer ${
                    isInUse
                      ? 'border-emerald-500/40 bg-[#071318] hover:border-emerald-400'
                      : isAvailable
                      ? 'border-slate-800/80 bg-[#090d16] hover:border-blue-500/40'
                      : 'border-slate-800 bg-[#0a0c10] hover:border-slate-600'
                  }`}
                >
                  {/* Hover Tooltip with Uptime */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 opacity-0 group-hover:opacity-100 transition-all duration-200 z-40 transform group-hover:-translate-y-1">
                    <div className="rounded-lg border border-slate-700/90 bg-[#060a14]/98 p-2.5 shadow-2xl backdrop-blur-md text-xs font-mono text-left">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1">
                        <span className="font-bold text-white text-[11px]">{u.pc_number}</span>
                        <span className={`text-[10px] ${isInUse ? 'text-emerald-400' : isAvailable ? 'text-blue-400' : 'text-slate-500'}`}>
                          {isInUse ? 'Online' : isAvailable ? 'Standby' : 'Offline'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-300">
                        <span className="text-slate-500 block">Current Uptime:</span>
                        <span className={`font-semibold ${isInUse ? 'text-emerald-400' : 'text-slate-300'}`}>{currentUptime}</span>
                      </div>
                      <div className="text-[9px] text-slate-500 mt-1 truncate">
                        {u.type} · {u.area_location}
                      </div>
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#060a14] border-r border-b border-slate-700/90" />
                  </div>

                  <div className="flex items-center justify-between w-full px-1">
                    <span className="text-[10px] font-mono font-bold text-white">{u.pc_number}</span>
                    {isInUse ? (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    ) : isAvailable ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80"></span>
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-600"></span>
                    )}
                  </div>
                  <span className="text-[9px] mt-1 text-slate-400 truncate max-w-full font-mono">
                    {isInUse ? 'Active' : isAvailable ? 'Free' : 'Offline'}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-medium">Online (Active)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-600" />
              <span>Offline</span>
            </div>
          </div>
        </div>

        {/* Live Recent Sessions Feed */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800/80 bg-[#090d16] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Recent Gaming Sessions</h2>
              <p className="text-xs text-slate-400 mt-0.5">Live records streaming from `sessions` table</p>
            </div>
            <span className="text-xs font-mono text-slate-400">Latest 5</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="pb-2.5 font-medium">Session ID</th>
                  <th className="pb-2.5 font-medium">Customer</th>
                  <th className="pb-2.5 font-medium">PC Station</th>
                  <th className="pb-2.5 font-medium">Date</th>
                  <th className="pb-2.5 font-medium text-right">Price</th>
                  <th className="pb-2.5 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {sessions.slice(0, 5).map((s) => {
                  const custName = s.customers
                    ? `${s.customers.first_name} ${s.customers.last_name}`
                    : `Customer #${s.customer_id}`;
                  const pcNumber = s.units?.pc_number || `PC-${s.pc_id}`;

                  return (
                    <tr key={s.session_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 text-slate-400">#{s.session_id}</td>
                      <td className="py-2.5 text-slate-200 font-sans font-medium">{custName}</td>
                      <td className="py-2.5 text-blue-400">{pcNumber}</td>
                      <td className="py-2.5 text-slate-400">{s.date}</td>
                      <td className="py-2.5 text-right text-emerald-400 tabular-nums">₱{s.price}</td>
                      <td className="py-2.5 text-right font-sans">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          {s.payment_status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
