import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Language } from '../../types';
import { INDIAN_LANGUAGES } from '../../i18n/languages';
import { Globe, ChevronDown, Check } from 'lucide-react';

interface LanguageDropdownProps {
  className?: string;
  variant?: 'header' | 'sidebar' | 'modal';
  align?: 'left' | 'right';
  direction?: 'up' | 'down';
}

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({ 
  className = '',
  variant = 'header',
  align = 'right',
  direction = 'down'
}) => {
  const { language, setLanguage } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = INDIAN_LANGUAGES.find(l => l.code === language) || INDIAN_LANGUAGES[0];

  // Close on outside click or touch
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick, { passive: true });
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (code: Language) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Optional Mobile Backdrop for clean outside click dismissal on phone/tablet */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 sm:hidden" 
          onClick={() => setIsOpen(false)} 
          aria-hidden="true" 
        />
      )}

      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-[11px] font-semibold transition-all border ${
          variant === 'header'
            ? 'bg-[#075E43] hover:bg-[#0B6B4F] text-[#FFFFFF] border-[#16845F] shadow-xs active:scale-98'
            : 'bg-[#FFFFFF] hover:bg-[#F3F9F5] text-[#17231F] border-[#CBD8D1]'
        }`}
        title="Change Language / भाषा बदलें"
      >
        <Globe className="w-3.5 h-3.5 text-[#A3D99D] flex-shrink-0" />
        <span className="tracking-wide">
          {currentLang.name}
        </span>
        {currentLang.name !== currentLang.englishName && (
          <span className="text-[9px] opacity-75 font-normal hidden md:inline">
            ({currentLang.englishName})
          </span>
        )}
        <ChevronDown className={`w-3 h-3 text-[#CBD8D1] transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Modal List */}
      {isOpen && (
        <div 
          className={`absolute ${
            align === 'left' ? 'left-0' : 'right-0'
          } ${
            direction === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } w-64 sm:w-72 max-w-[calc(100vw-1.5rem)] bg-[#FFFFFF] rounded-[8px] shadow-[0_10px_35px_rgba(0,0,0,0.25)] border border-[#CBD8D1] py-1.5 z-[100] text-[#17231F] animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden`}
          role="menu"
          aria-orientation="vertical"
        >
          {/* Header Banner */}
          <div className="px-3.5 py-2 border-b border-[#EDF3EF] bg-[#F5F8F6] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[#063B2A] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#075E43]" />
                <span>Select Language / भाषा चुनें</span>
              </div>
              <div className="text-[10px] text-[#66736D] mt-0.5">
                Top 10 Most Spoken Languages in India + English
              </div>
            </div>
            <span className="text-[9px] font-semibold bg-[#E7F3EC] text-[#075E43] border border-[#CBD8D1] px-1.5 py-0.5 rounded">
              11 Languages
            </span>
          </div>

          {/* Language Options Grid */}
          <div className="max-h-[min(320px,65vh)] overflow-y-auto py-1 divide-y divide-[#F5F8F6]">
            {INDIAN_LANGUAGES.map((langItem) => {
              const isSelected = language === langItem.code;
              return (
                <button
                  key={langItem.code}
                  onClick={() => handleSelect(langItem.code)}
                  role="menuitem"
                  className={`w-full text-left px-3.5 py-2 flex items-center justify-between gap-2 transition-colors ${
                    isSelected
                      ? 'bg-[#E7F3EC] text-[#063B2A] font-bold'
                      : 'hover:bg-[#F3F9F5] text-[#17231F]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#075E43]' : 'bg-transparent'}`} />
                    <div className="leading-tight truncate">
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        <span>{langItem.name}</span>
                        <span className="text-[11px] font-normal text-[#66736D]">
                          ({langItem.englishName})
                        </span>
                      </div>
                      <div className="text-[10px] text-[#66736D] font-normal mt-0.5 truncate">
                        {langItem.regionHint}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {langItem.speakersShare !== 'Official' && (
                      <span className="text-[10px] font-mono text-[#66736D] bg-[#F5F8F6] px-1.5 py-0.5 rounded border border-[#EDF3EF]">
                        {langItem.speakersShare}
                      </span>
                    )}
                    {isSelected ? (
                      <Check className="w-4 h-4 text-[#075E43] stroke-[2.5]" />
                    ) : (
                      <div className="w-4" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="px-3 py-1.5 bg-[#F5F8F6] border-t border-[#EDF3EF] text-[10px] text-[#66736D] text-center">
            Automatic real-time portal translation enabled
          </div>
        </div>
      )}
    </div>
  );
};
export default LanguageDropdown;
