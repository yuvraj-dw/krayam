import React from 'react';
import { useApp } from '../../context/AppContext';
import { OperatorHeader } from './OperatorHeader';
import { OperatorDashboardTab } from './OperatorDashboardTab';
import { OperatorQueueTab } from './OperatorQueueTab';
import { OperatorBookingsTab } from './OperatorBookingsTab';
import { OperatorProcurementTab } from './OperatorProcurementTab';
import { OperatorPaymentsTab } from './OperatorPaymentsTab';
import { OperatorAnalyticsTab } from './OperatorAnalyticsTab';
import { OperatorOfflineTab } from './OperatorOfflineTab';
import { ShieldCheck, Phone } from 'lucide-react';

export const OperatorPortal: React.FC = () => {
  const { operatorActiveTab, operator, isOffline } = useApp();

  return (
    <div className="min-h-screen flex flex-col font-['Inter'] antialiased bg-[#F5F8F6] text-[#17231F]">
      {/* Mandi Floor Operator Header */}
      <OperatorHeader />

      {/* Main Viewport Container */}
      <main className="flex-1 w-full max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        {operatorActiveTab === 'dashboard' && <OperatorDashboardTab />}
        {operatorActiveTab === 'queue' && <OperatorQueueTab />}
        {operatorActiveTab === 'bookings' && <OperatorBookingsTab />}
        {operatorActiveTab === 'procurement' && <OperatorProcurementTab />}
        {operatorActiveTab === 'payments' && <OperatorPaymentsTab />}
        {operatorActiveTab === 'analytics' && <OperatorAnalyticsTab />}
        {operatorActiveTab === 'offline' && <OperatorOfflineTab />}
      </main>

      {/* Official Government Mandi Footer */}
      <footer className="bg-[#FFFFFF] border-t border-[#CBD8D1] py-4 px-4 sm:px-6 lg:px-8 text-xs text-[#66736D] mt-8">
        <div className="max-w-[1500px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#063B2A]">KRAYAM Centre Operator System</span>
            <span>•</span>
            <span>{operator?.centreName || 'Samrala Main Grain Mandi'}</span>
            <span>•</span>
            <span className="font-mono text-[#075E43] font-semibold">APMC-PB-SAM-01</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-[#16803C]">
              <ShieldCheck className="w-4 h-4" /> State Grid Online
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-[#075E43]" /> Mandi Tech Support: 01628-234199
            </span>
            <span>•</span>
            <span>Version 2.4.0 (Govt Build)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
