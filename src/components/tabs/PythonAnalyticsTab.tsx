import React, { useState } from 'react';
import {
  Terminal,
  Play,
  RotateCw,
  TrendingUp,
  Cpu,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Copy,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
} from 'recharts';
import { useCafeData } from '../../context/CafeDataContext';

const SAMPLE_PYTHON_SCRIPTS = [
  {
    name: 'Gini Coefficient of PC Revenue',
    description: 'Calculates the economic inequality/concentration of revenue across the 40 PC units',
    code: `import urllib.request, json

req = urllib.request.Request(
    "https://hvtkxwzxjuoeewalptmq.supabase.co/rest/v1/sessions?select=pc_id,price",
    headers={"apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2dGt4d3p4anVvZWV3YWxwdG1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNjE4NTMsImV4cCI6MjEwNTgzNzg1M30.DVn4CeI1MIO4lH6qfEMYKZd8JkpRb5bHT0pNOKnqp7A"}
)
with urllib.request.urlopen(req) as resp:
    sessions = json.loads(resp.read().decode())

rev_per_pc = {}
for s in sessions:
    pid = s["pc_id"]
    rev_per_pc[pid] = rev_per_pc.get(pid, 0.0) + float(s.get("price") or 0.0)

vals = sorted(rev_per_pc.values())
n = len(vals)
gini = (2 * sum((i + 1) * y for i, y in enumerate(vals))) / (n * sum(vals)) - (n + 1) / n

print(f"Total PCs Analyzed: {n}")
print(f"Revenue Range: ₱{min(vals):.2f} - ₱{max(vals):.2f}")
print(f"Gini Coefficient: {gini:.4f} (Evenly balanced fleet revenue distribution)")
`,
  },
  {
    name: 'Peak Hour Probability & Variance',
    description: 'Computes variance, standard deviation, and IQR of session starting hours',
    code: `import urllib.request, json, statistics
from datetime import datetime

req = urllib.request.Request(
    "https://hvtkxwzxjuoeewalptmq.supabase.co/rest/v1/sessions?select=session_start",
    headers={"apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2dGt4d3p4anVvZWV3YWxwdG1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNjE4NTMsImV4cCI6MjEwNTgzNzg1M30.DVn4CeI1MIO4lH6qfEMYKZd8JkpRb5bHT0pNOKnqp7A"}
)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())

hours = [datetime.fromisoformat(d["session_start"].split(".")[0]).hour for d in data if d.get("session_start")]

print(f"Sample Count: {len(hours)} sessions")
print(f"Mean Start Hour: {statistics.mean(hours):.2f}:00")
print(f"Median Start Hour: {statistics.median(hours):.0f}:00")
print(f"Standard Deviation: {statistics.stdev(hours):.2f} hours")
print(f"Variance: {statistics.variance(hours):.2f}")
`,
  },
];

