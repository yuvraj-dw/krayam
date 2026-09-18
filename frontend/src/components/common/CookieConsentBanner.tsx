import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Cookie, X, ShieldCheck } from 'lucide-react';

export const CookieConsentBanner: React.FC = () => {
  const { setIsCookieModalOpen, setIsPrivacyModalOpen } = useApp();
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    // Check if user has already chosen cookie preferences
    const savedConsent = localStorage.getItem('krayam_cookie_consent');
    if (!savedConsent) {
      // Small delay for smooth entry
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleChoice = (choice: 'all' | 'essential' | 'declined') => {
    localStorage.setItem('krayam_cookie_consent', choice);
    localStorage.setItem('krayam_cookie_consent_date', new Date().toISOString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div 
      role="region"
      aria-label="Cookie consent banner"
      className="fixed bottom-20 lg:bottom-4 right-2 sm:right-4 z-50 w-[calc(100vw-1rem)] sm:w-[420px] max-w-full bg-[#FFFFFF] border-2 border-[#075E43] rounded-[10px] shadow-2xl p-3.5 sm:p-5 text-[#17231F] font-['Inter'] animate-in slide-in-from-bottom-5 duration-300"
    >
      {/* Top Banner Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#E7F3EC] border border-[#A7D1BD] flex items-center justify-center text-[#075E43] flex-shrink-0">
            <Cookie className="w-4 h-4" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-[#063B2A] tracking-tight">
            We use cookies
          </h3>
        </div>
        <button
          type="button"
          onClick={() => handleChoice('declined')}
          className="text-[#66736D] hover:text-[#17231F] p-1.5 rounded hover:bg-[#F0F4F2] transition-colors"
          title="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Copy */}
      <p className="mt-2 text-xs sm:text-[13px] text-[#33413B] leading-relaxed">
        Krayam uses essential cookies to keep the platform secure and functional. With your permission, we may also use optional cookies to remember preferences and understand how the website is used.
      </p>

      <p className="mt-1.5 text-xs sm:text-[13px] text-[#33413B]">
        Read our{' '}
        <button
          type="button"
          onClick={() => setIsCookieModalOpen(true)}
          className="font-bold text-[#075E43] underline hover:text-[#04261B] transition-colors"
        >
          Cookie Policy
        </button>{' '}
        and{' '}
        <button
          type="button"
          onClick={() => setIsPrivacyModalOpen(true)}
          className="font-bold text-[#075E43] underline hover:text-[#04261B] transition-colors"
        >
          Privacy Policy
        </button>{' '}
        to learn more.
      </p>

      {/* Button Actions */}
      <div className="mt-3.5 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => handleChoice('all')}
          className="w-full py-2 px-3 bg-[#075E43] hover:bg-[#063B2A] active:bg-[#04261B] text-[#FFFFFF] text-xs font-bold rounded-[6px] transition-colors shadow-sm flex items-center justify-center gap-1.5 min-h-[40px]"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#85E1A9]" />
          <span>Accept All</span>
        </button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            type="button"
            onClick={() => handleChoice('essential')}
            className="flex-1 py-1.5 px-2.5 bg-[#EDF3EF] hover:bg-[#DEE9E3] text-[#063B2A] border border-[#CBD8D1] text-xs font-semibold rounded-[6px] transition-colors text-center truncate min-h-[36px]"
            title="Accept Only Essential Cookies"
          >
            Accept Only Essential Cookies
          </button>

          <button
            type="button"
            onClick={() => handleChoice('declined')}
            className="py-1.5 px-3 bg-[#F8FAF9] hover:bg-[#EDF3EF] text-[#66736D] hover:text-[#17231F] border border-[#CBD8D1] text-xs font-medium rounded-[6px] transition-colors whitespace-nowrap min-h-[36px]"
          >
            Do Not Accept
          </button>
        </div>
      </div>

      {/* Subtext */}
      <div className="mt-3 pt-2.5 border-t border-[#EDF3EF] text-[11px] text-[#66736D] text-center">
        You can change your cookie preferences later.
      </div>
    </div>
  );
};
