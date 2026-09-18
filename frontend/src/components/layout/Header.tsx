import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, User, Menu, Sprout, ArrowRight } from 'lucide-react';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
  const { 
    farmer, 
    unreadCount, 
    activeView, 
    setActiveView,
    t
  } = useApp();

  const getViewTitle = () => {
    switch (activeView) {
      case 'tracking': return t('navTracking');
      case 'booking': return t('navBooking');
      case 'centres': return t('navCentres');
      case 'procurement': return t('navProcurement');
      case 'history': return t('navHistory');
      case 'notifications': return t('navNotifications');
      case 'profile': return t('navProfile');
      default: return 'Command Center';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#f4fbf5]/90 backdrop-blur-md border-b border-[#cdeac6] shadow-sm">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Mobile Sidebar Hamburger + Breadcrumb */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Hamburger for mobile */}
            <button
              onClick={onOpenSidebar}
              className="p-2.5 rounded-xl border border-[#cdeac6] bg-[#ffffff] text-[#0d2618] hover:bg-[#eef8ed] lg:hidden transition-colors flex-shrink-0 active:scale-95"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5 text-[#166534]" />
            </button>

            {/* Mobile Brand Emblem (visible on mobile where sidebar is hidden) */}
            <div 
              onClick={() => setActiveView('tracking')}
              className="flex items-center gap-1.5 cursor-pointer lg:hidden flex-shrink-0"
            >
              <div className="w-7 h-7 rounded-lg bg-[#166534] text-[#BBEAA6] flex items-center justify-center">
                <Sprout className="w-4 h-4 text-[#BBEAA6]" />
              </div>
              <span className="font-['Inter'] font-bold text-base text-[#0d2618]">
                KRA<span className="text-[#166534]">YAM</span>
              </span>
            </div>

            {/* View Breadcrumb */}
            <div className="flex items-center gap-2 min-w-0 truncate">
              <span className="font-['Inter'] font-bold text-base text-[#0d2618] hidden lg:inline-block">
                KRA<span className="text-[#166534]">YAM</span>
              </span>
              <span className="text-[#72a378] hidden lg:inline-block">/</span>
              <span className="text-xs sm:text-sm font-semibold text-[#0d2618] bg-[#BBEAA6]/40 px-2.5 sm:px-3 py-1 rounded-full border border-[#BBEAA6] truncate max-w-[140px] sm:max-w-none">
                {getViewTitle()}
              </span>
            </div>
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Alerts button */}
            <button
              onClick={() => setActiveView('notifications')}
              className={`relative p-2 rounded-full border transition-all ${
                activeView === 'notifications'
                  ? 'bg-[#166534] text-[#ffffff] border-[#166534]'
                  : 'bg-[#ffffff] text-[#0d2618] border-[#cdeac6] hover:border-[#166534]'
              }`}
              title="Alerts & Signals"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#166534] text-[#ffffff] font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-[#ffffff]">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Farmer ID Quick Pill */}
            {farmer && (
              <button
                onClick={() => setActiveView('profile')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-[56px] border transition-all ${
                  activeView === 'profile'
                    ? 'bg-[#166534] text-[#ffffff] border-[#166534]'
                    : 'bg-[#ffffff] hover:bg-[#eef8ed] text-[#0d2618] border-[#cdeac6]'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-[#BBEAA6] text-[#0d2618] flex items-center justify-center text-[10px] font-bold">
                  <User className="w-3 h-3" />
                </div>
                <div className="text-left hidden sm:block">
                  <span className="text-xs font-semibold block leading-none text-[#0d2618]">{farmer.fullName.split(' ')[0]}</span>
                  <span className="text-[9px] font-mono text-[#2e5a40] block">{farmer.farmerId}</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
