import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  supabase,
  Customer,
  Employee,
  Unit,
  Product,
  Session,
  SessionProduct,
  Payment,
  Earning,
} from '../lib/supabase';
import { computeClientAnalytics, PythonAnalyticsData } from '../lib/analyticsEngine';

export type { PythonAnalyticsData };

const PAGE_SIZE = 1000;
const AUTO_SYNC_INTERVAL_MS = 30000;

// Calculate dynamic connection latency persisting between 1000ms and 3000ms (1 to 3 seconds)
export const calculateConnectionDelay = (): number => {
  if (typeof navigator === 'undefined') return 1500;

  let delay = 1200; // Baseline on standard 4G/broadband connection (~1.2s)

  const nav = navigator as unknown as {
    connection?: {
      effectiveType?: string;
      rtt?: number;
      downlink?: number;
    };
    mozConnection?: {
      effectiveType?: string;
      rtt?: number;
      downlink?: number;
    };
    webkitConnection?: {
      effectiveType?: string;
      rtt?: number;
      downlink?: number;
    };
  };

  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

  if (conn) {
    if (conn.effectiveType === 'slow-2g') {
      delay = 2950;
    } else if (conn.effectiveType === '2g') {
      delay = 2650;
    } else if (conn.effectiveType === '3g') {
      delay = 2000;
    } else if (conn.effectiveType === '4g') {
      delay = 1200;
    }

    if (typeof conn.rtt === 'number') {
      const rttScaled = 1000 + Math.min(2000, conn.rtt * 2.5);
      delay = Math.max(delay, rttScaled);
    }

    if (typeof conn.downlink === 'number' && conn.downlink > 0) {
      if (conn.downlink < 0.5) {
        delay = Math.max(delay, 2850);
      } else if (conn.downlink < 1.5) {
        delay = Math.max(delay, 2200);
      } else if (conn.downlink < 5.0) {
        delay = Math.max(delay, 1600);
      }
    }
  }

  return Math.min(3000, Math.max(1000, Math.round(delay)));
};

/**
 * Paginated Supabase table fetcher that bypasses PostgREST's 1,000-row per-request cap
 * so every added or updated record across large tables is fetched completely.
 */
async function fetchAllFromTable<T>(
  label: string,
  buildQuery: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const allRows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await buildQuery(from, to);
    if (error) {
      throw new Error(`${label}: ${error.message}`);
    }
    if (!data || data.length === 0) {
      break;
    }
    allRows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return allRows;
}

interface CafeDataContextType {
  customers: Customer[];
  employees: Employee[];
  units: Unit[];
  products: Product[];
  sessions: Session[];
  sessionProducts: SessionProduct[];
  payments: Payment[];
  earnings: Earning[];
  pythonAnalytics: PythonAnalyticsData | null;
  loading: boolean;
  pythonLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  syncSilent: () => Promise<void>;
  refreshPythonAnalytics: () => Promise<void>;
}

const CafeDataContext = createContext<CafeDataContextType | undefined>(undefined);

