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
} from './supabase';

/**
 * Inserts a record into Supabase, letting PostgreSQL assign serial/identity PKs when supported,
 * and gracefully retrying with maxId + 1 if the table requires an explicit PK or has a stale sequence.
 */
async function insertWithIdFallback<T extends Record<string, unknown>>(
  table: string,
  pkCol: string,
  payload: Record<string, unknown>,
  existingIds: number[]
): Promise<T> {
  const { data, error } = await supabase
    .from(table)
    .insert([payload])
    .select()
    .single();

  if (!error && data) {
    return data as T;
  }

  const msg = error?.message || 'Database insert error';
  const code = error?.code || '';
  const needsExplicitId =
    code === '23502' ||
    code === '23505' ||
    msg.toLowerCase().includes('null value') ||
    msg.toLowerCase().includes('duplicate key') ||
    msg.toLowerCase().includes('violates not-null');

  if (needsExplicitId) {
    const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    const retryPayload = { ...payload, [pkCol]: nextId };
    const { data: retryData, error: retryError } = await supabase
      .from(table)
      .insert([retryPayload])
      .select()
      .single();

    if (!retryError && retryData) {
      return retryData as T;
    }

    throw new Error(formatSupabaseWriteError(table, retryError?.message || msg));
  }

  throw new Error(formatSupabaseWriteError(table, msg));
}

function formatSupabaseWriteError(table: string, rawMessage: string): string {
  const lower = rawMessage.toLowerCase();
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return `Permission denied on "${table}". Ensure Supabase RLS policies allow inserts/updates for this table.`;
  }
  return `Failed to save to ${table}: ${rawMessage}`;
}

export interface CreateSessionInput {
  customer_id: number;
  pc_id: number;
  employee_id: number;
  date: string;
  session_start: string;
  session_end: string;
  price: number;
  payment_status: 'Pending' | 'Paid' | 'Cancelled' | string;
  updatePcStatus: boolean;
  // Optional immediate settlement when starting as Paid
  payment_method?: string;
  provider?: string;
  expenses?: number;
}

export async function createSessionRecord(
  input: CreateSessionInput,
  existing: {
    sessions: Session[];
    payments: Payment[];
    earnings: Earning[];
  }
): Promise<{ session: Session; payment?: Payment; earning?: Earning }> {
  const sessionIds = existing.sessions.map((s) => Number(s.session_id) || 0);
  const createdSession = await insertWithIdFallback<Session & Record<string, unknown>>(
    'sessions',
    'session_id',
    {
      customer_id: input.customer_id,
      pc_id: input.pc_id,
      employee_id: input.employee_id,
      date: input.date,
      session_start: input.session_start,
      session_end: input.session_end,
      price: Number(input.price.toFixed(2)),
      payment_status: input.payment_status,
    },
    sessionIds
  );

  if (input.updatePcStatus) {
    const targetUnitStatus = input.payment_status === 'Pending' ? 'In Use' : 'Available';
    const { error: unitErr } = await supabase
      .from('units')
      .update({ status: targetUnitStatus })
      .eq('pc_id', input.pc_id);

    if (unitErr) {
      throw new Error(formatSupabaseWriteError('units', unitErr.message));
    }
  }

  if (input.payment_status === 'Paid' && input.payment_method && input.provider) {
    const paymentIds = existing.payments.map((p) => Number(p.payments_id) || 0);
    const createdPayment = await insertWithIdFallback<Payment & Record<string, unknown>>(
      'payments',
      'payments_id',
      {
        session_id: createdSession.session_id,
        payment_method: input.payment_method,
        provider: input.provider,
        date: input.session_start,
      },
      paymentIds
    );

    const gross = Number(input.price.toFixed(2));
    const expenses =
      typeof input.expenses === 'number'
        ? Number(input.expenses.toFixed(2))
        : Number((gross * 0.35).toFixed(2));
    const netProfit = Number((gross - expenses).toFixed(2));

    const earningIds = existing.earnings.map((e) => Number(e.earnings_id) || 0);
    const createdEarning = await insertWithIdFallback<Earning & Record<string, unknown>>(
      'earnings',
      'earnings_id',
      {
        payment_id: createdPayment.payments_id,
        date: input.date,
        gross_income: gross,
        expenses,
        net_profit: netProfit,
      },
      earningIds
    );

    return {
      session: createdSession as Session,
      payment: createdPayment as Payment,
      earning: createdEarning as Earning,
    };
  }

  return { session: createdSession as Session };
}

export interface AddSessionFoodInput {
  session_id: number;
  product_id: number;
  quantity: number;
  subtotal: number;
  currentStock: number;
}

export async function createSessionFoodOrder(
  input: AddSessionFoodInput,
  existingSessionProducts: SessionProduct[]
): Promise<SessionProduct> {
  const existingIds = existingSessionProducts.map((sp) => Number(sp.session_product_id) || 0);
  const created = await insertWithIdFallback<SessionProduct & Record<string, unknown>>(
    'session_products',
    'session_product_id',
    {
      session_id: input.session_id,
      product_id: input.product_id,
      quantity: input.quantity,
      subtotal: Number(input.subtotal.toFixed(2)),
    },
    existingIds
  );

  const nextStock = Math.max(0, input.currentStock - input.quantity);
  const { error: stockErr } = await supabase
    .from('products')
    .update({ stock_quantity: nextStock })
    .eq('product_id', input.product_id);

  if (stockErr) {
    throw new Error(formatSupabaseWriteError('products', stockErr.message));
  }

  return created as SessionProduct;
}

