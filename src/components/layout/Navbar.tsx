import React from 'react';
import { RefreshCw, Database, Menu } from 'lucide-react';
import { useCafeData } from '../../context/CafeDataContext';

interface NavbarProps {
  activeTab: string;
  onToggleMobileNav?: () => void;
}

const TAB_NAMES: Record<string, string> = {
  overview: 'Executive Overview',
  units: 'PC Fleet & Floor Matrix',
  sessions: 'Gaming Sessions Log',
  financials: 'Financials & Earnings',
  customers: 'Customer Directory',
  inventory: 'Cafe Concessions & Menu',
  employees: 'Staff & Shift Roster',
  python_engine: 'Data Analysis',
};

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onToggleMobileNav }) => {
  const { loading, refreshData, sessions, units } = useCafeData();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-4 border-b border-slate-800/80 bg-[#070b14]/90 px-4 sm:px-6 backdrop-blur-md shrink-0">
      {/* Brand & Mobile Hamburger */}
      <div className="flex items-center gap-3 shrink-0">
        {onToggleMobileNav && (
          <button
            onClick={onToggleMobileNav}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-[#060a14] text-slate-300 hover:text-white hover:bg-slate-800"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <a href="#overview" className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400">
            <Database className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-wide">
            Ethereal <span className="text-blue-400 font-normal">Cafe</span>
          </span>
        </a>
      </div>

      {/* Breadcrumb Context Trail */}
      <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-400 whitespace-nowrap shrink-0">
        <span className="text-slate-500">System</span>
        <span className="text-slate-700">/</span>
        <span className="text-slate-300">{TAB_NAMES[activeTab] || 'Dashboard'}</span>
        <span className="text-slate-700">·</span>
        <span className="font-mono text-slate-500">
          {units.length} PCs <span className="text-slate-700">·</span> {sessions.length} Live Sessions
        </span>
      </div>

      {/* Sync Action Button */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => refreshData()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-950/40 px-3 sm:px-3.5 py-1.5 text-xs font-medium text-blue-300 hover:border-blue-400/60 hover:bg-blue-900/50 hover:text-white transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{loading ? 'Querying...' : 'Sync Live Supabase'}</span>
          <span className="sm:hidden">{loading ? 'Syncing' : 'Sync'}</span>
        </button>
      </div>
    </header>
  );
};
