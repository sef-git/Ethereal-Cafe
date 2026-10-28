import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
      // Map RTT (e.g. 30ms -> ~1100ms, 250ms -> ~1700ms, 600ms+ -> ~2800ms)
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

  // Strictly clamp between 1000ms and 3000ms (1 to 3 seconds)
  return Math.min(3000, Math.max(1000, Math.round(delay)));
};

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

  const fetchPythonAnalytics = useCallback(async () => {
    // Only query backend API if running on a host that serves Node /api routes (localhost or Cloud Run dev app)
    const isBackendHost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.includes('run.app'));

    if (!isBackendHost) {
      // On static or external domains (e.g. ethereal-cafe.ai.studio),
      // statistical models are computed live from Supabase directly in memory.
      return;
    }

    try {
      setPythonLoading(true);
      const res = await fetch('/api/python-analytics?action=all');
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

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const connDelay = calculateConnectionDelay();

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        // Persist connecting/buffering attempt for 1 to 3 seconds based on connection before showing error
        await new Promise((resolve) => setTimeout(resolve, connDelay));
        throw new Error('Offline: No internet connection detected.');
      }

      // Fetch from Supabase tables concurrently with connection delay persisting between 1 to 3 seconds
      const [
        custRes,
        empRes,
        unitsRes,
        prodRes,
        sessRes,
        sessProdRes,
        payRes,
        earnRes,
      ] = await Promise.all([
        supabase.from('customers').select('*').order('customer_id', { ascending: true }),
        supabase.from('employees').select('*').order('employee_id', { ascending: true }),
        supabase.from('units').select('*').order('pc_id', { ascending: true }),
        supabase.from('products').select('*').order('product_id', { ascending: true }),
        supabase
          .from('sessions')
          .select('*, customers(*), units(*), employees(*)')
          .order('date', { ascending: false })
          .limit(1500),
        supabase
          .from('session_products')
          .select('*, products(*), sessions(*, units(*), customers(*))')
          .limit(1000),
        supabase.from('payments').select('*').order('date', { ascending: false }).limit(1000),
        supabase.from('earnings').select('*, payments(*)').order('date', { ascending: false }).limit(500),
        new Promise((resolve) => setTimeout(resolve, connDelay)),
      ]);

      if (custRes.error) throw new Error(`Customers: ${custRes.error.message}`);
      if (empRes.error) throw new Error(`Employees: ${empRes.error.message}`);
      if (unitsRes.error) throw new Error(`Units: ${unitsRes.error.message}`);
      if (prodRes.error) throw new Error(`Products: ${prodRes.error.message}`);
      if (sessRes.error) throw new Error(`Sessions: ${sessRes.error.message}`);
      if (sessProdRes.error) throw new Error(`Session Products: ${sessProdRes.error.message}`);
      if (payRes.error) throw new Error(`Payments: ${payRes.error.message}`);
      if (earnRes.error) throw new Error(`Earnings: ${earnRes.error.message}`);

      const custData = (custRes.data as Customer[]) || [];
      const empData = (empRes.data as Employee[]) || [];
      const unitsData = (unitsRes.data as Unit[]) || [];
      const prodData = (prodRes.data as Product[]) || [];
      const sessData = (sessRes.data as Session[]) || [];
      const sessProdData = (sessProdRes.data as SessionProduct[]) || [];
      const payData = (payRes.data as Payment[]) || [];
      const earnData = (earnRes.data as Earning[]) || [];

      setCustomers(custData);
      setEmployees(empData);
      setUnits(unitsData);
      setProducts(prodData);
      setSessions(sessData);
      setSessionProducts(sessProdData);
      setPayments(payData);
      setEarnings(earnData);

      // Pre-compute analytics immediately from live Supabase data
      // Guarantees that opening the site at any URL never has missing data
      const localAnalytics = computeClientAnalytics(sessData, unitsData, earnData, custData);
      setPythonAnalytics(localAnalytics);

      // Background sync with Python 3 backend if hosted together
      fetchPythonAnalytics();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error connecting to Supabase';
      setError(msg);
      console.error('Supabase fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchPythonAnalytics]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

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
        refreshPythonAnalytics: fetchPythonAnalytics,
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
