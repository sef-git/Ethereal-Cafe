import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  Calendar,
  Clock,
  MapPin,
  TrendingUp,
  DollarSign,
  Search,
} from 'lucide-react';
import { useCafeData } from '../../context/CafeDataContext';

export const EmployeesTab: React.FC = () => {
  const { employees, sessions } = useCafeData();
  const [shiftFilter, setShiftFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Performance per employee
  const employeePerformanceMap = useMemo(() => {
    const map = new Map<number, { sessionsCount: number; revenueProcessed: number }>();
    sessions.forEach((s) => {
      const eid = s.employee_id;
      const existing = map.get(eid) || { sessionsCount: 0, revenueProcessed: 0 };
      existing.sessionsCount += 1;
      existing.revenueProcessed += Number(s.price) || 0;
      map.set(eid, existing);
    });
    return map;
  }, [sessions]);

  // Unique shifts
  const shifts = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.shifts) set.add(e.shifts);
    });
    return Array.from(set);
  }, [employees]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const name = `${e.first_name} ${e.middle_initial || ''} ${e.last_name}`.toLowerCase();
      const addr = (e.address || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = !term || name.includes(term) || addr.includes(term) || e.employee_id.toString().includes(term);
      const matchesShift = shiftFilter === 'all' || e.shifts === shiftFilter;

      return matchesSearch && matchesShift;
    });
  }, [employees, searchTerm, shiftFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Staff &amp; Shift Operations
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Personnel roster, shift assignments, and station session throughput from Supabase `employees` table.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <span className="text-blue-400">{employees.length} Staff on Roster</span>
          <span className="text-slate-600">·</span>
          <span>Full Operations Team</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800/80 bg-[#090d16] p-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employee name or address..."
            className="w-full rounded-lg border border-slate-800 bg-[#060a12] pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 mr-1 text-[11px] uppercase font-medium">Shift:</span>
          <button
            onClick={() => setShiftFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              shiftFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All Shifts ({employees.length})
          </button>
          {shifts.map((sh) => (
            <button
              key={sh}
              onClick={() => setShiftFilter(sh)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                shiftFilter === sh
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {sh} Shift
            </button>
          ))}
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredEmployees.map((e) => {
          const perf = employeePerformanceMap.get(e.employee_id);
          const isNight = e.shifts?.toLowerCase().includes('night');

          return (
            <div
              key={e.employee_id}
              className="rounded-xl border border-slate-800/80 bg-[#090d16] p-5 transition-all hover:border-blue-500/30"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 font-bold text-sm">
                    {e.first_name[0]}
                    {e.last_name[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">
                      {e.first_name} {e.middle_initial ? `${e.middle_initial}. ` : ''}
                      {e.last_name}
                    </h3>
                    <span className="text-slate-400 text-[11px] font-mono">
                      Staff ID #{e.employee_id}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    isNight
                      ? 'border-indigo-500/40 bg-indigo-950/40 text-indigo-300'
                      : 'border-blue-500/40 bg-blue-950/40 text-blue-300'
                  }`}
                >
                  {e.shifts} Shift
                </span>
              </div>

              <div className="mt-4 space-y-2 border-t border-slate-800/60 pt-3 text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{e.address || 'Cavite, Philippines'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                  <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>DOB: {e.birth_date}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-800/60 pt-3 text-xs font-mono">
                <div className="rounded bg-[#060a12] p-2">
                  <span className="text-slate-500 text-[10px] block">Sessions Handled</span>
                  <span className="text-blue-400 font-bold text-sm mt-0.5 block">
                    {perf?.sessionsCount || 0}
                  </span>
                </div>
                <div className="rounded bg-[#060a12] p-2">
                  <span className="text-slate-500 text-[10px] block">Revenue Processed</span>
                  <span className="text-emerald-400 font-bold text-sm mt-0.5 block tabular-nums">
                    ₱{(perf?.revenueProcessed || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
