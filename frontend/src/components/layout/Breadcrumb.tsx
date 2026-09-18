import React from 'react';
import { useApp } from '../../context/AppContext';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumb: React.FC = () => {
  const { activeView, setActiveView, t } = useApp();

  const getViewTitle = (): string => {
    switch (activeView) {
      case 'dashboard':
        return t('navDashboard');
      case 'tracking':
        return t('navTracking');
      case 'booking':
        return t('navBooking');
      case 'centres':
        return t('navCentres');
      case 'procurement':
        return t('navProcurement');
      case 'history':
        return t('navHistory');
      case 'notifications':
        return t('navNotifications');
      case 'profile':
        return t('navProfile');
      case 'auth':
        return `${t('login')} / ${t('register')}`;
      default:
        return t('navDashboard');
    }
  };

  const currentTitle = getViewTitle();

  return (
    <nav aria-label="Breadcrumb" className="w-full bg-[#EDF3EF] border-b border-[#CBD8D1] py-2 px-4 sm:px-6">
      <div className="max-w-[1440px] mx-auto flex items-center gap-1.5 text-xs sm:text-[13px] text-[#66736D]">
        <button
          onClick={() => setActiveView('dashboard')}
          className="flex items-center gap-1 hover:text-[#063B2A] transition-colors"
          title={t('home')}
        >
          <Home className="w-3.5 h-3.5 text-[#075E43]" />
          <span>{t('home')}</span>
        </button>

        {activeView !== 'dashboard' && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-[#66736D] flex-shrink-0" />
            <span className="font-semibold text-[#17231F]">
              {currentTitle}
            </span>
          </>
        )}
      </div>
    </nav>
  );
};
