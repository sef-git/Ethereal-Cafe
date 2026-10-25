import React, { useState } from 'react';
import { Database, Table, Key, Link2, ExternalLink, CheckCircle } from 'lucide-react';
import { useCafeData } from '../../context/CafeDataContext';

interface TableDefinition {
  name: string;
  countKey: string;
  description: string;
  columns: Array<{ name: string; type: string; isPk?: boolean; isFk?: boolean; ref?: string }>;
}

const SCHEMA_DEFINITIONS: TableDefinition[] = [
  {
    name: 'customers',
    countKey: 'customers',
    description: 'Registered cafe patrons with contact details and membership tiers.',
    columns: [
      { name: 'customer_id', type: 'int4', isPk: true },
      { name: 'first_name', type: 'varchar' },
      { name: 'last_name', type: 'varchar' },
      { name: 'phone_number', type: 'varchar' },
      { name: 'email_address', type: 'varchar' },
      { name: 'membership', type: 'varchar' },
    ],
  },
  {
    name: 'employees',
    countKey: 'employees',
    description: 'Staff members managing front desk, cafe bar, and floor operations.',
    columns: [
      { name: 'employee_id', type: 'int4', isPk: true },
      { name: 'first_name', type: 'varchar' },
      { name: 'last_name', type: 'varchar' },
      { name: 'middle_initial', type: 'bpchar' },
      { name: 'birth_date', type: 'date' },
      { name: 'address', type: 'text' },
      { name: 'shifts', type: 'varchar' },
    ],
  },
  {
    name: 'units',
    countKey: 'units',
    description: 'Hardware gaming stations, streaming booths, and esports rigs.',
    columns: [
      { name: 'pc_id', type: 'int4', isPk: true },
      { name: 'pc_number', type: 'varchar' },
      { name: 'type', type: 'varchar' },
      { name: 'status', type: 'varchar' },
      { name: 'area_location', type: 'varchar' },
    ],
  },
  {
    name: 'products',
    countKey: 'products',
    description: 'Snack, beverage, and merchandise catalog inventory.',
    columns: [
      { name: 'product_id', type: 'int4', isPk: true },
      { name: 'product_name', type: 'varchar' },
      { name: 'category', type: 'varchar' },
      { name: 'unit_price', type: 'numeric' },
      { name: 'stock_quantity', type: 'int4' },
    ],
  },
  {
    name: 'sessions',
    countKey: 'sessions',
    description: 'Core junction logging PC time, patron, staff supervisor, and billing.',
    columns: [
      { name: 'session_id', type: 'int4', isPk: true },
      { name: 'customer_id', type: 'int4', isFk: true, ref: 'customers.customer_id' },
      { name: 'pc_id', type: 'int4', isFk: true, ref: 'units.pc_id' },
      { name: 'employee_id', type: 'int4', isFk: true, ref: 'employees.employee_id' },
      { name: 'date', type: 'date' },
      { name: 'session_start', type: 'timestamp' },
      { name: 'session_end', type: 'timestamp' },
      { name: 'price', type: 'numeric' },
      { name: 'payment_status', type: 'varchar' },
    ],
  },
  {
    name: 'session_products',
    countKey: 'sessionProducts',
    description: 'Line items linking concessions ordered to active sessions.',
    columns: [
      { name: 'session_product_id', type: 'int4', isPk: true },
      { name: 'session_id', type: 'int4', isFk: true, ref: 'sessions.session_id' },
      { name: 'product_id', type: 'int4', isFk: true, ref: 'products.product_id' },
      { name: 'quantity', type: 'int4' },
      { name: 'subtotal', type: 'numeric' },
    ],
  },
  {
    name: 'payments',
    countKey: 'payments',
    description: 'Payment transactions logged against completed gaming sessions.',
    columns: [
      { name: 'payments_id', type: 'int4', isPk: true },
      { name: 'session_id', type: 'int4', isFk: true, ref: 'sessions.session_id' },
      { name: 'payment_method', type: 'varchar' },
      { name: 'provider', type: 'varchar' },
      { name: 'date', type: 'timestamp' },
    ],
  },
  {
    name: 'earnings',
    countKey: 'earnings',
    description: 'Financial ledger recording gross revenue, expenses, and net profit.',
    columns: [
      { name: 'earnings_id', type: 'int4', isPk: true },
      { name: 'payment_id', type: 'int4', isFk: true, ref: 'payments.payments_id' },
      { name: 'date', type: 'date' },
      { name: 'gross_income', type: 'numeric' },
      { name: 'expenses', type: 'numeric' },
      { name: 'net_profit', type: 'numeric' },
    ],
  },
];

