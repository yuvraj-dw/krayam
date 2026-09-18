import React from 'react';
import { useApp } from '../../context/AppContext';
import { TranslationStrings } from '../../i18n/translations';
import { 
  CalendarPlus, 
  Activity, 
  MapPin, 
  IndianRupee, 
  History, 
  Bell, 
  HelpCircle,
  ArrowRight,
  Clock,
  ShieldCheck,
  Building2,
  FileText
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { 
    farmer, 
    activeBooking, 
    setActiveView, 
    setIsHelpModalOpen,
    unreadCount,
    t,
    translateCrop
  } = useApp();

  const services: {
    id: string;
    titleKey: keyof TranslationStrings;
    titleEn: string;
    desc: string;
    icon: React.ElementType;
    badge?: number;
    action: () => void;
  }[] = [
    {
      id: 'booking',
      titleKey: 'navBooking',
      titleEn: 'Book Slot',
      desc: t('descBooking'),
      icon: CalendarPlus,
      action: () => setActiveView('booking'),
    },
    {
      id: 'tracking',
      titleKey: 'navTracking',
      titleEn: 'Queue Track',
      desc: t('descTracking'),
      icon: Activity,
      action: () => setActiveView('tracking'),
    },
    {
      id: 'centres',
      titleKey: 'navCentres',
      titleEn: 'Procurement Centres',
      desc: t('descCentres'),
      icon: MapPin,
      action: () => setActiveView('centres'),
    },
    {
      id: 'procurement',
      titleKey: 'navProcurement',
      titleEn: 'Procurement & DBT',
      desc: t('descProcurement'),
      icon: IndianRupee,
      action: () => setActiveView('procurement'),
    },
    {
      id: 'history',
      titleKey: 'navHistory',
      titleEn: 'Transaction History',
      desc: t('descHistory'),
      icon: History,
      action: () => setActiveView('history'),
    },
    {
      id: 'alerts',
      titleKey: 'navNotifications',
      titleEn: 'Important Alerts',
      desc: t('descAlerts'),
      icon: Bell,
      badge: unreadCount,
      action: () => setActiveView('notifications'),
    },
    {
      id: 'help',
      titleKey: 'helpSupport',
      titleEn: 'Help & Support',
      desc: t('descHelp'),
      icon: HelpCircle,
      action: () => setIsHelpModalOpen(true),
    },
    {
      id: 'profile',
      titleKey: 'navProfile',
      titleEn: 'Farmer Profile & Land',
      desc: t('descProfile'),
      icon: ShieldCheck,
      action: () => setActiveView('profile'),
    }
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Top Greeting & Action Section */}
      <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-[#075E43] bg-[#E7F3EC] px-2 py-0.5 rounded-[4px] border border-[#CBD8D1]">
              {t('verifiedFarmer')}
            </span>
            {farmer?.farmerId && (
              <span className="text-xs text-[#66736D] font-mono">
                ID: {farmer.farmerId}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#17231F] mt-1.5">
            {t('goodMorning')}{farmer?.fullName ? `, ${farmer.fullName}` : ''}
          </h1>
          <p className="text-sm text-[#34443D] mt-0.5">
            {t('govOfIndia')} — Direct Mandi Procurement & Allocation Service
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          <button
            onClick={() => setActiveView('booking')}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[6px] bg-[#0B6B4F] hover:bg-[#075E43] text-[#FFFFFF] font-semibold text-sm transition-colors"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>{t('bookSlotAction')}</span>
          </button>
          <button
            onClick={() => setActiveView('tracking')}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[6px] bg-[#FFFFFF] border border-[#0B6B4F] text-[#0B6B4F] hover:bg-[#E7F3EC] font-semibold text-sm transition-colors"
          >
            <Activity className="w-4 h-4" />
            <span>{t('trackQueueAction')}</span>
          </button>
        </div>
      </div>

      {/* Current Booking Panel (Section 15) */}
      {activeBooking ? (
        <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] overflow-hidden">
          {/* Header Strip */}
          <div className="bg-[#EDF3EF] px-5 py-3 border-b border-[#CBD8D1] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-[#063B2A]">
                {t('currentBooking')}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-xs font-bold bg-[#E7F3EC] text-[#16803C] border border-[#CBD8D1]">
                <span className="w-2 h-2 rounded-full bg-[#16803C] animate-pulse" />
                {t('liveQueueBadge')}
              </span>
            </div>
            <div className="text-xs font-mono text-[#34443D]">
              Token: <span className="font-bold text-[#17231F]">{activeBooking.id}</span>
            </div>
          </div>

          {/* Booking Summary Content */}
          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
              {/* Crop & Quantity */}
              <div className="space-y-1">
                <div className="text-xs text-[#66736D] uppercase font-semibold">{t('cropAndQuantity')}</div>
                <div className="text-xl sm:text-2xl font-bold text-[#17231F]">
                  {translateCrop(activeBooking.cropName)}
                </div>
                <div className="text-sm font-semibold text-[#075E43]">
                  {t('quantityInQuintals')}: {activeBooking.quantityQuintals} {t('qtl', 'Qtl')}
                </div>
              </div>

              {/* Centre Information */}
              <div className="space-y-1">
                <div className="text-xs text-[#66736D] uppercase font-semibold">{t('mandiCentre')}</div>
                <div className="text-sm font-bold text-[#17231F] flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#075E43] flex-shrink-0" />
                  {activeBooking.centreName}
                </div>
                <div className="text-xs text-[#66736D]">
                  {activeBooking.centreLocation}
                </div>
              </div>

              {/* Queue Status Strip (Inline) */}
              <div className="bg-[#F4FAF6] border border-[#B7DCC5] rounded-[6px] p-3 flex items-center justify-around text-center">
                <div>
                  <div className="text-[11px] font-bold text-[#66736D] uppercase">{t('liveQueuePosition')}</div>
                  <div className="text-sm sm:text-lg font-black text-[#063B2A] font-mono">
                    {activeBooking.status === 'PROCESSING'
                      ? t('atWeighbridge')
                      : activeBooking.status === 'COMPLETED'
                      ? t('completed')
                      : activeBooking.queuePosition
                      ? `#${activeBooking.queuePosition}`
                      : t('scheduled')}
                  </div>
                </div>
                <div className="w-[1px] h-8 bg-[#CBD8D1]" />
                <div>
                  <div className="text-[11px] font-bold text-[#66736D] uppercase">{t('aheadBadge')}</div>
                  <div className="text-xl sm:text-2xl font-black text-[#063B2A] font-mono">
                    {activeBooking.farmersAhead !== undefined ? activeBooking.farmersAhead : '—'}
                  </div>
                </div>
                <div className="w-[1px] h-8 bg-[#CBD8D1]" />
                <div>
                  <div className="text-[11px] font-bold text-[#66736D] uppercase">{t('estWaitBadge')}</div>
                  <div className="text-xs sm:text-sm font-bold text-[#063B2A] mt-1 flex items-center gap-1 justify-center">
                    <Clock className="w-3.5 h-3.5" />
                    {activeBooking.estimatedWaitMinutes
                      ? `~${activeBooking.estimatedWaitMinutes} ${t('minutesAbbr')}`
                      : t('pendingCheckIn')}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-start lg:justify-end">
                <button
                  onClick={() => setActiveView('tracking')}
                  className="w-full lg:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-[6px] bg-[#0B6B4F] hover:bg-[#075E43] text-[#FFFFFF] font-semibold text-sm transition-colors"
                >
                  <span>{t('trackQueueAction')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-6 text-center">
          <div className="text-base font-bold text-[#17231F]">{t('noActiveBooking')}</div>
          <button
            onClick={() => setActiveView('booking')}
            className="mt-4 inline-flex items-center gap-2 h-10 px-5 rounded-[6px] bg-[#0B6B4F] hover:bg-[#075E43] text-[#FFFFFF] text-sm font-semibold"
          >
            <span>{t('bookSlotAction')}</span>
          </button>
        </div>
      )}

      {/* Services Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-[#17231F]">
            {t('servicesTitle')}
          </h2>
          <span className="text-xs text-[#66736D]">
            {t('officialServices')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {services.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.action}
                className="bg-[#FFFFFF] border border-[#CBD8D1] hover:border-[#0B6B4F] hover:bg-[#F3F9F5] rounded-[8px] p-4 text-left transition-colors flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-8 h-8 rounded-[6px] bg-[#E7F3EC] border border-[#CBD8D1] flex items-center justify-center text-[#063B2A]">
                      <Icon className="w-4 h-4" />
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold bg-[#D97706] text-[#FFFFFF]">
                        {item.badge} {t('newBadge')}
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-sm text-[#17231F] group-hover:text-[#063B2A] transition-colors leading-tight">
                    {t(item.titleKey)}
                  </div>
                  <div className="text-xs text-[#075E43] font-medium mt-0.5">
                    {item.titleEn}
                  </div>
                  <p className="text-xs text-[#66736D] mt-1.5 line-clamp-2 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-[#EDF3EF] flex items-center text-xs font-semibold text-[#0B6B4F] group-hover:underline">
                  <span>{t('viewDetails')}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Official Government Support Notice Strip */}
      <div className="bg-[#FFF9ED] border border-[#F0D7A7] rounded-[8px] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[6px] bg-[#FFF3DC] border border-[#F0D7A7] text-[#D97706] flex items-center justify-center flex-shrink-0 font-bold">
            !
          </div>
          <div>
            <div className="text-xs font-bold text-[#17231F]">
              {t('helplineTitle')}
            </div>
            <div className="text-xs text-[#66736D]">
              {t('helplineDesc')}
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsHelpModalOpen(true)}
          className="text-xs font-bold text-[#0B6B4F] hover:underline flex-shrink-0"
        >
          {t('viewFaqsBtn')} →
        </button>
      </div>
    </div>
  );
};