export interface RecordPaymentInput {
  session_id: number;
  pc_id?: number;
  payment_method: string;
  provider: string;
  timestamp: string; // ISO datetime for payments.date
  ledgerDate: string; // YYYY-MM-DD for earnings.date
  gross_income: number;
  expenses: number;
  releasePc: boolean;
}

export async function recordSessionPaymentAndEarning(
  input: RecordPaymentInput,
  existing: {
    payments: Payment[];
    earnings: Earning[];
  }
): Promise<{ payment: Payment; earning: Earning }> {
  const paymentIds = existing.payments.map((p) => Number(p.payments_id) || 0);
  const createdPayment = await insertWithIdFallback<Payment & Record<string, unknown>>(
    'payments',
    'payments_id',
    {
      session_id: input.session_id,
      payment_method: input.payment_method,
      provider: input.provider,
      date: input.timestamp,
    },
    paymentIds
  );

  const gross = Number(input.gross_income.toFixed(2));
  const expenses = Number(input.expenses.toFixed(2));
  const netProfit = Number((gross - expenses).toFixed(2));

  const earningIds = existing.earnings.map((e) => Number(e.earnings_id) || 0);
  const createdEarning = await insertWithIdFallback<Earning & Record<string, unknown>>(
    'earnings',
    'earnings_id',
    {
      payment_id: createdPayment.payments_id,
      date: input.ledgerDate,
      gross_income: gross,
      expenses,
      net_profit: netProfit,
    },
    earningIds
  );

  const { error: sessErr } = await supabase
    .from('sessions')
    .update({ payment_status: 'Paid' })
    .eq('session_id', input.session_id);

  if (sessErr) {
    throw new Error(formatSupabaseWriteError('sessions', sessErr.message));
  }

  if (input.releasePc && input.pc_id) {
    const { error: unitErr } = await supabase
      .from('units')
      .update({ status: 'Available' })
      .eq('pc_id', input.pc_id);

    if (unitErr) {
      throw new Error(formatSupabaseWriteError('units', unitErr.message));
    }
  }

  return {
    payment: createdPayment as Payment,
    earning: createdEarning as Earning,
  };
}

export interface CreateCustomerInput {
  first_name: string;
  last_name: string;
  phone_number: string;
  email_address: string;
  membership: string;
}

export async function createCustomerRecord(
  input: CreateCustomerInput,
  existingCustomers: Customer[]
): Promise<Customer> {
  const existingIds = existingCustomers.map((c) => Number(c.customer_id) || 0);
  const created = await insertWithIdFallback<Customer & Record<string, unknown>>(
    'customers',
    'customer_id',
    {
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      phone_number: input.phone_number.trim(),
      email_address: input.email_address.trim(),
      membership: input.membership,
    },
    existingIds
  );
  return created as Customer;
}

export interface CreateEmployeeInput {
  first_name: string;
  middle_initial: string;
  last_name: string;
  birth_date: string;
  address: string;
  shifts: string;
}

export async function createEmployeeRecord(
  input: CreateEmployeeInput,
  existingEmployees: Employee[]
): Promise<Employee> {
  const existingIds = existingEmployees.map((e) => Number(e.employee_id) || 0);
  const created = await insertWithIdFallback<Employee & Record<string, unknown>>(
    'employees',
    'employee_id',
    {
      first_name: input.first_name.trim(),
      middle_initial: input.middle_initial.trim().toUpperCase().slice(0, 2),
      last_name: input.last_name.trim(),
      birth_date: input.birth_date,
      address: input.address.trim(),
      shifts: input.shifts,
    },
    existingIds
  );
  return created as Employee;
}

export interface CreateUnitInput {
  pc_number: string;
  type: string;
  status: string;
  area_location: string;
}

export async function createUnitRecord(
  input: CreateUnitInput,
  existingUnits: Unit[]
): Promise<Unit> {
  const existingIds = existingUnits.map((u) => Number(u.pc_id) || 0);
  const created = await insertWithIdFallback<Unit & Record<string, unknown>>(
    'units',
    'pc_id',
    {
      pc_number: input.pc_number.trim().toUpperCase(),
      type: input.type,
      status: input.status,
      area_location: input.area_location,
    },
    existingIds
  );
  return created as Unit;
}

export async function updateUnitStatusRecord(pcId: number, status: string): Promise<void> {
  const { error } = await supabase.from('units').update({ status }).eq('pc_id', pcId);
  if (error) {
    throw new Error(formatSupabaseWriteError('units', error.message));
  }
}

export interface CreateProductInput {
  product_name: string;
  category: string;
  unit_price: number;
  stock_quantity: number;
}

export async function createProductRecord(
  input: CreateProductInput,
  existingProducts: Product[]
): Promise<Product> {
  const existingIds = existingProducts.map((p) => Number(p.product_id) || 0);
  const created = await insertWithIdFallback<Product & Record<string, unknown>>(
    'products',
    'product_id',
    {
      product_name: input.product_name.trim(),
      category: input.category,
      unit_price: Number(input.unit_price.toFixed(2)),
      stock_quantity: Math.max(0, Math.round(input.stock_quantity)),
    },
    existingIds
  );
  return created as Product;
}

export async function restockProductRecord(
  productId: number,
  currentStock: number,
  addedQty: number
): Promise<void> {
  const nextStock = Math.max(0, currentStock + addedQty);
  const { error } = await supabase
    .from('products')
    .update({ stock_quantity: nextStock })
    .eq('product_id', productId);
  if (error) {
    throw new Error(formatSupabaseWriteError('products', error.message));
  }
}
