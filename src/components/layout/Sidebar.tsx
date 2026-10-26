import React from 'react';
import {
  Activity,
  Monitor,
  Clock,
  DollarSign,
  Users,
  Coffee,
  UserCheck,
  Terminal,
  Database,
} from 'lucide-react';
import { useCafeData } from '../../context/CafeDataContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { units, sessions, customers, products } = useCafeData();

  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Activity,
      badge: null,
    },
    {
      id: 'units',
      label: 'PC Fleet & Floor',
      icon: Monitor,
      badge: units.length ? `${units.length}` : null,
    },
    {
      id: 'sessions',
      label: 'Gaming Sessions',
      icon: Clock,
      badge: sessions.length ? `${sessions.length}` : null,
    },
    {
      id: 'financials',
      label: 'Financials & P&L',
      icon: DollarSign,
      badge: null,
    },
    {
      id: 'customers',
      label: 'Customers & VIP',
      icon: Users,
      badge: customers.length ? `${customers.length}` : null,
    },
    {
      id: 'inventory',
      label: 'Cafe Concessions',
      icon: Coffee,
      badge: products.length ? `${products.length}` : null,
    },
    {
      id: 'employees',
      label: 'Staff Roster',
      icon: UserCheck,
      badge: null,
    },
    {
      id: 'python_engine',
      label: 'Python Analytics',
      icon: Terminal,
      badge: 'v3.10',
    },
    {
      id: 'erd_schema',
      label: 'ERD Architecture',
      icon: Database,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 md:w-68 shrink-0 h-full border-r border-slate-800/80 bg-[#060911] p-4 flex flex-col justify-between overflow-y-auto select-none">
      <div className="space-y-6">
        <div className="px-2 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Control Navigation
          </p>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-1.5 py-0.5 rounded">
            Panel
          </span>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`ml-2 font-mono text-[10px] px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-slate-800/60 space-y-3 mt-6">
        {/* Hatsune Miku Mascot - Embedded in Control Navigation Panel */}
        <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-[#080d19] p-2.5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center gap-2.5">
            <div className="relative h-12 w-12 rounded-xl bg-cyan-950/40 border border-cyan-500/40 overflow-hidden flex items-center justify-center shrink-0 p-0.5 shadow-inner">
              <img
                src="https://media.tenor.com/ouQzDmgC9CwAAAAj/miku-vocaloid.gif"
                alt="Hatsune Miku Mascot"
                className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-200"
                loading="lazy"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                <span className="text-xs font-bold text-white tracking-wide truncate">
                  Hatsune Miku
                </span>
              </div>
              <span className="text-[10px] text-cyan-300/90 font-mono mt-0.5">Control Mascot</span>
              <span className="text-[9px] text-slate-500 font-mono">Ethereal Terminal</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#090d16] p-3 text-xs text-slate-400">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-300 mb-1">
            <span>Supabase Gateway</span>
            <span className="text-emerald-400 font-mono text-[10px]">Active</span>
          </div>
          <p className="text-[11px] text-slate-500 truncate font-mono">
            ref: hvtkxwzxjuoeewalptmq
          </p>
          <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Live Data Mode</span>
            <span className="text-blue-400 font-mono">No Mock Data</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
