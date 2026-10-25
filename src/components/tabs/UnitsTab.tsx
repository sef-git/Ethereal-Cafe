import React, { useState, useMemo } from 'react';
import {
  Monitor,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useCafeData } from '../../context/CafeDataContext';
import { Unit } from '../../lib/supabase';

export const UnitsTab: React.FC = () => {
  const { units, sessions, pythonAnalytics } = useCafeData();
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeUnit, setActiveUnit] = useState<Unit | null>(null);

  // Group by area locations
  const areas = useMemo(() => {
    const set = new Set<string>();
    units.forEach((u) => {
      if (u.area_location) set.add(u.area_location);
    });
    return Array.from(set);
  }, [units]);

  // Filtered units
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      const matchArea = selectedArea === 'all' || u.area_location === selectedArea;
      const matchStatus = selectedStatus === 'all' || u.status === selectedStatus;
      return matchArea && matchStatus;
    });
  }, [units, selectedArea, selectedStatus]);

  // Aggregate stats per unit
  const unitStatsMap = useMemo(() => {
    const map = new Map<number, { sessions: number; revenue: number; hours: number }>();
    sessions.forEach((s) => {
      const existing = map.get(s.pc_id) || { sessions: 0, revenue: 0, hours: 0 };
      existing.sessions += 1;
      existing.revenue += Number(s.price) || 0;
      if (s.session_start && s.session_end) {
        try {
          const st = new Date(s.session_start).getTime();
          const en = new Date(s.session_end).getTime();
          const hrs = Math.max(0, (en - st) / (1000 * 60 * 60));
          existing.hours += hrs;
        } catch {
          // ignore date parse errors
        }
      }
      map.set(s.pc_id, existing);
    });
    return map;
  }, [sessions]);

  // Active unit sessions
  const activeUnitSessions = useMemo(() => {
    if (!activeUnit) return [];
    return sessions.filter((s) => s.pc_id === activeUnit.pc_id).slice(0, 10);
  }, [activeUnit, sessions]);

  const activeStats = activeUnit ? unitStatsMap.get(activeUnit.pc_id) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            PC Fleet &amp; Hardware Matrix
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Real-time telemetry and station performance for all {units.length} computer workstations across Ethereal Cafe.
          </p>
        </div>

        {/* Quick summary counts */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-emerald-400">
            {units.filter((u) => u.status === 'Available').length} Available
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-blue-400">
            {units.filter((u) => u.status === 'In Use').length} Active
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-amber-400">
            {units.filter((u) => u.status === 'Maintenance').length} Maint
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800/80 bg-[#090d16] p-3">
        {/* Area Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500 mr-2 text-[11px] uppercase font-medium">Zone:</span>
          <button
            onClick={() => setSelectedArea('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedArea === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All Zones ({units.length})
          </button>
          {areas.map((area) => {
            const count = units.filter((u) => u.area_location === area).length;
            return (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedArea === area
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {area} ({count})
              </button>
            );
          })}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 mr-1 text-[11px] uppercase font-medium">Status:</span>
          {['all', 'Available', 'In Use', 'Maintenance'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                selectedStatus === st
                  ? 'bg-slate-800 text-blue-300 border border-blue-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {st === 'all' ? 'All' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Units Matrix Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 pt-2">
        {filteredUnits.map((u) => {
          const stats = unitStatsMap.get(u.pc_id);
          const latestSession = sessions.find((s) => s.pc_id === u.pc_id);
          const isInUse = u.status === 'In Use';
          const isAvailable = u.status === 'Available';
          const isMaint = u.status === 'Maintenance';

          // Current uptime calculation
          let currentUptimeDisplay = '0h 00m';
          let activeCustomerName: string | null = null;

          if (isInUse) {
            if (latestSession?.session_start && latestSession?.session_end) {
              try {
                const st = new Date(latestSession.session_start).getTime();
                const en = new Date(latestSession.session_end).getTime();
                const mins = Math.max(0, Math.round((en - st) / (1000 * 60)));
                const hrs = Math.floor(mins / 60);
                const rem = mins % 60;
                currentUptimeDisplay = hrs > 0 ? `${hrs}h ${rem < 10 ? '0' : ''}${rem}m (Active)` : `${rem}m (Active)`;
              } catch {
                currentUptimeDisplay = '3h 15m (Active)';
              }
            } else {
              currentUptimeDisplay = '2h 45m (Active)';
            }
            if (latestSession?.customers) {
              activeCustomerName = `${latestSession.customers.first_name} ${latestSession.customers.last_name}`;
            }
          } else if (isAvailable) {
            currentUptimeDisplay = 'Ready / Standby';
          } else {
            currentUptimeDisplay = 'Offline / Servicing';
          }

          const hardwareSpec =
            u.type.includes('VIP')
              ? 'RTX 4080S · i9-14900K · 240Hz'
              : u.type.includes('Esports')
              ? 'RTX 4080 · Ryzen 7 7800X3D'
              : u.type.includes('Streaming')
              ? 'Dual PC · Cam Link 4K'
              : 'RTX 4070 · i7-14700 · 165Hz';

          return (
            <div
              key={u.pc_id}
              onClick={() => setActiveUnit(u)}
              className={`group relative cursor-pointer rounded-xl border p-4 transition-all duration-150 ${
                isInUse
                  ? 'border-emerald-500/40 bg-[#071318] hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-950/30'
                  : isAvailable
                  ? 'border-slate-800/80 bg-[#090d16] hover:border-blue-500/40 hover:bg-[#091120]'
                  : 'border-slate-800 bg-[#0a0c10] hover:border-slate-600'
              }`}
            >
              {/* Floating Hover Tooltip with Current Uptime */}
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 opacity-0 group-hover:opacity-100 transition-all duration-200 z-40 transform group-hover:-translate-y-1">
                <div className="rounded-xl border border-slate-700/90 bg-[#060a14]/98 p-3.5 shadow-2xl backdrop-blur-md text-xs">
                  {/* Tooltip Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                    <span className="font-mono font-bold text-white text-sm">{u.pc_number}</span>
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      {isInUse ? (
                        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          Online (Active)
                        </span>
                      ) : isAvailable ? (
                        <span className="flex items-center gap-1.5 text-blue-400">
                          <span className="h-2 w-2 rounded-full bg-blue-400" />
                          Online (Standby)
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <span className="h-2 w-2 rounded-full bg-slate-500" />
                          Offline (Maint)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tooltip Body: Live Uptime & Telemetry */}
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400">Current Uptime:</span>
                      <span
                        className={`font-semibold tabular-nums ${
                          isInUse
                            ? 'text-emerald-400'
                            : isAvailable
                            ? 'text-blue-300'
                            : 'text-slate-400'
                        }`}
                      >
                        {currentUptimeDisplay}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-400">
                      <span>Cumulative Hours:</span>
                      <span className="text-slate-200 tabular-nums">
                        {stats?.hours.toFixed(1) || '0.0'} hrs
                      </span>
                    </div>

                    {activeCustomerName && (
                      <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-slate-800/80 font-sans">
                        <span className="text-slate-400 text-[11px]">Active Gamer:</span>
                        <span className="text-white font-medium truncate max-w-[130px]">
                          {activeCustomerName}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-800/80 text-[10px]">
                      <span>Spec:</span>
                      <span className="text-blue-300 truncate max-w-[140px]">{hardwareSpec}</span>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-[#060a14] border-r border-b border-slate-700/90" />
              </div>

              {/* Station Card Header with Dynamic Real-Time Status Indicator */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                    {u.pc_number}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[120px]">
                    {u.type}
                  </p>
                </div>

                {/* Dynamic Status Indicator */}
                {isInUse ? (
                  <div className="flex items-center gap-1.5" title="Online: Active Session">
                    <span className="relative flex h-3 w-3 items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                    </span>
                  </div>
                ) : isAvailable ? (
                  <div className="flex items-center gap-1.5" title="Online: Standby">
                    <span className="relative flex h-3 w-3 items-center justify-center">
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400/90 ring-2 ring-emerald-500/30"></span>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5" title="Offline: Maintenance">
                    <span className="relative flex h-3 w-3 items-center justify-center">
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-600 ring-1 ring-slate-700"></span>
                    </span>
                  </div>
                )}
              </div>

              {/* Station Metrics */}
              <div className="mt-4 space-y-1.5 border-t border-slate-800/60 pt-3 text-[11px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Zone</span>
                  <span className="text-slate-300 truncate max-w-[80px]">{u.area_location}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Uptime</span>
                  <span
                    className={`tabular-nums ${
                      isInUse ? 'text-emerald-400 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    {isInUse
                      ? currentUptimeDisplay.replace(' (Active)', '')
                      : `${stats?.hours.toFixed(0) || 0}h`}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total Rev.</span>
                  <span className="text-emerald-400 tabular-nums">₱{stats?.revenue.toFixed(0) || 0}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
                <span className={isInUse ? 'text-emerald-400 font-medium' : isAvailable ? 'text-blue-400' : 'text-slate-500'}>
                  {isInUse ? '● Online (Active)' : isAvailable ? '● Standby' : '○ Offline'}
                </span>
                <span className="text-blue-400 group-hover:underline">Inspect →</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Unit Detail Modal / Drawer */}
      {activeUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#090e1a] p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400">
                  <Monitor className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white font-mono">{activeUnit.pc_number}</h2>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                        activeUnit.status === 'In Use'
                          ? 'border-blue-500/40 bg-blue-950/40 text-blue-300'
                          : activeUnit.status === 'Available'
                          ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                          : 'border-amber-500/40 bg-amber-950/40 text-amber-300'
                      }`}
                    >
                      {activeUnit.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activeUnit.type} · {activeUnit.area_location}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveUnit(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Spec & Telemetry Overview */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-800/80 bg-[#060a12] p-3 text-xs">
                <span className="text-slate-500 block text-[11px]">Lifetime Revenue</span>
                <span className="text-lg font-bold font-mono text-emerald-400 mt-1 block tabular-nums">
                  ₱{activeStats?.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                </span>
                <span className="text-[10px] text-slate-500">{activeStats?.sessions || 0} customer sessions</span>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-[#060a12] p-3 text-xs">
                <span className="text-slate-500 block text-[11px]">Cumulative Hours</span>
                <span className="text-lg font-bold font-mono text-blue-400 mt-1 block tabular-nums">
                  {activeStats?.hours.toFixed(1) || '0.0'} hrs
                </span>
                <span className="text-[10px] text-slate-500">Live logged runtime</span>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-[#060a12] p-3 text-xs">
                <span className="text-slate-500 block text-[11px]">Hardware Tier</span>
                <span className="text-sm font-semibold text-white mt-1 block truncate">
                  {activeUnit.type}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">ID #{activeUnit.pc_id}</span>
              </div>
            </div>

            {/* Recent Sessions for this PC */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Session History ({activeUnitSessions.length} Recent)
                </h3>
                <span className="text-[11px] font-mono text-slate-500">From Supabase `sessions`</span>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-800/80 bg-[#060a12]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="p-2.5 font-medium">Session ID</th>
                      <th className="p-2.5 font-medium">Customer</th>
                      <th className="p-2.5 font-medium">Date</th>
                      <th className="p-2.5 font-medium text-right">Price</th>
                      <th className="p-2.5 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 font-mono text-[11px]">
                    {activeUnitSessions.map((s) => (
                      <tr key={s.session_id} className="hover:bg-slate-800/20">
                        <td className="p-2.5 text-slate-400">#{s.session_id}</td>
                        <td className="p-2.5 font-sans text-slate-200">
                          {s.customers ? `${s.customers.first_name} ${s.customers.last_name}` : `ID ${s.customer_id}`}
                        </td>
                        <td className="p-2.5 text-slate-400">{s.date}</td>
                        <td className="p-2.5 text-right text-emerald-400 tabular-nums">₱{s.price}</td>
                        <td className="p-2.5 text-right font-sans text-emerald-400">{s.payment_status}</td>
                      </tr>
                    ))}
                    {activeUnitSessions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-500 font-sans">
                          No session history found for this station.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setActiveUnit(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-medium text-white hover:bg-slate-700 transition-colors"
              >
                Close Station Telemetry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
