import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Activity, 
  CalendarPlus, 
  MapPin, 
  IndianRupee, 
  History, 
  Bell, 
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const Navigation: React.FC = () => {
  const { activeView, setActiveView, t, unreadCount } = useApp();

  const navItems: {
    id: 'tracking' | 'booking' | 'centres' | 'procurement' | 'history' | 'notifications' | 'profile';
    label: string;
    icon: React.ElementType;
    badge?: number;
  }[] = [
    { id: 'tracking', label: t('navTracking'), icon: Activity },
    { id: 'booking', label: t('navBooking'), icon: CalendarPlus },
    { id: 'centres', label: t('navCentres'), icon: MapPin },
    { id: 'procurement', label: t('navProcurement'), icon: IndianRupee },
    { id: 'history', label: t('navHistory'), icon: History },
    { id: 'notifications', label: t('navNotifications'), icon: Bell, badge: unreadCount },
    { id: 'profile', label: t('navProfile'), icon: User },
  ];

  return (
    <>
      {/* Desktop Tab Pill Navigation */}
      <nav aria-label="Main Navigation" className="hidden md:block bg-[#ffffff] py-4 border-b border-[#cdeac6]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Pill Container */}
            <div className="flex items-center gap-1.5 bg-[#f4fbf5] p-1.5 rounded-[56px] border border-[#cdeac6] overflow-x-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-[56px] text-sm tracking-tight transition-all whitespace-nowrap font-bold ${
                      isActive
                        ? 'bg-[#BBEAA6] text-[#0c2417] shadow-sm'
                        : 'text-[#2e5a40] hover:text-[#0d2618] bg-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-[#0c2417] text-[#BBEAA6]' : 'bg-[#166534] text-[#ffffff]'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Live Signal Indicator */}
            <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.45px] text-[#2e5a40] bg-[#f4fbf5] px-3.5 py-2 rounded-[56px] border border-[#cdeac6] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#166534] animate-pulse" />
              <span>Telemetry: Online</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <nav aria-label="Mobile Bottom Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#ffffff] border-t border-[#cdeac6] shadow-xl">
        <div className="grid grid-cols-5 h-16 max-w-md mx-auto">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex flex-col items-center justify-center relative py-1 transition-colors ${
                  isActive ? 'text-[#166534]' : 'text-[#2e5a40] hover:text-[#0d2618]'
                }`}
              >
                <div className={`p-1.5 rounded-full transition-all ${isActive ? 'bg-[#BBEAA6] text-[#0c2417]' : ''}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[9px] uppercase tracking-[0.45px] mt-0.5 truncate max-w-[64px] font-bold ${
                  isActive ? 'text-[#166534]' : ''
                }`}>
                  {item.label}
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute top-1.5 right-4 bg-[#166534] text-[#ffffff] text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
