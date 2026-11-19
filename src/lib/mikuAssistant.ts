import {
  Customer,
  Employee,
  Unit,
  Product,
  Session,
  SessionProduct,
  Payment,
  Earning,
} from './supabase';
import { PythonAnalyticsData } from './analyticsEngine';

export type MikuEmotion = 'greeting' | 'chat_happy' | 'chat_helpful' | 'unknown' | 'goodbye';

export interface MikuEmotionAsset {
  src: string;
  label: string;
  alt: string;
}

export const MIKU_EMOTION_ASSETS: Record<MikuEmotion, MikuEmotionAsset> = {
  greeting: {
    src: '/assets/aistudio/Miku_01_prsk.erica.moe_1d9601ef.png',
    label: 'Greeting',
    alt: 'Hatsune Miku waving cheerfully to greet you',
  },
  chat_happy: {
    src: '/assets/aistudio/Miku_07_prsk.erica.moe_a879ef9b.png',
    label: 'Cheerful',
    alt: 'Hatsune Miku smiling happily with blushing cheeks',
  },
  chat_helpful: {
    src: '/assets/aistudio/Miku_09_prsk.erica.moe_48d64c15.png',
    label: 'Helpful',
    alt: 'Hatsune Miku clasping hands warmly with helpful insights',
  },
  unknown: {
    src: '/assets/aistudio/Miku_08_prsk.erica.moe_e5d80bd9.png',
    label: 'Missing Info',
    alt: 'Hatsune Miku looking apologetic because information is unavailable',
  },
  goodbye: {
    src: '/assets/aistudio/Miku_12_prsk.erica.moe_1f6879a7.png',
    label: 'Goodbye',
    alt: 'Hatsune Miku winking and waving goodbye cheerfully',
  },
};

export interface MikuLiveContext {
  customers: Customer[];
  employees: Employee[];
  units: Unit[];
  products: Product[];
  sessions: Session[];
  sessionProducts: SessionProduct[];
  payments: Payment[];
  earnings: Earning[];
  pythonAnalytics: PythonAnalyticsData | null;
}

export interface MikuAction {
  label: string;
  tabId: string;
}

export interface MikuResponse {
  text: string;
  emotion: MikuEmotion;
  highlights?: string[];
  actions?: MikuAction[];
}

/**
 * Ensures Hatsune Miku says "Mikudayo~" ONLY once at the very end of her entire statement/answer.
 */
export function enforceMikudayo(text: string): string {
  const withoutInnerTags = text
    .replace(/\.\.\.\s*mikudayo[~!.]*/gi, '...')
    .replace(/\bmikudayo[~!.]*/gi, '')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (!withoutInnerTags) return 'Mikudayo~';

  return `${withoutInnerTags} Mikudayo~`;
}

function finalizeMikuResponse(res: MikuResponse): MikuResponse {
  return {
    ...res,
    text: enforceMikudayo(res.text),
  };
}

function formatPeso(n: number): string {
  return `₱${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getPendingSessions(sessions: Session[]): Session[] {
  return sessions.filter((s) => s.payment_status !== 'Paid');
}

function buildSessionFoodMap(sessionProducts: SessionProduct[]): Map<number, number> {
  const map = new Map<number, number>();
  sessionProducts.forEach((sp) => {
    map.set(sp.session_id, (map.get(sp.session_id) || 0) + (Number(sp.subtotal) || 0));
  });
  return map;
}

function summarizeLiveMetrics(data: MikuLiveContext) {
  const { units, sessions, sessionProducts, products, earnings, payments, customers, employees } = data;
  const availableUnits = units.filter((u) => u.status === 'Available');
  const inUseUnits = units.filter((u) => u.status === 'In Use');
  const maintenanceUnits = units.filter((u) => u.status === 'Maintenance');
  const pendingSessions = getPendingSessions(sessions);
  const foodMap = buildSessionFoodMap(sessionProducts);

  const openBillTotal = pendingSessions.reduce((sum, s) => {
    return sum + (Number(s.price) || 0) + (foodMap.get(s.session_id) || 0);
  }, 0);

  const totalGross = earnings.reduce((sum, e) => sum + (Number(e.gross_income) || 0), 0);
  const totalNet = earnings.reduce((sum, e) => sum + (Number(e.net_profit) || 0), 0);
  const totalExpenses = earnings.reduce((sum, e) => sum + (Number(e.expenses) || 0), 0);
  const marginPct = totalGross > 0 ? ((totalNet / totalGross) * 100).toFixed(1) : '0.0';
  const totalFnb = sessionProducts.reduce((sum, sp) => sum + (Number(sp.subtotal) || 0), 0);
  const lowStock = products.filter((p) => Number(p.stock_quantity) <= 30);

  return {
    availableUnits,
    inUseUnits,
    maintenanceUnits,
    pendingSessions,
    openBillTotal,
    totalGross,
    totalNet,
    totalExpenses,
    marginPct,
    totalFnb,
    lowStock,
    totalPayments: payments.length,
    totalCustomers: customers.length,
    totalEmployees: employees.length,
    foodMap,
  };
}

export function buildCafeSummarySnapshot(data: MikuLiveContext): string {
  const m = summarizeLiveMetrics(data);
  const zones = Array.from(new Set(data.units.map((u) => u.area_location).filter(Boolean)));
  const pcTypes = Array.from(new Set(data.units.map((u) => u.type).filter(Boolean)));
  const categories = Array.from(new Set(data.products.map((p) => p.category).filter(Boolean)));
  const shifts = Array.from(new Set(data.employees.map((e) => e.shifts).filter(Boolean)));

  return [
    `- PCs: ${data.units.length} total (${m.availableUnits.length} Free, ${m.inUseUnits.length} In Use, ${m.maintenanceUnits.length} Maintenance); Areas: ${zones.join(', ') || 'Main Floor'}; Types: ${pcTypes.join(', ') || 'Standard PC'}`,
    `- Sessions & Bills: ${data.sessions.length} logged sessions; ${m.pendingSessions.length} open bills (${formatPeso(m.openBillTotal)})`,
    `- Food & Drinks: ${data.products.length} menu items across ${categories.join(', ') || 'Snacks & Drinks'}; ${m.lowStock.length} low-stock items`,
    `- Customers & Staff: ${m.totalCustomers} registered customers; ${m.totalEmployees} staff across ${shifts.join(', ') || 'Morning/Afternoon/Night'} shifts`,
    `- Sales: ${formatPeso(m.totalGross)} total income, ${formatPeso(m.totalNet)} net profit (${m.marginPct}% profit margin)`,
  ].join('\n');
}

export function getInitialTerminalGreeting(data: MikuLiveContext): MikuResponse {
  const m = summarizeLiveMetrics(data);
  return finalizeMikuResponse({
    text:
      `Welcome to Ethereal Cafe! I'm Hatsune Miku, ready to assist. ` +
      `Ask me anything about the cafe, how to use the website, open PCs, unpaid bills, food stock, or even general questions!`,
    emotion: 'greeting',
    highlights: [
      `Floor: ${m.availableUnits.length} Free · ${m.inUseUnits.length} In Use · ${m.maintenanceUnits.length} Maintenance (${data.units.length} total PCs)`,
      `Open Bills: ${m.pendingSessions.length} pending sessions (${formatPeso(m.openBillTotal)})`,
      `Net Profit: ${formatPeso(m.totalNet)} (${m.marginPct}% margin) · ${m.lowStock.length} low-stock item(s)`,
    ],
    actions: [
      { label: 'Go to Cafe Log', tabId: 'main_interface' },
      { label: 'View PC Stations', tabId: 'units' },
    ],
  });
}

