import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { OfficialBrandBar } from '../layout/OfficialBrandBar';
import { LanguageDropdown } from '../common/LanguageDropdown';
import { getOperatorText } from '../../i18n/operatorTranslations';
import { 
  Building2, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  LogOut, 
  Layers, 
  Calendar,
  Clock, 
  Scale, 
  CreditCard, 
  BarChart3, 
  HardDrive
} from 'lucide-react';

export const OperatorHeader: React.FC = () => {
  const { 
    operator, 
    logout, 
    operatorActiveTab, 
    setOperatorActiveTab, 
    isOffline, 
    toggleOfflineMode, 
    syncQueue, 
    syncOfflineQueue, 
    language,
    formatLocalizedDate
  } = useApp();

  const ot = getOperatorText(language);
  const pendingSyncCount = syncQueue.filter(q => q.status === 'PENDING').length;

  // Live Date & Time Clock for Mandi Floor Operations
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getLocaleCode = (lang: string) => {
    const locales: Record<string, string> = {
      hi: 'hi-IN',
      bn: 'bn-IN',
      mr: 'mr-IN',
      te: 'te-IN',
      ta: 'ta-IN',
      gu: 'gu-IN',
      ur: 'ur-PK',
      kn: 'kn-IN',
      or: 'or-IN',
      pa: 'pa-IN',
      en: 'en-IN'
    };
    return locales[lang] || 'en-IN';
  };

  const formattedDate = formatLocalizedDate(currentDateTime);

  const formattedTime = currentDateTime.toLocaleTimeString(getLocaleCode(language), {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <header className="sticky top-0 z-40 shadow-md">
      {/* 1. Official National Brand Bar (White background, identical to Farmer Header matching reference photo) */}
      <div className="w-full bg-[#FFFFFF] border-b border-[#CBD8D1]">
        <div className="max-w-[1500px] mx-auto px-2.5 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Official Brand Bar */}
          <OfficialBrandBar className="flex-1 min-w-0" onClick={() => setOperatorActiveTab('dashboard')} />

          {/* Right: Operator Badge, Language Dropdown & Logout Button */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Operator Identity Badge */}
            <div className="hidden sm:flex flex-col text-right leading-tight">
              <span className="font-bold text-[#17231F] text-xs">
                {operator?.name || 'Mandi Officer'}
              </span>
              <span className="text-[10px] text-[#075E43] font-medium">
                {operator?.operatorId ? `ID: ${operator.operatorId.slice(0, 8)}` : 'Authorized Personnel'} • Mandi In-Charge
              </span>
            </div>

            {/* Language Selector */}
            <LanguageDropdown variant="sidebar" align="right" />

            {/* Logout Button */}
            <button
              type="button"
              onClick={logout}
              className="bg-[#B42318]/10 hover:bg-[#B42318]/20 text-[#B42318] text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-[6px] border border-[#B42318]/20 transition-colors flex items-center gap-1.5 shrink-0"
              title="Logout from Operator Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{ot.logoutBtn}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Sub-Strip: APMC Mandi Floor Control & Operational Connection Status */}
      <div className="bg-[#063B2A] text-[#FFFFFF] border-b border-[#075E43]">
        <div className="max-w-[1500px] mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs">
          {/* Left: Mandi Floor Identity */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-[#075E43] flex items-center justify-center border border-[#0B6B4F] shrink-0">
              <Building2 className="w-4 h-4 text-[#E7F3EC]" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] text-[#85E1A9] uppercase tracking-wider font-bold truncate">
                APMC Mandi Floor Control
              </div>
              <div className="font-bold text-xs sm:text-sm text-[#FFFFFF] tracking-tight truncate">
                {operator?.centreName || ot.mandiCentreBadge}
              </div>
            </div>
          </div>

          {/* Center: Live Date & Time for Mandi Intake Ops */}
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#E7F3EC] bg-[#04261B]/90 px-3 py-1 rounded-full border border-[#0B4734] shadow-xs shrink-0">
            <div className="flex items-center gap-1.5 font-medium tracking-wide">
              <Calendar className="w-3.5 h-3.5 text-[#A3D99D]" />
              <span>{formattedDate}</span>
            </div>
            <span className="text-[#16845F]">•</span>
            <div className="flex items-center gap-1.5 font-mono font-semibold text-[#85E1A9]">
              <Clock className="w-3.5 h-3.5 text-[#A3D99D]" />
              <span>{formattedTime}</span>
            </div>
          </div>

          {/* Right: Connection & Offline Sync Status */}
          <div className="flex items-center gap-2">
            {/* Mobile compact time */}
            <span className="sm:hidden text-[10px] font-mono text-[#85E1A9] bg-[#04261B] px-2 py-0.5 rounded border border-[#0B4734] shrink-0">
              {currentDateTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
            <button
              type="button"
              onClick={toggleOfflineMode}
              className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold flex items-center gap-1.5 transition-colors border ${
                isOffline 
                  ? 'bg-[#EA8A0A]/20 text-[#EA8A0A] border-[#EA8A0A]/40' 
                  : 'bg-[#16803C]/20 text-[#85E1A9] border-[#16803C]/40'
              }`}
              title="Click to toggle simulated Offline Mode"
            >
              {isOffline ? (
                <>
                  <WifiOff className="w-3 h-3" />
                  <span>{ot.offlineBadge}</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3 h-3 animate-pulse" />
                  <span>{ot.onlineBadge}</span>
                </>
              )}
            </button>

            {pendingSyncCount > 0 && (
              <button
                type="button"
                onClick={() => syncOfflineQueue()}
                className="bg-[#EA8A0A] hover:bg-[#D97706] text-[#FFFFFF] px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                title="Synchronize local operations with cloud backend"
              >
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                <span>{pendingSyncCount} {ot.pendingSync}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Operator Navigation Tabs */}
      <div className="bg-[#04261B] text-[#FFFFFF] border-b border-[#075E43]">
        <div className="max-w-[1500px] mx-auto px-2 sm:px-6 flex items-center gap-1 overflow-x-auto py-1 text-xs no-scrollbar">
        <button
          type="button"
          onClick={() => setOperatorActiveTab('dashboard')}
          className={`px-3 py-2 rounded-t-[6px] font-bold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            operatorActiveTab === 'dashboard'
              ? 'bg-[#075E43] text-[#FFFFFF] border-[#85E1A9]'
              : 'text-[#CBD8D1] hover:text-[#FFFFFF] hover:bg-[#075E43]/40 border-transparent'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{ot.tabDashboard}</span>
        </button>

        <button
          type="button"
          onClick={() => setOperatorActiveTab('queue')}
          className={`px-3 py-2 rounded-t-[6px] font-bold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            operatorActiveTab === 'queue'
              ? 'bg-[#075E43] text-[#FFFFFF] border-[#85E1A9]'
              : 'text-[#CBD8D1] hover:text-[#FFFFFF] hover:bg-[#075E43]/40 border-transparent'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#16803C] animate-pulse"></span>
          <span>{ot.tabQueue}</span>
        </button>

        <button
          type="button"
          onClick={() => setOperatorActiveTab('bookings')}
          className={`px-3 py-2 rounded-t-[6px] font-bold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            operatorActiveTab === 'bookings'
              ? 'bg-[#075E43] text-[#FFFFFF] border-[#85E1A9]'
              : 'text-[#CBD8D1] hover:text-[#FFFFFF] hover:bg-[#075E43]/40 border-transparent'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{ot.tabBookings}</span>
        </button>

        <button
          type="button"
          onClick={() => setOperatorActiveTab('procurement')}
          className={`px-3 py-2 rounded-t-[6px] font-bold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            operatorActiveTab === 'procurement'
              ? 'bg-[#075E43] text-[#FFFFFF] border-[#85E1A9]'
              : 'text-[#CBD8D1] hover:text-[#FFFFFF] hover:bg-[#075E43]/40 border-transparent'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>{ot.tabProcurement}</span>
        </button>

        <button
          type="button"
          onClick={() => setOperatorActiveTab('payments')}
          className={`px-3 py-2 rounded-t-[6px] font-bold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            operatorActiveTab === 'payments'
              ? 'bg-[#075E43] text-[#FFFFFF] border-[#85E1A9]'
              : 'text-[#CBD8D1] hover:text-[#FFFFFF] hover:bg-[#075E43]/40 border-transparent'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>{ot.tabPayments}</span>
        </button>

        <button
          type="button"
          onClick={() => setOperatorActiveTab('analytics')}
          className={`px-3 py-2 rounded-t-[6px] font-bold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            operatorActiveTab === 'analytics'
              ? 'bg-[#075E43] text-[#FFFFFF] border-[#85E1A9]'
              : 'text-[#CBD8D1] hover:text-[#FFFFFF] hover:bg-[#075E43]/40 border-transparent'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>{ot.tabAnalytics}</span>
        </button>

        <button
          type="button"
          onClick={() => setOperatorActiveTab('offline')}
          className={`px-3 py-2 rounded-t-[6px] font-bold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            operatorActiveTab === 'offline'
              ? 'bg-[#075E43] text-[#FFFFFF] border-[#85E1A9]'
              : 'text-[#CBD8D1] hover:text-[#FFFFFF] hover:bg-[#075E43]/40 border-transparent'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>{ot.tabOffline}</span>
          {pendingSyncCount > 0 && (
            <span className="ml-1 bg-[#EA8A0A] text-white text-[10px] px-1.5 py-0.2 rounded-full">
              {pendingSyncCount}
            </span>
          )}
        </button>
      </div>
    </div>
  </header>
  );
};
