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

  // If there's no internet connection or error establishing connection
  if (hasConnectionError) {
    return (
      <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-4 sm:p-8 bg-[#05070D]/95 backdrop-blur-md text-slate-100 min-h-[500px]">
        <div className="max-w-md w-full flex flex-col items-center text-center space-y-6 animate-fadeIn">
          {/* Standard Error Icon with Rose Glow */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl border border-rose-500/40 bg-rose-950/20 shadow-2xl shadow-rose-950/60 flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-rose-500/10 animate-ping opacity-25" />
            <AlertTriangle className="h-14 w-14 sm:h-16 sm:w-16 text-rose-400 stroke-[2] animate-pulse" />
          </div>

          {/* Clean Error Message (extra text details removed) */}
          <h3 className="text-base sm:text-lg font-bold font-mono tracking-wide text-rose-300">
            Loading error. Please reconnect.
          </h3>

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
        <div className="max-w-md w-full flex flex-col items-center text-center space-y-6 animate-fadeIn">
          {/* Standard Buffering Icon with Cyan Glow */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl border border-cyan-500/40 bg-cyan-950/20 shadow-2xl shadow-cyan-950/60 flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-cyan-500/10 animate-ping opacity-25" />
            <Loader2 className="h-14 w-14 sm:h-16 sm:w-16 text-cyan-400 stroke-[2.2] animate-spin" />
          </div>

          {/* Sequential Ellipses Text (extra text details removed) */}
          <h3 className="text-base sm:text-lg font-bold font-mono tracking-wide text-cyan-300 min-w-[240px]">
            Loading. Please wait{'.'.repeat(dotCount)}
          </h3>
        </div>
      </div>
    );
  }

  // Once buffer is complete, render elements
  return <>{children}</>;
};