export const ErdSchemaTab: React.FC = () => {
  const data = useCafeData();
  const [selectedTable, setSelectedTable] = useState<string>('sessions');

  const getCount = (key: string) => {
    // @ts-expect-error dynamic access
    const arr = data[key];
    return Array.isArray(arr) ? arr.length : 0;
  };

  const currentDef = SCHEMA_DEFINITIONS.find((t) => t.name === selectedTable);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Ethereal Cafe Relational ERD Architecture
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Entity Relationship Diagram and schema blueprints powering the live Supabase database.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <span className="text-blue-400">8 Relational Tables</span>
          <span className="text-slate-600">·</span>
          <span>PostgreSQL 15</span>
        </div>
      </div>

      {/* Embedded ERD Image Asset */}
      <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Original ERD System Diagram</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Source schema: CS1-Elec Entity Relationship Model for Ethereal Cafe
            </p>
          </div>
          <span className="font-mono text-xs px-2 py-0.5 rounded border border-blue-500/30 bg-blue-950/40 text-blue-300">
            Verified Blueprint
          </span>
        </div>

        <div className="relative rounded-lg border border-slate-800 bg-[#04060c] p-2 overflow-hidden flex items-center justify-center">
          <img
            src="/assets/aistudio/Sergio_CS1-Elec_ERD_24b4cd8a.png"
            alt="Ethereal Cafe ERD Diagram"
            className="w-full max-h-[500px] object-contain rounded-md"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Relational Tables Explorer */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Table Selector */}
        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4">
          <h3 className="text-xs font-semibold uppercase text-slate-400 mb-3 tracking-wider">
            Database Entities
          </h3>
          <div className="space-y-1.5">
            {SCHEMA_DEFINITIONS.map((t) => {
              const isSelected = selectedTable === t.name;
              const count = getCount(t.countKey);

              return (
                <button
                  key={t.name}
                  onClick={() => setSelectedTable(t.name)}
                  className={`flex w-full items-center justify-between rounded-lg p-2.5 text-xs transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Table className="h-3.5 w-3.5" />
                    <span className="font-mono">{t.name}</span>
                  </div>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count} rows
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Table Detail */}
        {currentDef && (
          <div className="lg:col-span-2 rounded-xl border border-slate-800/80 bg-[#090d16] p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white font-mono">{currentDef.name}</h3>
                  <span className="font-mono text-xs text-blue-400">
                    ({getCount(currentDef.countKey)} live records)
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{currentDef.description}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-500 font-mono">
                  <tr>
                    <th className="py-2.5 px-3">Column Name</th>
                    <th className="py-2.5 px-3">Data Type</th>
                    <th className="py-2.5 px-3">Constraint</th>
                    <th className="py-2.5 px-3">Foreign Key Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-mono text-[11px]">
                  {currentDef.columns.map((c) => (
                    <tr key={c.name} className="hover:bg-slate-800/20">
                      <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-1.5">
                        {c.isPk && <Key className="h-3 w-3 text-amber-400" />}
                        {c.isFk && <Link2 className="h-3 w-3 text-blue-400" />}
                        <span>{c.name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{c.type}</td>
                      <td className="py-2.5 px-3">
                        {c.isPk ? (
                          <span className="text-amber-400 font-bold">PRIMARY KEY</span>
                        ) : c.isFk ? (
                          <span className="text-blue-400">FOREIGN KEY</span>
                        ) : (
                          <span className="text-slate-500">NULLABLE</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{c.ref || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
