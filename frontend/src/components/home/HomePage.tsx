import React from 'react';
import { useApp } from '../../context/AppContext';
import { HomeFooterLandscape } from './HomeFooterLandscape';
import { LanguageDropdown } from '../common/LanguageDropdown';
import { getHomeText } from '../../i18n/homeTranslations';
import { 
  User, 
  ChevronRight, 
  Calendar, 
  QrCode, 
  Scale, 
  IndianRupee, 
  Bell, 
  FileText, 
  Sprout 
} from 'lucide-react';

interface HomePageProps {
  onNavigateToAuth: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigateToAuth }) => {
  const { language, isLoggedIn, userRole, setActiveView } = useApp();
  const ht = getHomeText(language);

  const handleAuthClick = () => {
    if (isLoggedIn) {
      setActiveView('dashboard');
    } else {
      onNavigateToAuth();
    }
  };

  const newsImages = [
    '/assets/home/news-1.png',
    '/assets/home/news-2.png',
    '/assets/home/news-3.png',
    '/assets/home/news-4.png',
  ];

  const solutionIcons = [
    Calendar,
    QrCode,
    Scale,
    IndianRupee,
    Bell,
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-white text-[#17231F] font-['Inter',sans-serif] selection:bg-[#075E43] selection:text-white overflow-x-hidden w-full">
      
      {/* 1. TOP HEADER & BRANDING */}
      <header className="w-full bg-white border-b border-[#EDF3EF] sticky top-0 z-30 shadow-xs shrink-0">
        <div className="max-w-[1440px] mx-auto px-2.5 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Top Left: KRAYAM Sprout Logo & Portal Identity */}
          <div 
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group select-none shrink-0" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            {/* Actual KRAYAM Logo */}
            <div className="w-7 h-7 sm:w-9 sm:h-9 shrink-0 transition-transform group-hover:scale-105">
              <img
                src="/logo.png"
                alt="KRAYAM Logo"
                className="w-full h-full object-contain select-none"
              />
            </div>

            <div className="min-w-0">
              <div className="text-base sm:text-xl font-black text-[#0B402E] tracking-tight leading-none">
                {ht.appTitle}
              </div>
              <div className="hidden xs:block sm:block text-[9px] sm:text-[11px] font-semibold text-[#1B6F4F] tracking-tight leading-none mt-0.5 truncate">
                {ht.appSubtitle}
              </div>
            </div>
          </div>

          {/* Top Right: Language Dropdown + Green Register/Log In button */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Language Selector */}
            <LanguageDropdown variant="modal" align="right" className="shrink-0" />

            {/* Green Pill Action Button - Guaranteed to fit inside mobile viewport */}
            <button
              type="button"
              id="krayam-home-login-btn"
              onClick={handleAuthClick}
              className="inline-flex items-center justify-center gap-1 sm:gap-1.5 bg-[#063B2A] hover:bg-[#09573E] active:bg-[#04261B] text-white px-2.5 sm:px-4 lg:px-5 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-semibold tracking-wide transition-all shadow-sm hover:shadow-md cursor-pointer shrink-0 whitespace-nowrap"
            >
              <User className="w-3.5 h-3.5 text-white shrink-0" />
              <span>{isLoggedIn ? ht.goToDashboard : ht.registerLogin}</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. HERO SECTION - Compact for 1-screen desktop fit */}
      <section className="relative w-full overflow-hidden bg-white border-b border-[#EAF2ED] shrink-0">
        <div className="max-w-[1440px] mx-auto h-auto lg:h-[205px] xl:h-[220px] relative flex flex-col lg:flex-row items-center justify-between">
          
          {/* Left Text Content Area */}
          <div className="w-full lg:w-1/2 px-4 sm:px-6 lg:px-8 py-5 sm:py-6 lg:py-3 z-10 flex flex-col justify-center">
            
            {/* Main Headline */}
            <h1 className="text-xl sm:text-2xl lg:text-[25px] xl:text-[27px] font-black text-[#0D382B] leading-[1.14] tracking-tight">
              {ht.heroTitleLine1}<br />
              {ht.heroTitleLine2}<br />
              {ht.heroTitleLine3}
            </h1>

            {/* Supporting Text */}
            <div className="mt-2 sm:mt-2.5 space-y-0.5 max-w-lg text-[#324C41]">
              <p className="text-xs sm:text-[13px] font-bold text-[#143B2E] tracking-tight">
                {ht.heroSubtitleTag}
              </p>
              <p className="text-[11px] sm:text-xs leading-snug text-[#4A6458]">
                {ht.heroSubtitleDesc}
              </p>
            </div>

            {/* Direct CTA on Mobile */}
            <div className="mt-3.5 flex sm:hidden">
              <button
                type="button"
                onClick={handleAuthClick}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-[#063B2A] text-white py-2 px-3 rounded-lg font-semibold text-xs shadow-xs"
              >
                <User className="w-3.5 h-3.5" />
                <span>{isLoggedIn ? ht.goToDashboard : ht.registerLogin}</span>
              </button>
            </div>
          </div>

          {/* Right Hero Image Area (Indian Farmer in field holding smartphone with QR code) */}
          <div className="w-full lg:w-1/2 relative h-[200px] sm:h-[240px] lg:h-full flex items-center justify-end overflow-hidden">
            
            {/* Gradient overlay for soft seamless fade from left white background into the photo */}
            <div className="absolute inset-0 z-1 pointer-events-none bg-gradient-to-r from-white via-white/40 to-transparent lg:via-white/10 hidden sm:block w-24" />
            
            {/* Hero Image (contains the original Digital Today, Better Tomorrow text) */}
            <img
              src="/assets/home/hero-farmer.png"
              alt="Farmer using KRAYAM Digital Procurement Platform"
              className="w-full h-full object-cover object-center lg:object-right select-none"
            />
          </div>

        </div>
      </section>

      {/* 3. MAIN LOWER CONTENT: TWO EQUAL COLUMNS - Compact padding & heights for 1-screen fit */}
      <main className="flex-1 w-full bg-[#F5F9F6] py-2.5 sm:py-3 lg:py-3 px-3 sm:px-5 lg:px-8 flex flex-col justify-center">
        <div className="max-w-[1440px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-5 items-stretch">
          
          {/* ================= COLUMN 1: LATEST NEWS & UPDATES ================= */}
          <div className="bg-white rounded-xl p-3 sm:p-3.5 lg:p-4 shadow-[0_1px_6px_rgba(0,0,0,0.03)] border border-[#E3ECE6] flex flex-col justify-between">
            
            {/* Section Header */}
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[#EDF3EF]">
              <div className="w-6 h-6 rounded-md bg-[#EAF5EE] flex items-center justify-center text-[#075E43] shrink-0">
                <FileText className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <h2 className="text-xs sm:text-sm font-extrabold text-[#0E3527] tracking-tight">
                {ht.newsSectionTitle}
              </h2>
            </div>

            {/* News Updates List - ARROWS REMOVED */}
            <div className="divide-y divide-[#EDF3EF] flex-1 flex flex-col justify-around">
              {ht.newsItems.map((item, idx) => (
                <div 
                  key={idx}
                  className="py-1.5 sm:py-2 first:pt-0 last:pb-0 flex items-center gap-2.5 sm:gap-3 group cursor-pointer hover:bg-[#F9FCFA] -mx-1 px-1 rounded-lg transition-colors"
                >
                  {/* News Thumbnail Image */}
                  <div className="w-14 h-10 sm:w-16 sm:h-11 rounded-md overflow-hidden shrink-0 border border-[#CBD8D1]/60 shadow-xs bg-[#EDF3EF]">
                    <img 
                      src={newsImages[idx] || newsImages[0]} 
                      alt={item.state} 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  {/* News Meta & Content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] sm:text-[10px] font-semibold text-[#66736D] tracking-wide mb-0.5">
                      <span>{item.date}</span>
                      <span className="mx-1 text-[#CBD8D1]">|</span>
                      <span className="text-[#075E43]">{item.state}</span>
                    </div>
                    <p className="text-[11px] sm:text-xs font-semibold text-[#17231F] leading-snug group-hover:text-[#075E43] transition-colors line-clamp-2">
                      {item.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* ================= COLUMN 2: HOW KRAYAM SOLVES THESE PROBLEMS ================= */}
          <div className="bg-[#EBF5EF] rounded-xl p-3 sm:p-3.5 lg:p-4 shadow-[0_1px_6px_rgba(0,0,0,0.03)] border border-[#D9EBDF] flex flex-col justify-between">
            
            {/* Section Header */}
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[#D8E8DD]">
              <div className="w-6 h-6 rounded-md bg-[#075E43] flex items-center justify-center text-white shrink-0">
                <Sprout className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <h2 className="text-xs sm:text-sm font-extrabold text-[#0E3527] tracking-tight">
                {ht.solutionsSectionTitle}
              </h2>
            </div>

            {/* 5 Solution Cards */}
            <div className="space-y-1 sm:space-y-1.5 flex-1 flex flex-col justify-around">
              {ht.solutions.map((feat, idx) => {
                const IconComponent = solutionIcons[idx] || solutionIcons[0];
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-lg p-1.5 sm:p-2 flex items-center gap-2 sm:gap-2.5 shadow-none border border-[#E2EBE5] hover:border-[#075E43]/40 transition-all"
                  >
                    {/* Dark Green Circular Icon Badge */}
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#075E43] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <IconComponent className="w-3.5 h-3.5 stroke-[2]" />
                    </div>

                    {/* Solution Title & Description */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[11px] sm:text-xs font-bold text-[#0D382B] leading-none">
                        {feat.title}
                      </h3>
                      <p className="text-[9px] sm:text-[10px] text-[#52635B] leading-tight mt-0.5">
                        {feat.desc}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* 6th Highlight Card at bottom: "With KRAYAM, procurement becomes simpler, faster and fairer..." (ARROW PRESERVED) */}
              <div 
                onClick={handleAuthClick}
                className="bg-[#D3EBD9] hover:bg-[#C8E5CF] transition-colors rounded-lg p-1.5 sm:p-2 flex items-center justify-between gap-2 cursor-pointer border border-[#BBDDC3] shadow-none mt-1 group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-[#E8F6ED] flex items-center justify-center shrink-0 border border-[#99D2AA] text-[#075E43]">
                    <Sprout className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[10px] sm:text-[11px] font-bold text-[#0E3E2B] leading-tight">
                    {ht.closingCallout}
                  </p>
                </div>

                <div className="shrink-0 text-[#0E3E2B] group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* 4. SCENIC AGRICULTURAL FOOTER */}
      <HomeFooterLandscape onNavigateToAuth={handleAuthClick} />

    </div>
  );
};
