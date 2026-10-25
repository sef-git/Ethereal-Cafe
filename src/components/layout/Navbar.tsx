import React from 'react';
import { RefreshCw, Database } from 'lucide-react';
import { useCafeData } from '../../context/CafeDataContext';

interface NavbarProps {
  activeTab: string;
}

const TAB_NAMES: Record<string, string> = {
  overview: 'Executive Overview',
  units: 'PC Fleet & Floor Matrix',
  sessions: 'Gaming Sessions Log',
  financials: 'Financials & Earnings',
  customers: 'Customer Directory',
  inventory: 'Cafe Concessions & Menu',
  employees: 'Staff & Shift Roster',
  python_engine: 'Python 3 Analytics Engine',
  erd_schema: 'Relational ERD Architecture',
};

export const Navbar: React.FC<NavbarProps> = ({ activeTab }) => {
  const { loading, refreshData, sessions, units } = useCafeData();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-8 border-b border-slate-800/80 bg-[#070b14]/90 px-6 backdrop-blur-md">
      {/* Zone 1: Brand wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a href="#overview" className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400">
            <Database className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-wide">
            Ethereal <span className="text-blue-400 font-normal">Cafe</span>
          </span>
        </a>
      </div>

      {/* Zone 2: Single-line breadcrumb/context trail */}
      <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-400 whitespace-nowrap shrink-0">
        <span className="text-slate-500">System</span>
        <span className="text-slate-700">/</span>
        <span className="text-slate-300">{TAB_NAMES[activeTab] || 'Dashboard'}</span>
        <span className="text-slate-700">·</span>
        <span className="font-mono text-slate-500">
          {units.length} PCs <span className="text-slate-700">·</span> {sessions.length} Live Sessions
        </span>
      </div>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => refreshData()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-950/40 px-3.5 py-1.5 text-xs font-medium text-blue-300 hover:border-blue-400/60 hover:bg-blue-900/50 hover:text-white transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Querying...' : 'Sync Live Supabase'}</span>
        </button>
      </div>
    </header>
  );
};
