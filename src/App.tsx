import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CafeDataProvider } from './context/CafeDataContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { OverviewTab } from './components/tabs/OverviewTab';
import { UnitsTab } from './components/tabs/UnitsTab';
import { SessionsTab } from './components/tabs/SessionsTab';
import { FinancialsTab } from './components/tabs/FinancialsTab';
import { CustomersTab } from './components/tabs/CustomersTab';
import { InventoryTab } from './components/tabs/InventoryTab';
import { EmployeesTab } from './components/tabs/EmployeesTab';
import { PythonAnalyticsTab } from './components/tabs/PythonAnalyticsTab';
import { ErdSchemaTab } from './components/tabs/ErdSchemaTab';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');

  return (
    <CafeDataProvider>
      <div className="h-screen w-screen overflow-hidden bg-[#05070D] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
        <Navbar activeTab={activeTab} />

        <div className="flex flex-1 overflow-hidden">
          {/* Left Control Navigation Panel (Independent Scrolling) */}
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Right Main Panel (Independent Scrolling) */}
          <main className="flex-1 h-full overflow-y-auto p-6 md:p-8 w-full max-w-[1600px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'units' && <UnitsTab />}
                {activeTab === 'sessions' && <SessionsTab />}
                {activeTab === 'financials' && <FinancialsTab />}
                {activeTab === 'customers' && <CustomersTab />}
                {activeTab === 'inventory' && <InventoryTab />}
                {activeTab === 'employees' && <EmployeesTab />}
                {activeTab === 'python_engine' && <PythonAnalyticsTab />}
                {activeTab === 'erd_schema' && <ErdSchemaTab />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </CafeDataProvider>
  );
}
