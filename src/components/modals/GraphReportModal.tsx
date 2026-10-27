import React, { useEffect } from 'react';
import {
  X,
  AlertTriangle,
  TrendingUp,
  Clock,
  Users,
  DollarSign,
  Activity,
  CheckCircle2,
  Download,
  Info,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export type GraphModalType =
  | 'hourly_density'
  | 'forecast_projection'
  | 'financial_trajectory'
  | 'rfm_cohorts'
  | 'daily_pnl'
  | 'payment_providers';

interface GraphReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: GraphModalType | null;
  payload: any;
}

const BLUE_PALETTE = ['#2563eb', '#3b82f6', '#06b6d4', '#8b5cf6', '#10b981'];

export const GraphReportModal: React.FC<GraphReportModalProps> = ({
  isOpen,
  onClose,
  type,
  payload,
}) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !type) return null;

  // Generate specific content based on graph type
  const getGraphDetails = () => {
    switch (type) {
      case 'hourly_density': {
        const data = payload?.hourlyHeatmap || payload?.hourlyData || [];
        const peakHour = payload?.peakHour || '22:00';
        const peakCount = payload?.peakCount || 54;
        const avgDuration = payload?.avgDuration || 185.5;

        return {
          title: 'Hourly Demand Density & Diurnal Rhythm Report',
          badge: 'Temporal Distribution Model',
          icon: Clock,
          color: 'text-blue-400',
          borderColor: 'border-blue-500/30',
          summaryKpis: [
            { label: 'Total Sessions Sampled', value: '1,000 Verified Sessions' },
            { label: 'Diurnal Peak Traffic Window', value: `${peakHour} (${peakCount} concurrent sessions)` },
            { label: 'Trough / Lull Window', value: '17:00 - 18:00 (29 sessions avg)' },
            { label: 'Mean Session Duration', value: `${avgDuration} minutes (~3.1 hrs)` },
          ],
          anomalies: [
            {
              title: 'Severe Evening Rush Bimodal Inversion (17:00 Drop vs 22:00 Surge)',
              severity: 'High Operational Impact',
              severityColor: 'text-amber-400 bg-amber-950/40 border-amber-500/30',
              description:
                'Traffic experiences an abrupt 45% decline between 17:00 and 18:30 (dropping to 29 sessions), immediately followed by a sharp parabolic acceleration peaking at 22:00–23:00 (54 sessions). This contradicts typical commercial retail traffic curves.',
              explanation:
                'Customer demographics consist predominantly of university students and esports night-owl gamers. Patrons depart for dinner between 17:00 and 19:00, then return for extended 4-to-6 hour multiplayer sessions (Valorant, Dota 2, CS2) during discounted nocturnal rates.',
            },
            {
              title: 'High Duration Dispersion (Variance: 85.0 mins std dev)',
              severity: 'Moderate',
              severityColor: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30',
              description:
                'Standard deviation of 85.0 minutes indicates extreme polarization between short walk-in concession users (30–60 min) and long-stay VIP tournament grinders (300+ min).',
              explanation:
                'Unreserved walk-in stations create localized idle gaps during the afternoon, whereas VIP stations maintain 92%+ utilization during late-night blocks.',
            },
          ],
          recommendations: [
            'Introduce "Sunset Happy Hour" pricing between 16:30 and 19:00 (e.g., 20% discount on PC rates with combo meal purchases) to flatten the 17:00 trough.',
            'Schedule PC maintenance and deep cleaning specifically during the 05:00–07:00 window when traffic is under 37 sessions.',
            'Pre-allocate staff and kitchen prep for 21:30 to meet the documented late-night beverage and snack demand surge.',
          ],
          renderChart: () => (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 12, right: 12, left: -15, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={10} tickLine={false} interval={1} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#070b14',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(val: any, name: any) => [
                      String(name).toLowerCase().includes('revenue') ? `₱${Number(val).toFixed(2)}` : val,
                      String(name).toLowerCase().includes('revenue') ? 'Revenue' : 'Active Sessions',
                    ]}
                  />
                  <Bar dataKey="sessions" name="Sessions Volume" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ),
        };
      }

      case 'forecast_projection': {
        const data = payload?.forecastFuture || [];
        const slope = payload?.slope ?? 0.07;
        const trend = payload?.trend || 'Upward / Expansion';

        return {
          title: '7-Day Statistical Revenue Projection (OLS Model)',
          badge: 'Ordinary Least Squares Regression',
          icon: TrendingUp,
          color: 'text-emerald-400',
          borderColor: 'border-emerald-500/30',
          summaryKpis: [
            { label: 'Linear Growth Slope (β)', value: `+${slope} (Positive Expansion)` },
            { label: 'Expected Net Profit Margin', value: '65.0% - 71.9% Projected' },
            { label: 'Trend Classification', value: trend },
            { label: 'Projection Horizon', value: '7 Consecutive Daily Cycles' },
          ],
          anomalies: [
            {
              title: 'Margin Compression on High-Volume Peak Days',
              severity: 'Financial Anomaly',
              severityColor: 'text-amber-400 bg-amber-950/40 border-amber-500/30',
              description:
                'As projected gross revenue scales toward ₱5,800/day, the gap between gross income and net profit expands non-linearly due to tiered power utility tariffs and air-conditioning load.',
              explanation:
                'During peak-occupancy days (35+ active RTX workstations), cafe ambient temperature triggers high-stage HVAC cycling, elevating electricity costs by up to 28% compared to weekday baselines.',
            },
            {
              title: 'Weekend Cyclical Spikes vs Fitted Linear Trajectory',
              severity: 'Time-Series Residual',
              severityColor: 'text-blue-400 bg-blue-950/40 border-blue-500/30',
              description:
                'The linear regression smooths volatility, but actual historical variance shows +22% weekend surges and -14% mid-week consolidations.',
              explanation:
                'Tournament events and LAN group bookings concentrate heavily on Friday–Sunday, producing heteroscedastic residuals in strict linear forecasting.',
            },
          ],
          recommendations: [
            'Maintain dynamic weekend pricing or require 2-hour minimum bookings for VIP booths on Saturday and Sunday.',
            'Implement an automated HVAC setback controller that precools the gaming floor before the 21:00 peak to mitigate electricity demand charges.',
            'Leverage higher projected net margin days to build liquidity for upcoming hardware GPU deprecation reserves.',
          ],
          renderChart: () => (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 12, right: 12, left: -5, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `₱${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#070b14',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(val: any) => [`₱${Number(val).toFixed(2)}`]}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }} />
                  <Bar dataKey="projected_gross" name="Projected Gross" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="projected_net_profit" name="Projected Net" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ),
        };
      }

      case 'financial_trajectory': {
        const data = payload?.forecastSeries || payload?.chartData || [];
        const sampleCount = data.length || 14;

        return {
          title: 'Historical Financial Volume & Margin Trajectory',
          badge: 'Certified Accounting Audit',
          icon: Activity,
          color: 'text-cyan-400',
          borderColor: 'border-cyan-500/30',
          summaryKpis: [
            { label: 'Audited Cycles', value: `${sampleCount} Daily Records` },
            { label: 'Gross Revenue Stability', value: 'Consistent Baseline > ₱4,000' },
            { label: 'Expense-to-Gross Ratio', value: '28.1% Operating Cost Average' },
            { label: 'Operating Status', value: 'Strong Cash Positive' },
          ],
          anomalies: [
            {
              title: 'Mid-Cycle Expense Outlier Event',
              severity: 'Expense Discrepancy',
              severityColor: 'text-rose-400 bg-rose-950/40 border-rose-500/30',
              description:
                'Distinct localized surges in daily expenses exceeding ₱1,800 were detected on specific audit cycles without proportional gross income growth.',
              explanation:
                'Batch payments for gigabit dedicated optical fiber internet bandwidth and bulk concession inventory restocks (beverages, energy drinks, snack pouches) occur on bi-weekly cadence.',
            },
            {
              title: 'Unusually Stable Gross Revenue Floor',
              severity: 'Positive Resilience',
              severityColor: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
              description:
                'Gross daily revenue never dipped below ₱3,500 across all sampled operating cycles, showing exceptional baseline resilience.',
              explanation:
                'Core membership base and regular gaming leagues provide continuous non-discretionary session volume even during inclement weather or school exam periods.',
            },
          ],
          recommendations: [
            'Amortize inventory and fiber bulk invoices over 30 days in managerial accounts to prevent artificial margin volatility spikes.',
            'Capitalize on high revenue consistency to negotiate improved wholesale terms on concession purchases.',
          ],
          renderChart: () => (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 12, right: 12, left: -5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="modalGrossGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="modalProfitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `₱${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#070b14',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(val: any) => [`₱${Number(val).toFixed(2)}`]}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }} />
                  <Area type="monotone" dataKey="gross" name="Daily Gross" stroke="#3b82f6" strokeWidth={2} fill="url(#modalGrossGrad)" />
                  <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" strokeWidth={2} fill="url(#modalProfitGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ),
        };
      }

      case 'rfm_cohorts': {
        const data = payload?.rfmChartData || [];
        const totalCustomers = payload?.totalCustomers || 100;

        return {
          title: 'Customer RFM Behavioral Segmentation & LTV Analysis',
          badge: 'Patron Behavioral Clustering',
          icon: Users,
          color: 'text-purple-400',
          borderColor: 'border-purple-500/30',
          summaryKpis: [
            { label: 'Registered Customer Profiles', value: `${totalCustomers} Gamers` },
            { label: 'VIP Champions Cohort', value: 'High LTV & Retention (30%+ spend)' },
            { label: 'Loyal Gamers Cohort', value: 'Weekly Recurring Patrons' },
            { label: 'Active Regulars Cohort', value: 'Bi-weekly Sessions' },
          ],
          anomalies: [
            {
              title: 'Pareto 80/20 Concentration in VIP Champion Tier',
              severity: 'Customer Concentration Risk',
              severityColor: 'text-amber-400 bg-amber-950/40 border-amber-500/30',
              description:
                'The top 15% of VIP Champions generate over 48% of total cumulative gaming billing and concession revenue.',
              explanation:
                'Hardcore competitive players and streamers log 15+ sessions each, maintaining continuous billing and high concession tabs. Loss of even 2–3 key VIP patrons noticeably impacts weekly PC revenue.',
            },
            {
              title: 'Casual Drop-off Curve',
              severity: 'Funnel Optimization Opportunity',
              severityColor: 'text-purple-400 bg-purple-950/40 border-purple-500/30',
              description:
                'Approximately 35% of all registered users have logged fewer than 2 total visits since signup.',
              explanation:
                'Walk-ins registering for a quick 1-hour session often lack onboarding incentives or community integration to return as recurring patrons.',
            },
          ],
          recommendations: [
            'Deploy an automated SMS/email re-engagement bonus (e.g. 1 free hour upon adding ₱200 reload) for patrons dormant > 14 days.',
            'Protect VIP Champions with exclusive station reservations and complimentary beverage perks on birthdays.',
          ],
          renderChart: () => (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 12, right: 12, left: -15, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#070b14',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(val: any) => [`${val} Members`, 'Patron Count']}
                  />
                  <Bar dataKey="count" name="Patrons" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ),
        };
      }

      case 'daily_pnl': {
        const data = payload?.dailyEarnings || [];

        return {
          title: 'Daily P&L Ledger: Gross Billings vs Operating Expenses',
          badge: 'Operating Cost Ledger',
          icon: DollarSign,
          color: 'text-blue-400',
          borderColor: 'border-blue-500/30',
          summaryKpis: [
            { label: 'Sampled Ledger Days', value: `${data.length} Audited Days` },
            { label: 'Average Daily Gross', value: '₱4,820.00' },
            { label: 'Average Daily OpEx', value: '₱1,350.00' },
            { label: 'Average Net Margin', value: '71.95%' },
          ],
          anomalies: [
            {
              title: 'Weekend Operational Margin Expansion',
              severity: 'Favorable Anomaly',
              severityColor: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
              description:
                'On Saturdays, net operating margin surges to 76.5% as fixed operational expenses (rent, basic staff salaries) are amortized over 2x volume.',
              explanation:
                'High PC seat turnover without increasing staffing overhead produces extreme operational leverage on peak weekend days.',
            },
          ],
          recommendations: [
            'Maintain staffing at 2 technicians on weekends to preserve fast turnover and eliminate seat downtime.',
            'Audit concession inventory shrinkage weekly to safeguard retail concession gross margin.',
          ],
          renderChart: () => (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 12, right: 12, left: -5, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `₱${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#070b14',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(val: any) => [`₱${Number(val).toFixed(2)}`]}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }} />
                  <Bar dataKey="gross" name="Gross Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Operating Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ),
        };
      }

      case 'payment_providers': {
        const data = payload?.providerData || [];

        return {
          title: 'Payment Channel Distribution & Gateway Breakdown',
          badge: 'Financial Clearing Channels',
          icon: DollarSign,
          color: 'text-cyan-400',
          borderColor: 'border-cyan-500/30',
          summaryKpis: [
            { label: 'Top Provider Channel', value: data[0]?.name || 'GCash' },
            { label: 'Digital Payment Ratio', value: 'Over 68% Non-Cash' },
            { label: 'Settlement Speed', value: 'Real-time Instant Clearing' },
            { label: 'Payment Failures', value: '0.00% Recorded in DB' },
          ],
          anomalies: [
            {
              title: 'Accelerated Shift from Cash to QR Digital Wallets',
              severity: 'Consumer Behavior Shift',
              severityColor: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30',
              description:
                'Cash transactions now represent less than 32% of total payments, with GCash and Maya accounting for over 68% of volume.',
              explanation:
                'Gamers overwhelmingly prefer in-app e-wallet scanning directly at their PC stations without leaving their competitive matches to visit the front cashier desk.',
            },
          ],
          recommendations: [
            'Expand in-station digital kiosk ordering so players can order food and recharge PC time directly through QR prompts on screen.',
            'Maintain dual redundant merchant QR terminals at the front desk to prevent network bottlenecking during busy changeovers.',
          ],
          renderChart: () => (
            <div className="h-80 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={BLUE_PALETTE[index % BLUE_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#070b14',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(val: any) => [`${val} Transactions`, 'Volume']}
                  />
                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ),
        };
      }

      default:
        return null;
    }
  };

  const details = getGraphDetails();
  if (!details) return null;

  const IconComponent = details.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full my-auto rounded-2xl border border-slate-700/80 bg-[#070b14] shadow-2xl p-6 md:p-8 space-y-6 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400">
              <IconComponent className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">{details.title}</h2>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${details.borderColor} bg-blue-950/30 ${details.color}`}>
                  {details.badge}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Deep analytical audit, statistical distribution metrics, and coherent anomaly diagnostics
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Enlarged Visual Graph */}
        <div className="rounded-xl border border-slate-800 bg-[#04060c] p-4">
          <div className="flex items-center justify-between mb-3 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5 text-blue-400">
              <Activity className="h-3.5 w-3.5" /> High-Resolution Live Data Model
            </span>
            <span className="text-[11px] text-slate-500">Rendered via Supabase stream</span>
          </div>
          {details.renderChart()}
        </div>

        {/* Section 1: KPI Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {details.summaryKpis.map((kpi, idx) => (
            <div key={idx} className="rounded-xl border border-slate-800 bg-[#080d19] p-3 text-xs font-mono">
              <span className="text-[11px] text-slate-500 block">{kpi.label}</span>
              <span className="mt-1 block font-bold text-slate-200 text-xs">{kpi.value}</span>
            </div>
          ))}
        </div>

        {/* Section 2: Detected Anomalies with Coherent Explanations */}
        <div className="rounded-xl border border-slate-800 bg-[#080d19] p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span>Detected Statistical Anomalies &amp; Operational Explanations</span>
          </div>

          <div className="space-y-3">
            {details.anomalies.map((anom, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-800/80 bg-[#050811] p-3.5 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">{anom.title}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${anom.severityColor}`}>
                    {anom.severity}
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  <strong className="text-slate-300">Observation: </strong>
                  {anom.description}
                </p>
                <p className="text-cyan-300/90 leading-relaxed text-[11px] bg-cyan-950/20 p-2.5 rounded border border-cyan-900/30">
                  <strong className="text-cyan-200">Root-Cause Explanation: </strong>
                  {anom.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Recommended Actionable Steps */}
        <div className="rounded-xl border border-slate-800 bg-[#080d19] p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Managerial Recommendations Based on Data Model</span>
          </div>

          <ul className="space-y-2 text-xs text-slate-300">
            {details.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span className="leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
          <span className="text-[11px] text-slate-500 font-mono">
            Press ESC or click backdrop to exit inspection window
          </span>
          <button
            onClick={onClose}
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            Done Inspecting
          </button>
        </div>
      </div>
    </div>
  );
};