function tryLocalMikuAnswer(
  rawInput: string,
  data: MikuLiveContext,
  turnCount = 0
): MikuResponse | null {
  const trimmed = rawInput.trim();
  const q = trimmed.toLowerCase();

  if (!trimmed) {
    return finalizeMikuResponse({
      text: `Hehe, looks like an empty message! Ask me anything like "What is Ethereal Cafe?", "floor status", "open bills", or "how to add a session"!`,
      emotion: 'chat_happy',
    });
  }

  // 1. Thank-you & Goodbye detection -> Miku 12
  const goodbyeRegex =
    /\b(thank you|thanks|thank u|ty|thx|tysm|arigato|arigatou|salamat|bye|goodbye|good bye|see you|see ya|cya|gtg|gotta go|take care|goodnight|good night|farewell|later|signing off)\b/i;
  if (goodbyeRegex.test(q)) {
    return finalizeMikuResponse({
      text:
        `You're super welcome! Keep shining out there—you're doing an amazing job running Ethereal Cafe! ` +
        `Whenever you need a hand, just click "Ask" beside my internet panel! See you soon, bye-bye~`,
      emotion: 'goodbye',
    });
  }

  // 2. Pure greeting -> Miku 01
  const greetingOnlyRegex =
    /^(hi+|hello+|hey+|yo+|yahallo|good\s*(morning|afternoon|evening|day)|miku|hi miku|hello miku|hey miku)[!~.\s]*$/i;
  if (greetingOnlyRegex.test(q)) {
    return getInitialTerminalGreeting(data);
  }

  const m = summarizeLiveMetrics(data);
  const chatEmotion: MikuEmotion = turnCount % 2 === 0 ? 'chat_helpful' : 'chat_happy';

  // 3. Restricted private/security credentials guard -> Miku 08
  const restrictedPrivateRegex =
    /\b(wifi password|credit card|pin code|customer address|home address|personal password)\b/i;
  if (restrictedPrivateRegex.test(q)) {
    return finalizeMikuResponse({
      text:
        `Uwaaah, I'm sorry! I don't have access to private passwords or personal security details for safety reasons!`,
      emotion: 'unknown',
    });
  }

  // 4. General Question: What are you doing here, Hatsune Miku? / Who are you?
  if (
    q.includes('what are you doing here') ||
    q.includes('why are you here') ||
    q.includes('who are you') ||
    q.includes('what is your job') ||
    q.includes('what is your role') ||
    q.includes('about yourself') ||
    /^(miku|hatsune miku)\??$/i.test(q)
  ) {
    return finalizeMikuResponse({
      text:
        `I'm Hatsune Miku, the cheerful idol guide and mascot here at Ethereal Cafe! ` +
        `I keep an eye on the cafe's internet connection in the bottom-left panel, greet everyone on Home, and help staff or guests check live PC availability, manage orders and bills, understand sales, or answer questions right here!`,
      emotion: 'chat_happy',
      highlights: [
        'Role: Ethereal Cafe Guide, Assistant & Connection Mascot',
        'Ask me about live floor status, open bills, food stock, how to use any page, or general questions!',
      ],
      actions: [
        { label: 'Home', tabId: 'home' },
        { label: 'Cafe Log', tabId: 'main_interface' },
      ],
    });
  }

  // 5. General Question: What is Ethereal Cafe?
  if (
    q.includes('what is ethereal cafe') ||
    q.includes('about ethereal cafe') ||
    q.includes('tell me about the cafe') ||
    q.includes('what kind of cafe') ||
    q.includes('what does ethereal cafe do')
  ) {
    const zones = Array.from(new Set(data.units.map((u) => u.area_location).filter(Boolean)));
    const categories = Array.from(new Set(data.products.map((p) => p.category).filter(Boolean)));
    const tiers = Array.from(new Set(data.customers.map((c) => c.membership).filter(Boolean)));

    return finalizeMikuResponse({
      text:
        `Ethereal Cafe is a modern computer and gaming cafe where players can rent PC stations, enjoy snacks and drinks right at their desks, and join membership tiers for a great gaming experience! ` +
        `Right now the cafe operates ${data.units.length} PCs across ${zones.join(', ') || 'the main floor'}, serves ${data.products.length} food and drink items (${categories.join(', ') || 'Snacks & Drinks'}), and supports ${tiers.join(', ') || 'Regular & VIP'} members with ${data.employees.length} staff members!`,
      emotion: 'chat_helpful',
      highlights: [
        `Stations: ${data.units.length} PCs (${m.availableUnits.length} Free right now)`,
        `Food & Drinks: ${data.products.length} menu items across ${categories.length || 1} categories`,
        `Community: ${m.totalCustomers} registered customers · ${m.totalEmployees} staff across shifts`,
      ],
      actions: [
        { label: 'Home', tabId: 'home' },
        { label: 'View PC Stations', tabId: 'units' },
      ],
    });
  }

  // 6. General Question: What is the website about, in general?
  if (
    q.includes('website about') ||
    q.includes('site about') ||
    q.includes('what is this website') ||
    q.includes('what is the website') ||
    q.includes('what is this site') ||
    q.includes('what is this app') ||
    q.includes('purpose of this') ||
    q.includes('in general')
  ) {
    return finalizeMikuResponse({
      text:
        `This website is the all-in-one management and analytics hub for Ethereal Cafe! ` +
        `It brings together live front-desk operations (starting PC sessions, taking food & drink orders, settling bills, and adding new records) with real-time floor tracking, customer & staff directories, and clear sales charts and 7-day estimates!`,
      emotion: 'chat_helpful',
      highlights: [
        'Home & Cafe Log: Instant cafe summary plus fast front-desk logging and bill settlement.',
        'Operations Tabs: PC Stations, Gaming Sessions, Customers, Food & Drinks, and Staff Shifts.',
        'Insights Tabs: Sales & Profit charts plus Data Analysis with 7-day estimates and busiest hours.',
      ],
      actions: [
        { label: 'Home', tabId: 'home' },
        { label: 'Cafe Log', tabId: 'main_interface' },
        { label: 'Data Analysis', tabId: 'python_engine' },
      ],
    });
  }

  // 7. Terminal Help / Capabilities -> Miku 07
  if (/^(help|\?|commands|menu|what can you do|capabilities|guide me)$/i.test(q) || q.includes('what can you do')) {
    return finalizeMikuResponse({
      text: `Yay, let's check what we can do together! I know every tab in Ethereal Cafe, can check live cafe numbers, and can generate answers for general questions too!`,
      emotion: 'chat_happy',
      highlights: [
        'General: "What is Ethereal Cafe?", "What is the website about?", or "What are you doing here?"',
        'Live Floor: "floor status", "which PCs are free?", or "check PC-05"',
        'Bills & Sales: "open bills", "revenue summary", or "payment methods"',
        'Food & Stock: "low stock items", "menu prices", or search a snack/drink name',
        'People & Guide: "who is on night shift?", "top VIP customers", or "how to add a session?"',
      ],
      actions: [
        { label: 'Home', tabId: 'home' },
        { label: 'Cafe Log', tabId: 'main_interface' },
      ],
    });
  }

  // 5. Specific PC lookup
  const pcMatch = q.match(/\bpc[-\s_]?0*(\d+)\b/i);
  if (pcMatch) {
    const requestedNum = parseInt(pcMatch[1], 10);
    const matchedUnit = data.units.find((u) => {
      const unitNumMatch = u.pc_number.match(/\d+/);
      return unitNumMatch && parseInt(unitNumMatch[0], 10) === requestedNum;
    });

    if (!matchedUnit) {
      return finalizeMikuResponse({
        text:
          `Ehh? I searched all PC Stations, and I couldn't find a station matching "PC-${String(requestedNum).padStart(2, '0')}"! ` +
          `Currently the cafe manages ${data.units.length} registered PCs.`,
        emotion: 'unknown',
        actions: [{ label: 'Open PC Stations', tabId: 'units' }],
      });
    }

    const latestSess = data.sessions.find((s) => s.pc_id === matchedUnit.pc_id);
    const analyticsUnit = data.pythonAnalytics?.units.units.find((u) => u.pc_id === matchedUnit.pc_id);
    const sessCust = latestSess?.customers
      ? `${latestSess.customers.first_name} ${latestSess.customers.last_name}`
      : latestSess
      ? `Customer #${latestSess.customer_id}`
      : null;

    return finalizeMikuResponse({
      text:
        `Found it! Here is the live status for ${matchedUnit.pc_number}! ` +
        `It is a ${matchedUnit.type} located in ${matchedUnit.area_location}, currently marked as "${matchedUnit.status}".`,
      emotion: 'chat_helpful',
      highlights: [
        `Status: ${matchedUnit.status} · Area: ${matchedUnit.area_location} · Type: ${matchedUnit.type}`,
        analyticsUnit
          ? `Total Stats: ${analyticsUnit.total_sessions} sessions · ${formatPeso(analyticsUnit.total_revenue)} sales · ${analyticsUnit.total_hours} hrs`
          : `Recent Activity: ${latestSess ? `Session #${latestSess.session_id} (${latestSess.date})` : 'No sessions logged yet'}`,
        latestSess && sessCust
          ? `Latest Customer: ${sessCust} — ${formatPeso(Number(latestSess.price) || 0)} (${latestSess.payment_status})`
          : 'Ready for assignment in Cafe Log!',
      ],
      actions: [
        { label: 'View in PC Stations', tabId: 'units' },
        { label: 'Assign in Cafe Log', tabId: 'main_interface' },
      ],
    });
  }

  // 6. Specific Session ID lookup
  const sessIdMatch = q.match(/\bsession\s*#?(\d+)\b/i);
  if (sessIdMatch) {
    const id = parseInt(sessIdMatch[1], 10);
    const s = data.sessions.find((row) => row.session_id === id);
    if (!s) {
      return finalizeMikuResponse({
        text: `Hmm, I checked Gaming Sessions and couldn't find Session #${id}! Double-check the ID in Gaming Sessions or Cafe Log.`,
        emotion: 'unknown',
        actions: [{ label: 'Open Gaming Sessions', tabId: 'sessions' }],
      });
    }
    const custName = s.customers ? `${s.customers.first_name} ${s.customers.last_name}` : `Customer #${s.customer_id}`;
    const pcNum = s.units?.pc_number || `PC-${s.pc_id}`;
    const empName = s.employees ? `${s.employees.first_name} ${s.employees.last_name}` : `Staff #${s.employee_id}`;
    const fnb = m.foodMap.get(s.session_id) || 0;
    const total = (Number(s.price) || 0) + fnb;

    return finalizeMikuResponse({
      text: `Gotcha! Here are the complete details for Session #${s.session_id}!`,
      emotion: 'chat_helpful',
      highlights: [
        `Customer: ${custName} · PC: ${pcNum} · Staff: ${empName}`,
        `Date: ${s.date} · Status: ${s.payment_status}`,
        `PC Fee: ${formatPeso(Number(s.price) || 0)} + Food & Drinks: ${formatPeso(fnb)} = Total ${formatPeso(total)}`,
      ],
      actions: [
        { label: s.payment_status !== 'Paid' ? 'Settle in Cafe Log' : 'Open Cafe Log', tabId: 'main_interface' },
        { label: 'View Gaming Sessions', tabId: 'sessions' },
      ],
    });
  }

  // 7. Specific Customer ID lookup
  const custIdMatch = q.match(/\bcustomer\s*#?(\d+)\b/i);
  if (custIdMatch) {
    const id = parseInt(custIdMatch[1], 10);
    const c = data.customers.find((row) => row.customer_id === id);
    if (!c) {
      return finalizeMikuResponse({
        text: `Oh no, I looked through all ${data.customers.length} customers and couldn't find Customer #${id}!`,
        emotion: 'unknown',
        actions: [{ label: 'Open Customers', tabId: 'customers' }],
      });
    }
    const custSessions = data.sessions.filter((s) => s.customer_id === c.customer_id);
    const totalSpent = custSessions.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    return finalizeMikuResponse({
      text: `Found Customer #${c.customer_id}! Say hello to ${c.first_name} ${c.last_name} (${c.membership})!`,
      emotion: 'chat_helpful',
      highlights: [
        `Membership: ${c.membership} · Phone: ${c.phone_number || 'N/A'}`,
        `Email: ${c.email_address || 'N/A'}`,
        `Activity: ${custSessions.length} logged sessions totaling ${formatPeso(totalSpent)}`,
      ],
      actions: [{ label: 'Open Customers', tabId: 'customers' }],
    });
  }

  // 8. Website Guide / How-To Workflows
  if (
    q.includes('how to') ||
    q.includes('how do i') ||
    q.includes('how can i') ||
    q.includes('where do i') ||
    q.includes('where can i') ||
    q.includes('explain') ||
    q.includes('tutorial')
  ) {
    if (q.includes('session') || q.includes('start') || q.includes('assign pc')) {
      return finalizeMikuResponse({
        text:
          `Easy peasy! Head over to the "Cafe Log" tab and stay on "New Session". Pick an existing customer, PC station, and duty staff member—or click "+ New" to register someone brand new on the spot! Pick duration and rate presets, then click "Add Session".`,
        emotion: 'chat_happy',
        highlights: [
          'Pending sessions automatically appear in the "Open Bills & Floor" panel on the right.',
          'Checking "Automatically set PC status to In Use" updates the live floor status too!',
        ],
        actions: [{ label: 'Open Cafe Log', tabId: 'main_interface' }],
      });
    }

    if (q.includes('food') || q.includes('snack') || q.includes('drink') || q.includes('order')) {
      return finalizeMikuResponse({
        text:
          `Hungry gamers? Got it! In "Cafe Log", switch to the "Food Order" tab or click "+ Food" directly beside any open bill on the right. Choose the gaming session, pick the snack or drink—or click "+ New" to add a new menu item—adjust quantity, and submit!`,
        emotion: 'chat_happy',
        actions: [
          { label: 'Open Cafe Log', tabId: 'main_interface' },
          { label: 'View Food & Drinks', tabId: 'inventory' },
        ],
      });
    }

    if (q.includes('pay') || q.includes('settle') || q.includes('bill')) {
      return finalizeMikuResponse({
        text:
          `Time to cash out! In "Cafe Log", click the green "Settle" button next to any open bill, or open the "Record Payment" tab. It adds up the session fee and food total automatically and sets the PC back to "Available" once paid!`,
        emotion: 'chat_helpful',
        actions: [
          { label: 'Settle in Cafe Log', tabId: 'main_interface' },
          { label: 'View Sales & Profit', tabId: 'financials' },
        ],
      });
    }

    if (q.includes('restock') || q.includes('menu') || q.includes('add pc') || q.includes('unit')) {
      return finalizeMikuResponse({
        text: `To add a new PC station, add a new snack or drink to the menu, or restock items, open "Cafe Log" and click the "PC & Menu" tab! Every update syncs across the entire website right away.`,
        emotion: 'chat_helpful',
        actions: [
          { label: 'Open PC & Menu Form', tabId: 'main_interface' },
          { label: 'View PC Stations', tabId: 'units' },
        ],
      });
    }

    if (q.includes('customer') || q.includes('employee') || q.includes('staff')) {
      return finalizeMikuResponse({
        text: `You can add new customers or staff directly inside "Cafe Log" using the "Customer" and "Employee" tabs, or inline via "+ New" while starting a session. To browse and search all saved profiles, visit "Customers" or "Staff Shifts".`,
        emotion: 'chat_happy',
        actions: [
          { label: 'Open Cafe Log', tabId: 'main_interface' },
          { label: 'Customers', tabId: 'customers' },
          { label: 'Staff Shifts', tabId: 'employees' },
        ],
      });
    }

    if (q.includes('connection') || q.includes('internet') || q.includes('green') || q.includes('yellow') || q.includes('red') || q.includes('mascot')) {
      return finalizeMikuResponse({
        text: `Ooh, you noticed my internet panel! "Internet is active!" (green) means the database connection is strong, "Connecting..." (yellow) appears while loading or on slow internet, and "No internet..." (red) means offline.`,
        emotion: 'chat_happy',
      });
    }

    if (q.includes('data analysis') || q.includes('python') || q.includes('forecast') || q.includes('rfm')) {
      return finalizeMikuResponse({
        text: `The "Data Analysis" tab shows busiest hours, a 7-day sales estimate, PC usage stats, and top customer groups! It also includes a Python 3 console for custom calculations.`,
        emotion: 'chat_helpful',
        actions: [{ label: 'Open Data Analysis', tabId: 'python_engine' }],
      });
    }
  }

  // 9. Tab / Website tour (updated: no Overview tab)
  if (q.includes('tabs') || q.includes('website') || q.includes('navigation') || q.includes('sections')) {
    return finalizeMikuResponse({
      text: `Here is a quick tour of all tabs in Ethereal Cafe so you can find everything easily!`,
      emotion: 'chat_happy',
      highlights: [
        'Home: Main dashboard showing PC stations, food stock, sales, and live shift updates.',
        'Cafe Log: Front-desk workspace to log sessions, food orders, payments, customers, staff, PCs, and restocks.',
        'PC Stations / Gaming Sessions / Customers / Food & Drinks / Staff Shifts: Full tables and detail popups.',
        'Sales & Profit / Data Analysis: Income vs expenses charts, payment methods, 7-day estimates, and Python tools.',
      ],
      actions: [
        { label: 'Home', tabId: 'home' },
        { label: 'Cafe Log', tabId: 'main_interface' },
      ],
    });
  }

  // 10. Open Bills / Pending Payments
  if (q.includes('bill') || q.includes('pending') || q.includes('unpaid') || q.includes('open') || q.includes('settle')) {
    const topPending = m.pendingSessions.slice(0, 4).map((s) => {
      const cust = s.customers ? `${s.customers.first_name} ${s.customers.last_name}` : `Customer #${s.customer_id}`;
      const pc = s.units?.pc_number || `PC-${s.pc_id}`;
      const amt = (Number(s.price) || 0) + (m.foodMap.get(s.session_id) || 0);
      return `#${s.session_id} · ${pc} (${cust}) — ${formatPeso(amt)}`;
    });

    return finalizeMikuResponse({
      text:
        m.pendingSessions.length === 0
          ? `Woohoo! Every single logged session is settled right now—0 open bills!`
          : `There are currently ${m.pendingSessions.length} open bills totaling ${formatPeso(m.openBillTotal)}! You can settle them anytime in Cafe Log.`,
      emotion: chatEmotion,
      highlights: topPending.length > 0 ? topPending : ['All accounts are clean and settled!'],
      actions: [
        { label: 'Settle in Cafe Log', tabId: 'main_interface' },
        { label: 'Gaming Sessions', tabId: 'sessions' },
      ],
    });
  }

  // 11. Floor / PC Units availability
  if (
    q.includes('floor') ||
    q.includes('pc') ||
    q.includes('unit') ||
    q.includes('computer') ||
    q.includes('available') ||
    q.includes('free') ||
    q.includes('maintenance') ||
    q.includes('in use') ||
    q.includes('occupancy')
  ) {
    const freeList = m.availableUnits.slice(0, 6).map((u) => u.pc_number).join(', ');
    const maintList = m.maintenanceUnits.slice(0, 6).map((u) => u.pc_number).join(', ');
    const occPct = data.units.length > 0 ? Math.round((m.inUseUnits.length / data.units.length) * 100) : 0;

    return finalizeMikuResponse({
      text: `Here is the live PC floor report! Out of ${data.units.length} total PCs, ${m.availableUnits.length} are Available, ${m.inUseUnits.length} are In Use (${occPct}% used), and ${m.maintenanceUnits.length} are in Maintenance.`,
      emotion: chatEmotion,
      highlights: [
        `Free right now: ${freeList || 'None'}${m.availableUnits.length > 6 ? ` (+${m.availableUnits.length - 6} more)` : ''}`,
        `Maintenance: ${maintList || 'None — all healthy!'}`,
        data.pythonAnalytics?.units.top_pc
          ? `Top Earning PC: ${data.pythonAnalytics.units.top_pc} (${formatPeso(data.pythonAnalytics.units.top_pc_revenue)})`
          : 'All stations synced live from Supabase.',
      ],
      actions: [
        { label: 'Open PC Stations', tabId: 'units' },
        { label: 'Assign PC in Cafe Log', tabId: 'main_interface' },
      ],
    });
  }

  // 12. Finance / Revenue / Profit / Sales / Forecast / Payments
  if (
    q.includes('financ') ||
    q.includes('revenue') ||
    q.includes('income') ||
    q.includes('profit') ||
    q.includes('earning') ||
    q.includes('money') ||
    q.includes('sales') ||
    q.includes('expense') ||
    q.includes('margin') ||
    q.includes('payment') ||
    q.includes('gcash') ||
    q.includes('maya') ||
    q.includes('cash') ||
    q.includes('forecast') ||
    q.includes('estimate')
  ) {
    const methodCounts = new Map<string, number>();
    data.payments.forEach((p) => {
      const k = p.payment_method || 'Other';
      methodCounts.set(k, (methodCounts.get(k) || 0) + 1);
    });
    const methodSummary = Array.from(methodCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ');

    const forecastNext7 =
      data.pythonAnalytics?.forecast.forecast_next_7_days.reduce(
        (sum, d) => sum + (Number(d.projected_gross) || 0),
        0
      ) || 0;

    return finalizeMikuResponse({
      text: `Looking good! Total Income stands at ${formatPeso(m.totalGross)} with ${formatPeso(m.totalNet)} Net Profit (${m.marginPct}% profit margin)!`,
      emotion: chatEmotion,
      highlights: [
        `Expenses: ${formatPeso(m.totalExpenses)} · Food & Drink Sales: ${formatPeso(m.totalFnb)}`,
        `Payments (${m.totalPayments}): ${methodSummary || 'No payments logged yet'}`,
        forecastNext7 > 0
          ? `7-Day Sales Estimate: ~${formatPeso(forecastNext7)} (${data.pythonAnalytics?.forecast.trend_direction || 'Steady'} trend)`
          : `${data.earnings.length} sales entries recorded.`,
      ],
      actions: [
        { label: 'Open Sales & Profit', tabId: 'financials' },
        { label: 'Data Analysis', tabId: 'python_engine' },
      ],
    });
  }

  // 13. Concessions / Food / Drinks / Stock
  if (
    q.includes('stock') ||
    q.includes('concession') ||
    q.includes('inventory') ||
    q.includes('menu') ||
    q.includes('food') ||
    q.includes('snack') ||
    q.includes('drink') ||
    q.includes('product') ||
    q.includes('selling') ||
    q.includes('popular')
  ) {
    const itemSales = new Map<string, { qty: number; rev: number }>();
    data.sessionProducts.forEach((sp) => {
      const name = sp.products?.product_name || `Item #${sp.product_id}`;
      const cur = itemSales.get(name) || { qty: 0, rev: 0 };
      cur.qty += Number(sp.quantity) || 0;
      cur.rev += Number(sp.subtotal) || 0;
      itemSales.set(name, cur);
    });
    const topItem = Array.from(itemSales.entries()).sort((a, b) => b[1].qty - a[1].qty)[0];
    const lowStockStr = m.lowStock
      .slice(0, 4)
      .map((p) => `${p.product_name} (${p.stock_quantity} left)`)
      .join(', ');

    return finalizeMikuResponse({
      text:
        `Food & Drinks check! We have ${data.products.length} menu items earning ${formatPeso(m.totalFnb)} across ${data.sessionProducts.length} orders. ` +
        (m.lowStock.length > 0
          ? `Heads up—${m.lowStock.length} item(s) are running low on stock (30 or fewer left)!`
          : `All items are nicely stocked right now!`),
      emotion: chatEmotion,
      highlights: [
        topItem
          ? `Top Seller: ${topItem[0]} (${topItem[1].qty} sold · ${formatPeso(topItem[1].rev)})`
          : 'No food or drink orders logged yet.',
        m.lowStock.length > 0
          ? `Low Stock Alert: ${lowStockStr}`
          : 'Stock Alert: 0 items below 30 units.',
      ],
      actions: [
        { label: 'Open Food & Drinks', tabId: 'inventory' },
        { label: 'Restock in Cafe Log', tabId: 'main_interface' },
      ],
    });
  }

  // 14. Peak hours / Traffic / Sessions
  if (
    q.includes('peak') ||
    q.includes('hour') ||
    q.includes('busy') ||
    q.includes('busiest') ||
    q.includes('traffic') ||
    q.includes('duration') ||
    q.includes('session') ||
    q.includes('analytics')
  ) {
    const h = data.pythonAnalytics?.hourly;
    return finalizeMikuResponse({
      text: `Here is the latest session summary! We have logged ${data.sessions.length} gaming sessions in total, with the busiest hour around ${h?.peak_hour || '14:00'}!`,
      emotion: chatEmotion,
      highlights: [
        `Busiest Hour: ${h?.peak_hour || '14:00'} (${h?.peak_session_count || 0} sessions)`,
        `Average Length: ${Math.round(h?.avg_duration_minutes || 0)} min · Median: ${Math.round(h?.median_duration_minutes || 0)} min`,
        `Open Bills: ${m.pendingSessions.length} · Paid: ${data.sessions.length - m.pendingSessions.length}`,
      ],
      actions: [
        { label: 'View Gaming Sessions', tabId: 'sessions' },
        { label: 'Open Data Analysis', tabId: 'python_engine' },
      ],
    });
  }

  // 15. Staff / Employees / Shifts
  if (
    q.includes('staff') ||
    q.includes('employee') ||
    q.includes('roster') ||
    q.includes('shift') ||
    q.includes('morning') ||
    q.includes('afternoon') ||
    q.includes('night') ||
    q.includes('duty')
  ) {
    const shiftFilter = q.includes('morning')
      ? 'Morning'
      : q.includes('afternoon')
      ? 'Afternoon'
      : q.includes('night')
      ? 'Night'
      : null;

    const filteredEmps = shiftFilter
      ? data.employees.filter((e) => (e.shifts || '').toLowerCase().includes(shiftFilter.toLowerCase()))
      : data.employees;

    if (shiftFilter && filteredEmps.length === 0) {
      return finalizeMikuResponse({
        text: `Hmm, I checked Staff Shifts and nobody is currently listed under the ${shiftFilter} shift!`,
        emotion: 'unknown',
        actions: [{ label: 'Open Staff Shifts', tabId: 'employees' }],
      });
    }

    const shiftCounts = new Map<string, number>();
    data.employees.forEach((e) => {
      const sh = e.shifts || 'Unassigned';
      shiftCounts.set(sh, (shiftCounts.get(sh) || 0) + 1);
    });

    return finalizeMikuResponse({
      text: shiftFilter
        ? `Here is the ${shiftFilter} Shift team keeping Ethereal Cafe running smoothly!`
        : `We have ${data.employees.length} awesome staff members on duty!`,
      emotion: chatEmotion,
      highlights: [
        `Shifts: ${Array.from(shiftCounts.entries()).map(([k, v]) => `${k} (${v})`).join(' · ')}`,
        ...filteredEmps.slice(0, 4).map((e) => `#${e.employee_id} ${e.first_name} ${e.last_name} — ${e.shifts} Shift`),
      ],
      actions: [
        { label: 'Open Staff Shifts', tabId: 'employees' },
        { label: 'Add Staff in Cafe Log', tabId: 'main_interface' },
      ],
    });
  }

  // 16. Customers / VIP / PRO
  if (
    q.includes('customer') ||
    q.includes('patron') ||
    q.includes('vip') ||
    q.includes('pro') ||
    q.includes('member') ||
    q.includes('top spender') ||
    q.includes('loyal') ||
    q.includes('rfm')
  ) {
    const tierCounts = new Map<string, number>();
    data.customers.forEach((c) => {
      const t = c.membership || 'Regular';
      tierCounts.set(t, (tierCounts.get(t) || 0) + 1);
    });
    const topCusts = data.pythonAnalytics?.rfm.top_10_customers.slice(0, 3) || [];

    return finalizeMikuResponse({
      text: `Ethereal Cafe has ${data.customers.length} registered customers! Let's cheer for our loyal gamers!`,
      emotion: chatEmotion,
      highlights: [
        `Memberships: ${Array.from(tierCounts.entries()).map(([k, v]) => `${k}: ${v}`).join(' · ')}`,
        ...topCusts.map(
          (c, i) => `Top #${i + 1}: ${c.name} (${c.membership}) — ${formatPeso(c.total_spend)} across ${c.sessions_count} sessions`
        ),
      ],
      actions: [{ label: 'Open Customers', tabId: 'customers' }],
    });
  }

  // 17. Direct match against customer names, employee names, or product names
  const cleanTokens = q
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !['the', 'who', 'what', 'where', 'how', 'much', 'many', 'find', 'check', 'show', 'tell', 'about', 'price', 'does', 'have', 'are', 'for', 'with'].includes(w));

  if (cleanTokens.length > 0) {
    const matchedProduct = data.products.find((p) =>
      cleanTokens.some((tok) => p.product_name.toLowerCase().includes(tok))
    );
    if (matchedProduct) {
      const orders = data.sessionProducts.filter((sp) => sp.product_id === matchedProduct.product_id);
      const soldQty = orders.reduce((sum, sp) => sum + (Number(sp.quantity) || 0), 0);
      return finalizeMikuResponse({
        text: `Aha! I found "${matchedProduct.product_name}" on our Food & Drinks menu!`,
        emotion: 'chat_helpful',
        highlights: [
          `Category: ${matchedProduct.category} · Price: ${formatPeso(Number(matchedProduct.unit_price) || 0)}`,
          `Stock Left: ${matchedProduct.stock_quantity} units${Number(matchedProduct.stock_quantity) <= 30 ? ' (Low stock!)' : ''}`,
          `Total Ordered: ${soldQty} units across ${orders.length} order(s)`,
        ],
        actions: [{ label: 'Open Food & Drinks', tabId: 'inventory' }],
      });
    }

    const matchedCustomer = data.customers.find((c) => {
      const full = `${c.first_name} ${c.last_name}`.toLowerCase();
      return cleanTokens.some((tok) => full.includes(tok));
    });
    if (matchedCustomer) {
      const custSess = data.sessions.filter((s) => s.customer_id === matchedCustomer.customer_id);
      const spend = custSess.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
      return finalizeMikuResponse({
        text: `Found customer ${matchedCustomer.first_name} ${matchedCustomer.last_name} in our Customers list!`,
        emotion: 'chat_helpful',
        highlights: [
          `Customer #${matchedCustomer.customer_id} · Membership: ${matchedCustomer.membership}`,
          `Phone: ${matchedCustomer.phone_number || 'N/A'} · Email: ${matchedCustomer.email_address || 'N/A'}`,
          `Sessions: ${custSess.length} · Total Session Spend: ${formatPeso(spend)}`,
        ],
        actions: [{ label: 'View Customers', tabId: 'customers' }],
      });
    }

    const matchedEmployee = data.employees.find((e) => {
      const full = `${e.first_name} ${e.last_name}`.toLowerCase();
      return cleanTokens.some((tok) => full.includes(tok));
    });
    if (matchedEmployee) {
      return finalizeMikuResponse({
        text: `Found staff member ${matchedEmployee.first_name} ${matchedEmployee.last_name} in Staff Shifts!`,
        emotion: 'chat_helpful',
        highlights: [
          `Staff #${matchedEmployee.employee_id} · Shift: ${matchedEmployee.shifts}`,
          `Address: ${matchedEmployee.address || 'N/A'}`,
        ],
        actions: [{ label: 'Open Staff Shifts', tabId: 'employees' }],
      });
    }
  }

  // 18. Pricing / Hourly rates / Membership info
  if (q.includes('price') || q.includes('rate') || q.includes('cost') || q.includes('how much') || q.includes('hourly')) {
    const prices = data.sessions.map((s) => Number(s.price)).filter((p) => p > 0);
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 50;
    return finalizeMikuResponse({
      text:
        `PC hourly rates in Cafe Log default to ₱25/h, ₱35/h, ₱50/h, and ₱60/h depending on the station tier, and you can also enter custom amounts! ` +
        `Across ${data.sessions.length} logged sessions, the average session fee is ${formatPeso(avgPrice)}!`,
      emotion: chatEmotion,
      actions: [{ label: 'Open Cafe Log', tabId: 'main_interface' }],
    });
  }

  // 19. Friendly small talk / encouragement
  if (q.includes('how are you') || q.includes('cheer me up') || q.includes('motivate') || q.includes('good job')) {
    return finalizeMikuResponse({
      text: `I'm feeling super energized and ready to sing! You've got this—every shift at Ethereal Cafe runs smoother with you at the desk!`,
      emotion: 'chat_happy',
    });
  }

  // 20. General Cafe Status / Summary command
  if (q === 'status' || q === 'summary' || q.includes('how is the cafe') || q.includes('report')) {
    return finalizeMikuResponse({
      text: `Everything is running smoothly at Ethereal Cafe! Here is your live shift summary!`,
      emotion: 'chat_happy',
      highlights: [
        `PCs: ${m.availableUnits.length} Free / ${m.inUseUnits.length} In Use / ${m.maintenanceUnits.length} Maint (${data.units.length} total)`,
        `Sales: ${formatPeso(m.totalGross)} Gross · ${formatPeso(m.totalNet)} Net Profit (${m.marginPct}% margin)`,
        `Open Bills: ${m.pendingSessions.length} (${formatPeso(m.openBillTotal)}) · Low-Stock Items: ${m.lowStock.length}`,
      ],
      actions: [
        { label: 'Go to Home', tabId: 'home' },
        { label: 'Open Cafe Log', tabId: 'main_interface' },
      ],
    });
  }

  // Outside local DB & built-in guide -> trigger server-side on-the-spot generation
  return null;
}

export async function askMikuWithFallback(
  rawInput: string,
  data: MikuLiveContext,
  turnCount = 0,
  history: Array<{ sender: 'user' | 'miku'; text: string }> = []
): Promise<MikuResponse> {
  const localReply = tryLocalMikuAnswer(rawInput, data, turnCount);
  if (localReply) {
    return localReply;
  }

  const trimmed = rawInput.trim();
  const chatEmotion: MikuEmotion = turnCount % 2 === 0 ? 'chat_helpful' : 'chat_happy';

  try {
    const resp = await fetch('/api/miku/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: trimmed,
        cafeSummary: buildCafeSummarySnapshot(data),
        history,
      }),
    });

    const payload = (await resp.json()) as { text?: string; error?: string; code?: string };

    if (resp.ok && payload.text) {
      return finalizeMikuResponse({
        text: payload.text,
        emotion: chatEmotion,
      });
    }

    if (!resp.ok) {
      const isBusy = payload.code === 'HIGH_DEMAND' || resp.status === 503;
      return finalizeMikuResponse({
        text: isBusy
          ? `Uwaaah, my answer server is super busy right now due to high demand! Please try asking "${trimmed}" again in a few seconds, or ask me about Ethereal Cafe's live PCs, bills, food stock, or sales!`
          : `Uwaaah, I couldn't look up "${trimmed}" right now because my extra answer link hit a hiccup! Feel free to ask me about Ethereal Cafe, the website, PCs, sessions, food stock, customers, staff, or sales!`,
        emotion: 'unknown',
        actions: [
          { label: 'Home', tabId: 'home' },
          { label: 'Cafe Log', tabId: 'main_interface' },
        ],
      });
    }

    return finalizeMikuResponse({
      text: payload.error || `Uwaaah, something went wrong while answering "${trimmed}"!`,
      emotion: 'unknown',
    });
  } catch {
    return finalizeMikuResponse({
      text: `Uwaaah, I couldn't reach the generation server right now to answer "${trimmed}"! Please check your connection and try again!`,
      emotion: 'unknown',
    });
  }
}
