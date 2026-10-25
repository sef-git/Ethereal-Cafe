import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://hvtkxwzxjuoeewalptmq.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2dGt4d3p4anVvZWV3YWxwdG1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNjE4NTMsImV4cCI6MjEwNTgzNzg1M30.DVn4CeI1MIO4lH6qfEMYKZd8JkpRb5bHT0pNOKnqp7A';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Domain TypeScript Types matching Ethereal Cafe Supabase Schema (ERD)
export interface Customer {
  customer_id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  email_address: string;
  membership: string; // e.g. "PRO", "VIP", "Regular"
}

export interface Employee {
  employee_id: number;
  first_name: string;
  last_name: string;
  middle_initial: string;
  birth_date: string;
  address: string;
  shifts: string; // e.g. "Morning", "Night", "Afternoon"
}

export interface Unit {
  pc_id: number;
  pc_number: string;
  type: string; // "Standard PC", "VIP Gaming PC", etc.
  status: 'Available' | 'In Use' | 'Maintenance' | string;
  area_location: string; // "Main Floor", "VIP Lounge", "Streamer Booth"
}

export interface Product {
  product_id: number;
  product_name: string;
  category: string; // "Snacks", "Drinks", "Peripherals"
  unit_price: number;
  stock_quantity: number;
}

export interface Session {
  session_id: number;
  customer_id: number;
  pc_id: number;
  employee_id: number;
  date: string;
  session_start: string;
  session_end: string;
  price: number;
  payment_status: 'Paid' | 'Pending' | 'Unpaid' | string;
  // Joined relation fields
  customers?: Customer;
  units?: Unit;
  employees?: Employee;
}

export interface SessionProduct {
  session_product_id: number;
  session_id: number;
  product_id: number;
  quantity: number;
  subtotal: number;
  products?: Product;
}

export interface Payment {
  payments_id: number;
  session_id: number;
  payment_method: string;
  provider: string;
  date: string;
}

export interface Earning {
  earnings_id: number;
  payment_id: number;
  date: string;
  gross_income: number;
  expenses: number;
  net_profit: number;
  payments?: Payment;
}
