import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PRIVACY_POLICY_DATA } from '../../data/legalDocuments';
import { X, Search, ShieldCheck, CheckCircle2, Lock, Calendar, Building2 } from 'lucide-react';

export const PrivacyPolicyModal: React.FC = () => {
  const { isPrivacyModalOpen, setIsPrivacyModalOpen } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  if (!isPrivacyModalOpen) return null;

  const filteredSections = PRIVACY_POLICY_DATA.sections.filter(
    sec => sec.heading.toLowerCase().includes(searchTerm.toLowerCase()) ||
           sec.body.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-[#063B2A]/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[10px] max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-[#EDF3EF] px-5 py-4 border-b border-[#CBD8D1] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#075E43] flex items-center justify-center text-[#FFFFFF] shadow-sm">
              <ShieldCheck className="w-5 h-5 text-[#85E1A9]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#17231F] leading-tight">
                  Privacy Policy
                </h3>
                <span className="bg-[#16803C]/10 text-[#16803C] font-semibold text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Aadhaar & Data Protection
                </span>
              </div>
              <p className="text-xs text-[#66736D] mt-0.5 flex items-center gap-2">
                <span>Operated by <strong className="text-[#17231F]">Aurions</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Effective: {PRIVACY_POLICY_DATA.effectiveDate}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsPrivacyModalOpen(false)}
            className="p-1.5 rounded-md text-[#66736D] hover:text-[#17231F] hover:bg-[#CBD8D1]/50 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Overview Bar */}
        <div className="bg-[#F8FAF9] px-5 py-3 border-b border-[#E2EAE5] flex flex-col sm:flex-row items-center justify-between gap-2.5 flex-shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#66736D]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search in privacy sections..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#CBD8D1] rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#075E43] text-[#17231F]"
            />
          </div>
          <div className="text-[11px] text-[#66736D] flex items-center gap-1 self-start sm:self-auto">
            <Lock className="w-3.5 h-3.5 text-[#075E43]" />
            <span>Strict UIDAI Masking & AES-256 Banking Encryption Standards</span>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 text-[#17231F] text-xs sm:text-sm leading-relaxed scrollbar-thin">
          
          {/* Preamble Card */}
          {!searchTerm && (
            <div className="bg-[#EDF3EF]/60 border border-[#D5E1DA] rounded-[8px] p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#075E43]">
                <Building2 className="w-4 h-4" />
                <span>Krayam Privacy Commitment</span>
              </div>
              <p className="text-[#3E4D46]">
                {PRIVACY_POLICY_DATA.preamble}
              </p>
            </div>
          )}

          {/* Render Sections */}
          {filteredSections.length === 0 ? (
            <div className="py-12 text-center text-[#66736D]">
              <p className="text-sm font-semibold">No sections matching "{searchTerm}"</p>
              <button 
                type="button" 
                onClick={() => setSearchTerm('')}
                className="mt-2 text-xs text-[#075E43] underline font-medium"
              >
                Clear search filter
              </button>
            </div>
          ) : (
            filteredSections.map((sec, idx) => (
              <div 
                key={idx} 
                className="border-b border-[#E2EAE5] pb-5 last:border-b-0 space-y-2"
              >
                <h4 className="text-sm sm:text-base font-bold text-[#075E43] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#075E43]"></span>
                  {sec.heading}
                </h4>
                <div className="text-xs sm:text-sm text-[#2D3B35] whitespace-pre-line pl-4 border-l-2 border-[#EDF3EF]">
                  {sec.body}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="bg-[#F8FAF9] px-5 py-3.5 border-t border-[#CBD8D1] flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="text-[11px] text-[#66736D]">
            Last updated: 14 September 2026 • Aurions Privacy Division
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsPrivacyModalOpen(false)}
              className="px-5 py-2 bg-[#075E43] hover:bg-[#063B2A] text-[#FFFFFF] rounded-[6px] text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-[#85E1A9]" />
              <span>Understood</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
