import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, WifiOff, Sparkles } from 'lucide-react';
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

  // Re-trigger Tenor embed script if present
  useEffect(() => {
    try {
      const win = window as unknown as { tenor?: { embed?: () => void } };
      if (win.tenor && typeof win.tenor.embed === 'function') {
        win.tenor.embed();
      }
    } catch {
      // Fallback <img> handles visual display
    }
  }, [loading, error, isOffline]);

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
          {/* Error GIF: Ce2000 Sad Hatsune Miku */}
          <div className="relative w-56 sm:w-64 max-w-full rounded-2xl border border-rose-500/40 bg-[#090b14] p-3 shadow-2xl shadow-rose-950/30 overflow-hidden group">
            <div
              className="tenor-gif-embed w-full flex items-center justify-center"
              data-postid="1327000440316577800"
              data-share-method="host"
              data-aspect-ratio="0.986547"
              data-width="100%"
            >
              <a
                href="https://tenor.com/view/ce2000-sad-hatsune-miku-gif-1327000440316577800"
                className="sr-only"
              >
                Ce2000 Sad Sticker
              </a>
              <img
                src="https://media.tenor.com/Empz3qXbSAgAAAAC/ce2000-sad.gif"
                alt="Ce2000 Sad Hatsune Miku"
                className="w-full h-auto max-h-56 object-contain rounded-xl"
              />
            </div>
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-[10px] font-mono text-rose-300">
              <WifiOff className="h-3 w-3 text-rose-400" />
              <span>Offline / Error</span>
            </div>
          </div>

          {/* Exact required text */}
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
          {/* Buffering GIF: Anime Jamie */}
          <div className="relative w-64 sm:w-72 max-w-full rounded-2xl border border-cyan-500/40 bg-[#090b14] p-3 shadow-2xl shadow-cyan-950/40 overflow-hidden group">
            <div
              className="tenor-gif-embed w-full flex items-center justify-center"
              data-postid="9441519"
              data-share-method="host"
              data-aspect-ratio="1.46789"
              data-width="100%"
            >
              <a
                href="https://tenor.com/view/anime-jamie-zoe-cute-kawaii-gif-9441519"
                className="sr-only"
              >
                Anime Jamie GIF
              </a>
              <img
                src="https://media.tenor.com/U1Z5bV2rDxQAAAAC/anime-jamie.gif"
                alt="Anime Jamie Buffering"
                className="w-full h-auto max-h-52 object-contain rounded-xl"
              />
            </div>
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-mono text-cyan-300">
              <Sparkles className="h-3 w-3 text-cyan-400 animate-spin" />
              <span>Syncing</span>
            </div>
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
