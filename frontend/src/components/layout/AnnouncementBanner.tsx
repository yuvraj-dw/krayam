import React, { useState } from 'react';
import { X, Megaphone } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AnnouncementBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const { t, isOffline, syncOfflineQueue, isSyncing, syncQueue } = useApp();

  const pendingCount = syncQueue.filter(s => s.status === 'PENDING').length;

  if (isOffline) {
    return (
      <aside aria-label="Offline Mode Notice" className="w-full bg-[#B45309] text-[#FFFFFF] px-4 py-1.5 text-xs font-medium border-b border-[#92400E] flex items-center justify-between z-30">
        <div className="max-w-[1440px] mx-auto flex items-center justify-center gap-2 text-center w-full pr-4">
          <span className="bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded">
            OFFLINE
          </span>
          <span className="truncate">
            Offline Mode: Data saved to IndexedDB. {pendingCount > 0 ? `${pendingCount} actions pending sync.` : 'Changes will sync when connection returns.'}
          </span>
          <button
            type="button"
            onClick={() => syncOfflineQueue()}
            disabled={isSyncing}
            className="ml-2 bg-white/20 hover:bg-white/30 text-white font-bold px-2 py-0.5 rounded text-[10px] transition-colors disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </aside>
    );
  }

  if (!isVisible) return null;

  return (
    <aside aria-label="Official announcement" className="w-full bg-[#075E43] text-[#FFFFFF] px-4 py-1.5 text-xs font-medium border-b border-[#063B2A] flex items-center justify-between z-30">
      <div className="max-w-[1440px] mx-auto flex items-center justify-center gap-2 text-center w-full pr-4">
        <span className="bg-[#D97706] text-[#FFFFFF] text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded">
          {t('status')}
        </span>
        <span className="truncate">
          {t('govAnnouncement')}
        </span>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="text-[#E7F3EC] hover:text-[#FFFFFF] p-1 flex-shrink-0"
        title="Dismiss announcement"
        aria-label="Close Announcement"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </aside>
  );
};
