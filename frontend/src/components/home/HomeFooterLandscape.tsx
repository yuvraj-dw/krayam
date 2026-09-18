import React from 'react';
import { useApp } from '../../context/AppContext';
import { getHomeText } from '../../i18n/homeTranslations';

interface HomeFooterProps {
  onNavigateToAuth?: () => void;
}

export const HomeFooterLandscape: React.FC<HomeFooterProps> = ({ onNavigateToAuth }) => {
  const { language, setIsTcModalOpen, setIsPrivacyModalOpen, setIsHelpModalOpen } = useApp();
  const ht = getHomeText(language);

  return (
    <footer className="relative w-full overflow-hidden bg-[#063324] text-white shrink-0">
      {/* Scenic Rolling Hills and Agricultural Landscape Graphic - Compact for 1-screen desktop fit */}
      <div className="w-full relative h-7 sm:h-9 lg:h-11 -mb-1 select-none pointer-events-none">
        <svg
          className="w-full h-full object-cover"
          viewBox="0 0 1440 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          {/* Distant Light Green Rolling Hills */}
          <path
            d="M0,100 C200,60 380,120 600,80 C820,40 1020,110 1240,70 C1360,50 1400,65 1440,75 L1440,180 L0,180 Z"
            fill="#7CAE8E"
            fillOpacity="0.45"
          />

          {/* Distant Trees on Background Hill */}
          <g fill="#5F9573" opacity="0.7">
            <circle cx="450" cy="85" r="14" />
            <circle cx="468" cy="88" r="11" />
            <circle cx="436" cy="90" r="10" />
            <circle cx="1180" cy="74" r="16" />
            <circle cx="1202" cy="78" r="12" />
            <circle cx="1160" cy="80" r="11" />
            <circle cx="80" cy="92" r="13" />
            <circle cx="98" cy="96" r="9" />
          </g>

          {/* Mid Layer: Rolling Hills */}
          <path
            d="M0,120 C180,90 360,140 580,110 C800,80 980,135 1200,105 C1340,88 1400,100 1440,108 L1440,180 L0,180 Z"
            fill="#1B6347"
            fillOpacity="0.7"
          />

          {/* Trees on Mid Hill */}
          <g fill="#144F38">
            <circle cx="45" cy="112" r="18" />
            <circle cx="68" cy="116" r="13" />
            <circle cx="28" cy="118" r="14" />

            <circle cx="1380" cy="102" r="20" />
            <circle cx="1405" cy="108" r="14" />
            <circle cx="1355" cy="110" r="15" />
            
            <circle cx="1120" cy="104" r="12" />
            <circle cx="1135" cy="107" r="9" />

            <circle cx="290" cy="120" r="10" />
            <circle cx="304" cy="122" r="8" />
          </g>

          {/* Tractor Silhouette Driving across field */}
          <g fill="#144F38" transform="translate(920, 110) scale(0.75)">
            {/* Cabin */}
            <rect x="18" y="2" width="16" height="18" rx="2" />
            {/* Hood / Engine */}
            <path d="M4 11 L18 11 L18 20 L4 20 Z" />
            {/* Chimney / Exhaust pipe */}
            <rect x="7" y="5" width="2" height="7" />
            {/* Steering wheel hint */}
            <line x1="20" y1="8" x2="25" y2="12" stroke="#144F38" strokeWidth="2" />
            {/* Large Rear Wheel */}
            <circle cx="28" cy="22" r="9" fill="#0A3323" stroke="#144F38" strokeWidth="2" />
            <circle cx="28" cy="22" r="4" fill="#1B6347" />
            {/* Small Front Wheel */}
            <circle cx="7" cy="24" r="5" fill="#0A3323" stroke="#144F38" strokeWidth="1.5" />
            <circle cx="7" cy="24" r="2" fill="#1B6347" />
          </g>

          {/* Front Foreground Solid Layer */}
          <path
            d="M0,142 C240,132 520,150 760,138 C1040,126 1280,145 1440,136 L1440,180 L0,180 Z"
            fill="#063324"
          />
        </svg>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 pt-0.5 pb-2 sm:pb-3 relative z-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
          
          {/* Left: KRAYAM Branding */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-center sm:text-left">
            {/* Actual KRAYAM Logo */}
            <div className="w-6 h-6 sm:w-7 sm:h-7 shrink-0">
              <img
                src="/logo.png"
                alt="KRAYAM Logo"
                className="w-full h-full object-contain select-none"
              />
            </div>

            <div>
              <div className="text-sm sm:text-base font-extrabold tracking-wide text-white leading-none">
                {ht.appTitle}
              </div>
              <div className="text-[9px] sm:text-[10px] text-[#A6DEC0] font-medium leading-none mt-0.5">
                {ht.appSubtitle}
              </div>
            </div>
          </div>

          {/* Right: Legal & Info Navigation Links */}
          <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-[#CFEAD8]">
            <button
              type="button"
              onClick={() => setIsHelpModalOpen(true)}
              className="hover:text-white transition-colors py-0.5 cursor-pointer focus:outline-hidden"
            >
              {ht.footerAbout}
            </button>
            <span className="text-[#327A59]">|</span>
            <button
              type="button"
              onClick={() => setIsPrivacyModalOpen(true)}
              className="hover:text-white transition-colors py-0.5 cursor-pointer focus:outline-hidden"
            >
              {ht.footerPrivacy}
            </button>
            <span className="text-[#327A59]">|</span>
            <button
              type="button"
              onClick={() => setIsTcModalOpen(true)}
              className="hover:text-white transition-colors py-0.5 cursor-pointer focus:outline-hidden"
            >
              {ht.footerTerms}
            </button>
          </div>

        </div>
      </div>
    </footer>
  );
};
