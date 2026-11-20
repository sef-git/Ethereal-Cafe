import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Clock,
  DollarSign,
  Users,
  Coffee,
  UserCheck,
  Terminal,
  X,
  Loader2,
  AlertTriangle,
  PlusCircle,
  Home,
  MessageSquare,
} from 'lucide-react';
import { useCafeData } from '../../context/CafeDataContext';
import { ClickableMikuImage } from '../common/ClickableMikuImage';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenMiku: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenMiku,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { units, sessions, customers, products, loading, error, refreshData } = useCafeData();

  // Network connection & speed tracking
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSlowNetwork, setIsSlowNetwork] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const checkSpeed = () => {
      if (typeof navigator !== 'undefined' && 'connection' in navigator) {
        const conn = (navigator as unknown as {
          connection?: {
            effectiveType?: string;
            rtt?: number;
            downlink?: number;
            addEventListener?: (e: string, fn: () => void) => void;
            removeEventListener?: (e: string, fn: () => void) => void;
          };
        }).connection;

        if (conn) {
          const isSlow =
            conn.effectiveType === 'slow-2g' ||
            conn.effectiveType === '2g' ||
            (typeof conn.rtt === 'number' && conn.rtt > 400) ||
            (typeof conn.downlink === 'number' && conn.downlink < 0.7);
          setIsSlowNetwork(isSlow);
        }
      }
    };

    checkSpeed();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const conn =
      typeof navigator !== 'undefined' && 'connection' in navigator
        ? (navigator as unknown as {
            connection?: {
              addEventListener?: (e: string, fn: () => void) => void;
              removeEventListener?: (e: string, fn: () => void) => void;
            };
          }).connection
        : null;

    if (conn?.addEventListener) {
      conn.addEventListener('change', checkSpeed);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (conn?.removeEventListener) {
        conn.removeEventListener('change', checkSpeed);
      }
    };
  }, []);

  // Determine light status phase:
  // 1. Green ("Connected") - good internet connection
  // 2. Yellow ("Connecting") - slow/bad internet connection or loading
  // 3. Red ("No Connection") - no internet connection or unable to display
  const hasConnectionError = !isOnline || (!!error && !loading);
  let statusPhase: 'connected' | 'connecting' | 'no_connection' = 'connected';
  if (hasConnectionError) {
    statusPhase = 'no_connection';
  } else if (loading || isSlowNetwork) {
    statusPhase = 'connecting';
  } else {
    statusPhase = 'connected';
  }


  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      badge: null,
    },
    {
      id: 'main_interface',
      label: 'Cafe Log',
      icon: PlusCircle,
      badge: null,
    },
    {
      id: 'units',
      label: 'PC Stations',
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
      label: 'Sales & Profit',
      icon: DollarSign,
      badge: null,
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      badge: customers.length ? `${customers.length}` : null,
    },
    {
      id: 'inventory',
      label: 'Food & Drinks',
      icon: Coffee,
      badge: products.length ? `${products.length}` : null,
    },
    {
      id: 'employees',
      label: 'Staff Shifts',
      icon: UserCheck,
      badge: null,
    },
    {
      id: 'python_engine',
      label: 'Data Analysis',
      icon: Terminal,
      badge: 'v3.10',
    },
  ];

  const handleSelect = (id: string) => {
    setActiveTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  // Re-run Tenor embed script if online when status phase shifts
  useEffect(() => {
    try {
      const win = window as unknown as { tenor?: { embed?: () => void } };
      if (win.tenor && typeof win.tenor.embed === 'function') {
        win.tenor.embed();
      }
    } catch {
      // Offline fallback ensures immediate local image display
    }
  }, [statusPhase]);

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full w-full p-4 sm:p-5 overflow-y-auto select-none gap-4">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-1.5 pb-3 border-b border-slate-800/70 flex items-center justify-between shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Control Navigation
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded">
              Panel
            </span>
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="md:hidden p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <nav className="flex-1 flex flex-col justify-evenly gap-1 py-2.5 min-h-[380px]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2 lg:py-2.5 text-[13px] lg:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                      isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                  <span className="truncate whitespace-nowrap">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`ml-2 shrink-0 font-mono text-[11px] px-2 py-0.5 rounded-md tabular-nums ${
                      isActive
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-slate-800/90 text-slate-400'
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

      <div className="pt-4 border-t border-slate-800/70 space-y-3 shrink-0">
        {/* Mascot & Connection Status Box + Ask Button beside Control Mascot */}
        <div className="flex items-stretch gap-2">
          <div
            className={`flex-1 min-w-0 rounded-xl border p-2.5 shadow-lg relative overflow-hidden group transition-all duration-300 ${
              statusPhase === 'connected'
                ? 'border-cyan-500/30 bg-gradient-to-b from-cyan-950/25 to-[#080d19]'
                : statusPhase === 'connecting'
                ? 'border-amber-500/30 bg-gradient-to-b from-amber-950/25 to-[#080d19]'
                : 'border-rose-500/30 bg-gradient-to-b from-rose-950/25 to-[#080d19]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {/* Mascot & Status Icon Container (transparent for Miku GIFs) */}
              <div
                className={`relative h-12 w-12 flex items-center justify-center shrink-0 transition-colors ${
                  statusPhase === 'connecting'
                    ? 'rounded-xl bg-amber-950/40 overflow-hidden p-0.5'
                    : 'bg-transparent overflow-visible'
                }`}
              >
                {/* Phase 1: Green / Connected - Hatsune Miku */}
                {statusPhase === 'connected' && (
                  <ClickableMikuImage
                    src="/assets/miku-vocaloid.gif"
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://media.tenor.com/ouQzDmgC9CwAAAAj/miku-vocaloid.gif';
                    }}
                    alt="Hatsune Miku"
                    wrapperClassName="h-full w-full"
                    loading="eager"
                    noteSize="sm"
                  />
                )}

                {/* Phase 2: Yellow / Connecting - Standard Buffering Icon */}
                {statusPhase === 'connecting' && (
                  <div className="relative w-full h-full flex flex-col items-center justify-center bg-amber-950/20 rounded-lg">
                    <div className="relative flex items-center justify-center">
                      <span className="absolute h-6 w-6 rounded-full bg-amber-400/20 animate-ping" />
                      <Loader2 className="h-5 w-5 text-amber-400 animate-spin relative z-10" />
                    </div>
                  </div>
                )}

                {/* Phase 3: Red / No Connection - Ce2000 Sad Hatsune Miku GIF */}
                {statusPhase === 'no_connection' && (
                  <div className="relative w-full h-full flex items-center justify-center overflow-visible">
                    <div
                      className="tenor-gif-embed w-full h-full opacity-0 absolute inset-0 pointer-events-none"
                      data-postid="1327000440316577800"
                      data-share-method="host"
                      data-aspect-ratio="0.986547"
                      data-width="100%"
                    >
                      <a href="https://tenor.com/view/ce2000-sad-hatsune-miku-gif-1327000440316577800">
                        Ce2000 Sad Sticker
                      </a>
                      from <a href="https://tenor.com/search/ce2000-stickers">Ce2000 Stickers</a>
                    </div>
                    <ClickableMikuImage
                      src="/assets/ce2000-sad.gif"
                      onError={(e) => {
                        e.currentTarget.src =
                          'https://media.tenor.com/Empz3qXbSAgAAAAC/ce2000-sad.gif';
                      }}
                      alt="No Connection - Ce2000 Sad Hatsune Miku"
                      wrapperClassName="w-full h-full"
                      loading="eager"
                      noteSize="sm"
                    />
                  </div>
                )}
              </div>

              {/* Text Information Stack */}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        statusPhase === 'connected'
                          ? 'bg-emerald-400'
                          : statusPhase === 'connecting'
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                      }`}
                    />
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 shadow-sm animate-pulse ${
                        statusPhase === 'connected'
                          ? 'bg-emerald-400 shadow-emerald-400/80'
                          : statusPhase === 'connecting'
                          ? 'bg-amber-400 shadow-amber-400/80'
                          : 'bg-rose-500 shadow-rose-500/80'
                      }`}
                    />
                  </span>
                  <span
                    className={`text-[11px] font-bold font-mono tracking-wide truncate ${
                      statusPhase === 'connected'
                        ? 'text-emerald-400'
                        : statusPhase === 'connecting'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {statusPhase === 'connected' && 'Connected'}
                    {statusPhase === 'connecting' && 'Connecting'}
                    {statusPhase === 'no_connection' && 'No Connection'}
                  </span>
                </div>

                <span className="text-xs font-bold text-white tracking-wide truncate leading-tight">
                  {statusPhase === 'connected' && 'Internet is active!'}
                  {statusPhase === 'connecting' && 'Connecting...'}
                  {statusPhase === 'no_connection' && 'No internet...'}
                </span>

                <span className="text-[10px] text-cyan-300/85 font-mono leading-tight mt-0.5 truncate">
                  {' - Hatsune Miku'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onOpenMiku();
              if (onCloseMobile) onCloseMobile();
            }}
            className="shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-600 hover:text-white hover:border-cyan-400 transition-colors shadow-lg whitespace-nowrap"
            title="Ask Hatsune Miku for help or cafe data"
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span>Ask</span>
          </button>
        </div>

        {/* Supabase Gateway Status Box without Live Data Mode / No Mock Data */}
        <div className="rounded-xl border border-slate-800 bg-[#090d16] p-3.5 text-xs text-slate-400">
          <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1">
            <span>Supabase Gateway</span>
            <span className="text-emerald-400 font-mono text-[11px]">Active</span>
          </div>
          <p className="text-[11px] text-slate-500 truncate font-mono">
            ref: hvtkxwzxjuoeewalptmq
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-68 lg:w-72 shrink-0 h-full border-r border-slate-800/80 bg-[#060911]">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <aside className="relative w-72 max-w-[85vw] h-full bg-[#060911] border-r border-slate-800 shadow-2xl z-10 flex flex-col">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