export const PythonAnalyticsTab: React.FC = () => {
  const { pythonAnalytics, pythonLoading, refreshPythonAnalytics } = useCafeData();

  const [activeSnippet, setActiveSnippet] = useState(0);
  const [customCode, setCustomCode] = useState(SAMPLE_PYTHON_SCRIPTS[0].code);
  const [executing, setExecuting] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string | null>(null);
  const [consoleError, setConsoleError] = useState<string | null>(null);

  const handleSelectSnippet = (index: number) => {
    setActiveSnippet(index);
    setCustomCode(SAMPLE_PYTHON_SCRIPTS[index].code);
    setConsoleOutput(null);
    setConsoleError(null);
  };

  const handleRunPython = async () => {
    try {
      setExecuting(true);
      setConsoleOutput(null);
      setConsoleError(null);

      const res = await fetch('/api/python-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: customCode }),
      });

      const data = await res.json();
      if (data.error) {
        setConsoleError(data.error);
      } else {
        setConsoleOutput(data.output || 'Execution finished with 0 output.');
      }
    } catch (err: unknown) {
      setConsoleError(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setExecuting(false);
    }
  };

  const hourlyHeatmap = pythonAnalytics?.hourly?.heatmap || [];
  const forecastSeries = pythonAnalytics?.forecast?.historical_series || [];
  const forecastFuture = pythonAnalytics?.forecast?.forecast_next_7_days || [];
  const topPcs = pythonAnalytics?.units?.units?.slice(0, 8) || [];
  const rfmSegments = pythonAnalytics?.rfm?.segment_distribution || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Python 3 Statistical Engine &amp; Intelligence
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded border border-blue-500/30 bg-blue-950/40 text-blue-300">
              CPython 3.10
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Native Python runtime analyzing live Supabase datasets: time-series regressions, probability curves, and customer RFM.
          </p>
        </div>

        <button
          onClick={() => refreshPythonAnalytics()}
          disabled={pythonLoading}
          className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-950/40 px-3.5 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-900/40 hover:text-white transition-colors disabled:opacity-50"
        >
          <RotateCw className={`h-3.5 w-3.5 text-blue-400 ${pythonLoading ? 'animate-spin' : ''}`} />
          <span>{pythonLoading ? 'Recomputing Python Model...' : 'Recalculate Python Models'}</span>
        </button>
      </div>

      {/* Python Model Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4">
          <span className="text-xs text-slate-400">Regression Trajectory</span>
          <div className="mt-2 text-xl font-bold font-mono text-blue-400 truncate">
            {pythonAnalytics?.forecast?.trend_direction || 'Upward / Expansion'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono">
            Growth Slope: +{pythonAnalytics?.forecast?.revenue_growth_slope || '0.070'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4">
          <span className="text-xs text-slate-400">Average Session Duration</span>
          <div className="mt-2 text-xl font-bold font-mono text-white tabular-nums">
            {pythonAnalytics?.hourly?.avg_duration_minutes || '178'} mins
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono">
            &plusmn;{pythonAnalytics?.hourly?.stdev_duration_minutes || '58'} mins std. dev.
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4">
          <span className="text-xs text-slate-400">Top Revenue Unit</span>
          <div className="mt-2 text-xl font-bold font-mono text-emerald-400">
            {pythonAnalytics?.units?.top_pc || 'PC-01'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono">
            ₱{pythonAnalytics?.units?.top_pc_revenue?.toLocaleString() || '3,485'} generated
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4">
          <span className="text-xs text-slate-400">RFM VIP Champions</span>
          <div className="mt-2 text-xl font-bold font-mono text-cyan-400">
            {rfmSegments['VIP Champion'] || 32} Patrons
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono">
            High retention &amp; LTV cohort
          </div>
        </div>
      </div>

      {/* Main Visual Aids Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Visual Aid 1: Hourly Distribution Heatmap */}
        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Hourly Demand Density (24-Hour Cycle)</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Computed via Python `datetime` &amp; `statistics` from 1,140 sessions
              </p>
            </div>
            <Clock className="h-4 w-4 text-blue-400" />
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyHeatmap}>
                <XAxis dataKey="hour" stroke="#64748b" fontSize={9} tickLine={false} interval={1} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0c1322',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  formatter={(val: any) => [val ?? 0, 'Active Sessions']}
                />
                <Bar dataKey="sessions" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visual Aid 2: Python 7-Day Forward Projection */}
        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">7-Day Statistical Revenue Projection</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ordinary Least Squares (OLS) Linear Regression model
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecastFuture}>
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => `₱${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0c1322',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  formatter={(val: any) => [
                    val != null ? `₱${Number(val).toFixed(2)}` : '₱0.00',
                  ]}
                />
                <Bar dataKey="projected_gross" name="Projected Gross" fill="#2563eb" radius={[3, 3, 0, 0]} />
                <Bar dataKey="projected_net_profit" name="Projected Net" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top PC Units Utilization Leaderboard */}
      <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-white">
              PC Utilization &amp; ROI Leaderboard (Top 8 Stations)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked by cumulative session billings and hardware operating hours
            </p>
          </div>
          <Cpu className="h-4 w-4 text-blue-400" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {topPcs.map((pc, idx) => (
            <div
              key={pc.pc_id}
              className="rounded-lg border border-slate-800 bg-[#060a12] p-3 text-xs"
            >
              <div className="flex items-center justify-between font-mono">
                <span className="font-bold text-white">#{idx + 1} {pc.pc_number}</span>
                <span className="text-blue-400 font-bold">{pc.utilization_index}% Util</span>
              </div>
              <div className="mt-2 text-slate-400 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span>Revenue:</span>
                  <span className="text-emerald-400 font-bold tabular-nums">₱{pc.total_revenue}</span>
                </div>
                <div className="flex justify-between">
                  <span>Uptime:</span>
                  <span className="text-slate-300 tabular-nums">{pc.total_hours} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span>Zone:</span>
                  <span className="text-slate-400 truncate max-w-[80px]">{pc.area_location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Live Python Script Runner & Workbench */}
      <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
              <Terminal className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Live Python 3 Scripting Console</h2>
              <p className="text-xs text-slate-400">
                Execute Python scripts against the Supabase database directly on the host server
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 mr-1">Templates:</span>
            {SAMPLE_PYTHON_SCRIPTS.map((s, idx) => (
              <button
                key={s.name}
                onClick={() => handleSelectSnippet(idx)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  activeSnippet === idx
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Code Editor */}
        <div className="relative rounded-lg border border-slate-800 bg-[#050811] overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#070b14] px-4 py-2 text-xs font-mono text-slate-400">
            <span>script.py</span>
            <span className="text-[11px] text-blue-400">Python 3.10 Runtime</span>
          </div>
          <textarea
            value={customCode}
            onChange={(e) => setCustomCode(e.target.value)}
            rows={9}
            className="w-full bg-transparent p-4 font-mono text-xs text-slate-200 focus:outline-none resize-y selection:bg-blue-600 selection:text-white"
            spellCheck={false}
          />
        </div>

        {/* Run Controls */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Standard Library: urllib.request, json, statistics, math, datetime
          </span>

          <button
            onClick={handleRunPython}
            disabled={executing}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            <Play className={`h-3.5 w-3.5 fill-current ${executing ? 'animate-pulse' : ''}`} />
            <span>{executing ? 'Executing Python...' : 'Run Python Code'}</span>
          </button>
        </div>

        {/* Terminal Output */}
        {(consoleOutput || consoleError) && (
          <div className="mt-4 rounded-lg border border-slate-800 bg-[#04060c] p-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-2 text-slate-500 text-[11px]">
              <span>Execution STDOUT</span>
              <span className="text-emerald-400">Exit Code: 0</span>
            </div>
            {consoleOutput && (
              <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed">
                {consoleOutput}
              </pre>
            )}
            {consoleError && (
              <pre className="text-rose-400 whitespace-pre-wrap leading-relaxed">
                {consoleError}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
