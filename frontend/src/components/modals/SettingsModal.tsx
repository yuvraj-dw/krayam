import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Language } from '../../types';
import { INDIAN_LANGUAGES } from '../../i18n/languages';
import { X, Globe, Bell, Eye, Check } from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const { 
    isSettingsModalOpen, 
    setIsSettingsModalOpen, 
    language, 
    setLanguage,
    t
  } = useApp();

  const [smsTokenAlert, setSmsTokenAlert] = useState(true);
  const [smsQueueAlert, setSmsQueueAlert] = useState(true);
  const [smsPaymentAlert, setSmsPaymentAlert] = useState(true);

  if (!isSettingsModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#063B2A]/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] max-w-lg w-full shadow-gov-dropdown max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#EDF3EF] px-5 py-3.5 border-b border-[#CBD8D1] flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-[#17231F]">
              {t('settings')}
            </h3>
            <p className="text-xs text-[#66736D]">
              Top 10 Most Spoken Languages in India + English
            </p>
          </div>
          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="p-1 rounded text-[#66736D] hover:text-[#17231F] hover:bg-[#CBD8D1]/40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Language Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs uppercase font-bold tracking-wider text-[#17231F]">
                <Globe className="w-4 h-4 text-[#075E43]" />
                <span>{t('language')}</span>
              </div>
              <span className="text-[10px] bg-[#E7F3EC] text-[#075E43] font-bold px-2 py-0.5 rounded border border-[#CBD8D1]">
                11 Languages
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {INDIAN_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`p-2.5 rounded-[6px] border text-left flex flex-col justify-between transition-colors ${
                    language === l.code
                      ? 'border-[#075E43] bg-[#E7F3EC] font-bold text-[#063B2A] ring-1 ring-[#075E43]'
                      : 'border-[#CBD8D1] bg-[#FFFFFF] hover:bg-[#F3F9F5] text-[#17231F]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-semibold">{l.englishName}</span>
                    {language === l.code && (
                      <Check className="w-3.5 h-3.5 text-[#075E43]" />
                    )}
                  </div>
                  <div className="text-sm font-bold text-[#063B2A] mt-0.5">{l.name}</div>
                  <div className="text-[10px] text-[#66736D] mt-0.5 font-mono">{l.speakersShare}</div>
                </button>
              ))}
            </div>
          </div>

          {/* SMS & Mandi Telemetry Alerts */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs uppercase font-bold tracking-wider text-[#17231F]">
              <Bell className="w-4 h-4 text-[#075E43]" />
              <span>SMS & Gateway Alerts / एसएमएस अलर्ट</span>
            </div>
            <div className="space-y-2 text-xs">
              <label className="flex items-center justify-between p-3 rounded-[6px] border border-[#CBD8D1] bg-[#FFFFFF]">
                <div>
                  <div className="font-semibold text-[#17231F]">Token Generation & Slot Confirmation</div>
                  <div className="text-[#66736D] text-[11px]">Instant SMS upon reserving mandi slot</div>
                </div>
                <input
                  type="checkbox"
                  checked={smsTokenAlert}
                  onChange={(e) => setSmsTokenAlert(e.target.checked)}
                  className="w-4 h-4 text-[#075E43] focus:ring-[#075E43] rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-[6px] border border-[#CBD8D1] bg-[#FFFFFF]">
                <div>
                  <div className="font-semibold text-[#17231F]">Weighbridge Turn Approaching Alert</div>
                  <div className="text-[#66736D] text-[11px]">Advance SMS warning when 2 vehicles remain ahead</div>
                </div>
                <input
                  type="checkbox"
                  checked={smsQueueAlert}
                  onChange={(e) => setSmsQueueAlert(e.target.checked)}
                  className="w-4 h-4 text-[#075E43] focus:ring-[#075E43] rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-[6px] border border-[#CBD8D1] bg-[#FFFFFF]">
                <div>
                  <div className="font-semibold text-[#17231F]">DBT Direct Payment Confirmation</div>
                  <div className="text-[#66736D] text-[11px]">PFMS transaction and credit SMS alert</div>
                </div>
                <input
                  type="checkbox"
                  checked={smsPaymentAlert}
                  onChange={(e) => setSmsPaymentAlert(e.target.checked)}
                  className="w-4 h-4 text-[#075E43] focus:ring-[#075E43] rounded"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="bg-[#EDF3EF] px-5 py-3 border-t border-[#CBD8D1] flex justify-end">
          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="h-10 px-5 rounded-[6px] bg-[#0B6B4F] hover:bg-[#075E43] text-[#FFFFFF] font-semibold text-xs"
          >
            {t('save')} & {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};
