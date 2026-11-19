import React, { useState, useMemo, useEffect } from 'react';
import {
  PlusCircle,
  Monitor,
  Clock,
  Coffee,
  CreditCard,
  Users,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Package,
  RefreshCw,
} from 'lucide-react';
import { useCafeData } from '../../context/CafeDataContext';
import {
  createSessionRecord,
  createSessionFoodOrder,
  recordSessionPaymentAndEarning,
  createCustomerRecord,
  createEmployeeRecord,
  createUnitRecord,
  updateUnitStatusRecord,
  createProductRecord,
  restockProductRecord,
} from '../../lib/cafeMutations';

type DeskSection = 'session' | 'food' | 'payment' | 'customer' | 'employee' | 'catalog';
type FloorBoardTab = 'floor' | 'recent';
type ExistingOrNew = 'existing' | 'new';

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCurrentTimeHHMM(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function addHoursToHHMM(timeHHMM: string, hours: number): string {
  const [hhStr, mmStr] = timeHHMM.split(':');
  const hh = parseInt(hhStr || '0', 10);
  const mm = parseInt(mmStr || '0', 10);
  const totalMinutes = (hh * 60 + mm + Math.round(hours * 60)) % (24 * 60);
  const outH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const outM = String(totalMinutes % 60).padStart(2, '0');
  return `${outH}:${outM}`;
}

function getSuggestedRate(pcType?: string): number {
  const lower = (pcType || '').toLowerCase();
  if (lower.includes('streaming')) return 50;
  if (lower.includes('esports') || lower.includes('pro')) return 45;
  if (lower.includes('vip')) return 35;
  return 25;
}

function getDefaultProvider(method: string): string {
  switch (method) {
    case 'GCash':
      return 'GCash App';
    case 'Maya':
      return 'PayMaya Inc.';
    case 'Coins.ph':
      return 'Crypto Wallet';
    case 'Cash':
      return 'Over-The-Counter';
    default:
      return '';
  }
}

export const MainInterfaceTab: React.FC = () => {
  const {
    customers,
    employees,
    units,
    products,
    sessions,
    sessionProducts,
    payments,
    earnings,
    syncSilent,
  } = useCafeData();

  const [activeSection, setActiveSection] = useState<DeskSection>('session');
  const [boardTab, setBoardTab] = useState<FloorBoardTab>('floor');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [updatingUnitId, setUpdatingUnitId] = useState<number | null>(null);

  const todayStr = getTodayDateString();

  // Dynamic suggestion lists built from existing Supabase data + standard defaults
  const distinctMemberships = useMemo(() => {
    const s = new Set(['Regular', 'Student', 'PRO', 'VIP']);
    customers.forEach((c) => c.membership && s.add(c.membership));
    return Array.from(s);
  }, [customers]);

  const distinctShifts = useMemo(() => {
    const s = new Set(['Morning', 'Afternoon', 'Night', 'Graveyard']);
    employees.forEach((e) => e.shifts && s.add(e.shifts));
    return Array.from(s);
  }, [employees]);

  const distinctUnitTypes = useMemo(() => {
    const s = new Set(['Standard PC', 'VIP Gaming PC', 'Pro Esports Rig', 'Streaming Booth']);
    units.forEach((u) => u.type && s.add(u.type));
    return Array.from(s);
  }, [units]);

  const distinctUnitLocations = useMemo(() => {
    const s = new Set(['Main Floor', 'VIP Lounge', 'Esports Zone', 'Private Booths']);
    units.forEach((u) => u.area_location && s.add(u.area_location));
    return Array.from(s);
  }, [units]);

  const distinctUnitStatuses = useMemo(() => {
    const s = new Set(['Available', 'In Use', 'Reserved', 'Maintenance']);
    units.forEach((u) => u.status && s.add(u.status));
    return Array.from(s);
  }, [units]);

  const distinctCategories = useMemo(() => {
    const s = new Set(['Snacks', 'Drinks', 'Instant Noodles', 'Full Meals']);
    products.forEach((p) => p.category && s.add(p.category));
    return Array.from(s);
  }, [products]);

  const distinctPaymentMethods = useMemo(() => {
    const s = new Set(['Cash', 'GCash', 'Maya', 'Coins.ph']);
    payments.forEach((p) => p.payment_method && s.add(p.payment_method));
    return Array.from(s);
  }, [payments]);

  const distinctPaymentProviders = useMemo(() => {
    const s = new Set(['Over-The-Counter', 'GCash App', 'PayMaya Inc.', 'Crypto Wallet']);
    payments.forEach((p) => p.provider && s.add(p.provider));
    return Array.from(s);
  }, [payments]);

  const distinctSessionStatuses = useMemo(() => {
    const s = new Set(['Pending', 'Paid', 'Cancelled']);
    sessions.forEach((sess) => sess.payment_status && s.add(sess.payment_status));
    return Array.from(s);
  }, [sessions]);

  // Derived floor metrics
  const availableUnits = useMemo(() => units.filter((u) => u.status === 'Available'), [units]);
  const inUseUnits = useMemo(() => units.filter((u) => u.status === 'In Use'), [units]);
  const maintenanceUnits = useMemo(() => units.filter((u) => u.status === 'Maintenance'), [units]);
  const pendingSessions = useMemo(
    () => sessions.filter((s) => s.payment_status === 'Pending'),
    [sessions]
  );
  const lowStockProducts = useMemo(
    () => products.filter((p) => Number(p.stock_quantity) <= 30),
    [products]
  );

  const sessionFoodTotalMap = useMemo(() => {
    const map = new Map<number, number>();
    sessionProducts.forEach((sp) => {
      map.set(sp.session_id, (map.get(sp.session_id) || 0) + (Number(sp.subtotal) || 0));
    });
    return map;
  }, [sessionProducts]);

  const pendingTotalBill = useMemo(() => {
    return pendingSessions.reduce((sum, s) => {
      const food = sessionFoodTotalMap.get(s.session_id) || 0;
      return sum + (Number(s.price) || 0) + food;
    }, 0);
  }, [pendingSessions, sessionFoodTotalMap]);

  const todaySessions = useMemo(
    () => sessions.filter((s) => s.date === todayStr),
    [sessions, todayStr]
  );
  const todayRevenue = useMemo(
    () => todaySessions.reduce((sum, s) => sum + (Number(s.price) || 0), 0),
    [todaySessions]
  );

  // ---------- 1. NEW SESSION STATE (Existing OR Manual New for Customer, PC, Employee) ----------
  const [sessCustMode, setSessCustMode] = useState<ExistingOrNew>('existing');
  const [custSearch, setCustSearch] = useState('');
  const [sessCustomerId, setSessCustomerId] = useState<string>('');
  const [newSessCustFirst, setNewSessCustFirst] = useState('');
  const [newSessCustLast, setNewSessCustLast] = useState('');
  const [newSessCustPhone, setNewSessCustPhone] = useState('');
  const [newSessCustEmail, setNewSessCustEmail] = useState('');
  const [newSessCustTier, setNewSessCustTier] = useState('Regular');

  const [sessPcMode, setSessPcMode] = useState<ExistingOrNew>('existing');
  const [sessPcId, setSessPcId] = useState<string>('');
  const [newSessPcNumber, setNewSessPcNumber] = useState('');
  const [newSessPcType, setNewSessPcType] = useState('Standard PC');
  const [newSessPcLocation, setNewSessPcLocation] = useState('Main Floor');

  const [sessEmpMode, setSessEmpMode] = useState<ExistingOrNew>('existing');
  const [sessEmployeeId, setSessEmployeeId] = useState<string>('');
  const [newSessEmpFirst, setNewSessEmpFirst] = useState('');
  const [newSessEmpMI, setNewSessEmpMI] = useState('');
  const [newSessEmpLast, setNewSessEmpLast] = useState('');
  const [newSessEmpShift, setNewSessEmpShift] = useState('Morning');
  const [newSessEmpDob, setNewSessEmpDob] = useState('2000-01-01');
  const [newSessEmpAddress, setNewSessEmpAddress] = useState('');

  const [sessDate, setSessDate] = useState<string>(todayStr);
  const [sessStartTime, setSessStartTime] = useState<string>(getCurrentTimeHHMM());
  const [sessDurationHrs, setSessDurationHrs] = useState<number>(2);
  const [sessEndTime, setSessEndTime] = useState<string>(() => addHoursToHHMM(getCurrentTimeHHMM(), 2));
  const [sessHourlyRate, setSessHourlyRate] = useState<number>(25);
  const [sessPrice, setSessPrice] = useState<string>('50.00');
  const [sessPaymentStatus, setSessPaymentStatus] = useState<string>('Pending');
  const [sessUpdatePc, setSessUpdatePc] = useState<boolean>(true);
  const [sessPayMethod, setSessPayMethod] = useState<string>('Cash');
  const [sessPayProvider, setSessPayProvider] = useState<string>('Over-The-Counter');
  const [sessExpenses, setSessExpenses] = useState<string>('17.50');

  useEffect(() => {
    if (!sessCustomerId && customers.length > 0) {
      setSessCustomerId(String(customers[0].customer_id));
    }
    if (!sessEmployeeId && employees.length > 0) {
      setSessEmployeeId(String(employees[0].employee_id));
    }
    if (!sessPcId && units.length > 0) {
      const firstAvail = units.find((u) => u.status === 'Available') || units[0];
      setSessPcId(String(firstAvail.pc_id));
      const rate = getSuggestedRate(firstAvail.type);
      setSessHourlyRate(rate);
      const initialPrice = rate * sessDurationHrs;
      setSessPrice(initialPrice.toFixed(2));
      setSessExpenses((initialPrice * 0.35).toFixed(2));
    }
    if (!newSessPcNumber && units.length > 0) {
      setNewSessPcNumber(`PC-${String(units.length + 1).padStart(2, '0')}`);
    }
  }, [customers, employees, units, sessCustomerId, sessEmployeeId, sessPcId, sessDurationHrs, newSessPcNumber]);

  const filteredCustomerOptions = useMemo(() => {
    const q = custSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const full = `${c.first_name} ${c.last_name}`.toLowerCase();
      return (
        full.includes(q) ||
        String(c.customer_id).includes(q) ||
        (c.membership || '').toLowerCase().includes(q)
      );
    });
  }, [customers, custSearch]);

  const handlePcSelectionChange = (pcIdStr: string) => {
    setSessPcId(pcIdStr);
    const found = units.find((u) => String(u.pc_id) === pcIdStr);
    if (found) {
      const rate = getSuggestedRate(found.type);
      setSessHourlyRate(rate);
      const nextPrice = rate * sessDurationHrs;
      setSessPrice(nextPrice.toFixed(2));
      setSessExpenses((nextPrice * 0.35).toFixed(2));
    }
  };

  const handleDurationPreset = (hrs: number) => {
    setSessDurationHrs(hrs);
    setSessEndTime(addHoursToHHMM(sessStartTime, hrs));
    const nextPrice = sessHourlyRate * hrs;
    setSessPrice(nextPrice.toFixed(2));
    setSessExpenses((nextPrice * 0.35).toFixed(2));
  };

  const handleRatePreset = (rate: number) => {
    setSessHourlyRate(rate);
    const nextPrice = rate * sessDurationHrs;
    setSessPrice(nextPrice.toFixed(2));
    setSessExpenses((nextPrice * 0.35).toFixed(2));
  };

  const handleStartTimeChange = (newStart: string) => {
    setSessStartTime(newStart);
    setSessEndTime(addHoursToHHMM(newStart, sessDurationHrs));
  };

  // ---------- 2. FOOD ORDER STATE (Existing OR Manual New Session + Existing OR Manual New Product) ----------
  const [foodSessionMode, setFoodSessionMode] = useState<ExistingOrNew>('existing');
  const [foodSessionSearch, setFoodSessionSearch] = useState('');
  const [foodSessionId, setFoodSessionId] = useState<string>('');
  const [walkinFoodCustId, setWalkinFoodCustId] = useState<string>('');
  const [walkinFoodPcId, setWalkinFoodPcId] = useState<string>('');
  const [walkinFoodEmpId, setWalkinFoodEmpId] = useState<string>('');
  const [walkinFoodSessPrice, setWalkinFoodSessPrice] = useState<string>('50.00');

  const [foodProductMode, setFoodProductMode] = useState<ExistingOrNew>('existing');
  const [foodProductId, setFoodProductId] = useState<string>('');
  const [newFoodProdName, setNewFoodProdName] = useState('');
  const [newFoodProdCategory, setNewFoodProdCategory] = useState('Snacks');
  const [newFoodProdPrice, setNewFoodProdPrice] = useState('45.00');
  const [newFoodProdStock, setNewFoodProdStock] = useState('50');

  const [foodQty, setFoodQty] = useState<number>(1);
  const [foodSubtotal, setFoodSubtotal] = useState<string>('0.00');

  useEffect(() => {
    if (!foodSessionId && sessions.length > 0) {
      const target = pendingSessions[0] || sessions[0];
      setFoodSessionId(String(target.session_id));
    }
    if (!foodProductId && products.length > 0) {
      const inStock = products.find((p) => Number(p.stock_quantity) > 0) || products[0];
      setFoodProductId(String(inStock.product_id));
      setFoodSubtotal((Number(inStock.unit_price) || 0).toFixed(2));
    }
    if (!walkinFoodCustId && customers.length > 0) setWalkinFoodCustId(String(customers[0].customer_id));
    if (!walkinFoodPcId && units.length > 0) {
      const av = units.find((u) => u.status === 'Available') || units[0];
      setWalkinFoodPcId(String(av.pc_id));
    }
    if (!walkinFoodEmpId && employees.length > 0) setWalkinFoodEmpId(String(employees[0].employee_id));
  }, [
    sessions,
    pendingSessions,
    products,
    customers,
    units,
    employees,
    foodSessionId,
    foodProductId,
    walkinFoodCustId,
    walkinFoodPcId,
    walkinFoodEmpId,
  ]);

  const selectedFoodProduct = useMemo(
    () => products.find((p) => String(p.product_id) === foodProductId) || null,
    [products, foodProductId]
  );

  const handleFoodProductChange = (pidStr: string) => {
    setFoodProductId(pidStr);
    const prod = products.find((p) => String(p.product_id) === pidStr);
    if (prod) {
      setFoodSubtotal(((Number(prod.unit_price) || 0) * foodQty).toFixed(2));
    }
  };

  const handleFoodQtyChange = (nextQty: number) => {
    const safeQty = Math.max(1, nextQty);
    setFoodQty(safeQty);
    if (foodProductMode === 'existing' && selectedFoodProduct) {
      setFoodSubtotal(((Number(selectedFoodProduct.unit_price) || 0) * safeQty).toFixed(2));
    } else if (foodProductMode === 'new') {
      const up = parseFloat(newFoodProdPrice) || 0;
      setFoodSubtotal((up * safeQty).toFixed(2));
    }
  };

  // ---------- 3. PAYMENT SETTLEMENT STATE (Existing OR Walk-In New Session) ----------
  const [paySessionMode, setPaySessionMode] = useState<ExistingOrNew>('existing');
  const [paySessionId, setPaySessionId] = useState<string>('');
  const [payWalkinCustId, setPayWalkinCustId] = useState<string>('');
  const [payWalkinPcId, setPayWalkinPcId] = useState<string>('');
  const [payWalkinEmpId, setPayWalkinEmpId] = useState<string>('');
  const [payWalkinPrice, setPayWalkinPrice] = useState<string>('75.00');

  const [payMethod, setPayMethod] = useState<string>('Cash');
  const [payProvider, setPayProvider] = useState<string>('Over-The-Counter');
  const [payDate, setPayDate] = useState<string>(todayStr);
  const [payGross, setPayGross] = useState<string>('0.00');
  const [payExpenses, setPayExpenses] = useState<string>('0.00');
  const [payReleasePc, setPayReleasePc] = useState<boolean>(true);

  const applyPaymentSessionDefaults = (sidStr: string) => {
    setPaySessionId(sidStr);
    const sess = sessions.find((s) => String(s.session_id) === sidStr);
    if (sess) {
      const pcFee = Number(sess.price) || 0;
      const foodFee = sessionFoodTotalMap.get(sess.session_id) || 0;
      const totalGross = pcFee + foodFee;
      const estExp = pcFee * 0.35;
      setPayGross(totalGross.toFixed(2));
      setPayExpenses(estExp.toFixed(2));
    }
  };

  useEffect(() => {
    if (!paySessionId && sessions.length > 0 && paySessionMode === 'existing') {
      const target = pendingSessions[0] || sessions[0];
      applyPaymentSessionDefaults(String(target.session_id));
    }
    if (!payWalkinCustId && customers.length > 0) setPayWalkinCustId(String(customers[0].customer_id));
    if (!payWalkinPcId && units.length > 0) setPayWalkinPcId(String(units[0].pc_id));
    if (!payWalkinEmpId && employees.length > 0) setPayWalkinEmpId(String(employees[0].employee_id));
  }, [
    sessions,
    pendingSessions,
    paySessionId,
    paySessionMode,
    customers,
    units,
    employees,
    payWalkinCustId,
    payWalkinPcId,
    payWalkinEmpId,
  ]);

  const sortedSessionsForDesk = useMemo(() => {
    const q = foodSessionSearch.trim().toLowerCase();
    const list = [...sessions].sort((a, b) => {
      if (a.payment_status === 'Pending' && b.payment_status !== 'Pending') return -1;
      if (a.payment_status !== 'Pending' && b.payment_status === 'Pending') return 1;
      return b.session_id - a.session_id;
    });
    if (!q) return list.slice(0, 150);
    return list
      .filter((s) => {
        const cust = s.customers
          ? `${s.customers.first_name} ${s.customers.last_name}`.toLowerCase()
          : '';
        const pc = (s.units?.pc_number || `pc-${s.pc_id}`).toLowerCase();
        return (
          String(s.session_id).includes(q) ||
          cust.includes(q) ||
          pc.includes(q) ||
          (s.date || '').includes(q)
        );
      })
      .slice(0, 150);
  }, [sessions, foodSessionSearch]);

  // ---------- 4. CUSTOMER STATE ----------
  const [custFirstName, setCustFirstName] = useState('');
  const [custLastName, setCustLastName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custMembership, setCustMembership] = useState('Regular');

  // ---------- 5. EMPLOYEE STATE ----------
  const [empFirstName, setEmpFirstName] = useState('');
  const [empMiddleInitial, setEmpMiddleInitial] = useState('');
  const [empLastName, setEmpLastName] = useState('');
  const [empBirthDate, setEmpBirthDate] = useState('2000-01-01');
  const [empAddress, setEmpAddress] = useState('');
  const [empShift, setEmpShift] = useState('Morning');

  // ---------- 6. PC UNIT & MENU ITEM STATE ----------
  const [catalogMode, setCatalogMode] = useState<'unit' | 'product' | 'restock'>('unit');
  const [unitNumber, setUnitNumber] = useState('');
  const [unitType, setUnitType] = useState('Standard PC');
  const [unitLocation, setUnitLocation] = useState('Main Floor');
  const [unitStatus, setUnitStatus] = useState('Available');

  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Snacks');
  const [prodPrice, setProdPrice] = useState('35.00');
  const [prodStock, setProdStock] = useState('50');

  const [restockProductId, setRestockProductId] = useState('');
  const [restockQty, setRestockQty] = useState('25');

  useEffect(() => {
    if (!unitNumber && units.length > 0) {
      setUnitNumber(`PC-${String(units.length + 1).padStart(2, '0')}`);
    }
    if (!restockProductId && products.length > 0) {
      const target = lowStockProducts[0] || products[0];
      setRestockProductId(String(target.product_id));
    }
  }, [units, products, lowStockProducts, unitNumber, restockProductId]);

  // ---------- LIVE FLOOR BOARD FILTER ----------
  const [floorFilter, setFloorFilter] = useState<string>('all');
  const filteredFloorUnits = useMemo(() => {
    if (floorFilter === 'all') return units;
    return units.filter((u) => u.status === floorFilter);
  }, [units, floorFilter]);

  const showSuccess = (message: string) => setFeedback({ type: 'success', message });
  const showError = (err: unknown) => {
    const message = err instanceof Error ? err.message : 'Operation failed.';
    setFeedback({ type: 'error', message });
  };

  // ---------- SUBMIT HANDLERS ----------
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(sessPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      showError(new Error('Please enter a valid non-negative session price.'));
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      // 1. Resolve or create Customer
      let resolvedCustomerId: number;
      if (sessCustMode === 'new') {
        if (!newSessCustFirst.trim() || !newSessCustLast.trim()) {
          throw new Error('Enter first and last name for the new customer.');
        }
        const createdCust = await createCustomerRecord(
          {
            first_name: newSessCustFirst,
            last_name: newSessCustLast,
            phone_number: newSessCustPhone || '09000000000',
            email_address:
              newSessCustEmail ||
              `${newSessCustFirst.toLowerCase().replace(/\s+/g, '')}.${newSessCustLast
                .toLowerCase()
                .replace(/\s+/g, '')}@gmail.com`,
            membership: newSessCustTier.trim() || 'Regular',
          },
          customers
        );
        resolvedCustomerId = createdCust.customer_id;
      } else {
        if (!sessCustomerId) throw new Error('Select a customer.');
        resolvedCustomerId = parseInt(sessCustomerId, 10);
      }

      // 2. Resolve or create PC Unit
      let resolvedPcId: number;
      let resolvedPcLabel = '';
      if (sessPcMode === 'new') {
        if (!newSessPcNumber.trim()) {
          throw new Error('Enter a PC station number (e.g. PC-56).');
        }
        const createdUnit = await createUnitRecord(
          {
            pc_number: newSessPcNumber,
            type: newSessPcType.trim() || 'Standard PC',
            status: sessPaymentStatus === 'Pending' ? 'In Use' : 'Available',
            area_location: newSessPcLocation.trim() || 'Main Floor',
          },
          units
        );
        resolvedPcId = createdUnit.pc_id;
        resolvedPcLabel = createdUnit.pc_number;
      } else {
        if (!sessPcId) throw new Error('Select a PC station.');
        resolvedPcId = parseInt(sessPcId, 10);
        resolvedPcLabel =
          units.find((u) => u.pc_id === resolvedPcId)?.pc_number || `PC #${resolvedPcId}`;
      }

      // 3. Resolve or create Employee
      let resolvedEmployeeId: number;
      if (sessEmpMode === 'new') {
        if (!newSessEmpFirst.trim() || !newSessEmpLast.trim()) {
          throw new Error('Enter first and last name for the new duty staff.');
        }
        const createdEmp = await createEmployeeRecord(
          {
            first_name: newSessEmpFirst,
            middle_initial: newSessEmpMI,
            last_name: newSessEmpLast,
            birth_date: newSessEmpDob || '2000-01-01',
            address: newSessEmpAddress.trim() || 'Cavite, Philippines',
            shifts: newSessEmpShift.trim() || 'Morning',
          },
          employees
        );
        resolvedEmployeeId = createdEmp.employee_id;
      } else {
        if (!sessEmployeeId) throw new Error('Select a duty employee.');
        resolvedEmployeeId = parseInt(sessEmployeeId, 10);
      }

      const startIso = `${sessDate}T${sessStartTime}:00`;
      const endIso = `${sessDate}T${sessEndTime}:00`;
      const expNum = parseFloat(sessExpenses);

      const res = await createSessionRecord(
        {
          customer_id: resolvedCustomerId,
          pc_id: resolvedPcId,
          employee_id: resolvedEmployeeId,
          date: sessDate,
          session_start: startIso,
          session_end: endIso,
          price: priceNum,
          payment_status: sessPaymentStatus.trim() || 'Pending',
          updatePcStatus: sessUpdatePc,
          payment_method:
            sessPaymentStatus === 'Paid' ? sessPayMethod.trim() || 'Cash' : undefined,
          provider:
            sessPaymentStatus === 'Paid'
              ? sessPayProvider.trim() || 'Over-The-Counter'
              : undefined,
          expenses:
            sessPaymentStatus === 'Paid' && !isNaN(expNum) && expNum >= 0 ? expNum : undefined,
        },
        { sessions, payments, earnings }
      );

      await syncSilent();

      // Reset inline new-entry modes back cleanly & pre-select newly created IDs
      setSessCustMode('existing');
      setSessCustomerId(String(resolvedCustomerId));
      setNewSessCustFirst('');
      setNewSessCustLast('');
      setNewSessCustPhone('');
      setNewSessCustEmail('');

      setSessPcMode('existing');
      setSessPcId(String(resolvedPcId));

      setSessEmpMode('existing');
      setSessEmployeeId(String(resolvedEmployeeId));
      setNewSessEmpFirst('');
      setNewSessEmpMI('');
      setNewSessEmpLast('');
      setNewSessEmpAddress('');

      showSuccess(
        `Session #${res.session.session_id} added on ${resolvedPcLabel} (${sessPaymentStatus} · ₱${priceNum.toFixed(
          2
        )}). All tables and charts updated.`
      );
      setFoodSessionId(String(res.session.session_id));
      if (sessPaymentStatus === 'Pending') {
        setPaySessionId(String(res.session.session_id));
        setPayGross(priceNum.toFixed(2));
        setPayExpenses((priceNum * 0.35).toFixed(2));
      }
    } catch (err) {
      showError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateFoodOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const subtotalNum = parseFloat(foodSubtotal);
    if (isNaN(subtotalNum) || subtotalNum < 0) {
      showError(new Error('Please enter a valid subtotal amount.'));
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      // 1. Resolve or create Session
      let resolvedSessionId: number;
      if (foodSessionMode === 'new') {
        const sessFee = parseFloat(walkinFoodSessPrice);
        if (!walkinFoodCustId || !walkinFoodPcId || !walkinFoodEmpId || isNaN(sessFee) || sessFee < 0) {
          throw new Error('Complete customer, PC, staff, and session fee for the new session.');
        }
        const startNow = getCurrentTimeHHMM();
        const endNow = addHoursToHHMM(startNow, 2);
        const createdSess = await createSessionRecord(
          {
            customer_id: parseInt(walkinFoodCustId, 10),
            pc_id: parseInt(walkinFoodPcId, 10),
            employee_id: parseInt(walkinFoodEmpId, 10),
            date: todayStr,
            session_start: `${todayStr}T${startNow}:00`,
            session_end: `${todayStr}T${endNow}:00`,
            price: sessFee,
            payment_status: 'Pending',
            updatePcStatus: true,
          },
          { sessions, payments, earnings }
        );
        resolvedSessionId = createdSess.session.session_id;
      } else {
        if (!foodSessionId) throw new Error('Please choose a target session.');
        resolvedSessionId = parseInt(foodSessionId, 10);
      }

      // 2. Resolve or create Product
      let resolvedProductId: number;
      let resolvedProductName: string;
      let currentStock: number;

      if (foodProductMode === 'new') {
        const up = parseFloat(newFoodProdPrice);
        const st = parseInt(newFoodProdStock, 10);
        if (!newFoodProdName.trim() || isNaN(up) || up <= 0 || isNaN(st) || st < foodQty) {
          throw new Error(
            'Enter a valid new item name, unit price, and initial stock (>= ordered quantity).'
          );
        }
        const createdProd = await createProductRecord(
          {
            product_name: newFoodProdName,
            category: newFoodProdCategory.trim() || 'Snacks',
            unit_price: up,
            stock_quantity: st,
          },
          products
        );
        resolvedProductId = createdProd.product_id;
        resolvedProductName = createdProd.product_name;
        currentStock = createdProd.stock_quantity;
      } else {
        if (!selectedFoodProduct) throw new Error('Please select a menu item.');
        if (selectedFoodProduct.stock_quantity < foodQty) {
          throw new Error(
            `Insufficient stock for ${selectedFoodProduct.product_name} (${selectedFoodProduct.stock_quantity} remaining).`
          );
        }
        resolvedProductId = selectedFoodProduct.product_id;
        resolvedProductName = selectedFoodProduct.product_name;
        currentStock = Number(selectedFoodProduct.stock_quantity) || 0;
      }

      await createSessionFoodOrder(
        {
          session_id: resolvedSessionId,
          product_id: resolvedProductId,
          quantity: foodQty,
          subtotal: subtotalNum,
          currentStock,
        },
        sessionProducts
      );

      await syncSilent();
      setFoodSessionMode('existing');
      setFoodSessionId(String(resolvedSessionId));
      setFoodProductMode('existing');
      setFoodProductId(String(resolvedProductId));
      setNewFoodProdName('');
      setFoodQty(1);
      showSuccess(
        `Added ${foodQty}x ${resolvedProductName} (₱${subtotalNum.toFixed(
          2
        )}) to Session #${resolvedSessionId}. Inventory & customer totals updated.`
      );
    } catch (err) {
      showError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const grossNum = parseFloat(payGross);
    const expNum = parseFloat(payExpenses);
    if (isNaN(grossNum) || grossNum < 0 || isNaN(expNum) || expNum < 0) {
      showError(new Error('Please enter valid gross income and operating expense figures.'));
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      let targetSessionId: number;
      let targetPcId: number | undefined;

      if (paySessionMode === 'new') {
        const fee = parseFloat(payWalkinPrice);
        if (!payWalkinCustId || !payWalkinPcId || !payWalkinEmpId || isNaN(fee) || fee < 0) {
          throw new Error('Select customer, PC, staff, and session fee for the new session.');
        }
        const nowHm = getCurrentTimeHHMM();
        const endHm = addHoursToHHMM(nowHm, 2);
        const createdSess = await createSessionRecord(
          {
            customer_id: parseInt(payWalkinCustId, 10),
            pc_id: parseInt(payWalkinPcId, 10),
            employee_id: parseInt(payWalkinEmpId, 10),
            date: payDate,
            session_start: `${payDate}T${nowHm}:00`,
            session_end: `${payDate}T${endHm}:00`,
            price: fee,
            payment_status: 'Pending',
            updatePcStatus: false,
          },
          { sessions, payments, earnings }
        );
        targetSessionId = createdSess.session.session_id;
        targetPcId = createdSess.session.pc_id;
      } else {
        if (!paySessionId) throw new Error('Please select a session to settle.');
        targetSessionId = parseInt(paySessionId, 10);
        targetPcId = sessions.find((s) => s.session_id === targetSessionId)?.pc_id;
      }

      const nowTime = getCurrentTimeHHMM();
      const ts = `${payDate}T${nowTime}:00`;

      const res = await recordSessionPaymentAndEarning(
        {
          session_id: targetSessionId,
          pc_id: targetPcId,
          payment_method: payMethod.trim() || 'Cash',
          provider: payProvider.trim() || 'Over-The-Counter',
          timestamp: ts,
          ledgerDate: payDate,
          gross_income: grossNum,
          expenses: expNum,
          releasePc: payReleasePc,
        },
        { payments, earnings }
      );

      await syncSilent();
      setPaySessionMode('existing');
      setPaySessionId('');
      showSuccess(
        `Payment #${res.payment.payments_id} recorded for Session #${targetSessionId} (₱${grossNum.toFixed(
          2
        )} via ${payMethod}). Financials & analytics updated.`
      );
    } catch (err) {
      showError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custFirstName.trim() || !custLastName.trim()) {
      showError(new Error('First name and last name are required.'));
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const created = await createCustomerRecord(
        {
          first_name: custFirstName,
          last_name: custLastName,
          phone_number: custPhone || '09000000000',
          email_address:
            custEmail ||
            `${custFirstName.toLowerCase().replace(/\s+/g, '')}.${custLastName
              .toLowerCase()
              .replace(/\s+/g, '')}@gmail.com`,
          membership: custMembership.trim() || 'Regular',
        },
        customers
      );

      await syncSilent();
      setSessCustomerId(String(created.customer_id));
      setCustFirstName('');
      setCustLastName('');
      setCustPhone('');
      setCustEmail('');
      showSuccess(
        `Customer #${created.customer_id} (${created.first_name} ${created.last_name} · ${created.membership}) added to Supabase.`
      );
    } catch (err) {
      showError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empFirstName.trim() || !empLastName.trim()) {
      showError(new Error('Employee first name and last name are required.'));
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const created = await createEmployeeRecord(
        {
          first_name: empFirstName,
          middle_initial: empMiddleInitial,
          last_name: empLastName,
          birth_date: empBirthDate,
          address: empAddress || 'Cavite, Philippines',
          shifts: empShift.trim() || 'Morning',
        },
        employees
      );

      await syncSilent();
      setSessEmployeeId(String(created.employee_id));
      setEmpFirstName('');
      setEmpMiddleInitial('');
      setEmpLastName('');
      setEmpAddress('');
      showSuccess(
        `Employee #${created.employee_id} (${created.first_name} ${created.last_name} · ${created.shifts} Shift) added to Staff Roster.`
      );
    } catch (err) {
      showError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCatalogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setFeedback(null);

      if (catalogMode === 'unit') {
        if (!unitNumber.trim()) {
          throw new Error('PC station number is required (e.g. PC-56).');
        }
        const created = await createUnitRecord(
          {
            pc_number: unitNumber,
            type: unitType.trim() || 'Standard PC',
            status: unitStatus.trim() || 'Available',
            area_location: unitLocation.trim() || 'Main Floor',
          },
          units
        );
        await syncSilent();
        setUnitNumber(`PC-${String(units.length + 2).padStart(2, '0')}`);
        showSuccess(
          `PC Station ${created.pc_number} (${created.type} · ${created.area_location}) added to Floor Matrix.`
        );
      } else if (catalogMode === 'product') {
        const priceNum = parseFloat(prodPrice);
        const stockNum = parseInt(prodStock, 10);
        if (!prodName.trim() || isNaN(priceNum) || priceNum <= 0 || isNaN(stockNum) || stockNum < 0) {
          throw new Error('Enter a valid product name, positive price, and stock quantity.');
        }
        const created = await createProductRecord(
          {
            product_name: prodName,
            category: prodCategory.trim() || 'Snacks',
            unit_price: priceNum,
            stock_quantity: stockNum,
          },
          products
        );
        await syncSilent();
        setProdName('');
        showSuccess(
          `Menu item "${created.product_name}" (${created.category} · ₱${priceNum.toFixed(
            2
          )}) added to Cafe Concessions.`
        );
      } else {
        const prod = products.find((p) => String(p.product_id) === restockProductId);
        const qtyNum = parseInt(restockQty, 10);
        if (!prod || isNaN(qtyNum) || qtyNum <= 0) {
          throw new Error('Select a product and enter a positive restock quantity.');
        }
        await restockProductRecord(prod.product_id, Number(prod.stock_quantity) || 0, qtyNum);
        await syncSilent();
        showSuccess(
          `Restocked ${prod.product_name} (+${qtyNum} units → ${
            (Number(prod.stock_quantity) || 0) + qtyNum
          } total).`
        );
      }
    } catch (err) {
      showError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickUnitStatusChange = async (pcId: number, nextStatus: string) => {
    try {
      setUpdatingUnitId(pcId);
      setFeedback(null);
      await updateUnitStatusRecord(pcId, nextStatus);
      await syncSilent();
    } catch (err) {
      showError(err);
    } finally {
      setUpdatingUnitId(null);
    }
  };

  const jumpToSessionPayment = (sessionId: number) => {
    setActiveSection('payment');
    setPaySessionMode('existing');
    applyPaymentSessionDefaults(String(sessionId));
    setFeedback(null);
  };

  const jumpToSessionFood = (sessionId: number) => {
    setActiveSection('food');
    setFoodSessionMode('existing');
    setFoodSessionId(String(sessionId));
    setFeedback(null);
  };

  const jumpToAssignPc = (pcId: number) => {
    setActiveSection('session');
    setSessPcMode('existing');
    handlePcSelectionChange(String(pcId));
    setFeedback(null);
  };

  const selectedPaySession = useMemo(
    () =>
      paySessionMode === 'existing'
        ? sessions.find((s) => String(s.session_id) === paySessionId) || null
        : null,
    [sessions, paySessionId, paySessionMode]
  );

  const selectedPaySessionFood = selectedPaySession
    ? sessionFoodTotalMap.get(selectedPaySession.session_id) || 0
    : 0;

  const computedNetPreview = Math.max(
    0,
    (parseFloat(payGross) || 0) - (parseFloat(payExpenses) || 0)
  );

  const sectionTabs: {
    id: DeskSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'session', label: 'New Session', icon: Clock },
    { id: 'food', label: 'Food Order', icon: Coffee },
    { id: 'payment', label: 'Record Payment', icon: CreditCard },
    { id: 'customer', label: 'Customer', icon: Users },
    { id: 'employee', label: 'Employee', icon: UserCheck },
    { id: 'catalog', label: 'PC & Menu', icon: Package },
  ];

  return (
    <div className="space-y-6">
      {/* Shared HTML datalists allowing either picking existing values OR manually typing new values */}
      <datalist id="tier-list">
        {distinctMemberships.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <datalist id="emp-shift-list">
        {distinctShifts.map((sh) => (
          <option key={sh} value={sh} />
        ))}
      </datalist>
      <datalist id="unit-type-list">
        {distinctUnitTypes.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <datalist id="unit-loc-list">
        {distinctUnitLocations.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>
      <datalist id="unit-status-list">
        {distinctUnitStatuses.map((st) => (
          <option key={st} value={st} />
        ))}
      </datalist>
      <datalist id="prod-cat-list">
        {distinctCategories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id="pay-method-list">
        {distinctPaymentMethods.map((pm) => (
          <option key={pm} value={pm} />
        ))}
      </datalist>
      <datalist id="pay-provider-list">
        {distinctPaymentProviders.map((pr) => (
          <option key={pr} value={pr} />
        ))}
      </datalist>
      <datalist id="session-status-list">
        {distinctSessionStatuses.map((ss) => (
          <option key={ss} value={ss} />
        ))}
      </datalist>

      {/* Top Header (clean title without subtitle per prior rule) */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Cafe Log</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
          <span className="text-emerald-400">{availableUnits.length} Free PCs</span>
          <span className="text-slate-600">·</span>
          <span className="text-amber-400">{pendingSessions.length} Open Bills</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-300">{todayStr}</span>
        </div>
      </div>

      {/* Live Business-Day Desk KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Floor Availability</span>
            <Monitor className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2.5 text-2xl font-bold font-mono text-white tabular-nums">
            {availableUnits.length} / {units.length} Free
          </div>
          <div className="mt-1.5 text-xs text-slate-400 font-mono">
            {inUseUnits.length} In Use · {maintenanceUnits.length} Maint
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Pending Session Bills</span>
            <CreditCard className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2.5 text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {pendingSessions.length} Open
          </div>
          <div className="mt-1.5 text-xs text-slate-400 font-mono tabular-nums">
            Unsettled Tab: ₱{pendingTotalBill.toFixed(2)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Today&apos;s Logged Sessions</span>
            <Clock className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2.5 text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {todaySessions.length}
          </div>
          <div className="mt-1.5 text-xs text-slate-400 font-mono tabular-nums">
            Session Total: ₱{todayRevenue.toFixed(2)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Inventory Stock Alerts</span>
            <Coffee className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2.5 text-2xl font-bold font-mono text-white tabular-nums">
            {lowStockProducts.length} Low Stock
          </div>
          <div className="mt-1.5 text-xs text-slate-400 font-mono">
            {products.length} menu items active
          </div>
        </div>
      </div>

      {/* Operation Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${
            feedback.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
              : 'border-rose-500/40 bg-rose-950/30 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white text-[11px] font-mono whitespace-nowrap shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main 2-Column Front Desk Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
        {/* Left Column: Entry Console (7 cols) */}
        <div className="lg:col-span-7 flex flex-col rounded-xl border border-slate-800/80 bg-[#090d16] p-5">
          {/* Segmented Desk Entry Navigation */}
          <div className="flex flex-wrap items-center gap-1.5 pb-4 mb-5 border-b border-slate-800/80 shrink-0">
            {sectionTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(tab.id);
                    setFeedback(null);
                  }}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-[#060a12] text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* FORM 1: NEW GAMING SESSION */}
          {activeSection === 'session' && (
            <form onSubmit={handleCreateSession} className="flex-1 flex flex-col justify-between gap-5">
              <div className="flex-1 flex flex-col justify-between gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">Log / Start Gaming Session</h2>
                </div>

              {/* Customer: Initial selector + optional + New toggle */}
              <div className="rounded-lg border border-slate-800/90 bg-[#060a12] p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-200">Customer</span>
                  {sessCustMode === 'existing' ? (
                    <button
                      type="button"
                      onClick={() => setSessCustMode('new')}
                      className="inline-flex items-center gap-1 rounded-md border border-blue-500/40 bg-blue-950/40 px-2.5 py-1 text-[11px] font-medium text-blue-300 hover:bg-blue-600 hover:text-white transition-colors whitespace-nowrap"
                    >
                      + New
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSessCustMode('existing')}
                      className="rounded-md border border-slate-700 bg-[#090d16] px-2.5 py-1 text-[11px] text-slate-300 hover:text-white hover:border-slate-600 transition-colors whitespace-nowrap"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {sessCustMode === 'existing' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={custSearch}
                      onChange={(e) => setCustSearch(e.target.value)}
                      placeholder="Filter name, ID, tier..."
                      className="rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                    <select
                      aria-label="Select customer"
                      value={sessCustomerId}
                      onChange={(e) => setSessCustomerId(e.target.value)}
                      className="sm:col-span-2 rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                      required
                    >
                      {filteredCustomerOptions.map((c) => (
                        <option key={c.customer_id} value={c.customer_id}>
                          #{c.customer_id} — {c.first_name} {c.last_name} ({c.membership})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newSessCustFirst}
                      onChange={(e) => setNewSessCustFirst(e.target.value)}
                      placeholder="First Name *"
                      className="rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      required
                    />
                    <input
                      type="text"
                      value={newSessCustLast}
                      onChange={(e) => setNewSessCustLast(e.target.value)}
                      placeholder="Last Name *"
                      className="rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      required
                    />
                    <input
                      type="text"
                      value={newSessCustPhone}
                      onChange={(e) => setNewSessCustPhone(e.target.value)}
                      placeholder="Phone Number (e.g. 09XXXXXXXXX)"
                      className="rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="email"
                      value={newSessCustEmail}
                      onChange={(e) => setNewSessCustEmail(e.target.value)}
                      placeholder="Email Address"
                      className="rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        list="tier-list"
                        value={newSessCustTier}
                        onChange={(e) => setNewSessCustTier(e.target.value)}
                        placeholder="Membership Tier (select or type new)"
                        className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* PC Station & Duty Employee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* PC Station */}
                <div className="rounded-lg border border-slate-800/90 bg-[#060a12] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-200">PC Station</span>
                    {sessPcMode === 'existing' ? (
                      <button
                        type="button"
                        onClick={() => setSessPcMode('new')}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-500/40 bg-blue-950/40 px-2.5 py-0.5 text-[11px] font-medium text-blue-300 hover:bg-blue-600 hover:text-white transition-colors whitespace-nowrap"
                      >
                        + New
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSessPcMode('existing')}
                        className="rounded-md border border-slate-700 bg-[#090d16] px-2.5 py-0.5 text-[11px] text-slate-300 hover:text-white hover:border-slate-600 transition-colors whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {sessPcMode === 'existing' ? (
                    <select
                      aria-label="Select PC station"
                      value={sessPcId}
                      onChange={(e) => handlePcSelectionChange(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                      required
                    >
                      {units.map((u) => (
                        <option key={u.pc_id} value={u.pc_id}>
                          {u.pc_number} · {u.type} ({u.area_location}) — [{u.status}]
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newSessPcNumber}
                        onChange={(e) => setNewSessPcNumber(e.target.value)}
                        placeholder="PC Number (e.g. PC-56) *"
                        className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        required
                      />
                      <input
                        type="text"
                        list="unit-type-list"
                        value={newSessPcType}
                        onChange={(e) => setNewSessPcType(e.target.value)}
                        placeholder="Tier (Standard PC, VIP, or new)"
                        className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        list="unit-loc-list"
                        value={newSessPcLocation}
                        onChange={(e) => setNewSessPcLocation(e.target.value)}
                        placeholder="Area Location (or type new)"
                        className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Duty Employee */}
                <div className="rounded-lg border border-slate-800/90 bg-[#060a12] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-200">Duty Employee</span>
                    {sessEmpMode === 'existing' ? (
                      <button
                        type="button"
                        onClick={() => setSessEmpMode('new')}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-500/40 bg-blue-950/40 px-2.5 py-0.5 text-[11px] font-medium text-blue-300 hover:bg-blue-600 hover:text-white transition-colors whitespace-nowrap"
                      >
                        + New
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSessEmpMode('existing')}
                        className="rounded-md border border-slate-700 bg-[#090d16] px-2.5 py-0.5 text-[11px] text-slate-300 hover:text-white hover:border-slate-600 transition-colors whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {sessEmpMode === 'existing' ? (
                    <select
                      aria-label="Select duty employee"
                      value={sessEmployeeId}
                      onChange={(e) => setSessEmployeeId(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                      required
                    >
                      {employees.map((emp) => (
                        <option key={emp.employee_id} value={emp.employee_id}>
                          #{emp.employee_id} {emp.first_name} {emp.last_name} ({emp.shifts} Shift)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-5 gap-1.5">
                        <input
                          type="text"
                          value={newSessEmpFirst}
                          onChange={(e) => setNewSessEmpFirst(e.target.value)}
                          placeholder="First *"
                          className="col-span-2 rounded-lg border border-slate-800 bg-[#090d16] px-2.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                          required
                        />
                        <input
                          type="text"
                          maxLength={2}
                          value={newSessEmpMI}
                          onChange={(e) => setNewSessEmpMI(e.target.value)}
                          placeholder="MI"
                          className="rounded-lg border border-slate-800 bg-[#090d16] px-2 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={newSessEmpLast}
                          onChange={(e) => setNewSessEmpLast(e.target.value)}
                          placeholder="Last *"
                          className="col-span-2 rounded-lg border border-slate-800 bg-[#090d16] px-2.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          list="emp-shift-list"
                          value={newSessEmpShift}
                          onChange={(e) => setNewSessEmpShift(e.target.value)}
                          placeholder="Shift"
                          className="rounded-lg border border-slate-800 bg-[#090d16] px-2.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                        <input
                          type="date"
                          value={newSessEmpDob}
                          onChange={(e) => setNewSessEmpDob(e.target.value)}
                          className="rounded-lg border border-slate-800 bg-[#090d16] px-2 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <input
                        type="text"
                        value={newSessEmpAddress}
                        onChange={(e) => setNewSessEmpAddress(e.target.value)}
                        placeholder="Address"
                        className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-2.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Date & Time Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="sess-date" className="text-xs font-medium text-slate-300 block">
                    Session Date
                  </label>
                  <input
                    id="sess-date"
                    type="date"
                    value={sessDate}
                    onChange={(e) => setSessDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="sess-start" className="text-xs font-medium text-slate-300 block">
                    Start Time
                  </label>
                  <input
                    id="sess-start"
                    type="time"
                    value={sessStartTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="sess-end" className="text-xs font-medium text-slate-300 block">
                    End Time
                  </label>
                  <input
                    id="sess-end"
                    type="time"
                    value={sessEndTime}
                    onChange={(e) => setSessEndTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Quick Duration & Hourly Rate Helpers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-slate-400 block">Duration Preset</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[1, 2, 3, 4, 5].map((hr) => (
                      <button
                        key={hr}
                        type="button"
                        onClick={() => handleDurationPreset(hr)}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors ${
                          sessDurationHrs === hr
                            ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                            : 'bg-[#060a12] text-slate-400 border border-slate-800 hover:text-white'
                        }`}
                      >
                        {hr}h
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-slate-400 block">Hourly Rate Preset</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[25, 35, 50, 60].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handleRatePreset(rate)}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors tabular-nums ${
                          sessHourlyRate === rate
                            ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                            : 'bg-[#060a12] text-slate-400 border border-slate-800 hover:text-white'
                        }`}
                      >
                        ₱{rate}/h
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price & Payment Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="sess-price" className="text-xs font-medium text-slate-300 block">
                    Session Price (₱)
                  </label>
                  <input
                    id="sess-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={sessPrice}
                    onChange={(e) => {
                      setSessPrice(e.target.value);
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) setSessExpenses((v * 0.35).toFixed(2));
                    }}
                    className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs font-mono text-emerald-400 font-semibold focus:border-blue-500 focus:outline-none tabular-nums"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="sess-status" className="text-xs font-medium text-slate-300 block">
                    Payment Status
                  </label>
                  <input
                    id="sess-status"
                    type="text"
                    list="session-status-list"
                    value={sessPaymentStatus}
                    onChange={(e) => setSessPaymentStatus(e.target.value)}
                    placeholder="Pending, Paid, or custom"
                    className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Instant Payment Fields when Prepaid / Paid */}
              {sessPaymentStatus === 'Paid' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-lg border border-slate-800 bg-[#060a12] p-3.5">
                  <div className="space-y-1.5">
                    <label htmlFor="sess-pay-method" className="text-xs font-medium text-slate-300 block">
                      Payment Method
                    </label>
                    <input
                      id="sess-pay-method"
                      type="text"
                      list="pay-method-list"
                      value={sessPayMethod}
                      onChange={(e) => {
                        setSessPayMethod(e.target.value);
                        const def = getDefaultProvider(e.target.value);
                        if (def) setSessPayProvider(def);
                      }}
                      placeholder="Cash, GCash, or new"
                      className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="sess-pay-provider" className="text-xs font-medium text-slate-300 block">
                      Provider Channel
                    </label>
                    <input
                      id="sess-pay-provider"
                      type="text"
                      list="pay-provider-list"
                      value={sessPayProvider}
                      onChange={(e) => setSessPayProvider(e.target.value)}
                      placeholder="Provider (or new)"
                      className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="sess-pay-exp" className="text-xs font-medium text-slate-300 block">
                      Expenses (₱)
                    </label>
                    <input
                      id="sess-pay-exp"
                      type="number"
                      step="0.01"
                      min="0"
                      value={sessExpenses}
                      onChange={(e) => setSessExpenses(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs font-mono text-rose-400 focus:border-blue-500 focus:outline-none tabular-nums"
                    />
                  </div>
                </div>
              )}

              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 mt-auto border-t border-slate-800/80">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sessUpdatePc}
                    onChange={(e) => setSessUpdatePc(e.target.checked)}
                    className="rounded border-slate-700 bg-[#060a12] text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    {sessPaymentStatus === 'Pending'
                      ? 'Automatically set PC status to "In Use"'
                      : 'Keep PC status synced as "Available"'}
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>{submitting ? 'Saving...' : 'Add Session'}</span>
                </button>
              </div>
            </form>
          )}

          {/* FORM 2: ADD FOOD / CONCESSION ORDER */}
          {activeSection === 'food' && (
            <form onSubmit={handleCreateFoodOrder} className="flex-1 flex flex-col justify-between gap-5">
              <div className="flex-1 flex flex-col justify-between gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">Add Concession / Food Order</h2>
                  <span className="text-xs font-mono text-slate-400">Auto-updates stock &amp; tabs</span>
                </div>

              {/* Target Session: Initial selector + optional + New toggle */}
              <div className="rounded-lg border border-slate-800/90 bg-[#060a12] p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-200">Target Gaming Session</span>
                  {foodSessionMode === 'existing' ? (
                    <button
                      type="button"
                      onClick={() => setFoodSessionMode('new')}
                      className="inline-flex items-center gap-1 rounded-md border border-blue-500/40 bg-blue-950/40 px-2.5 py-1 text-[11px] font-medium text-blue-300 hover:bg-blue-600 hover:text-white transition-colors whitespace-nowrap"
                    >
                      + New
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setFoodSessionMode('existing')}
                      className="rounded-md border border-slate-700 bg-[#090d16] px-2.5 py-1 text-[11px] text-slate-300 hover:text-white hover:border-slate-600 transition-colors whitespace-nowrap"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {foodSessionMode === 'existing' ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={foodSessionSearch}
                      onChange={(e) => setFoodSessionSearch(e.target.value)}
                      placeholder="Filter session ID, customer, or PC..."
                      className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                    <select
                      id="food-session"
                      value={foodSessionId}
                      onChange={(e) => setFoodSessionId(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                      required
                    >
                      {sortedSessionsForDesk.map((s) => {
                        const custName = s.customers
                          ? `${s.customers.first_name} ${s.customers.last_name}`
                          : `Customer #${s.customer_id}`;
                        const pcNum = s.units?.pc_number || `PC-${s.pc_id}`;
                        return (
                          <option key={s.session_id} value={s.session_id}>
                            #{s.session_id} · {custName} · {pcNum} · {s.date} [{s.payment_status}]
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      aria-label="Customer for new session"
                      value={walkinFoodCustId}
                      onChange={(e) => setWalkinFoodCustId(e.target.value)}
                      className="rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    >
                      {customers.map((c) => (
                        <option key={c.customer_id} value={c.customer_id}>
                          #{c.customer_id} {c.first_name} {c.last_name}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="PC for new session"
                      value={walkinFoodPcId}
                      onChange={(e) => setWalkinFoodPcId(e.target.value)}
                      className="rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    >
                      {units.map((u) => (
                        <option key={u.pc_id} value={u.pc_id}>
                          {u.pc_number} ({u.status})
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Staff for new session"
                      value={walkinFoodEmpId}
                      onChange={(e) => setWalkinFoodEmpId(e.target.value)}
                      className="rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    >
                      {employees.map((emp) => (
                        <option key={emp.employee_id} value={emp.employee_id}>
                          {emp.first_name} {emp.last_name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={walkinFoodSessPrice}
                      onChange={(e) => setWalkinFoodSessPrice(e.target.value)}
                      placeholder="Session Fee (₱)"
                      className="rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Menu Item: Initial selector + optional + New toggle */}
              <div className="rounded-lg border border-slate-800/90 bg-[#060a12] p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-200">Food / Drink Item</span>
                  {foodProductMode === 'existing' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setFoodProductMode('new');
                        const up = parseFloat(newFoodProdPrice) || 0;
                        setFoodSubtotal((up * foodQty).toFixed(2));
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-blue-500/40 bg-blue-950/40 px-2.5 py-1 text-[11px] font-medium text-blue-300 hover:bg-blue-600 hover:text-white transition-colors whitespace-nowrap"
                    >
                      + New
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setFoodProductMode('existing')}
                      className="rounded-md border border-slate-700 bg-[#090d16] px-2.5 py-1 text-[11px] text-slate-300 hover:text-white hover:border-slate-600 transition-colors whitespace-nowrap"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {foodProductMode === 'existing' ? (
                  <select
                    id="food-product"
                    value={foodProductId}
                    onChange={(e) => handleFoodProductChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    required
                  >
                    {products.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.product_name} ({p.category}) — ₱{Number(p.unit_price).toFixed(2)} · Stock: {p.stock_quantity}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newFoodProdName}
                      onChange={(e) => setNewFoodProdName(e.target.value)}
                      placeholder="New Product Name *"
                      className="sm:col-span-2 rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      required
                    />
                    <input
                      type="text"
                      list="prod-cat-list"
                      value={newFoodProdCategory}
                      onChange={(e) => setNewFoodProdCategory(e.target.value)}
                      placeholder="Category (or type new)"
                      className="rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      required
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        value={newFoodProdPrice}
                        onChange={(e) => {
                          setNewFoodProdPrice(e.target.value);
                          const up = parseFloat(e.target.value) || 0;
                          setFoodSubtotal((up * foodQty).toFixed(2));
                        }}
                        placeholder="Unit ₱"
                        className="rounded-lg border border-slate-800 bg-[#090d16] px-2.5 py-2 text-xs font-mono text-emerald-400 focus:border-blue-500 focus:outline-none"
                        required
                      />
                      <input
                        type="number"
                        min="1"
                        value={newFoodProdStock}
                        onChange={(e) => setNewFoodProdStock(e.target.value)}
                        placeholder="Stock"
                        className="rounded-lg border border-slate-800 bg-[#090d16] px-2.5 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="food-qty" className="text-xs font-medium text-slate-300 block">
                    Quantity
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleFoodQtyChange(foodQty - 1)}
                      className="rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs font-mono text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      -
                    </button>
                    <input
                      id="food-qty"
                      type="number"
                      min="1"
                      max={
                        foodProductMode === 'existing' && selectedFoodProduct
                          ? Math.max(1, selectedFoodProduct.stock_quantity)
                          : 999
                      }
                      value={foodQty}
                      onChange={(e) => handleFoodQtyChange(parseInt(e.target.value || '1', 10))}
                      className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-center text-xs font-mono text-white focus:border-blue-500 focus:outline-none tabular-nums"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => handleFoodQtyChange(foodQty + 1)}
                      className="rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs font-mono text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="food-subtotal" className="text-xs font-medium text-slate-300 block">
                    Order Subtotal (₱)
                  </label>
                  <input
                    id="food-subtotal"
                    type="number"
                    step="0.01"
                    min="0"
                    value={foodSubtotal}
                    onChange={(e) => setFoodSubtotal(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs font-mono text-emerald-400 font-semibold focus:border-blue-500 focus:outline-none tabular-nums"
                    required
                  />
                </div>
              </div>

              {foodProductMode === 'existing' && selectedFoodProduct && (
                <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#060a12] px-3.5 py-2.5 text-xs font-mono text-slate-400">
                  <span>Stock Remaining After Order:</span>
                  <span
                    className={
                      selectedFoodProduct.stock_quantity - foodQty <= 15
                        ? 'text-amber-400 font-semibold tabular-nums'
                        : 'text-slate-200 font-semibold tabular-nums'
                    }
                  >
                    {selectedFoodProduct.stock_quantity} →{' '}
                    {Math.max(0, selectedFoodProduct.stock_quantity - foodQty)} units
                  </span>
                </div>
              )}

                {sessionProducts.length > 0 && (
                  <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3.5 space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Recent Concession Tickets
                    </div>
                    <div className="space-y-1.5">
                      {sessionProducts.slice(0, 3).map((sp) => (
                        <div
                          key={`recent-sp-${sp.session_product_id}`}
                          className="flex items-center justify-between text-xs text-slate-300"
                        >
                          <span className="truncate">
                            {sp.quantity}x {sp.products?.product_name || `Item #${sp.product_id}`}{' '}
                            <span className="font-mono text-slate-500">(Sess #{sp.session_id})</span>
                          </span>
                          <span className="font-mono text-emerald-400 tabular-nums shrink-0">
                            ₱{Number(sp.subtotal).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 mt-auto border-t border-slate-800/80">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <Coffee className="h-3.5 w-3.5" />
                  <span>{submitting ? 'Adding...' : 'Add Food Order'}</span>
                </button>
              </div>
            </form>
          )}

          {/* FORM 3: RECORD PAYMENT & SETTLE SESSION */}
          {activeSection === 'payment' && (
            <form onSubmit={handleRecordPayment} className="flex-1 flex flex-col justify-between gap-5">
              <div className="flex-1 flex flex-col justify-between gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">
                    Record Session &amp; Concession Payment
                  </h2>
                  <span className="text-xs font-mono text-slate-400">Updates payments &amp; earnings</span>
                </div>

              {/* Target Session: Initial selector + optional + New toggle */}
              <div className="rounded-lg border border-slate-800/90 bg-[#060a12] p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-200">Session to Settle</span>
                  {paySessionMode === 'existing' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPaySessionMode('new');
                        const fee = parseFloat(payWalkinPrice) || 0;
                        setPayGross(fee.toFixed(2));
                        setPayExpenses((fee * 0.35).toFixed(2));
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-blue-500/40 bg-blue-950/40 px-2.5 py-1 text-[11px] font-medium text-blue-300 hover:bg-blue-600 hover:text-white transition-colors whitespace-nowrap"
                    >
                      + New
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPaySessionMode('existing')}
                      className="rounded-md border border-slate-700 bg-[#090d16] px-2.5 py-1 text-[11px] text-slate-300 hover:text-white hover:border-slate-600 transition-colors whitespace-nowrap"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {paySessionMode === 'existing' ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={foodSessionSearch}
                      onChange={(e) => setFoodSessionSearch(e.target.value)}
                      placeholder="Filter session ID, customer, or PC..."
                      className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                    <select
                      id="pay-session"
                      value={paySessionId}
                      onChange={(e) => applyPaymentSessionDefaults(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">Select a session...</option>
                      {sortedSessionsForDesk.map((s) => {
                        const custName = s.customers
                          ? `${s.customers.first_name} ${s.customers.last_name}`
                          : `Customer #${s.customer_id}`;
                        const pcNum = s.units?.pc_number || `PC-${s.pc_id}`;
                        const foodTotal = sessionFoodTotalMap.get(s.session_id) || 0;
                        const combined = (Number(s.price) || 0) + foodTotal;
                        return (
                          <option key={s.session_id} value={s.session_id}>
                            #{s.session_id} · {custName} · {pcNum} · ₱{combined.toFixed(2)} [{s.payment_status}]
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      aria-label="Customer for walk-in payment"
                      value={payWalkinCustId}
                      onChange={(e) => setPayWalkinCustId(e.target.value)}
                      className="rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    >
                      {customers.map((c) => (
                        <option key={c.customer_id} value={c.customer_id}>
                          #{c.customer_id} {c.first_name} {c.last_name}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="PC for walk-in payment"
                      value={payWalkinPcId}
                      onChange={(e) => setPayWalkinPcId(e.target.value)}
                      className="rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    >
                      {units.map((u) => (
                        <option key={u.pc_id} value={u.pc_id}>
                          {u.pc_number} ({u.status})
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Staff for walk-in payment"
                      value={payWalkinEmpId}
                      onChange={(e) => setPayWalkinEmpId(e.target.value)}
                      className="rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    >
                      {employees.map((emp) => (
                        <option key={emp.employee_id} value={emp.employee_id}>
                          {emp.first_name} {emp.last_name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={payWalkinPrice}
                      onChange={(e) => {
                        setPayWalkinPrice(e.target.value);
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) {
                          setPayGross(v.toFixed(2));
                          setPayExpenses((v * 0.35).toFixed(2));
                        }
                      }}
                      placeholder="Session Price (₱)"
                      className="rounded-lg border border-slate-800 bg-[#090d16] px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {selectedPaySession && (
                <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-800 bg-[#060a12] p-3 text-xs font-mono">
                  <div>
                    <span className="text-[11px] text-slate-500 block font-sans">PC Session Fee</span>
                    <span className="text-white font-semibold tabular-nums">
                      ₱{Number(selectedPaySession.price || 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block font-sans">Food &amp; Drinks Tab</span>
                    <span className="text-blue-400 font-semibold tabular-nums">
                      ₱{selectedPaySessionFood.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block font-sans">Combined Total</span>
                    <span className="text-emerald-400 font-bold tabular-nums">
                      ₱{(Number(selectedPaySession.price || 0) + selectedPaySessionFood).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="pay-method" className="text-xs font-medium text-slate-300 block">
                    Payment Method
                  </label>
                  <input
                    id="pay-method"
                    type="text"
                    list="pay-method-list"
                    value={payMethod}
                    onChange={(e) => {
                      setPayMethod(e.target.value);
                      const def = getDefaultProvider(e.target.value);
                      if (def) setPayProvider(def);
                    }}
                    placeholder="Cash, GCash, or type new"
                    className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="pay-provider" className="text-xs font-medium text-slate-300 block">
                    Provider Channel
                  </label>
                  <input
                    id="pay-provider"
                    type="text"
                    list="pay-provider-list"
                    value={payProvider}
                    onChange={(e) => setPayProvider(e.target.value)}
                    placeholder="Provider (or type new)"
                    className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="pay-date" className="text-xs font-medium text-slate-300 block">
                    Settlement Date
                  </label>
                  <input
                    id="pay-date"
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="pay-gross" className="text-xs font-medium text-slate-300 block">
                    Gross Income (₱)
                  </label>
                  <input
                    id="pay-gross"
                    type="number"
                    step="0.01"
                    min="0"
                    value={payGross}
                    onChange={(e) => setPayGross(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs font-mono text-white font-semibold focus:border-blue-500 focus:outline-none tabular-nums"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="pay-expenses" className="text-xs font-medium text-slate-300 block">
                    Operating Expenses (₱)
                  </label>
                  <input
                    id="pay-expenses"
                    type="number"
                    step="0.01"
                    min="0"
                    value={payExpenses}
                    onChange={(e) => setPayExpenses(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs font-mono text-rose-400 focus:border-blue-500 focus:outline-none tabular-nums"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-slate-400 block">Net Profit Preview</span>
                  <div className="rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs font-mono text-emerald-400 font-bold tabular-nums">
                    ₱{computedNetPreview.toFixed(2)}
                  </div>
                </div>
              </div>

                {payments.length > 0 && (
                  <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3.5 space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Recent Settled Payments
                    </div>
                    <div className="space-y-1.5">
                      {payments.slice(0, 3).map((p) => (
                        <div
                          key={`recent-pay-${p.payments_id}`}
                          className="flex items-center justify-between text-xs font-mono text-slate-300"
                        >
                          <span>
                            Pay #{p.payments_id} <span className="text-slate-500">·</span> Sess #{p.session_id}
                          </span>
                          <span className="text-blue-400 text-[11px]">
                            {p.payment_method} ({p.provider})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 mt-auto border-t border-slate-800/80">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={payReleasePc}
                    onChange={(e) => setPayReleasePc(e.target.checked)}
                    className="rounded border-slate-700 bg-[#060a12] text-blue-600 focus:ring-blue-500"
                  />
                  <span>Mark session Paid and set PC station back to &quot;Available&quot;</span>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>{submitting ? 'Recording...' : 'Record Payment'}</span>
                </button>
              </div>
            </form>
          )}

          {/* FORM 4: REGISTER NEW CUSTOMER */}
          {activeSection === 'customer' && (
            <form onSubmit={handleCreateCustomer} className="flex-1 flex flex-col justify-between gap-5">
              <div className="flex-1 flex flex-col justify-between gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">Register Customer Profile</h2>
                  <span className="text-xs font-mono text-slate-400">
                    {customers.length} patrons
                  </span>
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="cust-first" className="text-xs font-medium text-slate-300 block">
                    First Name
                  </label>
                  <input
                    id="cust-first"
                    type="text"
                    value={custFirstName}
                    onChange={(e) => setCustFirstName(e.target.value)}
                    placeholder="e.g. Marco"
                    className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="cust-last" className="text-xs font-medium text-slate-300 block">
                    Last Name
                  </label>
                  <input
                    id="cust-last"
                    type="text"
                    value={custLastName}
                    onChange={(e) => setCustLastName(e.target.value)}
                    placeholder="e.g. Villanueva"
                    className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="cust-phone" className="text-xs font-medium text-slate-300 block">
                    Phone Number
                  </label>
                  <input
                    id="cust-phone"
                    type="text"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="09XXXXXXXXX"
                    className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="cust-email" className="text-xs font-medium text-slate-300 block">
                    Email Address
                  </label>
                  <input
                    id="cust-email"
                    type="email"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    placeholder="patron@gmail.com"
                    className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="cust-tier" className="text-xs font-medium text-slate-300 block">
                    Membership Tier
                  </label>
                  <input
                    id="cust-tier"
                    type="text"
                    list="tier-list"
                    value={custMembership}
                    onChange={(e) => setCustMembership(e.target.value)}
                    placeholder="Select Regular/PRO/VIP or type a new tier"
                    className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

                {customers.length > 0 && (
                  <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3.5 space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Recently Added Patrons
                    </div>
                    <div className="space-y-1.5">
                      {customers.slice(0, 4).map((c) => (
                        <div
                          key={`recent-cust-${c.customer_id}`}
                          className="flex items-center justify-between text-xs text-slate-300"
                        >
                          <span className="truncate">
                            <span className="font-mono text-slate-500 mr-1.5">#{c.customer_id}</span>
                            {c.first_name} {c.last_name}
                          </span>
                          <span className="font-mono text-cyan-400 text-[11px] shrink-0">
                            {c.membership}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 mt-auto border-t border-slate-800/80">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>{submitting ? 'Saving...' : 'Register Customer'}</span>
                </button>
              </div>
            </form>
          )}

          {/* FORM 5: ADD NEW EMPLOYEE */}
          {activeSection === 'employee' && (
            <form onSubmit={handleCreateEmployee} className="flex-1 flex flex-col justify-between gap-5">
              <div className="flex-1 flex flex-col justify-between gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">Add Staff Member to Roster</h2>
                  <span className="text-xs font-mono text-slate-400">{employees.length} active staff</span>
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="emp-first" className="text-xs font-medium text-slate-300 block">
                    First Name
                  </label>
                  <input
                    id="emp-first"
                    type="text"
                    value={empFirstName}
                    onChange={(e) => setEmpFirstName(e.target.value)}
                    placeholder="e.g. Elena"
                    className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="emp-mi" className="text-xs font-medium text-slate-300 block">
                    Middle Initial
                  </label>
                  <input
                    id="emp-mi"
                    type="text"
                    maxLength={2}
                    value={empMiddleInitial}
                    onChange={(e) => setEmpMiddleInitial(e.target.value)}
                    placeholder="M"
                    className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="emp-last" className="text-xs font-medium text-slate-300 block">
                    Last Name
                  </label>
                  <input
                    id="emp-last"
                    type="text"
                    value={empLastName}
                    onChange={(e) => setEmpLastName(e.target.value)}
                    placeholder="e.g. Reyes"
                    className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="emp-dob" className="text-xs font-medium text-slate-300 block">
                    Birth Date
                  </label>
                  <input
                    id="emp-dob"
                    type="date"
                    value={empBirthDate}
                    onChange={(e) => setEmpBirthDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="emp-shift" className="text-xs font-medium text-slate-300 block">
                    Assigned Shift
                  </label>
                  <input
                    id="emp-shift"
                    type="text"
                    list="emp-shift-list"
                    value={empShift}
                    onChange={(e) => setEmpShift(e.target.value)}
                    placeholder="Morning, Night, or type new"
                    className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="emp-addr" className="text-xs font-medium text-slate-300 block">
                    Address
                  </label>
                  <input
                    id="emp-addr"
                    type="text"
                    value={empAddress}
                    onChange={(e) => setEmpAddress(e.target.value)}
                    placeholder="e.g. Brgy. 12, Cavite, Philippines"
                    className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

                {employees.length > 0 && (
                  <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3.5 space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Current Roster Coverage
                    </div>
                    <div className="space-y-1.5">
                      {employees.slice(0, 4).map((emp) => (
                        <div
                          key={`recent-emp-${emp.employee_id}`}
                          className="flex items-center justify-between text-xs text-slate-300"
                        >
                          <span className="truncate">
                            <span className="font-mono text-slate-500 mr-1.5">#{emp.employee_id}</span>
                            {emp.first_name} {emp.last_name}
                          </span>
                          <span className="font-mono text-indigo-400 text-[11px] shrink-0">
                            {emp.shifts} Shift
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 mt-auto border-t border-slate-800/80">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>{submitting ? 'Saving...' : 'Add Employee'}</span>
                </button>
              </div>
            </form>
          )}

          {/* FORM 6: PC UNIT, NEW MENU ITEM, OR RESTOCK */}
          {activeSection === 'catalog' && (
            <form onSubmit={handleCatalogSubmit} className="flex-1 flex flex-col justify-between gap-5">
              <div className="flex-1 flex flex-col justify-between gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">
                  PC Station &amp; Concession Inventory
                </h2>
                <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#060a12] p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setCatalogMode('unit')}
                    className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                      catalogMode === 'unit'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    New PC Unit
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogMode('product')}
                    className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                      catalogMode === 'product'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    New Menu Item
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogMode('restock')}
                    className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                      catalogMode === 'restock'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Restock Item
                  </button>
                </div>
              </div>

              {catalogMode === 'unit' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="unit-number" className="text-xs font-medium text-slate-300 block">
                      PC Number
                    </label>
                    <input
                      id="unit-number"
                      type="text"
                      value={unitNumber}
                      onChange={(e) => setUnitNumber(e.target.value)}
                      placeholder="PC-56"
                      className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="unit-type" className="text-xs font-medium text-slate-300 block">
                      Hardware Tier
                    </label>
                    <input
                      id="unit-type"
                      type="text"
                      list="unit-type-list"
                      value={unitType}
                      onChange={(e) => setUnitType(e.target.value)}
                      placeholder="Standard PC or type new"
                      className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="unit-location" className="text-xs font-medium text-slate-300 block">
                      Area Location
                    </label>
                    <input
                      id="unit-location"
                      type="text"
                      list="unit-loc-list"
                      value={unitLocation}
                      onChange={(e) => setUnitLocation(e.target.value)}
                      placeholder="Main Floor or type new"
                      className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="unit-status" className="text-xs font-medium text-slate-300 block">
                      Initial Status
                    </label>
                    <input
                      id="unit-status"
                      type="text"
                      list="unit-status-list"
                      value={unitStatus}
                      onChange={(e) => setUnitStatus(e.target.value)}
                      placeholder="Available or type custom"
                      className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              )}

              {catalogMode === 'product' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="prod-name" className="text-xs font-medium text-slate-300 block">
                      Product Name
                    </label>
                    <input
                      id="prod-name"
                      type="text"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      placeholder="e.g. Iced Caramel Macchiato"
                      className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="prod-cat" className="text-xs font-medium text-slate-300 block">
                      Category
                    </label>
                    <input
                      id="prod-cat"
                      type="text"
                      list="prod-cat-list"
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      placeholder="Snacks, Drinks, or type new"
                      className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="prod-price" className="text-xs font-medium text-slate-300 block">
                        Unit Price (₱)
                      </label>
                      <input
                        id="prod-price"
                        type="number"
                        step="0.01"
                        min="1"
                        value={prodPrice}
                        onChange={(e) => setProdPrice(e.target.value)}
                        className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs font-mono text-emerald-400 focus:border-blue-500 focus:outline-none tabular-nums"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="prod-stock" className="text-xs font-medium text-slate-300 block">
                        Initial Stock
                      </label>
                      <input
                        id="prod-stock"
                        type="number"
                        min="0"
                        value={prodStock}
                        onChange={(e) => setProdStock(e.target.value)}
                        className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none tabular-nums"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {catalogMode === 'restock' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="restock-prod" className="text-xs font-medium text-slate-300 block">
                      Select Concession Item
                    </label>
                    <select
                      id="restock-prod"
                      value={restockProductId}
                      onChange={(e) => setRestockProductId(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    >
                      {products.map((p) => (
                        <option key={p.product_id} value={p.product_id}>
                          {p.product_name} ({p.category}) — Current Stock: {p.stock_quantity}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="restock-qty" className="text-xs font-medium text-slate-300 block">
                      Units to Add
                    </label>
                    <input
                      id="restock-qty"
                      type="number"
                      min="1"
                      value={restockQty}
                      onChange={(e) => setRestockQty(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none tabular-nums"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-slate-400 block">Quick Restock</span>
                    <div className="flex gap-1.5">
                      {[10, 25, 50, 100].map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setRestockQty(String(q))}
                          className="px-2.5 py-2 rounded-md border border-slate-800 bg-[#060a12] text-xs font-mono text-slate-300 hover:text-white hover:border-slate-700"
                        >
                          +{q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

                <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-3.5 space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {catalogMode === 'unit' ? 'Latest PC Units' : 'Low Stock Concession Alerts'}
                  </div>
                  <div className="space-y-1.5">
                    {catalogMode === 'unit'
                      ? units.slice(0, 4).map((u) => (
                          <div
                            key={`recent-unit-${u.pc_id}`}
                            className="flex items-center justify-between text-xs text-slate-300"
                          >
                            <span className="truncate">
                              <span className="font-mono text-white font-semibold mr-1.5">{u.pc_number}</span>
                              {u.type} · {u.area_location}
                            </span>
                            <span className="font-mono text-slate-400 text-[11px] shrink-0">{u.status}</span>
                          </div>
                        ))
                      : (lowStockProducts.length > 0 ? lowStockProducts : products)
                          .slice(0, 4)
                          .map((p) => (
                            <div
                              key={`recent-prod-${p.product_id}`}
                              className="flex items-center justify-between text-xs text-slate-300"
                            >
                              <span className="truncate">
                                {p.product_name}{' '}
                                <span className="text-slate-500">({p.category})</span>
                              </span>
                              <span
                                className={`font-mono text-[11px] shrink-0 tabular-nums ${
                                  Number(p.stock_quantity) <= 30 ? 'text-amber-400' : 'text-emerald-400'
                                }`}
                              >
                                {p.stock_quantity} left
                              </span>
                            </div>
                          ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 mt-auto border-t border-slate-800/80">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <Package className="h-3.5 w-3.5" />
                  <span>
                    {submitting
                      ? 'Saving...'
                      : catalogMode === 'unit'
                      ? 'Add PC Unit'
                      : catalogMode === 'product'
                      ? 'Add Menu Item'
                      : 'Update Stock'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Column: Live Business-Day Floor & Bills Board (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-slate-800/80 bg-[#090d16] p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setBoardTab('floor')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  boardTab === 'floor'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                Open Bills &amp; Floor ({pendingSessions.length})
              </button>
              <button
                type="button"
                onClick={() => setBoardTab('recent')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  boardTab === 'recent'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                Recent Desk Log
              </button>
            </div>
            <button
              type="button"
              onClick={() => syncSilent()}
              className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              title="Refresh live floor data"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {boardTab === 'floor' ? (
            <div className="space-y-5">
              {/* Pending / Unpaid Sessions Queue */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Pending / Active Session Bills
                  </h3>
                  <span className="text-[11px] font-mono text-amber-400 tabular-nums">
                    ₱{pendingTotalBill.toFixed(2)} open
                  </span>
                </div>

                {pendingSessions.length === 0 ? (
                  <div className="rounded-lg border border-slate-800/80 bg-[#060a12] p-4 text-center text-xs text-slate-500">
                    All logged sessions are currently settled.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {pendingSessions.slice(0, 15).map((s) => {
                      const custName = s.customers
                        ? `${s.customers.first_name} ${s.customers.last_name}`
                        : `Customer #${s.customer_id}`;
                      const pcNum = s.units?.pc_number || `PC-${s.pc_id}`;
                      const foodAmt = sessionFoodTotalMap.get(s.session_id) || 0;
                      const combined = (Number(s.price) || 0) + (Number.isFinite(foodAmt) ? foodAmt : 0);

                      return (
                        <div
                          key={s.session_id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#060a12] px-3 py-2.5 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-blue-400 font-semibold">{pcNum}</span>
                              <span className="text-slate-200 font-medium truncate">{custName}</span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5 tabular-nums">
                              #{s.session_id} · {s.date} · ₱{combined.toFixed(2)}
                              {foodAmt > 0 ? ` (incl. ₱${foodAmt.toFixed(0)} F&B)` : ''}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => jumpToSessionFood(s.session_id)}
                              className="rounded-md border border-slate-700 bg-slate-800/70 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700 whitespace-nowrap"
                            >
                              + Food
                            </button>
                            <button
                              type="button"
                              onClick={() => jumpToSessionPayment(s.session_id)}
                              className="rounded-md bg-emerald-600/20 border border-emerald-500/40 px-2.5 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-600 hover:text-white transition-colors whitespace-nowrap"
                            >
                              Settle
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick PC Floor Control */}
              <div className="pt-3 border-t border-slate-800/80">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    PC Floor Control
                  </h3>
                  <div className="flex flex-wrap items-center gap-1 text-[11px]">
                    {['all', ...distinctUnitStatuses].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setFloorFilter(st)}
                        className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                          floorFilter === st
                            ? 'bg-blue-600/25 text-blue-300'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {st === 'all' ? 'All' : st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {filteredFloorUnits.map((u) => (
                    <div
                      key={u.pc_id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-800/80 bg-[#060a12] px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">{u.pc_number}</span>
                          <span className="text-[11px] text-slate-400 truncate">
                            {u.type} · {u.area_location}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {u.status === 'Available' && (
                          <button
                            type="button"
                            onClick={() => jumpToAssignPc(u.pc_id)}
                            className="rounded border border-blue-500/30 bg-blue-950/40 px-2 py-1 text-[10px] text-blue-300 hover:bg-blue-600 hover:text-white transition-colors whitespace-nowrap"
                          >
                            Assign
                          </button>
                        )}
                        <select
                          aria-label={`Status for ${u.pc_number}`}
                          value={u.status}
                          disabled={updatingUnitId === u.pc_id}
                          onChange={(e) => handleQuickUnitStatusChange(u.pc_id, e.target.value)}
                          className={`rounded border px-2 py-1 text-[11px] font-mono bg-[#090d16] focus:outline-none ${
                            u.status === 'Available'
                              ? 'border-emerald-500/40 text-emerald-400'
                              : u.status === 'In Use'
                              ? 'border-blue-500/40 text-blue-400'
                              : u.status === 'Maintenance'
                              ? 'border-amber-500/40 text-amber-400'
                              : 'border-slate-700 text-slate-300'
                          }`}
                        >
                          {distinctUnitStatuses.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Recent Desk Log */
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Latest Sessions
                </h3>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {sessions.slice(0, 8).map((s) => {
                    const cust = s.customers
                      ? `${s.customers.first_name} ${s.customers.last_name}`
                      : `Customer #${s.customer_id}`;
                    const pc = s.units?.pc_number || `PC-${s.pc_id}`;
                    return (
                      <div
                        key={s.session_id}
                        className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-[#060a12] px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-slate-400 mr-2">#{s.session_id}</span>
                          <span className="text-slate-200 font-medium">{cust}</span>
                          <span className="text-slate-500 ml-2 font-mono text-[11px]">{pc}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                          <span className="text-emerald-400 tabular-nums">
                            ₱{Number(s.price).toFixed(2)}
                          </span>
                          <span
                            className={
                              s.payment_status === 'Paid'
                                ? 'text-emerald-400'
                                : s.payment_status === 'Pending'
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }
                          >
                            {s.payment_status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Latest Payments &amp; Food Orders
                </h3>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {payments.slice(0, 6).map((p) => (
                    <div
                      key={p.payments_id}
                      className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-[#060a12] px-3 py-2 text-xs font-mono"
                    >
                      <div className="text-slate-300">
                        Pay #{p.payments_id} <span className="text-slate-500">·</span> Sess #
                        {p.session_id}
                      </div>
                      <div className="text-[11px] text-blue-400">
                        {p.payment_method} ({p.provider})
                      </div>
                    </div>
                  ))}
                  {sessionProducts.slice(0, 4).map((sp) => (
                    <div
                      key={`sp-${sp.session_product_id}`}
                      className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-[#060a12] px-3 py-2 text-xs"
                    >
                      <div className="text-slate-300 truncate">
                        {sp.quantity}x {sp.products?.product_name || `Item #${sp.product_id}`}{' '}
                        <span className="font-mono text-slate-500">(Sess #{sp.session_id})</span>
                      </div>
                      <span className="font-mono text-emerald-400 tabular-nums shrink-0">
                        ₱{Number(sp.subtotal).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
