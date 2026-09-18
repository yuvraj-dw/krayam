import React from 'react';
import { useApp } from '../../context/AppContext';
import { ActiveView } from '../../types';
import { 
  LayoutDashboard,
  Activity, 
  CalendarPlus, 
  MapPin, 
  IndianRupee, 
  History, 
  Bell, 
  HelpCircle,
  Settings,
  X,
  User,
  Globe,
  LogIn
} from 'lucide-react';
import { TranslationStrings } from '../../i18n/translations';
import { LanguageDropdown } from '../common/LanguageDropdown';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { 
    activeView, 
    setActiveView, 
    unreadCount, 
    setIsHelpModalOpen, 
    setIsSettingsModalOpen,
    setIsTcModalOpen,
    setIsPrivacyModalOpen,
    t,
    isLoggedIn
  } = useApp();


  // 6 Services for Desktop (Alerts removed as requested)
  const desktopServices: {
    id: ActiveView;
    titleEn: string;
    titleKey: keyof TranslationStrings;
    icon: React.ElementType;
    badge?: number;
  }[] = [
    { id: 'dashboard', titleEn: 'Dashboard', titleKey: 'navDashboard', icon: LayoutDashboard },
    { id: 'tracking', titleEn: 'Queue Track', titleKey: 'navTracking', icon: Activity },
    { id: 'booking', titleEn: 'Book Slot', titleKey: 'navBooking', icon: CalendarPlus },
    { id: 'centres', titleEn: 'Centres', titleKey: 'navCentres', icon: MapPin },
    { id: 'procurement', titleEn: 'Procurement & DBT', titleKey: 'navProcurement', icon: IndianRupee },
    { id: 'history', titleEn: 'History', titleKey: 'navHistory', icon: History },
  ];

  // Additional Services specifically for Mobile (excluding the 4 tabs pinned on the bottom bar: Home, Book, Queue, History)
  const mobileAdditionalServices: {
    id: ActiveView;
    titleEn: string;
    titleKey: keyof TranslationStrings;
    desc: string;
    icon: React.ElementType;
    badge?: number;
  }[] = [
    { 
      id: 'centres', 
      titleEn: 'Procurement Centres', 
      titleKey: 'navCentres',
      desc: 'Mandi locator, distances & slot availability',
      icon: MapPin 
    },
    { 
      id: 'procurement', 
      titleEn: 'Procurement & DBT', 
      titleKey: 'navProcurement',
      desc: 'Intake weighbridge slips & PFMS transfer logs',
      icon: IndianRupee 
    },
    { 
      id: 'profile', 
      titleEn: 'Farmer Profile & Land', 
      titleKey: 'navProfile',
      desc: 'Aadhaar e-KYC, Jamabandi & bank account',
      icon: User 
    },
  ];

  const handleNavClick = (view: ActiveView) => {
    setActiveView(view);
    onClose();
  };

  return (
    <>
      {/* ────────────────────────────────────────────────────────────────
          1. DESKTOP SIDEBAR (Visible on lg screens, perfectly aligned 
             underneath the government header with 280px fixed width)
      ──────────────────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-[280px] shrink-0 bg-[#063B2A] text-[#FFFFFF] border-r border-[#0B4734] sticky top-[86px] sm:top-[90px] h-[calc(100vh-86px)] sm:h-[calc(100vh-90px)] overflow-y-auto pb-6 select-none">
        {/* Section: Main Services Navigation */}
        <div className="px-3.5 pt-4 pb-1">
          <div className="text-[10px] uppercase tracking-wider text-[#CBD8D1] font-bold px-2 mb-2">
            {t('servicesTitle')}
          </div>

          <nav className="space-y-1">
            {desktopServices.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[6px] text-left transition-colors relative ${
                    isActive
                      ? 'bg-[#E7F3EC] text-[#063B2A] font-bold border border-[#CBD8D1]'
                      : 'text-[#E7F3EC] hover:bg-[#075E43] hover:text-[#FFFFFF]'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#063B2A] rounded-r" />
                  )}

                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#063B2A]' : 'text-[#CBD8D1]'}`} />
                    <div className="leading-tight truncate">
                      <div className="text-[13px]">{t(item.titleKey)}</div>
                      <div className={`text-[10px] ${isActive ? 'text-[#075E43]' : 'text-[#CBD8D1]'}`}>
                        {item.titleEn}
                      </div>
                    </div>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      isActive ? 'bg-[#063B2A] text-[#FFFFFF]' : 'bg-[#D97706] text-[#FFFFFF]'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Help & Support, Settings, Version (Positioned directly under nav with zero wasted free space) */}
        <div className="px-3.5 pt-3">
          <div className="p-3 border border-[#0B4734] bg-[#04261B] rounded-[6px] space-y-1 shadow-xs">
          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs text-[#E7F3EC] hover:bg-[#075E43] transition-colors text-left"
          >
            <HelpCircle className="w-4 h-4 text-[#CBD8D1]" />
            <div className="leading-tight">
              <div>{t('helpSupport')}</div>
              <div className="text-[10px] text-[#CBD8D1]">1800-180-1551</div>
            </div>
          </button>

          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs text-[#E7F3EC] hover:bg-[#075E43] transition-colors text-left"
          >
            <Settings className="w-4 h-4 text-[#CBD8D1]" />
            <div className="leading-tight">
              <div>{t('settings')}</div>
              <div className="text-[10px] text-[#CBD8D1]">Krayam Portal</div>
            </div>
          </button>

          {!isLoggedIn && (
            <button
              onClick={() => setActiveView('auth')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs text-[#A3D99D] hover:bg-[#075E43] transition-colors text-left"
            >
              <LogIn className="w-4 h-4 text-[#A3D99D]" />
              <div className="leading-tight">
                <div>{t('login')} / {t('register')}</div>
              </div>
            </button>
          )}

          {/* Legal Links: Terms & Conditions and Privacy Policy */}
          <div className="pt-2 border-t border-[#0B4734]/60 flex items-center justify-between text-[11px] text-[#CBD8D1] px-1">
            <button
              type="button"
              onClick={() => setIsTcModalOpen(true)}
              className="hover:text-white underline transition-colors"
            >
              Terms & Conditions
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setIsPrivacyModalOpen(true)}
              className="hover:text-white underline transition-colors"
            >
              Privacy Policy
            </button>
          </div>

            <div className="pt-1 flex items-center justify-between text-[10px] text-[#CBD8D1]/80 px-1">
              <span>Krayam Platform</span>
              <span className="font-mono">v2.4.0</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ────────────────────────────────────────────────────────────────
          2. MOBILE DRAWER (Tailored specifically for Phone Viewport!
             Does NOT duplicate the 4 items pinned on the bottom bar:
             Home, Book, Queue, History. Instead, highlights Additional
             Services, Farmer Identity, Support, and Settings!)
      ──────────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop overlay */}
          <div 
            onClick={onClose}
            className="fixed inset-0 bg-[#063B2A]/70 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer container */}
          <div className="fixed inset-y-0 left-0 w-[310px] sm:w-[340px] bg-[#063B2A] text-[#FFFFFF] shadow-2xl flex flex-col justify-between z-50 overflow-y-auto pb-safe">
            <div>
              {/* Drawer Top Bar */}
              <div className="p-4 border-b border-[#0B4734] flex items-center justify-between bg-[#04261B]">
                <div>
                  <div className="font-bold text-base text-[#FFFFFF] tracking-tight flex items-center gap-2">
                    <span>KRAYAM</span>
                    <span className="text-[10px] font-normal uppercase text-[#CBD8D1] bg-[#075E43] px-1.5 py-0.5 rounded">
                      Gov Menu
                    </span>
                  </div>
                  <div className="text-[11px] text-[#CBD8D1]">
                    {t('appSubtitle')}
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-[6px] text-[#CBD8D1] hover:text-[#FFFFFF] hover:bg-[#075E43] active:scale-95"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Verified Farmer Profile Block */}
              {/* Mobile: Additional Government Services (Not on Bottom Bar) */}
              <div className="px-3.5 py-3">
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-[#CBD8D1] font-bold">
                    {t('officialServices')}
                  </span>
                  <span className="text-[9px] text-[#CBD8D1] bg-[#075E43] px-1.5 py-0.2 rounded">
                    Mandi Grid
                  </span>
                </div>

                <div className="space-y-1.5">
                  {mobileAdditionalServices.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-[6px] text-left transition-colors ${
                          isActive
                            ? 'bg-[#E7F3EC] text-[#063B2A] font-bold border border-[#CBD8D1]'
                            : 'text-[#E7F3EC] hover:bg-[#075E43] hover:text-[#FFFFFF] bg-[#075E43]/40 border border-[#0B4734]'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className={`p-1.5 rounded ${isActive ? 'bg-[#063B2A] text-[#E7F3EC]' : 'bg-[#075E43] text-[#CBD8D1]'}`}>
                            <Icon className="w-4 h-4 flex-shrink-0" />
                          </div>
                          <div className="leading-tight truncate">
                            <div className="text-xs font-bold">{t(item.titleKey)}</div>
                            <div className={`text-[10px] ${isActive ? 'text-[#075E43]' : 'text-[#CBD8D1]'}`}>
                              {item.titleEn}
                            </div>
                            <div className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-[#34443D]' : 'text-[#CBD8D1]/80'}`}>
                              {item.desc}
                            </div>
                          </div>
                        </div>

                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#D97706] text-[#FFFFFF] flex-shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Bar Reminder Strip (Explains why Home/Book/Queue/History aren't duplicated) */}
              <div className="mx-3.5 my-2 p-2.5 rounded-[6px] bg-[#04261B] border border-[#0B4734] text-[11px] text-[#CBD8D1]">
                <div className="font-bold text-[#E7F3EC] mb-1">
                  {t('servicesTitle')}
                </div>
                <div className="text-[10px] text-[#CBD8D1] leading-relaxed">
                  Home • Book • Queue • History are pinned to the bottom bar for instant 1-tap access.
                </div>
              </div>
            </div>

            {/* Mobile Drawer Bottom: Language & Support */}
            <div className="p-3.5 border-t border-[#0B4734] bg-[#04261B] space-y-2">
              {/* Language Dropdown Selector in Drawer */}
              <div className="flex items-center justify-between text-xs text-[#CBD8D1] pb-2 border-b border-[#0B4734]">
                <span className="flex items-center gap-1 text-[11px]">
                  <Globe className="w-3.5 h-3.5 text-[#CBD8D1]" />
                  {t('language')}:
                </span>
                <LanguageDropdown variant="header" direction="up" align="right" />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => { setIsHelpModalOpen(true); onClose(); }}
                  className="h-9 px-2.5 rounded-[6px] bg-[#075E43] hover:bg-[#0B6B4F] text-[#FFFFFF] text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{t('helpSupport')}</span>
                </button>

                <button
                  onClick={() => { setIsSettingsModalOpen(true); onClose(); }}
                  className="h-9 px-2.5 rounded-[6px] bg-[#075E43] hover:bg-[#0B6B4F] text-[#FFFFFF] text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>{t('settings')}</span>
                </button>
              </div>

              {/* Mobile Auth Button */}
              {!isLoggedIn && (
                <div className="pt-1">
                  <button
                    onClick={() => {
                      setActiveView('auth');
                      onClose();
                    }}
                    className="w-full h-9 px-2.5 rounded-[6px] bg-[#075E43] hover:bg-[#0B6B4F] text-[#A3D99D] text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#16845F]"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{t('login')} / {t('register')}</span>
                  </button>
                </div>
              )}

              {/* Mobile Legal Links */}
              <div className="pt-2 border-t border-[#0B4734] flex items-center justify-center gap-3 text-[11px] text-[#CBD8D1]">
                <button
                  type="button"
                  onClick={() => { setIsTcModalOpen(true); onClose(); }}
                  className="hover:text-white underline transition-colors"
                >
                  Terms & Conditions
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => { setIsPrivacyModalOpen(true); onClose(); }}
                  className="hover:text-white underline transition-colors"
                >
                  Privacy Policy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
