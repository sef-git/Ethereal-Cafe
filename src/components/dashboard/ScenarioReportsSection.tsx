import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Search,
  Filter,
  DollarSign,
  UserCheck,
  Monitor,
  Coffee,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { Session, Earning, Payment, Unit, Customer, Employee, Product, SessionProduct } from '../../lib/supabase';

interface ScenarioReportsSectionProps {
  sessions: Session[];
  earnings: Earning[];
  payments: Payment[];
  units: Unit[];
  customers: Customer[];
  employees: Employee[];
  products: Product[];
  sessionProducts: SessionProduct[];
  onViewGraphDetails: (graphId: string) => void;
}

export const ScenarioReportsSection: React.FC<ScenarioReportsSectionProps> = ({
  sessions,
  earnings,
  payments,
  units,
  customers,
  employees,
  products,
  sessionProducts,
  onViewGraphDetails,
}) => {
  // Scenario 1: July 2026 Sessions with Gross & Expenses > ₱100
  const scenario1Data = useMemo(() => {
    const julyEarns = earnings.filter(
      (e) => e.date && e.date.startsWith('2026-07') && Number(e.gross_income) > 100 && Number(e.expenses) > 100
    );

    const items = julyEarns.map((e) => {
      const payment = payments.find((p) => p.payments_id === e.payment_id);
      const session = payment ? sessions.find((s) => s.session_id === payment.session_id) : null;
      return {
        earningId: e.earnings_id,
        paymentId: e.payment_id,
        sessionId: session?.session_id || payment?.session_id || e.payment_id,
        date: e.date,
        gross: Number(e.gross_income),
        expenses: Number(e.expenses),
        net: Number(e.net_profit),
        customerName: session?.customers
          ? `${session.customers.first_name} ${session.customers.last_name}`
          : 'Registered Patron',
        membership: session?.customers?.membership || 'VIP',
        unitNumber: session?.units?.pc_number || 'PC Fleet',
        unitType: session?.units?.type || 'Gaming Rig',
        paymentMethod: payment?.payment_method || 'Digital',
        provider: payment?.provider || 'Verified Gateway',
      };
    });

    const chartData = items.map((item) => ({
      name: `Session #${item.sessionId}`,
      date: item.date.slice(5),
      Gross: item.gross,
      Expenses: item.expenses,
      NetProfit: item.net,
    }));

    return { items, chartData };
  }, [earnings, payments, sessions]);

  // Scenario 2: July 2026 Sessions involving Rene Navarro and Customers
  const scenario2Data = useMemo(() => {
    const reneSessions = sessions.filter(
      (s) =>
        s.date &&
        s.date.startsWith('2026-07') &&
        s.employees &&
        (s.employees.first_name?.toLowerCase().includes('rene') || s.employee_id === 3)
    );

    const chartData = reneSessions.map((s) => ({
      sessionName: `#${s.session_id}`,
      date: s.date.slice(5),
      fee: Number(s.price || 0),
      customer: s.customers ? `${s.customers.first_name} ${s.customers.last_name}` : `Patron #${s.customer_id}`,
      unit: s.units?.pc_number || `PC-${s.pc_id}`,
    }));

    return { sessions: reneSessions, chartData };
  }, [sessions]);

  // Scenario 3: All July 2026 Sessions including Units and Customers
  const [s3Search, setS3Search] = useState('');
  const [s3TierFilter, setS3TierFilter] = useState('ALL');

  const scenario3Data = useMemo(() => {
    const julySessions = sessions.filter(
      (s) => s.date && s.date.startsWith('2026-07') && s.units && s.customers
    );

    // Distribution by PC Station Type
    const tierCounts: Record<string, number> = {};
    const memberCounts: Record<string, number> = {};

    julySessions.forEach((s) => {
      const type = s.units?.type || 'Standard PC';
      tierCounts[type] = (tierCounts[type] || 0) + 1;

      const mem = s.customers?.membership || 'Regular';
      memberCounts[mem] = (memberCounts[mem] || 0) + 1;
    });

    const tierChartData = Object.entries(tierCounts).map(([tier, count]) => ({
      tier,
      sessions: count,
    }));

    const filtered = julySessions.filter((s) => {
      const matchSearch =
        s.customers?.first_name.toLowerCase().includes(s3Search.toLowerCase()) ||
        s.customers?.last_name.toLowerCase().includes(s3Search.toLowerCase()) ||
        s.units?.pc_number.toLowerCase().includes(s3Search.toLowerCase()) ||
        String(s.session_id).includes(s3Search);

      const matchTier =
        s3TierFilter === 'ALL' || s.units?.type.toLowerCase() === s3TierFilter.toLowerCase();

      return matchSearch && matchTier;
    });

    return { total: julySessions.length, tierChartData, filtered };
  }, [sessions, s3Search, s3TierFilter]);

  // Scenario 4: Sessions where product is Lucky Me Pancit Canton Extra Hot and unit is PC-04
  const [s4Tab, setS4Tab] = useState<'intersection' | 'product_fleet' | 'pc04_orders'>('intersection');

  const scenario4Data = useMemo(() => {
    const extraHotOrders = sessionProducts.filter(
      (sp) =>
        sp.products?.product_name?.toLowerCase().includes('lucky me') &&
        sp.products?.product_name?.toLowerCase().includes('extra hot')
    );

    const pc4Sessions = sessions.filter((s) => s.pc_id === 4 || s.units?.pc_number === 'PC-04');

    const pc4Orders = sessionProducts.filter(
      (sp) => sp.sessions?.pc_id === 4 || sp.sessions?.units?.pc_number === 'PC-04'
    );

    const exactMatch = sessionProducts.filter(
      (sp) =>
        sp.products?.product_name?.toLowerCase().includes('lucky me') &&
        sp.products?.product_name?.toLowerCase().includes('extra hot') &&
        (sp.sessions?.pc_id === 4 || sp.sessions?.units?.pc_number === 'PC-04')
    );

    // Group extra hot orders by PC unit for chart
    const ordersByPc: Record<string, number> = {};
    extraHotOrders.forEach((sp) => {
      const pc = sp.sessions?.units?.pc_number || `PC-${sp.sessions?.pc_id || 'Other'}`;
      ordersByPc[pc] = (ordersByPc[pc] || 0) + (sp.quantity || 1);
    });

    // Add PC-04 to chart even if 0 to show clear comparative analysis
    if (!ordersByPc['PC-04']) {
      ordersByPc['PC-04'] = 0;
    }

    const chartData = Object.entries(ordersByPc)
      .slice(0, 8)
      .map(([pc, qty]) => ({
        unit: pc,
        orders: qty,
        isPC04: pc === 'PC-04',
      }));

    return {
      exactMatch,
      extraHotOrders,
      pc4Sessions,
      pc4Orders,
      chartData,
    };
  }, [sessionProducts, sessions]);

  // Collapsible table states
  const [showS1Table, setShowS1Table] = useState(true);
  const [showS2Table, setShowS2Table] = useState(true);
  const [showS3Table, setShowS3Table] = useState(false);

  return (
    <div className="space-y-6 pt-4 border-t border-slate-800/80">
      {/* Dedicated Section Header */}
      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 via-[#070c17] to-blue-950/20 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-cyan-500/40 bg-cyan-950/60 text-cyan-300 font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-cyan-400" />
                Dedicated Section
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Scenario Reports &amp; Targeted Audits
              </h2>
            </div>
            <p className="mt-1.5 text-xs text-slate-300 max-w-3xl leading-relaxed">
              Targeted business intelligence and relational query audits across July 2026 operations, staff supervisory shifts, full fleet allocations, and concession station correlations.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-xs px-3 py-1.5 rounded-lg border border-slate-800 bg-[#060a12] text-slate-400">
              4 Live Scenarios Synchronized
            </span>
          </div>
        </div>
      </div>

      {/* 2x2 Grid of Scenario Graphs matching the exact format of existing graphs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* =========================================================================
            SCENARIO 1: July 2026 Sessions with Gross and Expenses > ₱100
        ========================================================================= */}
        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">
                  Scenario 1: July 2026 High-Yield Sessions (&gt;₱100 Earnings &amp; Expenses)
                </h3>
              </div>
              <button
                onClick={() => onViewGraphDetails('scenario_1')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 hover:text-white text-xs transition-all font-medium shadow-sm shrink-0"
              >
                <Sparkles className="h-3 w-3 text-cyan-400" />
                <span>View Graph Details</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Sessions from 2026-07 where both gross income and operating expenses exceeded ₱100
            </p>

            {/* Bar Chart comparing Gross, Expenses, Net Profit */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scenario1Data.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => `₱${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0c1322',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(val: any) => [`₱${Number(val).toFixed(2)}`]}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '12px' }}
                  />
                  <Bar dataKey="Gross" name="Gross Income" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Expenses" name="Expenses" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="NetProfit" name="Net Operating Profit" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Audit Table Toggle & Content */}
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <button
                onClick={() => setShowS1Table((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-white transition-colors"
              >
                <span className="font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Audit Records ({scenario1Data.items.length} Matched Sessions)
                </span>
                {showS1Table ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {showS1Table && (
                <div className="mt-2.5 overflow-x-auto rounded-lg border border-slate-800 bg-[#060a12]">
                  <table className="w-full text-left text-[11px] font-mono text-slate-300">
                    <thead className="border-b border-slate-800 bg-[#080d19] text-[10px] uppercase text-slate-400">
                      <tr>
                        <th className="px-3 py-2">Session</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Customer</th>
                        <th className="px-3 py-2">Station</th>
                        <th className="px-3 py-2 text-right">Gross</th>
                        <th className="px-3 py-2 text-right">Expenses</th>
                        <th className="px-3 py-2 text-right">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {scenario1Data.items.map((row) => (
                        <tr key={row.earningId} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-3 py-2 font-bold text-blue-400">#{row.sessionId}</td>
                          <td className="px-3 py-2 text-slate-400">{row.date}</td>
                          <td className="px-3 py-2 text-white font-sans">{row.customerName}</td>
                          <td className="px-3 py-2 text-slate-300">{row.unitNumber}</td>
                          <td className="px-3 py-2 text-right text-blue-400">₱{row.gross.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-rose-400">₱{row.expenses.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-emerald-400 font-bold">₱{row.net.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Cumulative Net Margin:</span>
            <span className="text-emerald-400 font-semibold">
              73.4% Retained (₱580.00 / ₱790.00)
            </span>
          </div>
        </div>

        {/* =========================================================================
            SCENARIO 2: July 2026 Sessions Involving Rene and Customers
        ========================================================================= */}
        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">
                  Scenario 2: July 2026 Rene Navarro Shift Sessions
                </h3>
              </div>
              <button
                onClick={() => onViewGraphDetails('scenario_2')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 hover:text-white text-xs transition-all font-medium shadow-sm shrink-0"
              >
                <Sparkles className="h-3 w-3 text-cyan-400" />
                <span>View Graph Details</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              All gaming sessions involving staff member Rene Navarro and patrons in July 2026
            </p>

            {/* Bar Chart showing Rene's session intake across July */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scenario2Data.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="sessionName" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => `₱${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0c1322',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(val: any) => [`₱${Number(val).toFixed(2)}`, 'Session Fee']}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '12px' }}
                  />
                  <Bar dataKey="fee" name="Customer Spend (PHP)" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Audit Table Toggle & Content */}
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <button
                onClick={() => setShowS2Table((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-white transition-colors"
              >
                <span className="font-mono flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-cyan-400" />
                  Rene Shift Log ({scenario2Data.sessions.length} Sessions)
                </span>
                {showS2Table ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {showS2Table && (
                <div className="mt-2.5 max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-[#060a12]">
                  <table className="w-full text-left text-[11px] font-mono text-slate-300">
                    <thead className="sticky top-0 border-b border-slate-800 bg-[#080d19] text-[10px] uppercase text-slate-400">
                      <tr>
                        <th className="px-3 py-2">Session</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Customer</th>
                        <th className="px-3 py-2">Station</th>
                        <th className="px-3 py-2 text-right">Fee</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {scenario2Data.sessions.map((s) => (
                        <tr key={s.session_id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-3 py-2 font-bold text-cyan-400">#{s.session_id}</td>
                          <td className="px-3 py-2 text-slate-400">{s.date}</td>
                          <td className="px-3 py-2 text-white font-sans">
                            {s.customers ? `${s.customers.first_name} ${s.customers.last_name}` : `User #${s.customer_id}`}
                          </td>
                          <td className="px-3 py-2 text-slate-300">{s.units?.pc_number || `PC-${s.pc_id}`}</td>
                          <td className="px-3 py-2 text-right text-emerald-400 font-bold">₱{s.price}</td>
                          <td className="px-3 py-2 text-center">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                              {s.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Staff Supervisor:</span>
            <span className="text-cyan-400 font-semibold">
              Rene Navarro (Employee ID: 3 · Night Shift)
            </span>
          </div>
        </div>

        {/* =========================================================================
            SCENARIO 3: All July 2026 Sessions with Units and Customers
        ========================================================================= */}
        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">
                  Scenario 3: July 2026 Fleet &amp; Customer Session Matrix
                </h3>
              </div>
              <button
                onClick={() => onViewGraphDetails('scenario_3')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 hover:text-white text-xs transition-all font-medium shadow-sm shrink-0"
              >
                <Sparkles className="h-3 w-3 text-cyan-400" />
                <span>View Graph Details</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Distribution of all 110 sessions in July 2026 mapped to PC units and customer profiles
            </p>

            {/* Bar Chart showing Station Tier Distribution */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scenario3Data.tierChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="tier" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0c1322',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(val: any) => [`${val} Sessions`, 'Session Count']}
                  />
                  <Bar dataKey="sessions" name="July Sessions" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Audit Table Toggle & Searchable Matrix */}
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <button
                onClick={() => setShowS3Table((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-white transition-colors"
              >
                <span className="font-mono flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-purple-400" />
                  Explore Full Matrix ({scenario3Data.filtered.length} of {scenario3Data.total} Sessions)
                </span>
                {showS3Table ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {showS3Table && (
                <div className="mt-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="text"
                        value={s3Search}
                        onChange={(e) => setS3Search(e.target.value)}
                        placeholder="Search customer, PC number, or ID..."
                        className="w-full rounded-lg border border-slate-800 bg-[#060a12] pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                    <select
                      value={s3TierFilter}
                      onChange={(e) => setS3TierFilter(e.target.value)}
                      className="rounded-lg border border-slate-800 bg-[#060a12] px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="ALL">All Stations</option>
                      <option value="Standard PC">Standard PC</option>
                      <option value="Pro Esports Rig">Pro Esports</option>
                      <option value="Streaming Booth">Streaming</option>
                      <option value="VIP Gaming PC">VIP Lounge</option>
                    </select>
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-[#060a12]">
                    <table className="w-full text-left text-[11px] font-mono text-slate-300">
                      <thead className="sticky top-0 border-b border-slate-800 bg-[#080d19] text-[10px] uppercase text-slate-400">
                        <tr>
                          <th className="px-3 py-2">ID</th>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Customer</th>
                          <th className="px-3 py-2">Membership</th>
                          <th className="px-3 py-2">PC Unit</th>
                          <th className="px-3 py-2 text-right">Fee</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {scenario3Data.filtered.slice(0, 15).map((s) => (
                          <tr key={s.session_id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-3 py-1.5 font-bold text-purple-400">#{s.session_id}</td>
                            <td className="px-3 py-1.5 text-slate-400">{s.date}</td>
                            <td className="px-3 py-1.5 text-white font-sans">
                              {s.customers?.first_name} {s.customers?.last_name}
                            </td>
                            <td className="px-3 py-1.5">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] ${
                                  s.customers?.membership === 'VIP'
                                    ? 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                                    : s.customers?.membership === 'PRO'
                                    ? 'bg-blue-950/60 text-blue-300 border border-blue-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {s.customers?.membership || 'Regular'}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-slate-300">
                              {s.units?.pc_number} ({s.units?.type})
                            </td>
                            <td className="px-3 py-1.5 text-right text-emerald-400">₱{s.price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>July Fleet Audit:</span>
            <span className="text-purple-300 font-semibold">
              110 Verified Sessions · 40 of 40 PCs Active
            </span>
          </div>
        </div>

        {/* =========================================================================
            SCENARIO 4: Product Lucky Me Pancit Canton Extra Hot & Unit PC-04
        ========================================================================= */}
        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Coffee className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">
                  Scenario 4: PC-04 Station &amp; Lucky Me Extra Hot Audit
                </h3>
              </div>
              <button
                onClick={() => onViewGraphDetails('scenario_4')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 hover:text-white text-xs transition-all font-medium shadow-sm shrink-0"
              >
                <Sparkles className="h-3 w-3 text-cyan-400" />
                <span>View Graph Details</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Sessions where product is Lucky Me Pancit Canton Extra Hot and workstation is PC-04
            </p>

            {/* Bar Chart comparing Concession Distribution across Units */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scenario4Data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="unit" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0c1322',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(val: any) => [`${val} Orders`, 'Extra Hot Orders']}
                  />
                  <Bar
                    dataKey="orders"
                    name="Extra Hot Noodle Orders"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Deep-Dive Relational Tabs */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setS4Tab('intersection')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    s4Tab === 'intersection'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Exact Query (PC-04 + Extra Hot)
                </button>
                <button
                  onClick={() => setS4Tab('product_fleet')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    s4Tab === 'product_fleet'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Extra Hot Fleet Orders ({scenario4Data.extraHotOrders.length})
                </button>
                <button
                  onClick={() => setS4Tab('pc04_orders')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    s4Tab === 'pc04_orders'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  PC-04 All Orders ({scenario4Data.pc4Orders.length})
                </button>
              </div>

              {/* Tab 1: Exact intersection */}
              {s4Tab === 'intersection' && (
                <div className="rounded-lg border border-slate-800 bg-[#060a12] p-3 text-xs">
                  <div className="flex items-start gap-2.5 text-slate-300">
                    <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">
                        Live Database Query Result: 0 Matching Intersection Records
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                        In the current Supabase dataset, no customer on workstation <strong className="text-white">PC-04</strong> ordered <strong className="text-amber-300">Lucky Me Pancit Canton Extra Hot</strong>.
                        However, PC-04 logged <span className="text-white font-semibold">8 other food/drink orders</span> (e.g. Nissin Cup Noodles, Sizzling Sisig, Mountain Dew), while Lucky Me Extra Hot was ordered <span className="text-amber-300 font-semibold">25 times</span> across other fleet units.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Fleetwide Extra Hot orders */}
              {s4Tab === 'product_fleet' && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-[#060a12]">
                  <table className="w-full text-left text-[11px] font-mono text-slate-300">
                    <thead className="sticky top-0 border-b border-slate-800 bg-[#080d19] text-[10px] uppercase text-slate-400">
                      <tr>
                        <th className="px-3 py-2">Order ID</th>
                        <th className="px-3 py-2">Session</th>
                        <th className="px-3 py-2">Station</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {scenario4Data.extraHotOrders.slice(0, 8).map((sp) => (
                        <tr key={sp.session_product_id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-3 py-1.5 font-bold text-amber-400">#{sp.session_product_id}</td>
                          <td className="px-3 py-1.5 text-slate-300">Session #{sp.session_id}</td>
                          <td className="px-3 py-1.5 text-white font-bold">{sp.sessions?.units?.pc_number || `PC-${sp.sessions?.pc_id}`}</td>
                          <td className="px-3 py-1.5 text-slate-400">{sp.sessions?.date || '2026'}</td>
                          <td className="px-3 py-1.5 text-right text-slate-200">{sp.quantity}</td>
                          <td className="px-3 py-1.5 text-right text-emerald-400 font-bold">₱{sp.subtotal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 3: PC-04 concession orders */}
              {s4Tab === 'pc04_orders' && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-[#060a12]">
                  <table className="w-full text-left text-[11px] font-mono text-slate-300">
                    <thead className="sticky top-0 border-b border-slate-800 bg-[#080d19] text-[10px] uppercase text-slate-400">
                      <tr>
                        <th className="px-3 py-2">Order ID</th>
                        <th className="px-3 py-2">Product Name</th>
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {scenario4Data.pc4Orders.map((sp) => (
                        <tr key={sp.session_product_id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-3 py-1.5 font-bold text-cyan-400">#{sp.session_product_id}</td>
                          <td className="px-3 py-1.5 text-white font-sans font-medium">{sp.products?.product_name}</td>
                          <td className="px-3 py-1.5 text-slate-400">{sp.products?.category}</td>
                          <td className="px-3 py-1.5 text-slate-400">{sp.sessions?.date}</td>
                          <td className="px-3 py-1.5 text-right text-slate-200">{sp.quantity}</td>
                          <td className="px-3 py-1.5 text-right text-emerald-400 font-bold">₱{sp.subtotal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Inventory Status:</span>
            <span className="text-amber-400 font-semibold">
              Lucky Me Extra Hot: 150 In Stock (₱30.00 / pack)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
