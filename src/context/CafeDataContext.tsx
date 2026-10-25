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

interface PythonAnalyticsData {
  hourly?: {
    total_sessions_analyzed: number;
    peak_hour: string;
    peak_session_count: number;
    avg_duration_minutes: number;
    median_duration_minutes: number;
    stdev_duration_minutes: number;
    heatmap: Array<{ hour: string; sessions: number; revenue: number }>;
  };
  units?: {
    units_count: number;
    avg_revenue_per_pc: number;
    top_pc: string;
    top_pc_revenue: number;
    units: Array<{
      pc_id: number;
      pc_number: string;
      type: string;
      status: string;
      area_location: string;
      total_sessions: number;
      total_revenue: number;
      total_hours: number;
      utilization_index: number;
    }>;
  };
  forecast?: {
    sample_points: number;
    total_gross_income: number;
    total_net_profit: number;
    net_profit_margin_pct: number;
    revenue_growth_slope: number;
    trend_direction: string;
    historical_series: Array<{ date: string; gross: number; expenses: number; profit: number }>;
    forecast_next_7_days: Array<{ date: string; projected_gross: number; projected_net_profit: number }>;
  };
  rfm?: {
    total_customers: number;
    segment_distribution: Record<string, number>;
    top_10_customers: Array<{
      customer_id: number;
      name: string;
      membership: string;
      sessions_count: number;
      total_spend: number;
      latest_visit: string | null;
      segment: string;
    }>;
  };
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
    try {
      setPythonLoading(true);
      const res = await fetch('/api/python-analytics?action=all');
      if (!res.ok) throw new Error(`Python API status: ${res.status}`);
      const data = await res.json();
      setPythonAnalytics(data);
    } catch (err: unknown) {
      console.warn('Python analytics fetch error:', err);
    } finally {
      setPythonLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch from Supabase tables concurrently
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
        supabase.from('session_products').select('*, products(*)').limit(1000),
        supabase.from('payments').select('*').order('date', { ascending: false }).limit(1000),
        supabase.from('earnings').select('*, payments(*)').order('date', { ascending: false }).limit(500),
      ]);

      if (custRes.error) throw new Error(`Customers: ${custRes.error.message}`);
      if (empRes.error) throw new Error(`Employees: ${empRes.error.message}`);
      if (unitsRes.error) throw new Error(`Units: ${unitsRes.error.message}`);
      if (prodRes.error) throw new Error(`Products: ${prodRes.error.message}`);
      if (sessRes.error) throw new Error(`Sessions: ${sessRes.error.message}`);
      if (sessProdRes.error) throw new Error(`Session Products: ${sessProdRes.error.message}`);
      if (payRes.error) throw new Error(`Payments: ${payRes.error.message}`);
      if (earnRes.error) throw new Error(`Earnings: ${earnRes.error.message}`);

      setCustomers((custRes.data as Customer[]) || []);
      setEmployees((empRes.data as Employee[]) || []);
      setUnits((unitsRes.data as Unit[]) || []);
      setProducts((prodRes.data as Product[]) || []);
      setSessions((sessRes.data as Session[]) || []);
      setSessionProducts((sessProdRes.data as SessionProduct[]) || []);
      setPayments((payRes.data as Payment[]) || []);
      setEarnings((earnRes.data as Earning[]) || []);

      // Trigger Python analytics in parallel
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
