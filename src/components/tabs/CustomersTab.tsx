import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Mail,
  Phone,
  Award,
  Clock,
  DollarSign,
  X,
  ChevronRight,
} from 'lucide-react';
import { useCafeData } from '../../context/CafeDataContext';
import { Customer } from '../../lib/supabase';

export const CustomersTab: React.FC = () => {
  const { customers, sessions } = useCafeData();
  const [searchTerm, setSearchTerm] = useState('');
  const [membershipFilter, setMembershipFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Compute stats per customer from sessions
  const customerStatsMap = useMemo(() => {
    const map = new Map<number, { sessions: number; totalSpend: number; lastVisit: string | null }>();
    sessions.forEach((s) => {
      const existing = map.get(s.customer_id) || { sessions: 0, totalSpend: 0, lastVisit: null };
      existing.sessions += 1;
      existing.totalSpend += Number(s.price) || 0;
      if (s.date && (!existing.lastVisit || s.date > existing.lastVisit)) {
        existing.lastVisit = s.date;
      }
      map.set(s.customer_id, existing);
    });
    return map;
  }, [sessions]);

  // Unique memberships
  const memberships = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.membership) set.add(c.membership);
    });
    return Array.from(set);
  }, [customers]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
      const email = (c.email_address || '').toLowerCase();
      const phone = c.phone_number || '';
      const term = searchTerm.toLowerCase();

      const matchesSearch =
        !term ||
        fullName.includes(term) ||
        email.includes(term) ||
        phone.includes(term) ||
        c.customer_id.toString().includes(term);

      const matchesTier = membershipFilter === 'all' || c.membership === membershipFilter;

      return matchesSearch && matchesTier;
    });
  }, [customers, searchTerm, membershipFilter]);

  // Sessions for selected customer
  const customerSessions = useMemo(() => {
    if (!selectedCustomer) return [];
    return sessions.filter((s) => s.customer_id === selectedCustomer.customer_id).slice(0, 15);
  }, [selectedCustomer, sessions]);

  const activeStats = selectedCustomer ? customerStatsMap.get(selectedCustomer.customer_id) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Customer Directory &amp; Loyalty Registry
          </h1>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <span className="text-blue-400">{filteredCustomers.length} displayed</span>
          <span className="text-slate-600">·</span>
          <span>{customers.length} patrons in Supabase</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800/80 bg-[#090d16] p-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, phone number, or ID..."
            className="w-full rounded-lg border border-slate-800 bg-[#060a12] pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Membership Tier Tabs */}
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <span className="text-slate-500 mr-1 text-[11px] uppercase font-medium">Tier:</span>
          <button
            onClick={() => setMembershipFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              membershipFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All Patrons ({customers.length})
          </button>
          {memberships.map((m) => {
            const count = customers.filter((c) => c.membership === m).length;
            return (
              <button
                key={m}
                onClick={() => setMembershipFilter(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  membershipFilter === m
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {m} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-xl border border-slate-800/80 bg-[#090d16] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-[#070b13] text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4 font-medium">Patron ID</th>
                <th className="py-3 px-4 font-medium">Full Name</th>
                <th className="py-3 px-4 font-medium">Membership</th>
                <th className="py-3 px-4 font-medium">Email Address</th>
                <th className="py-3 px-4 font-medium">Contact Phone</th>
                <th className="py-3 px-4 font-medium text-center">Sessions</th>
                <th className="py-3 px-4 font-medium text-right">Lifetime Spend</th>
                <th className="py-3 px-4 font-medium text-right">Latest Visit</th>
                <th className="py-3 px-4 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-[11px]">
              {filteredCustomers.map((c) => {
                const stats = customerStatsMap.get(c.customer_id);
                const isVip = c.membership === 'VIP' || c.membership === 'PRO';

                return (
                  <tr
                    key={c.customer_id}
                    onClick={() => setSelectedCustomer(c)}
                    className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-slate-500">#{c.customer_id}</td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {c.first_name} {c.last_name}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                          isVip
                            ? 'border-blue-500/40 bg-blue-950/40 text-blue-300'
                            : 'border-slate-700 bg-slate-800/40 text-slate-400'
                        }`}
                      >
                        {c.membership}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono truncate max-w-[160px]">
                      {c.email_address}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{c.phone_number}</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-300">
                      {stats?.sessions || 0}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400 font-semibold tabular-nums">
                      ₱{(stats?.totalSpend || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      {stats?.lastVisit || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(c);
                        }}
                        className="rounded px-2 py-1 text-[10px] text-blue-400 hover:bg-blue-950/50"
                      >
                        Profile →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#090e1a] p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 font-bold text-lg">
                  {selectedCustomer.first_name[0]}
                  {selectedCustomer.last_name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">
                      {selectedCustomer.first_name} {selectedCustomer.last_name}
                    </h2>
                    <span className="font-mono text-xs px-2 py-0.5 rounded border border-blue-500/30 bg-blue-950/40 text-blue-300">
                      {selectedCustomer.membership}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    Customer ID #{selectedCustomer.customer_id} · Ethereal Club Member
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contact details */}
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2.5 rounded-lg border border-slate-800/80 bg-[#060a12] p-3">
                <Mail className="h-4 w-4 text-blue-400 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-slate-500 block uppercase">Email Address</span>
                  <span className="text-slate-200 font-mono truncate block">{selectedCustomer.email_address}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg border border-slate-800/80 bg-[#060a12] p-3">
                <Phone className="h-4 w-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Phone Contact</span>
                  <span className="text-slate-200 font-mono block">{selectedCustomer.phone_number}</span>
                </div>
              </div>
            </div>

            {/* Financial & Session Stats */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3 text-xs">
                <span className="text-slate-500 block text-[11px]">Lifetime Spend</span>
                <span className="text-lg font-bold font-mono text-emerald-400 mt-1 block tabular-nums">
                  ₱{(activeStats?.totalSpend || 0).toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500">Total cafe outlay</span>
              </div>

              <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3 text-xs">
                <span className="text-slate-500 block text-[11px]">Total Sessions</span>
                <span className="text-lg font-bold font-mono text-blue-400 mt-1 block tabular-nums">
                  {activeStats?.sessions || 0}
                </span>
                <span className="text-[10px] text-slate-500">Gaming visits</span>
              </div>

              <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3 text-xs">
                <span className="text-slate-500 block text-[11px]">Most Recent Visit</span>
                <span className="text-sm font-semibold font-mono text-white mt-1 block">
                  {activeStats?.lastVisit || 'No visits recorded'}
                </span>
                <span className="text-[10px] text-slate-500">Live ledger</span>
              </div>
            </div>

            {/* Recent Session Logs */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Session History ({customerSessions.length} Recent)
                </h3>
                <span className="text-[10px] font-mono text-slate-500">Supabase Joined Query</span>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-800/80 bg-[#060a12]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="p-2.5 font-medium">Session ID</th>
                      <th className="p-2.5 font-medium">Rig Station</th>
                      <th className="p-2.5 font-medium">Date</th>
                      <th className="p-2.5 font-medium text-right">Fee</th>
                      <th className="p-2.5 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 font-mono text-[11px]">
                    {customerSessions.map((s) => (
                      <tr key={s.session_id}>
                        <td className="p-2.5 text-slate-400">#{s.session_id}</td>
                        <td className="p-2.5 text-blue-400">{s.units?.pc_number || `PC-${s.pc_id}`}</td>
                        <td className="p-2.5 text-slate-400">{s.date}</td>
                        <td className="p-2.5 text-right text-emerald-400 tabular-nums">₱{s.price}</td>
                        <td className="p-2.5 text-right font-sans text-emerald-400">{s.payment_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-medium text-white hover:bg-slate-700"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
