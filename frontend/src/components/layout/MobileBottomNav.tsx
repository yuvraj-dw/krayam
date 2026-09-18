import React from 'react';
import { useApp } from '../../context/AppContext';
import { ActiveView } from '../../types';
import { 
  Home, 
  CalendarPlus, 
  Activity, 
  History, 
  Menu
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenMore?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMore }) => {
  const { activeView, setActiveView, unreadCount, t } = useApp();

  // Secondary views are accessed via "More"
  const isMoreActive = ['centres', 'procurement', 'notifications', 'profile'].includes(activeView);

  const navItems: {
    id: ActiveView | 'more';
    label: string;
    icon: React.ElementType;
    isActive: boolean;
    badge?: number;
  }[] = [
    { 
      id: 'dashboard', 
      label: t('navDashboard'), 
      icon: Home, 
      isActive: activeView === 'dashboard' 
    },
    { 
      id: 'booking', 
      label: t('navBooking'), 
      icon: CalendarPlus, 
      isActive: activeView === 'booking' 
    },
    { 
      id: 'tracking', 
      label: t('navTracking'), 
      icon: Activity, 
      isActive: activeView === 'tracking' 
    },
    { 
      id: 'history', 
      label: t('navHistory'), 
      icon: History, 
      isActive: activeView === 'history' 
    },
    { 
      id: 'more', 
      label: isMoreActive ? '★' : t('action'), 
      icon: Menu, 
      isActive: isMoreActive,
      badge: unreadCount 
    },
  ];

  return (
    <nav 
      aria-label="Mobile Bottom Navigation" 
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF] border-t border-[#CBD8D1] shadow-[0_-2px_10px_rgba(0,0,0,0.08)] lg:hidden pb-safe"
    >
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto items-center">
        {navItems.map((item) => {
          const Icon = item.icon;

          const handleClick = () => {
            if (item.id === 'more') {
              if (onOpenMore) onOpenMore();
            } else {
              setActiveView(item.id);
            }
          };

          return (
            <button
              key={item.id}
              onClick={handleClick}
              className={`flex flex-col items-center justify-center h-full relative transition-colors ${
                item.isActive 
                  ? 'text-[#063B2A]' 
                  : 'text-[#66736D] hover:text-[#17231F]'
              }`}
            >
              {/* Top active indicator bar */}
              {item.isActive && (
                <span className="absolute top-0 left-3 right-3 h-[3px] bg-[#063B2A] rounded-b" />
              )}

              {/* Icon with subtle rounded background when active */}
              <div className="relative">
                <div className={`p-1 rounded-[4px] transition-colors ${
                  item.isActive ? 'bg-[#E7F3EC] text-[#063B2A]' : 'text-[#66736D]'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 bg-[#D97706] text-[#FFFFFF] text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className={`text-[11px] mt-1 leading-none ${
                item.isActive ? 'font-bold text-[#063B2A]' : 'font-medium text-[#66736D]'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
