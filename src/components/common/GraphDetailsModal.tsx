import React, { useEffect } from 'react';
import {
  X,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Info,
  Layers,
  Database,
  CheckCircle2,
  Activity,
  ArrowRight,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

export interface AnomalyItem {
  type: 'spike' | 'drop' | 'variance' | 'pattern';
  title: string;
  rateChange: string;
  timeOrSegment: string;
  severity: 'high' | 'medium' | 'info';
  observation: string;
  rootCause?: string;
  coherentExplanation?: string;
  impact?: string;
  businessImpact?: string;
  technicalContext?: string;
}

export interface TechnicalDiagnostics {
  primaryModel: string;
  sampleCount: string;
  confidenceOrMargin: string;
  varianceOrStdDev?: string;
  statisticalFormula?: string;
  supabaseTables: string[];
  dataFreshness: string;
}

export interface GraphReportData {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  timeframe: string;
  sampleSize: string;
  metrics: Array<{
    label: string;
    value: string;
    change?: string;
    isPositive?: boolean;
    helper?: string;
  }>;
  executiveSummary: string;
  keyTakeaways?: string[];
  anomalies: AnomalyItem[];
  strategicRecommendations: string[];
  technicalDiagnostics: TechnicalDiagnostics;
}

interface GraphDetailsModalProps {
  report: GraphReportData | null;
  onClose: () => void;
}

export const GraphDetailsModal: React.FC<GraphDetailsModalProps> = ({ report, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!report) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-cyan-500/30 bg-[#080d19]/98 p-5 sm:p-7 shadow-2xl text-slate-100 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 font-semibold flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-cyan-400" />
                {report.category}
              </span>
              <span className="font-mono text-[11px] text-slate-400 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-500" />
                {report.timeframe}
              </span>
              <span className="text-slate-600">·</span>
              <span className="font-mono text-[11px] text-slate-400">
                {report.sampleSize}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              {report.title}
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              {report.subtitle}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title="Close Report (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {report.metrics.map((m, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-800/90 bg-[#060a14] p-3 text-xs"
            >
              <span className="text-[11px] text-slate-400 block">{m.label}</span>
              <div className="mt-1.5 text-base sm:text-lg font-bold font-mono text-white">
                {m.value}
              </div>
              {m.change && (
                <div
                  className={`mt-1 text-[10px] font-mono flex items-center gap-1 ${
                    m.isPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {m.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{m.change}</span>
                </div>
              )}
              {m.helper && (
                <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                  {m.helper}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Executive Summary */}
        <div className="rounded-xl border border-slate-800 bg-[#050912] p-4 text-xs space-y-3">
          <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs">
            <Info className="h-4 w-4 text-cyan-400" />
            <span>Analysis &amp; Executive Summary</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-xs sm:text-sm">
            {report.executiveSummary}
          </p>

          {report.keyTakeaways && report.keyTakeaways.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block mb-2">
                Key Findings:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {report.keyTakeaways.map((takeaway, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-[#080d19] border border-slate-800 p-2.5 text-[11px] text-slate-300 flex items-start gap-2"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{takeaway}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Anomaly & Variance Analysis */}
        {report.anomalies && report.anomalies.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Anomaly &amp; Variance Analysis
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {report.anomalies.length} Events Detected
              </span>
            </div>

            <div className="space-y-3">
              {report.anomalies.map((ano, index) => {
                const isSpike = ano.type === 'spike';
                const isDrop = ano.type === 'drop';
                const isHigh = ano.severity === 'high';
                const causeText = ano.rootCause || ano.coherentExplanation || '';
                const impactText = ano.impact || ano.businessImpact || '';

                return (
                  <div
                    key={index}
                    className={`rounded-xl border p-4 transition-all text-xs ${
                      isHigh
                        ? 'border-amber-500/30 bg-amber-950/10'
                        : 'border-slate-800 bg-[#060a14]'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                            isSpike
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : isDrop
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {isSpike ? 'Surge' : isDrop ? 'Downturn' : 'Variance'}
                        </span>
                        <span className="font-semibold text-white text-xs sm:text-sm">
                          {ano.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="text-slate-400">
                          Period: <strong className="text-slate-200 font-sans">{ano.timeOrSegment}</strong>
                        </span>
                        <span
                          className={`font-bold ${
                            isSpike
                              ? 'text-emerald-400'
                              : isDrop
                              ? 'text-rose-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {ano.rateChange}
                        </span>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="rounded-lg bg-black/30 p-3 border border-slate-800/80">
                        <span className="text-[10px] uppercase font-bold font-mono tracking-wider text-slate-400 block mb-1 flex items-center gap-1.5">
                          <Activity className="h-3 w-3 text-slate-400" />
                          Observed Behavior
                        </span>
                        <p className="text-slate-300 leading-relaxed text-[11px]">
                          {ano.observation}
                        </p>
                      </div>

                      <div className="rounded-lg bg-cyan-950/20 p-3 border border-cyan-500/20">
                        <span className="text-[10px] uppercase font-bold font-mono tracking-wider text-cyan-400 block mb-1 flex items-center gap-1.5">
                          <ArrowRight className="h-3 w-3 text-cyan-400" />
                          Root Cause &amp; Operational Driver
                        </span>
                        <p className="text-cyan-100/90 leading-relaxed text-[11px]">
                          {causeText}
                        </p>
                      </div>
                    </div>

                    {impactText && (
                      <div className="mt-3 p-2.5 rounded-lg bg-[#050812] border border-slate-800/60 text-[11px] text-slate-300 flex items-start gap-2">
                        <span className="font-mono text-[10px] uppercase font-bold text-slate-400 shrink-0">
                          Operational Impact:
                        </span>
                        <span className="text-slate-300">{impactText}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Strategic Recommendations */}
        {report.strategicRecommendations && report.strategicRecommendations.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-[#060a14] p-4 text-xs">
            <div className="flex items-center gap-2 mb-2.5 text-emerald-400 font-semibold text-xs">
              <ShieldCheck className="h-4 w-4" />
              <span>Strategic Recommendations</span>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-300 text-[11px]">
              {report.strategicRecommendations.map((rec, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 bg-[#090e1c] p-2.5 rounded-lg border border-slate-800/70"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                  <span className="leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Telemetry & Lineage Footnote */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2 flex-wrap">
            <Database className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span>Model: <strong className="text-slate-200">{report.technicalDiagnostics.primaryModel}</strong></span>
            <span className="text-slate-600">·</span>
            <span>Tables: <strong className="text-slate-200">{report.technicalDiagnostics.supabaseTables.join(', ')}</strong></span>
            <span className="text-slate-600">·</span>
            <span>Confidence: <strong className="text-emerald-400">{report.technicalDiagnostics.confidenceOrMargin}</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors shadow-md ml-auto"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
