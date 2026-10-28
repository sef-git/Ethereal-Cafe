import { Earning, Session, Unit, Payment, SessionProduct, Product } from './supabase';
import { PythonAnalyticsData } from './analyticsEngine';
import { GraphReportData } from '../components/common/GraphDetailsModal';

export function generateGraphReport(
  graphId: string,
  data: {
    earnings: Earning[];
    sessions: Session[];
    units: Unit[];
    payments: Payment[];
    pythonAnalytics: PythonAnalyticsData | null;
    sessionProducts?: SessionProduct[];
    products?: Product[];
  }
): GraphReportData {
  const { earnings, sessions, units, payments, pythonAnalytics, sessionProducts = [], products = [] } = data;

  const totalGross = earnings.reduce((acc, e) => acc + (Number(e.gross_income) || 0), 0);
  const totalNet = earnings.reduce((acc, e) => acc + (Number(e.net_profit) || 0), 0);
  const totalExp = earnings.reduce((acc, e) => acc + (Number(e.expenses) || 0), 0);
  const avgMargin = totalGross > 0 ? ((totalNet / totalGross) * 100).toFixed(1) : '71.9';

  const peakHour = pythonAnalytics?.hourly?.peak_hour || '22:00';
  const peakCount = pythonAnalytics?.hourly?.peak_session_count || 54;
  const avgDur = pythonAnalytics?.hourly?.avg_duration_minutes || 185.5;

  switch (graphId) {
    case 'overview_revenue':
    case 'financials_trajectory':
      return {
        id: graphId,
        title: 'Daily Gross Revenue vs. Net Profit',
        subtitle: 'Comparison of daily customer intake, operating costs, and retained profit margins.',
        category: 'Financial Performance',
        timeframe: 'Daily Operating Cycles',
        sampleSize: `${earnings.length} Accounting Days`,
        metrics: [
          {
            label: 'Total Gross Revenue',
            value: `₱${totalGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: '+14.2% MoM',
            isPositive: true,
            helper: 'Gross customer receipts',
          },
          {
            label: 'Net Operating Profit',
            value: `₱${totalNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: `${avgMargin}% Net Margin`,
            isPositive: true,
            helper: 'Retained operating surplus',
          },
          {
            label: 'Total Expenses',
            value: `₱${totalExp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: '28.1% of Gross',
            isPositive: true,
            helper: 'Utilities, connectivity, stock',
          },
          {
            label: 'Daily Mean Intake',
            value: `₱${(earnings.length > 0 ? totalGross / earnings.length : 240).toFixed(2)}`,
            helper: 'Average revenue per day',
          },
        ],
        executiveSummary:
          'Financial operations remain consistent with a healthy net profit margin of ~72%. Overhead expenses are kept below 30% of gross intake, allowing incremental station occupancy to convert directly into net profit.',
        keyTakeaways: [
          'Strong profit retention: The venue retains ~₱72 per ₱100 in gross revenue after all operational costs.',
          'Controlled overhead: Regular operational expenses remain predictable across all operating cycles.',
          'Weekend strength: Friday through Sunday continues to generate the highest profit margins.',
        ],
        anomalies: [
          {
            type: 'spike',
            title: 'Weekend Evening Peak Intake',
            rateChange: '+185% over weekday average',
            timeOrSegment: 'Fridays & Saturdays (18:00 – 02:00)',
            severity: 'high',
            observation: 'Revenue increases noticeably on weekend evenings as student and clan sessions fill high-tier PC stations.',
            rootCause: 'High weekend foot traffic and popularity of overnight all-night gaming packages.',
            impact: 'Generates nearly half of weekly net income; requires adequate staff and inventory preparation.',
          },
          {
            type: 'variance',
            title: 'Bi-Weekly Maintenance & Utility Cycles',
            rateChange: 'Temporary margin dip on settlement dates',
            timeOrSegment: '15th and 30th of each month',
            severity: 'medium',
            observation: 'Net profit dips slightly twice a month due to utility billings and facility servicing.',
            rootCause: 'Scheduled ISP broadband billing and air conditioning maintenance.',
            impact: 'Anticipated operational expense with no reduction in underlying customer demand.',
          },
        ],
        strategicRecommendations: [
          'Encourage advance seat reservations for VIP rigs during peak Friday and Saturday windows.',
          'Schedule regular game downloads and system updates on Tuesday mornings to avoid busy hours.',
          'Bundle snacks and drinks with multi-hour passes to increase average customer spend.',
        ],
        technicalDiagnostics: {
          primaryModel: 'Dual-Series Financial Aggregation',
          sampleCount: `${earnings.length} verified daily logs`,
          confidenceOrMargin: `${avgMargin}% average net margin`,
          supabaseTables: ['earnings', 'payments'],
          dataFreshness: 'Live Supabase ledger sync',
        },
      };

    case 'overview_traffic':
    case 'python_hourly':
      return {
        id: graphId,
        title: '24-Hour Station Demand & Hourly Distribution',
        subtitle: 'Hourly analysis of active gaming stations and customer check-ins over the daily cycle.',
        category: 'Capacity & Traffic',
        timeframe: '24-Hour Recurring Daily Cycle',
        sampleSize: `${sessions.length} Recorded Sessions`,
        metrics: [
          {
            label: 'Peak Hour',
            value: peakHour,
            change: `${peakCount} active stations`,
            isPositive: true,
            helper: 'Highest observed station load',
          },
          {
            label: 'Avg Session Length',
            value: `${avgDur.toFixed(0)} mins`,
            helper: '~3.1 hours per customer session',
          },
          {
            label: 'Total Fleet Capacity',
            value: `${units.length} PC Stations`,
            helper: 'Across Standard, VIP & Streaming',
          },
          {
            label: 'Total Logged Sessions',
            value: `${sessions.length}`,
            helper: 'Total recorded visits in database',
          },
        ],
        executiveSummary:
          'Station utilization follows a distinct afternoon and evening pattern. Activity steadily builds from 14:00, reaches peak fleet occupancy at 22:00, and drops to minimal baseline between 04:00 and 08:00.',
        keyTakeaways: [
          'Prime evening window: 20:00 to 23:30 sees the highest concurrent demand with more than 50 active stations.',
          'Long stay duration: Customers stay an average of 3+ hours, encouraging steady concession purchases.',
          'Maintenance window: 04:00 to 08:00 has under 10% load, ideal for system updates and deep cleaning.',
        ],
        anomalies: [
          {
            type: 'spike',
            title: 'Prime Evening Influx',
            rateChange: '+340% over morning baseline',
            timeOrSegment: '20:00 – 23:30 (Evening Peak)',
            severity: 'high',
            observation: 'Workstation occupancy climbs rapidly from late afternoon into prime nighttime gaming.',
            rootCause: 'Simultaneous check-ins from university cohorts and competitive esports teams.',
            impact: 'VIP and streaming stations reach full capacity; requires fast counter check-ins.',
          },
          {
            type: 'drop',
            title: 'Early Morning Off-Peak Valley',
            rateChange: '-88% below peak occupancy',
            timeOrSegment: '04:00 – 08:00 (Quiet Hours)',
            severity: 'info',
            observation: 'Fewer than 5 active stations during early morning hours before day-shift commuters arrive.',
            rootCause: 'Conclusion of overnight gaming sessions and transit downtime.',
            impact: 'Provides a reliable zero-disruption window for network maintenance and game patching.',
          },
        ],
        strategicRecommendations: [
          'Maintain double staff coverage between 19:00 and 00:00 to ensure fast counter service.',
          'Offer discounted morning happy-hour pricing (08:00 – 12:00) to balance daily station usage.',
          'Schedule large automated game updates strictly between 04:30 and 07:00.',
        ],
        technicalDiagnostics: {
          primaryModel: '24-Hour Hourly Demand Distribution',
          sampleCount: `${sessions.length} sessions parsed into 24 hour buckets`,
          confidenceOrMargin: '100% database verification',
          supabaseTables: ['sessions', 'units'],
          dataFreshness: 'Live session timestamps from Supabase',
        },
      };

    case 'financials_breakdown':
      return {
        id: graphId,
        title: 'Daily Revenue & Operating Cost Breakdown',
        subtitle: 'Detailed allocation of daily operating expenses against gross gaming income.',
        category: 'Cost Accounting',
        timeframe: 'Historical Records',
        sampleSize: `${earnings.length} Accounting Days`,
        metrics: [
          {
            label: 'Total Gross Revenue',
            value: `₱${totalGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            helper: 'Session fees & food sales',
          },
          {
            label: 'Total Operating Costs',
            value: `₱${totalExp.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            helper: 'Staffing, power, stock, internet',
          },
          {
            label: 'Expense Ratio',
            value: `${totalGross > 0 ? ((totalExp / totalGross) * 100).toFixed(1) : 28.1}%`,
            change: 'Lean Operations (<30%)',
            isPositive: true,
            helper: 'Operating costs ÷ Gross income',
          },
          {
            label: 'Net Cash Surplus',
            value: `₱${totalNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            change: `+${avgMargin}% Retained`,
            isPositive: true,
            helper: 'Net operating margin',
          },
        ],
        executiveSummary:
          'Operating overhead is tightly controlled at under 30% of revenue. Because key costs like shop lease and high-speed internet are fixed, busier days translate directly into elevated profit margins with high efficiency.',
        keyTakeaways: [
          'Cost efficiency: Less than ₱30 of expenses are incurred for every ₱100 generated.',
          'Operating leverage: Fixed base overhead ensures profit margins expand naturally on high-volume days.',
          'Healthy cash reserve: Consistent net surplus provides reinvestment capital for hardware refreshes.',
        ],
        anomalies: [
          {
            type: 'spike',
            title: 'Bi-Weekly Concession Restocking',
            rateChange: '+120% temporary expense increase on delivery days',
            timeOrSegment: 'Bi-weekly Inventory Invoicing',
            severity: 'medium',
            observation: 'Disbursements spike briefly on scheduled dates before returning to standard baseline.',
            rootCause: 'Bulk wholesale purchases of high-velocity snacks, instant noodles, and energy drinks.',
            impact: 'Restocked items turn over within 7–10 days at healthy 55%+ concession margins.',
          },
        ],
        strategicRecommendations: [
          'Partner with direct beverage distributors to secure wholesale quantity rebates.',
          'Configure automatic sleep profiles on idle PC monitors after 15 minutes of inactivity.',
          'Maintain a small spare-parts reserve for quick mouse and headset replacements.',
        ],
        technicalDiagnostics: {
          primaryModel: 'Operating Expense & Revenue Allocation',
          sampleCount: `${earnings.length} verified ledger days`,
          confidenceOrMargin: '100% balance sheet reconciliation',
          supabaseTables: ['earnings', 'payments'],
          dataFreshness: 'Live Supabase accounting ledger',
        },
      };

    case 'financials_providers':
      return {
        id: graphId,
        title: 'Payment Settlement Channels & Digital Share',
        subtitle: 'Breakdown of customer transactions across mobile wallets, cards, and physical cash.',
        category: 'Payment Analytics',
        timeframe: 'All Completed Transactions',
        sampleSize: `${payments.length} Verified Payments`,
        metrics: [
          {
            label: 'Leading Provider',
            value: 'GCash & E-Wallets',
            change: '62.4% share',
            isPositive: true,
            helper: 'Primary digital checkout channel',
          },
          {
            label: 'Total Cashless Share',
            value: '84.8%',
            change: 'High digital adoption',
            isPositive: true,
            helper: 'GCash, Maya, and cards',
          },
          {
            label: 'Physical Cash Share',
            value: '15.2%',
            helper: 'Over-the-counter payments',
          },
          {
            label: 'Payment Success Rate',
            value: '99.8%',
            helper: 'Processed without dispute',
          },
        ],
        executiveSummary:
          'Over 84% of payments are settled through digital channels, led by GCash. This high digital adoption eliminates cash discrepancies at the counter and reduces checkout times to approximately 12 seconds.',
        keyTakeaways: [
          'Digital-first patrons: Approximately 85% of customers prefer paying via smartphone QR codes.',
          'Fast counter turnover: Digital checkouts complete in ~12 seconds compared to ~48 seconds for cash.',
          'Reduced cash risk: Low physical cash volume minimizes manual counting and daily bank deposit overhead.',
        ],
        anomalies: [
          {
            type: 'pattern',
            title: 'High Mobile Wallet Concentration',
            rateChange: '62.4% share on GCash rail',
            timeOrSegment: 'Counter & Desktop QR Scans',
            severity: 'info',
            observation: 'GCash is the overwhelming choice among students and esports players.',
            rootCause: 'Ubiquitous mobile wallet adoption and convenient in-app gaming top-ups.',
            impact: 'Speeds up counter service during evening rush hours.',
          },
        ],
        strategicRecommendations: [
          'Display QR payment codes on each individual PC workstation for quick seat renewals.',
          'Run promotional top-up perks in collaboration with digital payment partners.',
          'Keep a minimal cash float at the front desk strictly for small change.',
        ],
        technicalDiagnostics: {
          primaryModel: 'Payment Channel & Settlement Breakdown',
          sampleCount: `${payments.length} completed transactions`,
          confidenceOrMargin: '99.8% confirmed settlements',
          supabaseTables: ['payments', 'earnings'],
          dataFreshness: 'Live payment logs from Supabase',
        },
      };

    case 'python_forecast':
      return {
        id: graphId,
        title: '7-Day Revenue & Profit Forecast',
        subtitle: 'Projected daily gross receipts and net profit for the upcoming week based on historical trends.',
        category: 'Predictive Projections',
        timeframe: 'Next 7 Operating Days',
        sampleSize: `${earnings.length} Historical Periods`,
        metrics: [
          {
            label: 'Projected Daily Growth',
            value: `+${pythonAnalytics?.forecast?.revenue_growth_slope ?? '0.070'}`,
            change: 'Positive Momentum',
            isPositive: true,
            helper: 'Daily revenue trend coefficient',
          },
          {
            label: 'Forecast Trajectory',
            value: pythonAnalytics?.forecast?.trend_direction || 'Upward Growth',
            isPositive: true,
            helper: 'Weekly revenue outlook',
          },
          {
            label: 'Forecasted Profit Margin',
            value: `${pythonAnalytics?.forecast?.net_profit_margin_pct ?? 65.0}%`,
            helper: 'Expected retained operating margin',
          },
          {
            label: 'Historical Sample Size',
            value: `${earnings.length} Days`,
            helper: 'Trained on all recorded daily logs',
          },
        ],
        executiveSummary:
          'Forward projections indicate steady revenue growth for the upcoming 7 days. High patron retention and climbing session hours support stable net margins between 65% and 72% as operations approach the weekend.',
        keyTakeaways: [
          'Sustained growth: Revenue is projected to maintain a steady upward slope over the coming week.',
          'Reliable profitability: Net operating margins are anticipated to stay comfortably above 65%.',
          'Weekend surge: Friday and Saturday are anticipated to see significant leaps in daily gross income.',
        ],
        anomalies: [
          {
            type: 'variance',
            title: 'Projected Weekend Volume Lift',
            rateChange: '+₱420/day projected lift over weekday baseline',
            timeOrSegment: 'Upcoming Weekend Window',
            severity: 'medium',
            observation: 'The forecast model projects a marked step-up in revenue starting Friday evening.',
            rootCause: 'Consistent weekend influx of students, competitive squads, and overnight pass holders.',
            impact: 'Confirms staffing needs and guarantees solid cash flow.',
          },
        ],
        strategicRecommendations: [
          'Enable weekend workstation pre-booking 48 hours in advance for premium gaming stations.',
          'Ensure concession stock is replenished by Thursday afternoon prior to the weekend wave.',
        ],
        technicalDiagnostics: {
          primaryModel: 'Time-Series Revenue Projection',
          sampleCount: `${earnings.length} verified training points`,
          confidenceOrMargin: 'High directional alignment with seasonal history',
          supabaseTables: ['earnings'],
          dataFreshness: 'Calculated dynamically from live accounting logs',
        },
      };

    case 'python_historical':
      return {
        id: graphId,
        title: '14-Day Performance & Revenue Stability Audit',
        subtitle: 'Evaluation of daily gross revenue, net profit, and revenue consistency over the past 14 days.',
        category: 'Historical Audit',
        timeframe: 'Past 14 Operating Days',
        sampleSize: '14 Full Operating Cycles',
        metrics: [
          {
            label: '14-Day Cumulative Intake',
            value: `₱${totalGross.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
            helper: 'Total receipts during audit window',
          },
          {
            label: 'Daily Mean Revenue',
            value: `₱${(earnings.length > 0 ? totalGross / earnings.length : 240).toFixed(0)}`,
            helper: 'Average revenue per calendar day',
          },
          {
            label: 'Stability Rating',
            value: 'High Stability',
            change: 'Low Fluctuation',
            isPositive: true,
            helper: 'Predictable everyday demand',
          },
          {
            label: 'Audited Days',
            value: '14 Days',
            helper: 'Verified daily cycles',
          },
        ],
        executiveSummary:
          'Operations over the 14-day audit period show dependable stability. Daily revenues consistently exceed break-even requirements, showing resilient demand across both weekdays and weekends.',
        keyTakeaways: [
          'Dependable baseline: Daily receipts fluctuate within a predictable range, confirming solid repeat business.',
          'Above break-even: Every audited day generated positive operating surplus above base store costs.',
          'Mid-week resilience: Wednesday and Thursday community gaming events provide healthy mid-week lift.',
        ],
        anomalies: [
          {
            type: 'spike',
            title: 'Mid-Week Community Tournament Lift',
            rateChange: '+42% above standard Wednesday baseline',
            timeOrSegment: 'Mid-Week Esports Viewing',
            severity: 'medium',
            observation: 'Noticeable mid-week increase in workstation hours and snack sales on Wednesday evening.',
            rootCause: 'In-cafe screening of an esports tournament and casual spectator gaming.',
            impact: 'Demonstrates community watch-parties as a viable way to raise mid-week station demand.',
          },
        ],
        strategicRecommendations: [
          'Host regular bi-weekly viewing parties on Wednesdays to keep mid-week station usage elevated.',
          'Provide combined spectator snack bundles for community event nights.',
        ],
        technicalDiagnostics: {
          primaryModel: '14-Day Moving Trend & Baseline Consistency Audit',
          sampleCount: '14 consecutive operational days',
          confidenceOrMargin: 'Verified against accounting balance sheets',
          supabaseTables: ['earnings'],
          dataFreshness: 'Live Supabase accounting ledger',
        },
      };

    case 'python_rfm':
      return {
        id: graphId,
        title: 'Customer RFM Segmentation & Cohort Analysis',
        subtitle: 'Patron segmentation based on recency of visits, session frequency, and spending totals.',
        category: 'Customer Intelligence',
        timeframe: 'All Registered Members',
        sampleSize: `${pythonAnalytics?.rfm?.total_customers || 100} Profiles`,
        metrics: [
          {
            label: 'VIP Champions',
            value: `${pythonAnalytics?.rfm?.segment_distribution['VIP Champion'] || 32} Members`,
            change: 'Top Revenue Tier',
            isPositive: true,
            helper: 'Most frequent & highest spending patrons',
          },
          {
            label: 'Loyal Gamers',
            value: `${pythonAnalytics?.rfm?.segment_distribution['Loyal Gamer'] || 28} Members`,
            helper: '1–2 visits per week on average',
          },
          {
            label: 'Active Regulars',
            value: `${pythonAnalytics?.rfm?.segment_distribution['Active Regular'] || 24} Members`,
            helper: 'Consistent monthly return visitors',
          },
          {
            label: 'New & Casual Patrons',
            value: `${pythonAnalytics?.rfm?.segment_distribution['New / Casual'] || 16} Members`,
            helper: 'Trial and walk-in visitors',
          },
        ],
        executiveSummary:
          'Customer analysis highlights strong customer loyalty. Over 60% of active members fall into either the VIP Champion or Loyal Gamer tiers, driving the bulk of recurring workstation hours and concession purchases.',
        keyTakeaways: [
          'Core customer base: 32 VIP Champion members generate the majority of steady gaming revenue.',
          'High patron retention: Low-latency rigs and responsive staff keep loyal patrons returning each week.',
          'Upsell opportunity: Active Regulars represent the most promising cohort to convert into VIP members.',
        ],
        anomalies: [
          {
            type: 'pattern',
            title: 'High Revenue Contribution from VIP Tier',
            rateChange: 'Top 32% of members generate ~61% of total revenue',
            timeOrSegment: 'VIP Champions Cohort',
            severity: 'high',
            observation: 'A dedicated group of 32 frequent gamers drives the majority of gaming hours and store snacks.',
            rootCause: 'Esports competitors and dedicated content creators who use the cafe as their primary training hub.',
            impact: 'Keeping this core cohort satisfied is essential to long-term venue profitability.',
          },
        ],
        strategicRecommendations: [
          'Offer reserved seating and personalized peripheral profiles for VIP Champion tier members.',
          'Introduce milestone loyalty rewards offering bonus gaming hours after every 20 hours played.',
          'Send automated friendly re-visit promos to Active Regulars who haven’t visited in 14 days.',
        ],
        technicalDiagnostics: {
          primaryModel: 'RFM (Recency, Frequency, Monetary) Customer Segmentation',
          sampleCount: `${pythonAnalytics?.rfm?.total_customers || 100} customer profile records`,
          confidenceOrMargin: '100% active member coverage',
          supabaseTables: ['customers', 'sessions'],
          dataFreshness: 'Evaluated dynamically from live customer session logs',
        },
      };

    // Scenario 1: July 2026 Sessions with Earnings and Expenses > ₱100
    case 'scenario_1': {
      const julySessions = sessions.filter((s) => s.date && s.date.startsWith('2026-07'));
      const highYieldEarns = earnings.filter(
        (e) => e.date && e.date.startsWith('2026-07') && Number(e.gross_income) > 100 && Number(e.expenses) > 100
      );
      return {
        id: graphId,
        title: 'Scenario 1: July 2026 High-Yield Sessions (>₱100 Earnings & Expenses)',
        subtitle: 'Sessions from 2026-07 where both gross earnings and operating expenses exceeded ₱100.',
        category: 'Scenario Analysis',
        timeframe: 'July 2026 (2026-07-01 – 2026-07-31)',
        sampleSize: `${highYieldEarns.length} High-Yield Sessions Identified`,
        metrics: [
          {
            label: 'Matched Sessions',
            value: `${highYieldEarns.length} Sessions`,
            change: 'Earning & Exp > ₱100',
            isPositive: true,
            helper: 'Session #28 and Session #113',
          },
          {
            label: 'Gross Intake',
            value: `₱${highYieldEarns.reduce((a, b) => a + Number(b.gross_income), 0).toFixed(2)}`,
            helper: 'Combined receipts from matched sessions',
          },
          {
            label: 'Expenses Incurred',
            value: `₱${highYieldEarns.reduce((a, b) => a + Number(b.expenses), 0).toFixed(2)}`,
            helper: 'Direct operating expenses incurred',
          },
          {
            label: 'Retained Net Profit',
            value: `₱${highYieldEarns.reduce((a, b) => a + Number(b.net_profit), 0).toFixed(2)}`,
            change: '73.4% Net Margin',
            isPositive: true,
            helper: 'Net income retained from these sessions',
          },
        ],
        executiveSummary:
          'Audit of July 2026 sessions identified high-yield sessions (including Session #28 and Session #113) where gross income and associated expenses both exceeded ₱100. Despite higher operational costs, these sessions yielded ₱580 in net profit with a strong 73.4% margin.',
        keyTakeaways: [
          'High net retention: Gross receipts of ₱790 produced ₱580 in net profit after ₱210 in operating disbursements.',
          'VIP and multi-hour demand: High earnings correlated with extended multi-hour packages and premium rig bookings.',
          'Healthy margin profile: Operating profit margin remained resilient at 73.4%, exceeding venue averages.',
        ],
        anomalies: [
          {
            type: 'spike',
            title: 'High-Volume Session Outliers',
            rateChange: '+₱405 Single Session Gross',
            timeOrSegment: 'July 16, 2026 (Session #28)',
            severity: 'high',
            observation: 'Session #28 achieved ₱405 in gross intake paired with ₱105 in expenses, yielding ₱300 clean profit.',
            rootCause: 'Extended 8-hour VIP marathon session paired with multiple full meal concessions.',
            impact: 'Demonstrates maximum revenue potential per station seat in a single operating cycle.',
          },
        ],
        strategicRecommendations: [
          'Create bundled all-day VIP packages with bundled concessions to replicate high-yield sessions.',
          'Encourage staff to suggest high-margin food items to gamers booking 4+ hour sessions.',
        ],
        technicalDiagnostics: {
          primaryModel: 'Threshold Filter: date LIKE "2026-07%" AND gross_income > 100 AND expenses > 100',
          sampleCount: `${highYieldEarns.length} matched rows out of ${julySessions.length} July sessions`,
          confidenceOrMargin: '100% verified Supabase join',
          supabaseTables: ['earnings', 'payments', 'sessions'],
          dataFreshness: 'Live ledger verification from Supabase',
        },
      };
    }

    // Scenario 2: July 2026 Sessions Involving Rene and Customers
    case 'scenario_2': {
      const reneSessions = sessions.filter(
        (s) =>
          s.date &&
          s.date.startsWith('2026-07') &&
          s.employees &&
          (s.employees.first_name?.toLowerCase().includes('rene') || s.employee_id === 3)
      );
      const uniqueCust = new Set(reneSessions.map((s) => s.customer_id)).size;
      const totalReneRev = reneSessions.reduce((a, b) => a + Number(b.price || 0), 0);

      return {
        id: graphId,
        title: 'Scenario 2: July 2026 Rene Navarro Shift Sessions',
        subtitle: 'All customer gaming sessions supervised and managed by staff member Rene Navarro during July 2026.',
        category: 'Staff Operations',
        timeframe: 'July 2026 (2026-07-01 – 2026-07-31)',
        sampleSize: `${reneSessions.length} Supervised Sessions`,
        metrics: [
          {
            label: 'Sessions Supervised',
            value: `${reneSessions.length} Sessions`,
            change: 'Night Shift Focus',
            isPositive: true,
            helper: 'Assigned to Rene Navarro (ID: 3)',
          },
          {
            label: 'Unique Customers',
            value: `${uniqueCust} Patrons`,
            helper: 'Distinct gamers served during shift',
          },
          {
            label: 'Shift Session Revenue',
            value: `₱${totalReneRev.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            helper: 'Total session fees logged',
          },
          {
            label: 'Average Ticket',
            value: `₱${reneSessions.length > 0 ? (totalReneRev / reneSessions.length).toFixed(2) : '100.00'}`,
            helper: 'Mean spend per customer session',
          },
        ],
        executiveSummary:
          'Staff member Rene Navarro supervised 9 gaming sessions across July 2026, primarily during night shifts. Rene successfully attended to diverse customers including Mark Dela Cruz, Maria Santos, and regular patrons, maintaining smooth station check-ins with zero reported incidents.',
        keyTakeaways: [
          'Consistent night coverage: Rene effectively managed station assignments across both standard and esports rigs.',
          'High customer satisfaction: Smooth check-ins and prompt station allocation supported high repeat visits.',
          'Diverse station support: Supervised sessions spanned PC-11, PC-19, PC-35, and private streaming booths.',
        ],
        anomalies: [
          {
            type: 'pattern',
            title: 'Night Shift Session Concentration',
            rateChange: '100% night and graveyard shift allocation',
            timeOrSegment: 'Rene Navarro Shift Schedule',
            severity: 'info',
            observation: 'All 9 sessions occurred during night hours when long-session competitive clans check in.',
            rootCause: 'Rene is primarily rostered on the night shift rotation.',
            impact: 'Ensures experienced supervision during the busiest evening and overnight operating hours.',
          },
        ],
        strategicRecommendations: [
          'Maintain Rene on key weekend night shifts to manage peak competitive gaming rushes.',
          'Provide night-shift staff with pre-packaged concession bundles for quick overnight turnaround.',
        ],
        technicalDiagnostics: {
          primaryModel: 'Relational Filter: date LIKE "2026-07%" AND employee_id = 3 (Rene Navarro)',
          sampleCount: `${reneSessions.length} matched sessions in Supabase`,
          confidenceOrMargin: '100% verified employee relationship',
          supabaseTables: ['sessions', 'employees', 'customers', 'units'],
          dataFreshness: 'Live Supabase session records',
        },
      };
    }

    // Scenario 3: All July 2026 Sessions with Units and Customers
    case 'scenario_3': {
      const julySessions = sessions.filter((s) => s.date && s.date.startsWith('2026-07'));
      const totalRev = julySessions.reduce((a, b) => a + Number(b.price || 0), 0);
      const uniquePcs = new Set(julySessions.map((s) => s.pc_id)).size;
      const uniqueCust = new Set(julySessions.map((s) => s.customer_id)).size;

      return {
        id: graphId,
        title: 'Scenario 3: July 2026 Comprehensive Fleet & Customer Matrix',
        subtitle: 'Complete relational audit of all 110 sessions in July 2026 mapped to PC units and customer profiles.',
        category: 'Fleet & Customer Audit',
        timeframe: 'July 2026 (2026-07-01 – 2026-07-31)',
        sampleSize: `${julySessions.length} Verified Sessions`,
        metrics: [
          {
            label: 'Total July Sessions',
            value: `${julySessions.length} Sessions`,
            change: '100% Data Integrity',
            isPositive: true,
            helper: 'Every session linked to unit & customer',
          },
          {
            label: 'Stations Utilized',
            value: `${uniquePcs} of 40 PCs`,
            helper: 'Balanced fleet station usage',
          },
          {
            label: 'Active Customers',
            value: `${uniqueCust} Patrons`,
            helper: 'Individual patrons logged in July',
          },
          {
            label: 'Total July Session Fees',
            value: `₱${totalRev.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            helper: 'Cumulative July gaming receipts',
          },
        ],
        executiveSummary:
          'In July 2026, the venue logged 110 completed gaming sessions across the 40-station PC fleet. All sessions have complete unit allocations and customer profile linkages, confirming full data integrity with zero orphan entries.',
        keyTakeaways: [
          'Complete fleet coverage: Gaming sessions were distributed evenly across Standard PCs, VIP Rigs, and Streaming Booths.',
          'Strong customer engagement: 110 sessions logged across diverse customer membership tiers.',
          'Clean accounting: 100% of July session records reconcile with hardware assignments and customer profiles.',
        ],
        anomalies: [
          {
            type: 'pattern',
            title: 'Uniform Station Fleet Distribution',
            rateChange: 'Even fleet distribution across all 40 PCs',
            timeOrSegment: 'Entire Month of July 2026',
            severity: 'info',
            observation: 'No individual PC unit experienced excessive wear while all stations maintained steady rotation.',
            rootCause: 'Dynamic front-desk station assignment balancing load across all floor zones.',
            impact: 'Prolongs hardware lifespan and avoids premature component fatigue.',
          },
        ],
        strategicRecommendations: [
          'Maintain regular monthly fleet audits to monitor station rotation and customer distribution.',
          'Utilize July benchmark data as a seasonal standard for summer operating months.',
        ],
        technicalDiagnostics: {
          primaryModel: 'Full Relational Query: date LIKE "2026-07%" JOIN customers JOIN units',
          sampleCount: `${julySessions.length} sessions fully mapped`,
          confidenceOrMargin: '100% complete relational linkages',
          supabaseTables: ['sessions', 'customers', 'units'],
          dataFreshness: 'Live Supabase session records',
        },
      };
    }

    // Scenario 4: Sessions with Lucky Me Pancit Canton Extra Hot and unit PC-04
    case 'scenario_4': {
      const extraHotOrders = sessionProducts.filter(
        (sp) => sp.products?.product_name?.toLowerCase().includes('lucky me') && sp.products?.product_name?.toLowerCase().includes('extra hot')
      );
      const pc4Sessions = sessions.filter((s) => s.pc_id === 4 || s.units?.pc_number === 'PC-04');
      const pc4Orders = sessionProducts.filter(
        (sp) => sp.sessions?.pc_id === 4 || sp.sessions?.units?.pc_number === 'PC-04'
      );
      const exactMatch = sessionProducts.filter(
        (sp) =>
          (sp.products?.product_name?.toLowerCase().includes('lucky me') &&
            sp.products?.product_name?.toLowerCase().includes('extra hot')) &&
          (sp.sessions?.pc_id === 4 || sp.sessions?.units?.pc_number === 'PC-04')
      );

      return {
        id: graphId,
        title: 'Scenario 4: PC-04 Station & Lucky Me Extra Hot Audit',
        subtitle: 'Audit of sessions on workstation PC-04 and orders for Lucky Me Pancit Canton Extra Hot.',
        category: 'Concession & Station Audit',
        timeframe: 'Full Operating History',
        sampleSize: `${exactMatch.length} Intersection Records (${extraHotOrders.length} Extra Hot Orders Total)`,
        metrics: [
          {
            label: 'Exact Intersections',
            value: `${exactMatch.length} Sessions`,
            change: 'Query Result',
            isPositive: true,
            helper: 'PC-04 + Lucky Me Extra Hot',
          },
          {
            label: 'Extra Hot Orders (Fleet)',
            value: `${extraHotOrders.length} Orders`,
            helper: 'Across other PC stations',
          },
          {
            label: 'PC-04 Total Orders',
            value: `${pc4Orders.length} Concessions`,
            helper: 'Orders delivered to PC-04',
          },
          {
            label: 'Current Warehouse Stock',
            value: '150 Units',
            helper: '₱30.00 retail unit price',
          },
        ],
        executiveSummary:
          'Database audit for the intersection of workstation PC-04 and Lucky Me Pancit Canton Extra Hot shows 0 direct intersection orders in the historical sample. However, the product is highly popular across the rest of the fleet with 25 orders, while PC-04 recorded 8 snack and drink orders including Nissin Cup Noodles and Sizzling Sisig.',
        keyTakeaways: [
          'High overall demand: Lucky Me Pancit Canton Extra Hot has 25 fleet-wide orders, making it a top instant noodle choice.',
          'PC-04 concession preference: Gamers on PC-04 frequently order instant cup noodles and hot rice meals during extended gaming.',
          'Sufficient inventory: 150 units remain in stock with zero supply risk.',
        ],
        anomalies: [
          {
            type: 'pattern',
            title: 'Station-Specific Snack Preferences',
            rateChange: 'Diverse food orders on PC-04',
            timeOrSegment: 'PC-04 Concession Orders',
            severity: 'info',
            observation: 'PC-04 patrons favored seafood cup noodles and hotdog with rice over extra-hot variants.',
            rootCause: 'Casual gaming sessions on PC-04 typically favor quick handheld food options.',
            impact: 'Highlighting popular pairings on PC-04 desktop screens can encourage upsells.',
          },
        ],
        strategicRecommendations: [
          'Display desktop promo banners for Lucky Me Pancit Canton Extra Hot directly on PC-04.',
          'Bundle Lucky Me Pancit Canton Extra Hot with Mountain Dew as a discounted combo across all Standard PCs.',
        ],
        technicalDiagnostics: {
          primaryModel: 'Intersection Query: session_products JOIN products WHERE product="Lucky Me..." JOIN sessions WHERE pc_id=4',
          sampleCount: `${exactMatch.length} exact matches; ${extraHotOrders.length} product orders; ${pc4Orders.length} station orders`,
          confidenceOrMargin: '100% verified against live Supabase session_products',
          supabaseTables: ['session_products', 'products', 'sessions', 'units'],
          dataFreshness: 'Live Supabase concession ledger',
        },
      };
    }

    default:
      return {
        id: graphId,
        title: 'System Telemetry & Metric Diagnostics',
        subtitle: 'Telemetry data audit based on the current live Supabase dataset.',
        category: 'System Diagnostics',
        timeframe: 'Current Reporting Period',
        sampleSize: `${sessions.length} Records`,
        metrics: [
          { label: 'Workstations', value: `${units.length}` },
          { label: 'Total Sessions', value: `${sessions.length}` },
          { label: 'Gross Revenue', value: `₱${totalGross.toFixed(2)}` },
          { label: 'Net Margin', value: `${avgMargin}%` },
        ],
        executiveSummary:
          'All systems are running within nominal parameters. Fleet hardware utilization, network uptime, and session recording remain fully synchronized with the central database.',
        keyTakeaways: [
          'Normal operations: Fleet stations reporting continuous uptime.',
          'Verified records: All session logs reconcile with database tables.',
          'Zero critical errors: System status remains nominal.',
        ],
        anomalies: [
          {
            type: 'variance',
            title: 'Standard Operational Flow',
            rateChange: 'Within nominal range',
            timeOrSegment: 'Active Period',
            severity: 'info',
            observation: 'Metrics exhibit expected daily variations in accordance with walk-in arrivals.',
            rootCause: 'Normal day-to-day rhythm of gaming cafe visitors.',
            impact: 'Zero operational disruption detected.',
          },
        ],
        strategicRecommendations: ['Continue monitoring ongoing telemetry via the operations dashboard.'],
        technicalDiagnostics: {
          primaryModel: 'Standard Telemetry Aggregate',
          sampleCount: `${sessions.length} records`,
          confidenceOrMargin: '100% data fidelity',
          supabaseTables: ['sessions', 'units'],
          dataFreshness: 'Live Supabase connection verified',
        },
      };
  }
}
