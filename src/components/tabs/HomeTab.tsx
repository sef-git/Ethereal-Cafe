import React from 'react';
import {
  Monitor,
  Coffee,
  DollarSign,
  TrendingUp,
  Clock,
  Users,
  Terminal,
  PlusCircle,
  ArrowRight,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useCafeData } from '../../context/CafeDataContext';
import { MIKU_EMOTION_ASSETS } from '../../lib/mikuAssistant';

interface HomeTabProps {
  onNavigateTab: (tabId: string) => void;
  onOpenMiku: (initialPrompt?: string) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({ onNavigateTab, onOpenMiku }) => {
  const {
    units,
    products,
    sessionProducts,
    sessions,
    payments,
    earnings,
    customers,
    employees,
    pythonAnalytics,
  } = useCafeData();

  // PC Units metrics
  const availableUnits = units.filter((u) => u.status === 'Available');
  const inUseUnits = units.filter((u) => u.status === 'In Use');
  const maintenanceUnits = units.filter((u) => u.status === 'Maintenance');
  const occupancyPct = units.length > 0 ? Math.round((inUseUnits.length / units.length) * 100) : 0;

  const zoneCounts = new Map<string, number>();
  units.forEach((u) => {
    const z = u.area_location || 'Main Floor';
    zoneCounts.set(z, (zoneCounts.get(z) || 0) + 1);
  });

  // Food, Drinks & Stock metrics
  const totalStockUnits = products.reduce((sum, p) => sum + (Number(p.stock_quantity) || 0), 0);
  const lowStockProducts = [...products]
    .filter((p) => Number(p.stock_quantity) <= 30)
    .sort((a, b) => Number(a.stock_quantity) - Number(b.stock_quantity));
  const totalFnbRevenue = sessionProducts.reduce((sum, sp) => sum + (Number(sp.subtotal) || 0), 0);

  const categoryCounts = new Map<string, number>();
  products.forEach((p) => {
    const c = p.category || 'General';
    categoryCounts.set(c, (categoryCounts.get(c) || 0) + 1);
  });

  // Sales & Profit metrics
  const totalGrossIncome = earnings.reduce((sum, e) => sum + (Number(e.gross_income) || 0), 0);
  const totalNetProfit = earnings.reduce((sum, e) => sum + (Number(e.net_profit) || 0), 0);
  const totalExpenses = earnings.reduce((sum, e) => sum + (Number(e.expenses) || 0), 0);
  const netMarginPct = totalGrossIncome > 0 ? ((totalNetProfit / totalGrossIncome) * 100).toFixed(1) : '0.0';

  const pendingSessions = sessions.filter((s) => s.payment_status !== 'Paid');
  const paidSessionsCount = sessions.length - pendingSessions.length;
  const sessionFoodMap = new Map<number, number>();
  sessionProducts.forEach((sp) => {
    sessionFoodMap.set(sp.session_id, (sessionFoodMap.get(sp.session_id) || 0) + (Number(sp.subtotal) || 0));
  });
  const pendingOpenTotal = pendingSessions.reduce(
    (sum, s) => sum + (Number(s.price) || 0) + (sessionFoodMap.get(s.session_id) || 0),
    0
  );

  // Payment method distribution
  const paymentMethodMap = new Map<string, number>();
  payments.forEach((p) => {
    const m = p.payment_method || 'Other';
    paymentMethodMap.set(m, (paymentMethodMap.get(m) || 0) + 1);
  });
  const paymentMethods = Array.from(paymentMethodMap.entries()).sort((a, b) => b[1] - a[1]);

  // Customer memberships & Staff shifts
  const tierCounts = new Map<string, number>();
  customers.forEach((c) => {
    const t = c.membership || 'Regular';
    tierCounts.set(t, (tierCounts.get(t) || 0) + 1);
  });

  const shiftCounts = new Map<string, number>();
  employees.forEach((e) => {
    const sh = e.shifts || 'Flexible';
    shiftCounts.set(sh, (shiftCounts.get(sh) || 0) + 1);
  });

  // 7-day sales estimate
  const forecast7DayGross =
    pythonAnalytics?.forecast.forecast_next_7_days.reduce(
      (sum, d) => sum + (Number(d.projected_gross) || 0),
      0
    ) || 0;
  const forecast7DayProfit =
    pythonAnalytics?.forecast.forecast_next_7_days.reduce(
      (sum, d) => sum + (Number(d.projected_net_profit) || 0),
      0
    ) || 0;

  const mikuGreetingAsset = MIKU_EMOTION_ASSETS.greeting;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Home</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
          <span className="text-slate-200">{units.length} PCs</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-200">{products.length} Menu Items</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-200">{sessions.length.toLocaleString()} Sessions</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-200">{employees.length} Staff</span>
        </div>
      </div>

      {/* Hatsune Miku Greeting */}
      <section className="rounded-xl border border-cyan-500/30 bg-[#090d16] px-5 py-4 sm:px-8 sm:py-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex-1 flex flex-col sm:flex-row items-center gap-5 sm:gap-7 min-w-0">
            <div className="h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 rounded-xl bg-[#060a12] p-1 shrink-0 flex items-center justify-center overflow-hidden">
              <img
                src={mikuGreetingAsset.src}
                alt={mikuGreetingAsset.alt}
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="space-y-2 min-w-0 text-center sm:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Welcome to Ethereal Cafe!
              </h2>
              <p className="text-sm sm:text-base font-medium text-cyan-300">
                I&apos;m Hatsune Miku, ready to assist...Mikudayo~
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center justify-center lg:justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onOpenMiku()}
              className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-500 transition-colors whitespace-nowrap shrink-0"
            >
              <Terminal className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Ask Miku</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('main_interface')}
              className="inline-flex items-center justify-center gap-2.5 rounded-xl border border-slate-700 bg-[#060a12] px-5 py-3 text-sm font-medium text-slate-200 hover:border-blue-500/50 hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
              <span>Open Cafe Log</span>
            </button>
          </div>
        </div>
      </section>

      {/* Key Numbers Strip */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Income</span>
            <DollarSign className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2.5 text-2xl font-bold font-mono text-white tabular-nums">
            ₱{totalGrossIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs font-mono text-slate-400 tabular-nums">
            <span className="text-emerald-400">{netMarginPct}% Profit Margin</span>
            <span className="text-slate-600">·</span>
            <span>Exp ₱{totalExpenses.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Net Profit</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2.5 text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            ₱{totalNetProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs font-mono text-slate-400 tabular-nums">
            <span>{payments.length.toLocaleString()} payments</span>
            <span className="text-slate-600">·</span>
            <span>{earnings.length.toLocaleString()} entries</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Gaming Sessions</span>
            <Clock className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2.5 text-2xl font-bold font-mono text-white tabular-nums">
            {sessions.length.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs font-mono text-slate-400 tabular-nums">
            <span className="text-emerald-400">{paidSessionsCount} Paid</span>
            <span className="text-slate-600">·</span>
            <span className="text-amber-400">{pendingSessions.length} Open (₱{pendingOpenTotal.toFixed(0)})</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Customers &amp; Staff</span>
            <Users className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2.5 text-2xl font-bold font-mono text-white tabular-nums">
            {customers.length} <span className="text-sm font-normal text-slate-500">/ {employees.length} Staff</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs font-mono text-slate-400 tabular-nums">
            <span>Food Sales: ₱{totalFnbRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            <span className="text-slate-600">·</span>
            <span>{sessionProducts.length} orders</span>
          </div>
        </div>
      </section>

      {/* Physical Cafe Data: PC Stations + Food & Drinks */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
        {/* Left: PC Stations & Floor */}
        <div className="lg:col-span-6 rounded-xl border border-slate-800/80 bg-[#090d16] p-5 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800/70 pb-3">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-blue-400 shrink-0" />
                <h2 className="text-sm font-semibold text-white">PC Stations &amp; Floor</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('units')}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 whitespace-nowrap shrink-0"
              >
                <span>Open PC Stations</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3">
                <span className="text-[11px] text-slate-400 block">Available</span>
                <span className="mt-1 block text-lg font-bold font-mono text-emerald-400 tabular-nums">
                  {availableUnits.length}
                </span>
              </div>
              <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3">
                <span className="text-[11px] text-slate-400 block">In Use ({occupancyPct}%)</span>
                <span className="mt-1 block text-lg font-bold font-mono text-blue-400 tabular-nums">
                  {inUseUnits.length}
                </span>
              </div>
              <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3">
                <span className="text-[11px] text-slate-400 block">Maintenance</span>
                <span className="mt-1 block text-lg font-bold font-mono text-amber-400 tabular-nums">
                  {maintenanceUnits.length}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>All PCs ({units.length} Total)</span>
                <span className="font-mono text-[11px]">
                  Top PC: {pythonAnalytics?.units.top_pc || 'N/A'}
                </span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5 max-h-44 overflow-y-auto pr-1">
                {units.map((u) => {
                  const isAvail = u.status === 'Available';
                  const isUsed = u.status === 'In Use';
                  return (
                    <div
                      key={u.pc_id}
                      title={`${u.pc_number} · ${u.type} · ${u.area_location} · ${u.status}`}
                      className={`rounded-md border px-1.5 py-1.5 text-center font-mono text-[10px] ${
                        isUsed
                          ? 'border-blue-500/40 bg-blue-950/25 text-blue-300'
                          : isAvail
                          ? 'border-emerald-500/30 bg-emerald-950/15 text-emerald-300'
                          : 'border-amber-500/35 bg-amber-950/15 text-amber-300'
                      }`}
                    >
                      <div className="font-bold truncate">{u.pc_number}</div>
                      <div className="text-[9px] text-slate-400 truncate">
                        {isUsed ? 'Used' : isAvail ? 'Free' : 'Maint'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>Areas:</span>
            <span className="font-mono text-slate-300 truncate">
              {Array.from(zoneCounts.entries())
                .map(([zone, count]) => `${zone} (${count})`)
                .join(' · ')}
            </span>
          </div>
        </div>

        {/* Right: Food, Drinks & Stock */}
        <div className="lg:col-span-6 rounded-xl border border-slate-800/80 bg-[#090d16] p-5 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800/70 pb-3">
              <div className="flex items-center gap-2">
                <Coffee className="h-4 w-4 text-cyan-400 shrink-0" />
                <h2 className="text-sm font-semibold text-white">Food, Drinks &amp; Stock</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('inventory')}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 whitespace-nowrap shrink-0"
              >
                <span>Open Food &amp; Drinks</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3">
                <span className="text-[11px] text-slate-400 block">Menu Items</span>
                <span className="mt-1 block text-lg font-bold font-mono text-white tabular-nums">
                  {products.length}
                </span>
              </div>
              <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3">
                <span className="text-[11px] text-slate-400 block">Total Stock</span>
                <span className="mt-1 block text-lg font-bold font-mono text-cyan-400 tabular-nums">
                  {totalStockUnits.toLocaleString()}
                </span>
              </div>
              <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3">
                <span className="text-[11px] text-slate-400 block">Food &amp; Drink Sales</span>
                <span className="mt-1 block text-lg font-bold font-mono text-emerald-400 tabular-nums">
                  ₱{totalFnbRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="flex items-center gap-1.5">
                  {lowStockProducts.length > 0 && <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                  <span>
                    {lowStockProducts.length > 0
                      ? `Low Stock (${lowStockProducts.length} with 30 or less left)`
                      : 'Stock Highlights'}
                  </span>
                </span>
                <span className="font-mono text-[11px]">{sessionProducts.length} orders</span>
              </div>

              <div className="divide-y divide-slate-800/60 rounded-lg border border-slate-800/80 bg-[#060a12]">
                {(lowStockProducts.length > 0 ? lowStockProducts : products).slice(0, 5).map((p) => (
                  <div
                    key={p.product_id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-slate-200 truncate block">
                        {p.product_name}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {p.category} · ₱{Number(p.unit_price).toFixed(2)}
                      </span>
                    </div>
                    <span
                      className={`font-mono text-xs font-semibold tabular-nums shrink-0 ${
                        Number(p.stock_quantity) <= 30 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {p.stock_quantity} left
                    </span>
                  </div>
                ))}
                {products.length === 0 && (
                  <div className="px-3 py-4 text-center text-xs text-slate-500">
                    No food or drink items found.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>Categories:</span>
            <span className="font-mono text-slate-300 truncate">
              {Array.from(categoryCounts.entries())
                .map(([cat, count]) => `${cat} (${count})`)
                .join(' · ')}
            </span>
          </div>
        </div>
      </section>

      {/* Sales, Trends, Sessions & Staff */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
        {/* Left: Sales Summary & 7-Day Estimate */}
        <div className="lg:col-span-6 rounded-xl border border-slate-800/80 bg-[#090d16] p-5 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800/70 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
                <h2 className="text-sm font-semibold text-white">Sales Summary &amp; Trends</h2>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigateTab('financials')}
                  className="text-xs font-medium text-blue-400 hover:text-blue-300 whitespace-nowrap"
                >
                  Sales &amp; Profit
                </button>
                <span className="text-slate-700">·</span>
                <button
                  type="button"
                  onClick={() => onNavigateTab('python_engine')}
                  className="text-xs font-medium text-cyan-400 hover:text-cyan-300 whitespace-nowrap"
                >
                  Data Analysis
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3">
                <span className="text-[11px] text-slate-400 block">Busiest Hour</span>
                <span className="mt-1 block text-base font-bold font-mono text-white tabular-nums">
                  {pythonAnalytics?.hourly.peak_hour || '14:00'}{' '}
                  <span className="text-xs font-normal text-blue-400">
                    ({pythonAnalytics?.hourly.peak_session_count || 0} sessions)
                  </span>
                </span>
                <span className="text-[11px] font-mono text-slate-500 mt-0.5 block tabular-nums">
                  Avg {Math.round(pythonAnalytics?.hourly.avg_duration_minutes || 0)} min / session
                </span>
              </div>

              <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3">
                <span className="text-[11px] text-slate-400 block">7-Day Sales Estimate</span>
                <span className="mt-1 block text-base font-bold font-mono text-emerald-400 tabular-nums">
                  ₱{forecast7DayGross.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
                <span className="text-[11px] font-mono text-slate-500 mt-0.5 block tabular-nums">
                  Est. Profit ₱{forecast7DayProfit.toLocaleString('en-US', { maximumFractionDigits: 0 })} ·{' '}
                  {pythonAnalytics?.forecast.trend_direction || 'Steady'}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400 mb-2">Payment Methods ({payments.length} payments)</div>
              <div className="space-y-2 rounded-lg border border-slate-800/80 bg-[#060a12] p-3">
                {paymentMethods.slice(0, 4).map(([method, count]) => {
                  const pct = payments.length > 0 ? Math.round((count / payments.length) * 100) : 0;
                  return (
                    <div key={method} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-slate-200 font-sans">{method}</span>
                        <span className="text-slate-400 tabular-nums">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {paymentMethods.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-2">No payment records available yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Avg Sales per PC:</span>
            <span className="font-mono text-slate-200 tabular-nums">
              ₱{(pythonAnalytics?.units.avg_revenue_per_pc || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Right: Recent Sessions, Customers & Staff */}
        <div className="lg:col-span-6 rounded-xl border border-slate-800/80 bg-[#090d16] p-5 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800/70 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-blue-400 shrink-0" />
                <h2 className="text-sm font-semibold text-white">Recent Sessions, Customers &amp; Staff</h2>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigateTab('sessions')}
                  className="text-xs font-medium text-blue-400 hover:text-blue-300 whitespace-nowrap"
                >
                  Sessions
                </button>
                <span className="text-slate-700">·</span>
                <button
                  type="button"
                  onClick={() => onNavigateTab('employees')}
                  className="text-xs font-medium text-blue-400 hover:text-blue-300 whitespace-nowrap"
                >
                  Staff Shifts
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3">
                <span className="text-[11px] text-slate-400 block">Customer Memberships</span>
                <span className="mt-1 block font-mono text-slate-200 tabular-nums">
                  {Array.from(tierCounts.entries())
                    .map(([tier, count]) => `${tier}: ${count}`)
                    .join(' · ') || 'No customers'}
                </span>
              </div>
              <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3">
                <span className="text-[11px] text-slate-400 block">Staff Shifts</span>
                <span className="mt-1 block font-mono text-slate-200 tabular-nums">
                  {Array.from(shiftCounts.entries())
                    .map(([shift, count]) => `${shift}: ${count}`)
                    .join(' · ') || 'No staff'}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-800/80 bg-[#060a12]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-[11px] text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">ID</th>
                    <th className="px-3 py-2 font-medium">Customer</th>
                    <th className="px-3 py-2 font-medium">PC</th>
                    <th className="px-3 py-2 font-medium text-right">Fee</th>
                    <th className="px-3 py-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {sessions.slice(0, 5).map((s) => {
                    const cust = s.customers
                      ? `${s.customers.first_name} ${s.customers.last_name}`
                      : `Customer #${s.customer_id}`;
                    const pc = s.units?.pc_number || `PC-${s.pc_id}`;
                    return (
                      <tr key={s.session_id} className="hover:bg-slate-800/30">
                        <td className="px-3 py-2 text-slate-400">#{s.session_id}</td>
                        <td className="px-3 py-2 font-sans text-slate-200 truncate max-w-[140px]">{cust}</td>
                        <td className="px-3 py-2 text-blue-400">{pc}</td>
                        <td className="px-3 py-2 text-right text-emerald-400 tabular-nums">
                          ₱{Number(s.price).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-sans">
                          {s.payment_status === 'Paid' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              Paid
                            </span>
                          ) : s.payment_status === 'Pending' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                              <Clock className="h-3 w-3" />
                              Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-rose-400">
                              <AlertCircle className="h-3 w-3" />
                              {s.payment_status}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Need help finding records?</span>
            <button
              type="button"
              onClick={() => onOpenMiku('status')}
              className="font-medium text-cyan-400 hover:text-cyan-300 whitespace-nowrap"
            >
              Ask Miku for Quick Summary
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