export const CafeDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionProducts, setSessionProducts] = useState<SessionProduct[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [pythonAnalytics, setPythonAnalytics] = useState<PythonAnalyticsData | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [pythonLoading, setPythonLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isSyncingRef = useRef<boolean>(false);
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPythonAnalytics = useCallback(async (forceRefresh = false) => {
    const isBackendHost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.includes('run.app'));

    if (!isBackendHost) {
      return;
    }

    try {
      setPythonLoading(true);
      const query = forceRefresh
        ? `/api/python-analytics?action=all&refresh=true&t=${Date.now()}`
        : `/api/python-analytics?action=all&t=${Date.now()}`;
      const res = await fetch(query);
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error && !data.fallback) {
          setPythonAnalytics(data);
        }
      }
    } catch {
      // Quietly maintain live computed analytics when backend is unreachable
    } finally {
      setPythonLoading(false);
    }
  }, []);

  const fetchAllDatasets = useCallback(async () => {
    const [
      custData,
      empData,
      unitsData,
      prodData,
      sessData,
      sessProdData,
      payData,
      earnData,
    ] = await Promise.all([
      fetchAllFromTable<Customer>('Customers', (from, to) =>
        supabase
          .from('customers')
          .select('*')
          .order('customer_id', { ascending: true })
          .range(from, to)
      ),
      fetchAllFromTable<Employee>('Employees', (from, to) =>
        supabase
          .from('employees')
          .select('*')
          .order('employee_id', { ascending: true })
          .range(from, to)
      ),
      fetchAllFromTable<Unit>('Units', (from, to) =>
        supabase
          .from('units')
          .select('*')
          .order('pc_id', { ascending: true })
          .range(from, to)
      ),
      fetchAllFromTable<Product>('Products', (from, to) =>
        supabase
          .from('products')
          .select('*')
          .order('product_id', { ascending: true })
          .range(from, to)
      ),
      fetchAllFromTable<Session>('Sessions', (from, to) =>
        supabase
          .from('sessions')
          .select('*, customers(*), units(*), employees(*)')
          .order('date', { ascending: false })
          .order('session_id', { ascending: false })
          .range(from, to)
      ),
      fetchAllFromTable<SessionProduct>('Session Products', (from, to) =>
        supabase
          .from('session_products')
          .select('*, products(*), sessions(*, units(*), customers(*))')
          .order('session_product_id', { ascending: false })
          .range(from, to)
      ),
      fetchAllFromTable<Payment>('Payments', (from, to) =>
        supabase
          .from('payments')
          .select('*')
          .order('date', { ascending: false })
          .order('payments_id', { ascending: false })
          .range(from, to)
      ),
      fetchAllFromTable<Earning>('Earnings', (from, to) =>
        supabase
          .from('earnings')
          .select('*, payments(*)')
          .order('date', { ascending: false })
          .order('earnings_id', { ascending: false })
          .range(from, to)
      ),
    ]);

    return {
      custData,
      empData,
      unitsData,
      prodData,
      sessData,
      sessProdData,
      payData,
      earnData,
    };
  }, []);

  const applyFetchedDatasets = useCallback(
    (datasets: Awaited<ReturnType<typeof fetchAllDatasets>>, forcePythonRefresh = false) => {
      const {
        custData,
        empData,
        unitsData,
        prodData,
        sessData,
        sessProdData,
        payData,
        earnData,
      } = datasets;

      setCustomers(custData);
      setEmployees(empData);
      setUnits(unitsData);
      setProducts(prodData);
      setSessions(sessData);
      setSessionProducts(sessProdData);
      setPayments(payData);
      setEarnings(earnData);

      // Recompute live analytics immediately from full Supabase datasets
      const localAnalytics = computeClientAnalytics(sessData, unitsData, earnData, custData);
      setPythonAnalytics(localAnalytics);

      // Background sync with Python 3 backend
      fetchPythonAnalytics(forcePythonRefresh);
    },
    [fetchPythonAnalytics]
  );

  // Full refresh with buffering state (used on mount, manual sync button, and reconnect)
  const refreshData = useCallback(async () => {
    try {
      isSyncingRef.current = true;
      setLoading(true);
      setError(null);

      const connDelay = calculateConnectionDelay();

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await new Promise((resolve) => setTimeout(resolve, connDelay));
        throw new Error('Offline: No internet connection detected.');
      }

      const [datasets] = await Promise.all([
        fetchAllDatasets(),
        new Promise((resolve) => setTimeout(resolve, connDelay)),
      ]);

      applyFetchedDatasets(datasets, true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error connecting to Supabase';
      setError(msg);
      console.error('Supabase fetch failed:', err);
    } finally {
      isSyncingRef.current = false;
      setLoading(false);
    }
  }, [fetchAllDatasets, applyFetchedDatasets]);

  // Silent background live sync (used by Realtime subscription, tab focus, and polling)
  const silentRefresh = useCallback(async () => {
    if (isSyncingRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    try {
      isSyncingRef.current = true;
      const datasets = await fetchAllDatasets();
      setError(null);
      applyFetchedDatasets(datasets, true);
    } catch (err: unknown) {
      console.warn('Background Supabase live sync skipped:', err);
    } finally {
      isSyncingRef.current = false;
    }
  }, [fetchAllDatasets, applyFetchedDatasets]);

  // Initial mount fetch
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Live Supabase Realtime listener + visibility focus sync + periodic poll fallback
  useEffect(() => {
    const scheduleSilentSync = () => {
      if (realtimeDebounceRef.current) {
        clearTimeout(realtimeDebounceRef.current);
      }
      realtimeDebounceRef.current = setTimeout(() => {
        silentRefresh();
      }, 600);
    };

    const watchedTables = [
      'customers',
      'employees',
      'units',
      'products',
      'sessions',
      'session_products',
      'payments',
      'earnings',
    ];

    let channel = supabase.channel('ethereal-cafe-live-sync');
    watchedTables.forEach((table) => {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        scheduleSilentSync
      );
    });
    channel.subscribe();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        silentRefresh();
      }
    };

    const handleFocus = () => {
      silentRefresh();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    const pollTimer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        silentRefresh();
      }
    }, AUTO_SYNC_INTERVAL_MS);

    return () => {
      if (realtimeDebounceRef.current) {
        clearTimeout(realtimeDebounceRef.current);
      }
      clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      supabase.removeChannel(channel);
    };
  }, [silentRefresh]);

  const handleRefreshPythonAnalytics = useCallback(async () => {
    await fetchPythonAnalytics(true);
  }, [fetchPythonAnalytics]);

  return (
    <CafeDataContext.Provider
      value={{
        customers,
        employees,
        units,
        products,
        sessions,
        sessionProducts,
        payments,
        earnings,
        pythonAnalytics,
        loading,
        pythonLoading,
        error,
        refreshData,
        syncSilent: silentRefresh,
        refreshPythonAnalytics: handleRefreshPythonAnalytics,
      }}
    >
      {children}
    </CafeDataContext.Provider>
  );
};

export const useCafeData = () => {
  const context = useContext(CafeDataContext);
  if (!context) {
    throw new Error('useCafeData must be used within a CafeDataProvider');
  }
  return context;
};
