import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, Phone, FileQuestion, ExternalLink, ShieldCheck } from 'lucide-react';

export const HelpSupportModal: React.FC = () => {
  const { isHelpModalOpen, setIsHelpModalOpen, t } = useApp();

  if (!isHelpModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#063B2A]/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-gov-dropdown">
        {/* Header */}
        <div className="bg-[#EDF3EF] px-5 py-3.5 border-b border-[#CBD8D1] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#17231F]">
              {t('helpSupport')}
            </h3>
            <p className="text-xs text-[#66736D]">
              {t('ministryName')}, {t('govOfIndia')}
            </p>
          </div>
          <button
            onClick={() => setIsHelpModalOpen(false)}
            className="p-1 rounded text-[#66736D] hover:text-[#17231F] hover:bg-[#CBD8D1]/40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Toll Free Helpline Box */}
          <div className="bg-[#FFF9ED] border border-[#F0D7A7] rounded-[6px] p-4 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-full bg-[#FFF3DC] border border-[#F0D7A7] text-[#D97706] flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-wide text-[#D97706]">
                National Kisan Call Centre (Toll-Free)
              </div>
              <div className="text-2xl font-mono font-bold text-[#17231F] mt-0.5">
                1800-180-1551
              </div>
              <div className="text-xs text-[#66736D] mt-0.5">
                Operational 06:00 AM to 10:00 PM (All 365 Days) — Free assistance in 22 official languages
              </div>
            </div>
          </div>

          {/* Local Mandi Official Contacts */}
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-[#17231F] mb-2 pb-1 border-b border-[#EDF3EF]">
              Local District Mandi Contacts / स्थानीय संपर्क
            </h4>
            <div className="border border-[#CBD8D1] rounded-[6px] overflow-hidden">
              <table className="gov-table">
                <tbody>
                  <tr>
                    <td className="bg-[#EDF3EF] font-semibold text-xs text-[#17231F] w-2/5">Samrala Main Mandi</td>
                    <td className="text-xs text-[#17231F]">
                      <div className="font-bold">Sh. Rajesh Kumar (Secretary)</div>
                      <div className="text-[#075E43] font-mono">+91 1628 234190</div>
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-[#EDF3EF] font-semibold text-xs text-[#17231F]">District Mandi Office</td>
                    <td className="text-xs text-[#17231F]">
                      <div className="font-bold">Ludhiana Mandi Board Secretariat</div>
                      <div className="text-[#075E43] font-mono">+91 161 2401890</div>
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-[#EDF3EF] font-semibold text-xs text-[#17231F]">DBT / PFMS Grievance</td>
                    <td className="text-xs text-[#17231F]">
                      <div className="font-bold">Treasury Payment Cell</div>
                      <div className="text-[#075E43] font-mono">1800-118-111</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Frequently Asked Questions */}
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-[#17231F] mb-2 pb-1 border-b border-[#EDF3EF]">
              Frequently Asked Questions / अक्सर पूछे जाने वाले प्रश्न
            </h4>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded bg-[#F5F8F6] border border-[#CBD8D1]">
                <div className="font-bold text-[#17231F]">Q: What documents are mandatory at mandi gate entry?</div>
                <div className="text-[#66736D] mt-0.5">A: Original Aadhaar card, Mandi token SMS/printout, and Landholding record (Fard/Jamabandi).</div>
              </div>
              <div className="p-2.5 rounded bg-[#F5F8F6] border border-[#CBD8D1]">
                <div className="font-bold text-[#17231F]">Q: How long does DBT disbursement take after weighing?</div>
                <div className="text-[#66736D] mt-0.5">A: Government norms ensure direct credit into farmer bank account within 24 to 48 hours of quality inspection.</div>
              </div>
              <div className="p-2.5 rounded bg-[#F5F8F6] border border-[#CBD8D1]">
                <div className="font-bold text-[#17231F]">Q: What moisture level is permissible for Wheat procurement?</div>
                <div className="text-[#66736D] mt-0.5">A: Up to 12% moisture is accepted without deductions. Produce between 12%–14% incurs standard dockage.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#EDF3EF] px-5 py-3 border-t border-[#CBD8D1] flex justify-end">
          <button
            onClick={() => setIsHelpModalOpen(false)}
            className="h-10 px-5 rounded-[6px] bg-[#0B6B4F] hover:bg-[#075E43] text-[#FFFFFF] font-semibold text-xs"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};
