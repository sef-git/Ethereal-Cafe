import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Loader2, AlertTriangle } from 'lucide-react';
import { useCafeData } from '../../context/CafeDataContext';

interface MainPanelBufferProps {
  children?: React.ReactNode;
}

export const MainPanelBuffer: React.FC<MainPanelBufferProps> = ({ children }) => {
  const { loading, error, refreshData } = useCafeData();
  const [dotCount, setDotCount] = useState<number>(1);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? !navigator.onLine : false;
  });

  // Sequential dot counter: 1 -> 2 -> 3 -> 1 -> 2 -> 3
  useEffect(() => {
    if (!loading && !isRetrying) return;
    const interval = setInterval(() => {
      setDotCount((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 450);
    return () => clearInterval(interval);
  }, [loading, isRetrying]);

  // Monitor online / offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      refreshData();
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshData]);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setIsOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    try {
      await refreshData();
    } finally {
      setIsRetrying(false);
    }
  }, [refreshData]);

  const hasConnectionError = isOffline || (!!error && !loading);
  const isBuffering = (loading || isRetrying) && !hasConnectionError;

  // If there's an error establishing a good connection
  if (hasConnectionError) {
    return (
      <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-4 sm:p-8 bg-[#05070D]/95 backdrop-blur-md text-slate-100 min-h-[500px]">
        <div className="max-w-md w-full flex flex-col items-center text-center space-y-5 animate-fadeIn">
          {/* Standard Error Icon */}
          <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border border-rose-500/40 bg-rose-950/20 shadow-2xl shadow-rose-950/40 text-rose-400 group">
            <div className="absolute -inset-1 rounded-2xl bg-rose-500/20 blur-md pointer-events-none" />
            <AlertTriangle className="relative h-10 w-10 sm:h-12 sm:w-12 text-rose-400 stroke-[1.75]" />
          </div>

          {/* Error Message */}
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold font-mono tracking-wide text-rose-300">
              Loading error. Please reconnect.
            </h3>
            <p className="text-xs text-slate-400 max-w-sm">
              The website could not establish a stable connection with the live Supabase gateway.
            </p>
          </div>

          {/* Retry Button */}
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 active:scale-95 text-white font-semibold text-xs tracking-wider uppercase font-mono shadow-lg shadow-cyan-950/40 border border-cyan-400/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  // If loading and buffering the website elements with the current connection
  if (isBuffering) {
    return (
      <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-4 sm:p-8 bg-[#05070D]/95 backdrop-blur-md text-slate-100 min-h-[500px]">
        <div className="max-w-md w-full flex flex-col items-center text-center space-y-5 animate-fadeIn">
          {/* Standard Buffering Icon */}
          <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border border-cyan-500/40 bg-cyan-950/20 shadow-2xl shadow-cyan-950/40 text-cyan-400 group">
            <div className="absolute -inset-1 rounded-2xl bg-cyan-500/20 blur-md pointer-events-none" />
            <Loader2 className="relative h-10 w-10 sm:h-12 sm:w-12 animate-spin text-cyan-400 stroke-[1.75]" />
          </div>

          {/* Sequential Ellipses Text */}
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold font-mono tracking-wide text-cyan-300 min-w-[240px]">
              Loading. Please wait{'.'.repeat(dotCount)}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Synchronizing telemetry and database records with active internet connection
            </p>
          </div>

          {/* Sleek connection progress indicator */}
          <div className="w-48 h-1 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 animate-pulse rounded-full w-full" />
          </div>
        </div>
      </div>
    );
  }


  // Once buffer is complete, render elements
  return <>{children}</>;
};
