import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Terminal,
  RotateCcw,
  ArrowUpRight,
  Loader2,
  Monitor,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { useCafeData } from '../../context/CafeDataContext';
import {
  MIKU_EMOTION_ASSETS,
  MikuEmotion,
  MikuAction,
  getInitialTerminalGreeting,
  askMikuWithFallback,
  enforceMikudayo,
} from '../../lib/mikuAssistant';

interface TerminalMessage {
  id: string;
  sender: 'user' | 'miku';
  text: string;
  emotion?: MikuEmotion;
  highlights?: string[];
  actions?: MikuAction[];
  timestamp: string;
}

interface MikuTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tabId: string) => void;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
}

const QUICK_COMMANDS = [
  'floor status',
  'open bills',
  'low stock',
  'sales summary',
  'staff shifts',
  'busiest hours',
];

export const MikuTerminalModal: React.FC<MikuTerminalModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  initialPrompt,
  onClearInitialPrompt,
}) => {
  const {
    customers,
    employees,
    units,
    products,
    sessions,
    sessionProducts,
    payments,
    earnings,
    pythonAnalytics,
    refreshData,
  } = useCafeData();

  const [messages, setMessages] = useState<TerminalMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [syncingAction, setSyncingAction] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const mikuTurnCountRef = useRef<number>(0);

  const liveContext = {
    customers,
    employees,
    units,
    products,
    sessions,
    sessionProducts,
    payments,
    earnings,
    pythonAnalytics,
  };

  const formatTime = () =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Initialize greeting on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = getInitialTerminalGreeting(liveContext);
      setMessages([
        {
          id: `miku-init-${Date.now()}`,
          sender: 'miku',
          text: greeting.text,
          emotion: greeting.emotion,
          highlights: greeting.highlights,
          actions: greeting.actions,
          timestamp: formatTime(),
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Handle incoming prefilled prompt if triggered from a button
  useEffect(() => {
    if (isOpen && initialPrompt && initialPrompt.trim()) {
      void submitCommand(initialPrompt.trim());
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialPrompt]);

  // Focus terminal input & Escape key support
  useEffect(() => {
    if (!isOpen) return;
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 60);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isThinking]);

  const submitCommand = async (rawQuery: string) => {
    const trimmed = rawQuery.trim();
    if (!trimmed || isThinking) return;

    if (trimmed.toLowerCase() === 'clear') {
      const greeting = getInitialTerminalGreeting(liveContext);
      setMessages([
        {
          id: `miku-reset-${Date.now()}`,
          sender: 'miku',
          text: greeting.text,
          emotion: greeting.emotion,
          highlights: greeting.highlights,
          actions: greeting.actions,
          timestamp: formatTime(),
        },
      ]);
      setInput('');
      return;
    }

    const userMsg: TerminalMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: 'user',
      text: trimmed,
      timestamp: formatTime(),
    };

    const nextHistory = [...messages, userMsg].map((m) => ({
      sender: m.sender,
      text: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setHistory((prev) => [trimmed, ...prev.slice(0, 29)]);
    setHistoryIdx(-1);
    setInput('');
    setIsThinking(true);

    try {
      const reply = await askMikuWithFallback(
        trimmed,
        liveContext,
        mikuTurnCountRef.current,
        nextHistory
      );
      mikuTurnCountRef.current += 1;

      const mikuMsg: TerminalMessage = {
        id: `miku-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: 'miku',
        text: reply.text,
        emotion: reply.emotion,
        highlights: reply.highlights,
        actions: reply.actions,
        timestamp: formatTime(),
      };

      setMessages((prev) => [...prev, mikuMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitCommand(input);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(nextIdx);
      setInput(history[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx <= 0) {
        setHistoryIdx(-1);
        setInput('');
      } else {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setInput(history[nextIdx]);
      }
    }
  };

  const handleResetChat = () => {
    const greeting = getInitialTerminalGreeting(liveContext);
    mikuTurnCountRef.current = 0;
    setMessages([
      {
        id: `miku-clear-${Date.now()}`,
        sender: 'miku',
        text: greeting.text,
        emotion: greeting.emotion,
        highlights: greeting.highlights,
        actions: greeting.actions,
        timestamp: formatTime(),
      },
    ]);
    inputRef.current?.focus();
  };

  const handleQuickAction = async (action: 'pc_status' | 'revenue_report' | 'sync_inventory') => {
    if (isThinking || syncingAction) return;

    const actionLabels = {
      pc_status: 'Check PC Status',
      revenue_report: 'View Revenue Report',
      sync_inventory: 'Sync Inventory',
    };

    const userMsg: TerminalMessage = {
      id: `user-qa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: 'user',
      text: actionLabels[action],
      timestamp: formatTime(),
    };
    setMessages((prev) => [...prev, userMsg]);

    if (action === 'pc_status') {
      const freeUnits = units.filter((u) => u.status === 'Available');
      const usedUnits = units.filter((u) => u.status === 'In Use');
      const maintUnits = units.filter((u) => u.status === 'Maintenance');
      const occPct = units.length > 0 ? Math.round((usedUnits.length / units.length) * 100) : 0;

      const ackMsg: TerminalMessage = {
        id: `miku-qa-${Date.now()}`,
        sender: 'miku',
        text: enforceMikudayo(
          `Roger that! I just checked every station on the floor for you—${freeUnits.length} PCs are free, ${usedUnits.length} are in use (${occPct}% occupied), and ${maintUnits.length} are under maintenance!`
        ),
        emotion: 'chat_happy',
        highlights: [
          `Available Now: ${freeUnits.slice(0, 6).map((u) => u.pc_number).join(', ') || 'None'}${freeUnits.length > 6 ? ` (+${freeUnits.length - 6} more)` : ''}`,
          `Maintenance: ${maintUnits.slice(0, 6).map((u) => u.pc_number).join(', ') || 'None — all healthy!'}`,
          pythonAnalytics?.units.top_pc
            ? `Top Earning PC: ${pythonAnalytics.units.top_pc} (₱${Number(pythonAnalytics.units.top_pc_revenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
            : `Total Registered Stations: ${units.length}`,
        ],
        actions: [
          { label: 'View PC Stations', tabId: 'units' },
          { label: 'Assign in Cafe Log', tabId: 'main_interface' },
        ],
        timestamp: formatTime(),
      };
      setMessages((prev) => [...prev, ackMsg]);
      return;
    }

    if (action === 'revenue_report') {
      const totalGross = earnings.reduce((sum, e) => sum + (Number(e.gross_income) || 0), 0);
      const totalNet = earnings.reduce((sum, e) => sum + (Number(e.net_profit) || 0), 0);
      const totalExp = earnings.reduce((sum, e) => sum + (Number(e.expenses) || 0), 0);
      const marginPct = totalGross > 0 ? ((totalNet / totalGross) * 100).toFixed(1) : '0.0';
      const fnbSales = sessionProducts.reduce((sum, sp) => sum + (Number(sp.subtotal) || 0), 0);
      const est7Day =
        pythonAnalytics?.forecast.forecast_next_7_days.reduce(
          (sum, d) => sum + (Number(d.projected_gross) || 0),
          0
        ) || 0;

      const ackMsg: TerminalMessage = {
        id: `miku-qa-${Date.now()}`,
        sender: 'miku',
        text: enforceMikudayo(
          `You got it! Here is the latest revenue report—Ethereal Cafe has earned ₱${totalGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in total income with ₱${totalNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} net profit (${marginPct}% margin)!`
        ),
        emotion: 'chat_helpful',
        highlights: [
          `Expenses: ₱${totalExp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Food & Drink Sales: ₱${fnbSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `Payments Logged: ${payments.length} · Sales Entries: ${earnings.length}`,
          est7Day > 0
            ? `7-Day Sales Estimate: ~₱${est7Day.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : 'All earnings figures are synced live.',
        ],
        actions: [
          { label: 'View Sales & Profit', tabId: 'financials' },
          { label: 'Open Data Analysis', tabId: 'python_engine' },
        ],
        timestamp: formatTime(),
      };
      setMessages((prev) => [...prev, ackMsg]);
      return;
    }

    // action === 'sync_inventory'
    setSyncingAction(true);
    try {
      await refreshData();
      const totalStockUnits = products.reduce((sum, p) => sum + (Number(p.stock_quantity) || 0), 0);
      const lowStockItems = products.filter((p) => Number(p.stock_quantity) <= 30);

      const ackMsg: TerminalMessage = {
        id: `miku-qa-${Date.now()}`,
        sender: 'miku',
        text: enforceMikudayo(
          `All synced up and sparkly clean! I just refreshed our live cafe inventory—${products.length} menu items (${totalStockUnits.toLocaleString()} units in stock) are up to date!`
        ),
        emotion: 'chat_happy',
        highlights: [
          `Menu Items: ${products.length} · Total Units in Stock: ${totalStockUnits.toLocaleString()}`,
          lowStockItems.length > 0
            ? `Low Stock (${lowStockItems.length}): ${lowStockItems.slice(0, 4).map((p) => `${p.product_name} (${p.stock_quantity} left)`).join(', ')}`
            : 'All snacks and drinks are well stocked right now!',
        ],
        actions: [
          { label: 'Open Food & Drinks', tabId: 'inventory' },
          { label: 'Restock in Cafe Log', tabId: 'main_interface' },
        ],
        timestamp: formatTime(),
      };
      setMessages((prev) => [...prev, ackMsg]);
    } catch {
      const errMsg: TerminalMessage = {
        id: `miku-qa-err-${Date.now()}`,
        sender: 'miku',
        text: enforceMikudayo(
          `Uwaaah, I tried syncing the inventory just now, but hit a snag connecting to the database! Please try again in a moment.`
        ),
        emotion: 'unknown',
        timestamp: formatTime(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSyncingAction(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="miku-terminal-title"
    >
      <div
        className="flex flex-col w-full max-w-3xl h-[85vh] max-h-[760px] rounded-xl border border-cyan-500/35 bg-[#070b14] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-[#090e1a] px-4 py-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-cyan-400 shrink-0" />
                <h2 id="miku-terminal-title" className="text-sm sm:text-base font-bold text-white truncate">
                  Ethereal Cafe Info Terminal
                </h2>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                Hatsune Miku, Cafe Guide
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetChat}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#060a12] px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-colors whitespace-nowrap"
              title="Reset conversation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg border border-slate-800 bg-[#060a12] p-1.5 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
              aria-label="Close terminal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-[#080c16] px-4 py-2.5 shrink-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Quick Actions
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isThinking || syncingAction}
              onClick={() => void handleQuickAction('pc_status')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/35 bg-blue-950/35 px-2.5 py-1.5 text-xs font-medium text-blue-200 hover:bg-blue-600 hover:text-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Monitor className="h-3.5 w-3.5 text-blue-400 group-hover:text-white" />
              <span>Check PC Status</span>
            </button>
            <button
              type="button"
              disabled={isThinking || syncingAction}
              onClick={() => void handleQuickAction('revenue_report')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-950/35 px-2.5 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-600 hover:text-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span>View Revenue Report</span>
            </button>
            <button
              type="button"
              disabled={isThinking || syncingAction}
              onClick={() => void handleQuickAction('sync_inventory')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/35 bg-cyan-950/35 px-2.5 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-600 hover:text-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${syncingAction ? 'animate-spin' : ''}`} />
              <span>{syncingAction ? 'Syncing Inventory...' : 'Sync Inventory'}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#050810]">
          {messages.map((msg) => {
            if (msg.sender === 'user') {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-xl border border-blue-500/30 bg-blue-950/35 px-3.5 py-2.5 text-xs sm:text-sm text-slate-100">
                    <div className="flex items-center justify-between gap-3 text-[11px] text-blue-300 mb-1">
                      <span className="font-semibold">User</span>
                      <span className="text-slate-500 font-mono">{msg.timestamp}</span>
                    </div>
                    <p className="leading-relaxed break-words">{msg.text}</p>
                  </div>
                </div>
              );
            }

            const asset = MIKU_EMOTION_ASSETS[msg.emotion || 'chat_happy'];

            return (
              <div key={msg.id} className="flex items-start gap-3">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-[#090e1a] p-1 shrink-0 flex items-center justify-center overflow-hidden">
                  <img
                    src={asset.src}
                    alt={asset.alt}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="flex-1 min-w-0 rounded-xl border border-slate-800/90 bg-[#090d16] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-cyan-300 font-semibold">Hatsune Miku</span>
                    <span className="text-slate-500 font-mono tabular-nums">{msg.timestamp}</span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">{msg.text}</p>

                  {msg.highlights && msg.highlights.length > 0 && (
                    <ul className="space-y-1.5 border-t border-slate-800/80 pt-2.5 text-xs font-mono text-slate-300">
                      {msg.highlights.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 leading-relaxed">
                          <span className="text-cyan-400 shrink-0">&gt;</span>
                          <span className="tabular-nums">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {msg.actions.map((act) => (
                        <button
                          key={`${msg.id}-${act.tabId}-${act.label}`}
                          type="button"
                          onClick={() => {
                            onNavigateTab(act.tabId);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/35 bg-cyan-950/35 px-2.5 py-1.5 text-[11px] font-medium text-cyan-200 hover:bg-cyan-600 hover:text-white transition-colors whitespace-nowrap shrink-0"
                        >
                          <span>{act.label}</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isThinking && (
            <div className="flex items-start gap-3">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-[#090e1a] p-1 shrink-0 flex items-center justify-center overflow-hidden">
                <img
                  src={MIKU_EMOTION_ASSETS.chat_helpful.src}
                  alt={MIKU_EMOTION_ASSETS.chat_helpful.alt}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="rounded-xl border border-slate-800/90 bg-[#090d16] px-4 py-3 flex items-center gap-2 text-xs text-cyan-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Hatsune Miku is thinking...</span>
              </div>
            </div>
          )}

          <div ref={scrollEndRef} />
        </div>

        {/* Quick Suggestions + User Prompt */}
        <div className="border-t border-slate-800 bg-[#080c16] p-3 sm:p-4 space-y-3 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {QUICK_COMMANDS.map((cmd) => (
              <button
                key={cmd}
                type="button"
                disabled={isThinking}
                onClick={() => void submitCommand(cmd)}
                className="rounded-md border border-slate-800 bg-[#060a12] px-2.5 py-1 text-[11px] font-mono text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                {cmd}
              </button>
            ))}
          </div>

          <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-lg border border-slate-800 bg-[#050810] px-3 py-2 focus-within:border-cyan-500/60 transition-colors">
              <span className="text-xs font-semibold text-cyan-400 shrink-0 hidden sm:inline">
                User:
              </span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Ask me anything! Mikudayo~"
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isThinking}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-cyan-500 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
