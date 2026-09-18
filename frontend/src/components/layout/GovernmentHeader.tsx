import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { OfficialBrandBar } from './OfficialBrandBar';
import { LanguageDropdown } from '../common/LanguageDropdown';
import { Bell, Menu, ChevronDown, UserCheck, LogOut, LogIn, ShieldCheck, Calendar, Clock, MessageSquare } from 'lucide-react';

interface GovernmentHeaderProps {
  onOpenSidebar: () => void;
}

export const GovernmentHeader: React.FC<GovernmentHeaderProps> = ({ onOpenSidebar }) => {
  const { 
    farmer, 
    unreadCount, 
    activeView, 
    setActiveView, 
    setIsSmsModalOpen,
    t,
    isLoggedIn,
    logout,
    language,
    formatLocalizedDate
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Live Date and Time Shower formatted dynamically with 1-second ticking clock
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = formatLocalizedDate(currentDateTime);

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

  const formattedTime = currentDateTime.toLocaleTimeString(getLocaleCode(language), {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <header className="w-full bg-[#FFFFFF] border-b border-[#CBD8D1] sticky top-0 z-30 shadow-xs">
      {/* Official Top Stripe with Live Clock on Left and Language Dropdown on Right */}
      <div className="w-full bg-[#063B2A] text-[#FFFFFF] text-[10px] sm:text-[11px] py-1.5 px-3 sm:px-6 border-b border-[#075E43] relative z-40 shadow-xs">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Live Date & Time Clock */}
          <div className="flex items-center gap-2">
            {/* Desktop & Tablet: Date + Live Clock */}
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#E7F3EC] bg-[#04261B]/80 px-3 py-0.5 rounded-full border border-[#0B4734] shadow-xs shrink-0">
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

            {/* Mobile compact time */}
            <div className="sm:hidden flex items-center gap-1.5 text-[10px] text-[#85E1A9] font-mono font-medium bg-[#04261B]/80 px-2.5 py-0.5 rounded-full border border-[#0B4734] shrink-0">
              <Clock className="w-3 h-3 text-[#A3D99D]" />
              <span>{formattedTime}</span>
            </div>
          </div>

          {/* Right: Language Dropdown */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Top Right Indian Languages Dropdown */}
            <LanguageDropdown variant="header" align="right" />
          </div>
        </div>
      </div>

      {/* Main Official Header Area */}
      <div className="max-w-[1440px] mx-auto px-2.5 sm:px-6 py-2 sm:py-3">
        <div className="flex items-center justify-between gap-1.5 sm:gap-3">
          {/* Left: Mobile Toggle + Emblem + User Sprout Logo + Portal Identity */}
          <div className="flex items-center gap-1.5 sm:gap-3.5 min-w-0 flex-1">
            {/* Mobile Menu Button */}
            <button
              onClick={onOpenSidebar}
              className="p-1.5 sm:p-2 rounded-[6px] border border-[#CBD8D1] text-[#17231F] hover:bg-[#F3F9F5] lg:hidden flex-shrink-0"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 text-[#075E43]" />
            </button>

            {/* Left Interactive Area: Official Brand Bar matching photo */}
            <OfficialBrandBar onClick={() => setActiveView('dashboard')} />
          </div>

          {/* Right: Notification Bell & Farmer Identity Block */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0 relative">

            {/* Notification Bell */}
            <button
              onClick={() => setActiveView('notifications')}
              className={`relative p-2 rounded-[6px] border transition-colors ${
                activeView === 'notifications'
                  ? 'bg-[#E7F3EC] text-[#063B2A] border-[#075E43]'
                  : 'bg-[#FFFFFF] text-[#34443D] border-[#CBD8D1] hover:bg-[#F3F9F5]'
              }`}
              title="Alerts & Notices"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 text-[#075E43]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#D97706] text-[#FFFFFF] font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* SMS & NLP Gateway Console Trigger */}
            <button
              onClick={() => setIsSmsModalOpen(true)}
              className="relative p-2 rounded-[6px] border border-[#CBD8D1] bg-[#FFFFFF] text-[#34443D] hover:bg-[#F3F9F5] transition-colors"
              title="Krayam SMS & Natural-Language Mandi Gateway"
              aria-label="SMS Gateway"
            >
              <MessageSquare className="w-4 h-4 text-[#075E43]" />
            </button>

            {/* Farmer Identity Badge or Login/Register Button */}
            {isLoggedIn && farmer ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-[6px] border transition-colors text-left ${
                    isUserMenuOpen || activeView === 'profile'
                      ? 'bg-[#E7F3EC] border-[#075E43]'
                      : 'bg-[#FFFFFF] border-[#CBD8D1] hover:bg-[#F3F9F5]'
                  }`}
                  title="Farmer Account Options"
                >
                  <div className="w-7 h-7 rounded-full bg-[#063B2A] text-[#E7F3EC] flex items-center justify-center text-xs font-bold flex-shrink-0">
                    <UserCheck className="w-4 h-4 text-[#E7F3EC]" />
                  </div>
                  <div className="hidden sm:block leading-tight">
                    <div className="text-xs font-bold text-[#17231F] truncate max-w-[130px]">
                      {farmer.fullName}
                    </div>
                    <div className="text-[10px] font-mono text-[#66736D]">
                      {farmer.farmerId}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#66736D]" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-1 w-56 bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2 border-b border-[#EDF3EF]">
                      <div className="text-xs font-bold text-[#17231F]">{farmer.fullName}</div>
                      <div className="text-[10px] text-[#66736D] font-mono">{farmer.farmerId}</div>
                      <div className="text-[10px] text-[#075E43] font-medium mt-0.5">
                        {farmer.location.village}, {farmer.location.district}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setActiveView('profile');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-[#17231F] hover:bg-[#F5F8F6] flex items-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#075E43]" />
                      <span>{t('farmerProfile')}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveView('auth');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-[#17231F] hover:bg-[#F5F8F6] flex items-center gap-2"
                    >
                      <LogIn className="w-4 h-4 text-[#075E43]" />
                      <span>{t('login')} / {t('register')}</span>
                    </button>

                    <div className="border-t border-[#EDF3EF] my-1" />

                    <button
                      onClick={() => {
                        logout();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-[#DC2626] hover:bg-[#FEF2F2] flex items-center gap-2 font-medium"
                    >
                      <LogOut className="w-4 h-4 text-[#DC2626]" />
                      <span>{t('logout')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setActiveView('auth')}
                className="h-9 px-2.5 sm:px-4 rounded-[6px] bg-[#075E43] hover:bg-[#063B2A] text-[#FFFFFF] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">{t('login')} / {t('register')}</span>
                <span className="sm:hidden">{t('login')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
