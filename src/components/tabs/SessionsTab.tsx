import React, { useState, useMemo } from 'react';
import {
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  Coffee,
  User,
  Monitor,
  Calendar,
  X,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useCafeData } from '../../context/CafeDataContext';
import { Session } from '../../lib/supabase';

export const SessionsTab: React.FC = () => {
  const { sessions, sessionProducts, payments } = useCafeData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const pageSize = 25;

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const custName = s.customers
        ? `${s.customers.first_name} ${s.customers.last_name}`.toLowerCase()
        : '';
      const pcNum = s.units?.pc_number ? s.units.pc_number.toLowerCase() : `pc-${s.pc_id}`;
      const term = searchTerm.toLowerCase();

      const matchesSearch =
        !term ||
        s.session_id.toString().includes(term) ||
        custName.includes(term) ||
        pcNum.includes(term) ||
        (s.date && s.date.includes(term));

      const matchesStatus = statusFilter === 'all' || s.payment_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [sessions, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredSessions.length / pageSize) || 1;
  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSessions.slice(start, start + pageSize);
  }, [filteredSessions, currentPage, pageSize]);

  // Orders attached to selected session
  const attachedProducts = useMemo(() => {
    if (!selectedSession) return [];
    return sessionProducts.filter((sp) => sp.session_id === selectedSession.session_id);
  }, [selectedSession, sessionProducts]);

  // Payment record attached to selected session
  const attachedPayment = useMemo(() => {
    if (!selectedSession) return null;
    return payments.find((p) => p.session_id === selectedSession.session_id);
  }, [selectedSession, payments]);

  const calculateDuration = (startStr?: string, endStr?: string) => {
    if (!startStr || !endStr) return 'N/A';
    try {
      const st = new Date(startStr).getTime();
      const en = new Date(endStr).getTime();
      const mins = Math.max(0, Math.round((en - st) / (1000 * 60)));
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return hrs > 0 ? `${hrs}h ${remMins}m` : `${remMins}m`;
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Gaming Sessions Ledger
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Real-time registry of all {sessions.length} customer computer sessions with linked hardware, employees, and concessions.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="text-blue-400">{filteredSessions.length} matching</span>
          <span className="text-slate-600">/</span>
          <span>{sessions.length} total entries</span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800/80 bg-[#090d16] p-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by customer, PC number, session ID, or date (YYYY-MM-DD)..."
            className="w-full rounded-lg border border-slate-800 bg-[#060a12] pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 mr-1 text-[11px] uppercase font-medium">Payment:</span>
          {['all', 'Paid', 'Pending'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {st === 'all' ? 'All' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions Table */}
      <div className="rounded-xl border border-slate-800/80 bg-[#090d16] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-[#070b13] text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4 font-medium">Session ID</th>
                <th className="py-3 px-4 font-medium">Customer</th>
                <th className="py-3 px-4 font-medium">PC Station</th>
                <th className="py-3 px-4 font-medium">Duty Employee</th>
                <th className="py-3 px-4 font-medium">Date</th>
                <th className="py-3 px-4 font-medium">Duration</th>
                <th className="py-3 px-4 font-medium text-right">Session Fee</th>
                <th className="py-3 px-4 font-medium text-right">Status</th>
                <th className="py-3 px-4 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-mono text-[11px]">
              {paginatedSessions.map((s) => {
                const custName = s.customers
                  ? `${s.customers.first_name} ${s.customers.last_name}`
                  : `Customer #${s.customer_id}`;
                const empName = s.employees
                  ? `${s.employees.first_name} ${s.employees.last_name}`
                  : `Staff #${s.employee_id}`;
                const pcNumber = s.units?.pc_number || `PC-${s.pc_id}`;
                const duration = calculateDuration(s.session_start, s.session_end);

                return (
                  <tr
                    key={s.session_id}
                    onClick={() => setSelectedSession(s)}
                    className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-400">#{s.session_id}</td>
                    <td className="py-3 px-4 font-sans font-medium text-slate-200">
                      <div>
                        <span>{custName}</span>
                        {s.customers?.membership && (
                          <span className="ml-2 text-[10px] text-blue-400 font-mono">
                            [{s.customers.membership}]
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-blue-400 font-semibold">{pcNumber}</td>
                    <td className="py-3 px-4 font-sans text-slate-400">{empName}</td>
                    <td className="py-3 px-4 text-slate-400">{s.date}</td>
                    <td className="py-3 px-4 text-slate-300">{duration}</td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-semibold tabular-nums">
                      ₱{s.price}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        {s.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSession(s);
                        }}
                        className="rounded px-2 py-1 text-[10px] font-sans text-blue-400 hover:bg-blue-950/50 hover:text-blue-300"
                      >
                        Details →
                      </button>
                    </td>
                  </tr>
                );
              })}
              {paginatedSessions.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                    No gaming sessions found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-slate-800/80 px-4 py-3 text-xs text-slate-400">
          <div>
            Showing <span className="text-white font-mono">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="text-white font-mono">
              {Math.min(currentPage * pageSize, filteredSessions.length)}
            </span>{' '}
            of <span className="text-white font-mono">{filteredSessions.length}</span> sessions
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 rounded border border-slate-800 px-2.5 py-1 text-xs hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <span className="font-mono text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 rounded border border-slate-800 px-2.5 py-1 text-xs hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#090e1a] p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white font-mono">
                    Session #{selectedSession.session_id}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Logged on {selectedSession.date} · Station {selectedSession.units?.pc_number || `PC-${selectedSession.pc_id}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Core Info Grid */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3">
                <span className="text-slate-500 block text-[11px]">Customer</span>
                <span className="font-semibold text-white mt-1 block">
                  {selectedSession.customers
                    ? `${selectedSession.customers.first_name} ${selectedSession.customers.last_name}`
                    : `ID #${selectedSession.customer_id}`}
                </span>
                <span className="text-[10px] text-blue-400">
                  {selectedSession.customers?.membership || 'Standard'} Member
                </span>
              </div>

              <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3">
                <span className="text-slate-500 block text-[11px]">Assigned Rig</span>
                <span className="font-mono font-bold text-blue-400 mt-1 block">
                  {selectedSession.units?.pc_number || `PC-${selectedSession.pc_id}`}
                </span>
                <span className="text-[10px] text-slate-400 truncate block">
                  {selectedSession.units?.area_location || 'Floor'}
                </span>
              </div>

              <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3">
                <span className="text-slate-500 block text-[11px]">Duration</span>
                <span className="font-mono font-bold text-white mt-1 block">
                  {calculateDuration(selectedSession.session_start, selectedSession.session_end)}
                </span>
                <span className="text-[10px] text-slate-400">
                  Fee: ₱{selectedSession.price}
                </span>
              </div>

              <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3">
                <span className="text-slate-500 block text-[11px]">Staff Overseer</span>
                <span className="font-semibold text-slate-200 mt-1 block">
                  {selectedSession.employees
                    ? `${selectedSession.employees.first_name} ${selectedSession.employees.last_name}`
                    : `Staff #${selectedSession.employee_id}`}
                </span>
                <span className="text-[10px] text-slate-400">
                  Shift: {selectedSession.employees?.shifts || 'Day'}
                </span>
              </div>
            </div>

            {/* Attached Concession Orders */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Coffee className="h-3.5 w-3.5 text-blue-400" />
                  <span>Cafe Orders Attached ({attachedProducts.length} items)</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-500">Supabase `session_products`</span>
              </div>

              {attachedProducts.length > 0 ? (
                <div className="rounded-lg border border-slate-800/80 bg-[#060a12] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                      <tr>
                        <th className="p-2 font-medium">Product</th>
                        <th className="p-2 font-medium">Category</th>
                        <th className="p-2 font-medium text-center">Qty</th>
                        <th className="p-2 font-medium text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 font-mono text-[11px]">
                      {attachedProducts.map((sp) => (
                        <tr key={sp.session_product_id}>
                          <td className="p-2 text-white font-sans">
                            {sp.products?.product_name || `Product #${sp.product_id}`}
                          </td>
                          <td className="p-2 text-slate-400 font-sans">{sp.products?.category || 'Snack'}</td>
                          <td className="p-2 text-center text-slate-300">{sp.quantity}</td>
                          <td className="p-2 text-right text-emerald-400 tabular-nums">₱{sp.subtotal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-800/60 bg-[#060a12] p-4 text-center text-xs text-slate-500">
                  No snack or drink concessions were billed during this session.
                </div>
              )}
            </div>

            {/* Payment Details */}
            {attachedPayment && (
              <div className="mt-4 rounded-lg border border-slate-800 bg-[#060a12] p-3 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-400" />
                  <div>
                    <span className="text-white font-medium">Payment Record #{attachedPayment.payments_id}</span>
                    <span className="text-slate-400 text-[11px] block">
                      Method: {attachedPayment.payment_method} · Provider: {attachedPayment.provider}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-emerald-400 text-xs">
                  {new Date(attachedPayment.date).toLocaleDateString()}
                </span>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedSession(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-medium text-white hover:bg-slate-700"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
