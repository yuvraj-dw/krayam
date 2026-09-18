import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, CheckCheck, Clock, ArrowRight } from 'lucide-react';

export const NotificationsView: React.FC = () => {
  const { 
    notifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    setActiveView,
    t
  } = useApp();

  const newAlerts = notifications.filter(n => !n.read);
  const readAlerts = notifications.filter(n => n.read);

  const handleNotificationClick = (notif: typeof notifications[0]) => {
    markNotificationAsRead(notif.id);
    if (notif.type === 'QUEUE' || notif.type === 'BOOKING') {
      setActiveView('tracking');
    } else if (notif.type === 'PROCUREMENT' || notif.type === 'PAYMENT') {
      setActiveView('procurement');
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#17231F]">
            {t('notificationsTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-[#66736D] mt-0.5">
            {t('descAlerts')}
          </p>
        </div>

        {newAlerts.length > 0 && (
          <button
            onClick={markAllNotificationsAsRead}
            className="h-10 px-4 rounded-[6px] bg-[#FFFFFF] border border-[#CBD8D1] hover:bg-[#F3F9F5] text-xs font-semibold text-[#17231F] flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-[#075E43]" />
            <span>{t('markAllRead')}</span>
          </button>
        )}
      </div>

      {/* Section 20: Prioritized Alerts List */}
      <div className="space-y-6">
        
        {/* NEW ALERTS SECTION */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#D97706] bg-[#FFF3DC] px-2 py-0.5 rounded-[4px] border border-[#F0D7A7]">
              {t('newBadge')} ({newAlerts.length})
            </span>
          </div>

          {newAlerts.length === 0 ? (
            <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-6 text-center text-xs text-[#66736D]">
              {t('noNotifications')}
            </div>
          ) : (
            <div className="space-y-2.5">
              {newAlerts.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className="bg-[#FFFFFF] border-l-4 border-l-[#D97706] border-y border-r border-[#CBD8D1] rounded-[6px] p-4 sm:p-5 hover:bg-[#F3F9F5] transition-colors cursor-pointer flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse" />
                      <h2 className="text-sm font-bold text-[#17231F] leading-tight">
                        {notif.title}
                      </h2>
                    </div>
                    <p className="text-xs text-[#34443D] pl-4 leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="text-[11px] text-[#66736D] pl-4 flex items-center gap-1 pt-1">
                      <Clock className="w-3 h-3 text-[#66736D]" />
                      <span>{notif.timestamp}</span>
                    </div>
                  </div>

                  <button className="text-xs font-semibold text-[#075E43] hover:underline flex-shrink-0 flex items-center gap-1 self-center">
                    <span>{t('viewDetails')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* READ ALERTS SECTION */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#66736D] bg-[#EDF3EF] px-2 py-0.5 rounded-[4px] border border-[#CBD8D1]">
              {t('completed')} ({readAlerts.length})
            </span>
          </div>

          <div className="space-y-2.5">
            {readAlerts.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[6px] p-4 hover:bg-[#F3F9F5] transition-colors cursor-pointer flex items-start justify-between gap-4 opacity-90"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#66736D]" />
                    <h2 className="text-xs sm:text-sm font-semibold text-[#17231F]">
                      {notif.title}
                    </h2>
                  </div>
                  <p className="text-xs text-[#66736D] pl-3.5 leading-relaxed">
                    {notif.message}
                  </p>
                  <div className="text-[10px] text-[#66736D] pl-3.5 flex items-center gap-1 pt-0.5">
                    <Clock className="w-3 h-3 text-[#66736D]" />
                    <span>{notif.timestamp}</span>
                  </div>
                </div>

                <button className="text-xs font-semibold text-[#66736D] hover:underline flex-shrink-0 self-center">
                  {t('viewDetails')} →
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
