import React from 'react';

export const GovernmentFooter: React.FC = () => {
  return (
    <footer className="w-full bg-[#FFFFFF] border-t border-[#CBD8D1] py-4 text-xs text-[#34443D] mt-auto">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
        {/* Bottom Attribution & Version */}
        <div className="flex items-center justify-center sm:justify-end text-[11px] text-[#66736D]">
          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span>National Agri-Procurement Network</span>
            <span>|</span>
            <span className="font-bold text-[#063B2A]">Version 2.4.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

