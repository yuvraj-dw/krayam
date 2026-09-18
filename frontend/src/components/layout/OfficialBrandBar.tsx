import React from 'react';
import { useApp } from '../../context/AppContext';

interface OfficialBrandBarProps {
  onClick?: () => void;
  className?: string;
}

export const OfficialBrandBar: React.FC<OfficialBrandBarProps> = ({
  onClick,
  className = ""
}) => {
  const { t } = useApp();

  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-2 sm:gap-3.5 md:gap-4 cursor-pointer group min-w-0 flex-1 ${className}`}
    >
      {/* 1. KRAYAM Sprout Logo */}
      <div className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
        <img 
          src="/logo.png" 
          alt="KRAYAM Logo" 
          className="w-full h-full object-contain select-none" 
        />
      </div>

      {/* 2. KRAYAM Name & Subtitle */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline">
          <span className="text-lg sm:text-2xl font-black tracking-tight text-[#063B2A] leading-tight">
            {t('appTitle')}
          </span>
        </div>
        <div className="text-[9px] sm:text-xs font-medium sm:font-semibold text-[#075E43] leading-snug sm:leading-tight mt-0.5 whitespace-normal sm:whitespace-nowrap">
          {t('appSubtitle')}
        </div>
      </div>
    </div>
  );
};

