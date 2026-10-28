import React, { useState, useMemo } from 'react';
import {
  Coffee,
  Search,
  Package,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Tag,
} from 'lucide-react';
import { useCafeData } from '../../context/CafeDataContext';

export const InventoryTab: React.FC = () => {
  const { products, sessionProducts } = useCafeData();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Compute sales velocity per product from session_products
  const productSalesMap = useMemo(() => {
    const map = new Map<number, { unitsSold: number; totalRevenue: number }>();
    sessionProducts.forEach((sp) => {
      const pid = sp.product_id;
      const existing = map.get(pid) || { unitsSold: 0, totalRevenue: 0 };
      existing.unitsSold += Number(sp.quantity) || 0;
      existing.totalRevenue += Number(sp.subtotal) || 0;
      map.set(pid, existing);
    });
    return map;
  }, [sessionProducts]);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [products, searchTerm, categoryFilter]);

  // Summary KPIs
  const totalInventoryValue = products.reduce(
    (sum, p) => sum + (Number(p.unit_price) || 0) * (Number(p.stock_quantity) || 0),
    0
  );
  const totalConcessionRevenue = sessionProducts.reduce(
    (sum, sp) => sum + (Number(sp.subtotal) || 0),
    0
  );
  const lowStockCount = products.filter((p) => p.stock_quantity <= 30).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Cafe Concessions &amp; Inventory Menu
          </h1>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <span className="text-blue-400">{products.length} menu items</span>
          <span className="text-slate-600">·</span>
          <span className="text-emerald-400">{sessionProducts.length} order line items</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4">
          <span className="text-xs text-slate-400">Total Concessions Revenue</span>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            ₱{totalConcessionRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="mt-1 block text-[11px] text-slate-500 font-mono">
            {sessionProducts.length} recorded session purchases
          </span>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4">
          <span className="text-xs text-slate-400">Current Warehouse Stock Valuation</span>
          <div className="mt-2 text-2xl font-bold font-mono text-white tabular-nums">
            ₱{totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="mt-1 block text-[11px] text-slate-500 font-mono">
            Asset value across all categories
          </span>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4">
          <span className="text-xs text-slate-400">Inventory Health Alerts</span>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {lowStockCount} Low Stock
          </div>
          <span className="mt-1 block text-[11px] text-slate-500 font-mono">
            Restock threshold &le; 30 units
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800/80 bg-[#090d16] p-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search product name or category..."
            className="w-full rounded-lg border border-slate-800 bg-[#060a12] pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              categoryFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All Categories ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filteredProducts.map((p) => {
          const sales = productSalesMap.get(p.product_id);
          const isLowStock = p.stock_quantity <= 30;

          return (
            <div
              key={p.product_id}
              className="rounded-xl border border-slate-800/80 bg-[#090d16] p-4 transition-all hover:border-blue-500/30"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-blue-400">
                    {p.category}
                  </span>
                  <h3 className="font-semibold text-white text-sm mt-0.5">{p.product_name}</h3>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-950/40 border border-blue-500/20 text-blue-400">
                  <Coffee className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-4 space-y-2 border-t border-slate-800/60 pt-3 text-xs font-mono">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Unit Price</span>
                  <span className="text-white font-bold text-sm tabular-nums">₱{p.unit_price}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Stock on Hand</span>
                  <span
                    className={`font-semibold tabular-nums ${
                      isLowStock ? 'text-amber-400' : 'text-slate-300'
                    }`}
                  >
                    {p.stock_quantity} units
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Units Sold</span>
                  <span className="text-blue-400 tabular-nums">{sales?.unitsSold || 0}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Billed Total</span>
                  <span className="text-emerald-400 font-semibold tabular-nums">
                    ₱{(sales?.totalRevenue || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {isLowStock && (
                <div className="mt-3 flex items-center gap-1.5 rounded bg-amber-950/20 border border-amber-900/30 px-2 py-1 text-[10px] text-amber-300">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Low stock threshold triggered</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
