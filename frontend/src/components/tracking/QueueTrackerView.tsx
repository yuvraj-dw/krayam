import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  MapPin, 
  RotateCcw, 
  XCircle, 
  Check, 
  AlertTriangle, 
  FastForward,
  CalendarPlus,
  ArrowRight,
  Scale,
  CheckCircle2
} from 'lucide-react';
import { RescheduleModal } from '../booking/RescheduleModal';

export const QueueTrackerView: React.FC = () => {
  const { 
    activeBooking, 
    cancelBooking, 
    realtimeStatus,
    lastQueueUpdate,
    setActiveView,
    farmer,
    t,
    translateCrop,
    translateStatus,
    translateUnit,
    formatLocalizedDate
  } = useApp();

  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  if (!activeBooking) {
    return (
      <div className="w-full py-8">
        <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-12 h-12 rounded-[6px] bg-[#E7F3EC] text-[#075E43] border border-[#CBD8D1] flex items-center justify-center mx-auto mb-4">
            <CalendarPlus className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#17231F]">
            {t('noActiveBooking')}
          </h2>
          <p className="text-sm text-[#66736D] mt-2 mb-6 leading-relaxed">
            {t('rescheduleNotice')}
          </p>
          <button
            onClick={() => setActiveView('booking')}
            className="inline-flex items-center gap-2 h-11 px-6 rounded-[6px] bg-[#0B6B4F] hover:bg-[#075E43] text-[#FFFFFF] font-semibold text-sm transition-colors"
          >
            <span>{t('bookSlotAction')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const queuePos = activeBooking.queuePosition ?? null;
  const farmersAhead = activeBooking.farmersAhead !== undefined && activeBooking.farmersAhead !== null 
    ? activeBooking.farmersAhead 
    : (queuePos !== null ? Math.max(0, queuePos - 1) : null);
  const waitMinutes = activeBooking.estimatedWaitMinutes ?? null;

  const status = activeBooking.status;
  const isCheckedIn = status === 'CHECKED_IN' || status === 'IN_QUEUE' || status === 'TURN_APPROACHING' || status === 'PROCESSING' || status === 'COMPLETED';
  const isProcessing = status === 'PROCESSING' || status === 'COMPLETED';
  const isCompleted = status === 'COMPLETED';

  // Real backend-driven timeline stages
  const timelineStages = [
    { 
      number: 1, 
      title: t('tokenIssuedStage'), 
      time: activeBooking.createdAt ? formatLocalizedDate(activeBooking.createdAt) : t('confirmed'), 
      isDone: true, 
      isCurrent: status === 'CONFIRMED' || status === 'RESCHEDULED' 
    },
    { 
      number: 2, 
      title: t('mandiGateCheckInStage'), 
      time: isCheckedIn ? t('checkedInByMandi', 'Checked in by Mandi Operator') : t('awaitingFarmerArrival', 'Awaiting farmer arrival at mandi'), 
      isDone: isCheckedIn, 
      isCurrent: false 
    },
    { 
      number: 3, 
      title: t('inQueueStage'), 
      time: status === 'TURN_APPROACHING' 
        ? t('turnApproachingBannerMsg') 
        : (queuePos !== null ? `#${queuePos} ${t('officialTokenOrder')}` : (isCheckedIn ? t('in_queue', 'Waiting in Mandi Queue') : t('upcomingStage', 'Upcoming stage'))), 
      isDone: isProcessing, 
      isCurrent: status === 'IN_QUEUE' || status === 'CHECKED_IN' || status === 'TURN_APPROACHING' 
    },
    { 
      number: 4, 
      title: t('weighbridgeStage'), 
      time: status === 'PROCESSING' 
        ? t('atWeighbridgeBannerMsg') 
        : (isCompleted ? t('completed') : t('upcomingStage', 'Upcoming stage')), 
      isDone: isCompleted, 
      isCurrent: status === 'PROCESSING' 
    },
    { 
      number: 5, 
      title: t('procurementCompleteStage'), 
      time: isCompleted ? t('officialJForm') : t('upcomingStage', 'Upcoming stage'), 
      isDone: isCompleted, 
      isCurrent: false 
    },
    { 
      number: 6, 
      title: t('dbtDisbursementStage'), 
      time: isCompleted ? t('dbtDisbursementInitiated', 'DBT payment verification initiated') : t('upcomingStage', 'Upcoming stage'), 
      isDone: isCompleted, 
      isCurrent: false 
    },
  ];

  const handleConfirmCancel = async () => {
    try {
      await cancelBooking(activeBooking.uuid || activeBooking.id);
      setShowCancelDialog(false);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking.');
    }
  };

  return (
    <div className="space-y-6 w-full">
      
      {/* 10. Booking Summary Panel */}
      <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left info: Crop, Quantity, Location */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-bold text-[#17231F]">
                {translateCrop(activeBooking.cropName)}
              </span>
              <span className="text-base sm:text-lg font-normal text-[#34443D]">
                / {activeBooking.quantityQuintals} {translateUnit('Qtl')}
              </span>
            </div>

            <div className="mt-2 flex items-start gap-1.5 text-xs sm:text-sm text-[#34443D]">
              <MapPin className="w-4 h-4 text-[#075E43] flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#17231F]">{activeBooking.centreName}</span>
                <span className="text-[#66736D] block sm:inline sm:ml-1">({activeBooking.centreLocation})</span>
              </div>
            </div>
          </div>

          {/* Right-side info: Live queue badge, Token No, Booking Date, Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-8 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#EDF3EF]">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-xs font-bold bg-[#E7F3EC] text-[#16803C] border border-[#CBD8D1]">
                  <span className="w-2 h-2 rounded-full bg-[#16803C] animate-pulse" />
                  {t('liveQueueBadge')}
                </span>
              </div>
              <div className="text-xs text-[#66736D]">
                {t('token')}: <span className="font-mono font-bold text-[#17231F]">{activeBooking.id}</span>
              </div>
              <div className="text-xs text-[#66736D]">
                {t('date')}: <span className="font-semibold text-[#17231F]">{formatLocalizedDate(activeBooking.expectedDate)} ({activeBooking.slot.split('(')[0].trim()})</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => setIsRescheduleOpen(true)}
                className="h-10 px-4 rounded-[6px] bg-[#FFFFFF] border border-[#CBD8D1] hover:border-[#075E43] hover:bg-[#F3F9F5] text-[#17231F] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#075E43]" />
                <span>{t('reschedule', 'Reschedule')}</span>
              </button>

              <button
                onClick={() => setShowCancelDialog(true)}
                className="h-10 px-3.5 rounded-[6px] bg-[#FFFFFF] border border-[#CBD8D1] hover:border-[#B42318] hover:bg-[#FFF5F5] text-[#B42318] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{t('cancel')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Turn Approaching Urgent Mandi Banner */}
      {status === 'TURN_APPROACHING' && (
        <div className="bg-[#FFFDF5] border-2 border-[#EA8A0A] rounded-[8px] p-4 flex items-center gap-3.5 shadow-md animate-pulse">
          <div className="w-10 h-10 rounded-full bg-[#EA8A0A] text-white flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#B45309]">
              {t('turnApproachingBannerTitle')}
            </h3>
            <p className="text-xs text-[#92400E] mt-0.5 leading-relaxed">
              {t('turnApproachingBannerMsg')}
            </p>
          </div>
        </div>
      )}

      {/* Produce Being Processed Banner */}
      {status === 'PROCESSING' && (
        <div className="bg-[#F5F8FF] border-2 border-[#175CD3] rounded-[8px] p-4 flex items-center gap-3.5 shadow-md">
          <div className="w-10 h-10 rounded-full bg-[#175CD3] text-white flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#175CD3]">
              {t('atWeighbridgeBannerTitle')}
            </h3>
            <p className="text-xs text-[#1E40AF] mt-0.5 leading-relaxed">
              {t('atWeighbridgeBannerMsg')}
            </p>
          </div>
        </div>
      )}

      {/* Produce Completed Banner */}
      {status === 'COMPLETED' && (
        <div className="bg-[#E7F3EC] border-2 border-[#16803C] rounded-[8px] p-4 flex items-center justify-between gap-3.5 shadow-md flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#16803C] text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#063B2A]">
                {t('procurementCompletedBannerTitle')}
              </h3>
              <p className="text-xs text-[#16803C] mt-0.5 leading-relaxed">
                {t('procurementCompletedBannerMsg')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveView('procurement')}
            className="bg-[#063B2A] hover:bg-[#075E43] text-white text-xs font-bold px-4 py-2 rounded-[6px] transition-colors inline-flex items-center gap-1.5"
          >
            <span>{t('viewJFormBtn')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 11. Queue Status Summary: Horizontal Information Strip */}
      <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] overflow-hidden shadow-sm">
        <div className="bg-[#EDF3EF] px-5 py-2.5 border-b border-[#CBD8D1] flex items-center justify-between">
          <span className="text-xs uppercase font-bold tracking-wider text-[#17231F]">
            {t('queueStatusTitle')}
          </span>
          <span className="text-xs text-[#075E43] font-semibold">
            {t('mandiGateNo')} 2
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#CBD8D1] p-4 sm:p-6 text-center">
          {/* Queue Position */}
          <div className="py-2 sm:py-0">
            <div className="text-xs uppercase font-bold tracking-wider text-[#66736D]">
              {t('liveQueuePosition')}
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[#063B2A] font-mono mt-1">
              {queuePos !== null ? `#${queuePos}` : (status === 'CONFIRMED' || status === 'RESCHEDULED' ? t('pendingCheckIn') : '—')}
            </div>
            <div className="text-xs text-[#66736D] mt-1">
              {t('officialTokenOrder')}
            </div>
          </div>

          {/* Farmers Ahead */}
          <div className="py-2 sm:py-0">
            <div className="text-xs uppercase font-bold tracking-wider text-[#66736D]">
              {t('aheadBadge')}
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[#063B2A] font-mono mt-1">
              {farmersAhead !== null ? farmersAhead : (status === 'CONFIRMED' || status === 'RESCHEDULED' ? t('pendingCheckIn') : '—')}
            </div>
            <div className="text-xs text-[#66736D] mt-1">
              {t('people')}
            </div>
          </div>

          {/* Estimated Waiting Time */}
          <div className="py-2 sm:py-0">
            <div className="text-xs uppercase font-bold tracking-wider text-[#66736D]">
              {t('estWaitBadge')}
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[#063B2A] mt-1">
              {waitMinutes !== null ? `~${waitMinutes} ${t('minutesAbbr')}` : (status === 'CONFIRMED' || status === 'RESCHEDULED' ? t('pendingCheckIn') : '—')}
            </div>
            <div className="text-xs text-[#66736D] mt-1">
              {t('weighbridgePace')}
            </div>
          </div>
        </div>

        {/* Realtime Live Telemetry Bar */}
        <div className="bg-[#F5F8F6] border-t border-[#CBD8D1] px-4 sm:px-5 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#66736D]">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${realtimeStatus === 'connected' ? 'bg-[#16803C] animate-pulse' : realtimeStatus === 'reconnecting' ? 'bg-[#EA8A0A] animate-ping' : 'bg-[#66736D]'}`} />
            <span className="font-semibold text-[#17231F]">
              {realtimeStatus === 'connected' ? t('liveSseStream') : realtimeStatus === 'reconnecting' ? t('reconnectingStream') : t('autoPolling')}
            </span>
          </div>
          <div className="text-[11px] text-[#66736D]">
            {t('lastUpdated')}: <span className="font-semibold text-[#17231F]">{lastQueueUpdate || 'Just now'}</span>
          </div>
        </div>
      </div>

      {/* 2-Column Operational Layout: Section 12 Queue Progress & Section 13 Booking Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: 12. Queue Progress Timeline (7 cols) */}
        <div className="lg:col-span-6 bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-5 sm:p-6 shadow-sm">
          <div className="border-b border-[#CBD8D1] pb-3 mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#17231F]">
                {t('queueProgressTitle')}
              </h2>
              <p className="text-xs text-[#66736D]">
                {t('pipelineSubtitle')}
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-[4px] bg-[#E7F3EC] text-[#075E43] border border-[#CBD8D1]">
              {t('liveFeed')}
            </span>
          </div>

          <div className="space-y-0 relative">
            {timelineStages.map((stage, idx) => {
              const isLast = idx === timelineStages.length - 1;
              return (
                <div key={stage.number} className="relative flex items-start gap-4 pb-6 group">
                  {/* Vertical connecting line */}
                  {!isLast && (
                    <div 
                      className={`absolute left-[13px] top-[26px] bottom-0 w-[2px] ${
                        stage.isDone ? 'bg-[#16803C]' : 'bg-[#CBD8D1]'
                      }`} 
                    />
                  )}

                  {/* Stage Node Indicator */}
                  <div className="relative z-10 flex-shrink-0 mt-0.5">
                    {stage.isDone ? (
                      <div className="w-7 h-7 rounded-full bg-[#16803C] text-[#FFFFFF] flex items-center justify-center shadow-xs">
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </div>
                    ) : stage.isCurrent ? (
                      <div className="w-7 h-7 rounded-full bg-[#063B2A] text-[#FFFFFF] flex items-center justify-center ring-4 ring-[#E7F3EC] font-bold text-xs">
                        {stage.number}
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#FFFFFF] border-2 border-[#CBD8D1] text-[#66736D] flex items-center justify-center text-xs font-bold">
                        {stage.number}
                      </div>
                    )}
                  </div>

                  {/* Stage Content */}
                  <div className={`flex-1 min-w-0 p-2.5 rounded-[6px] transition-colors ${
                    stage.isCurrent ? 'bg-[#E7F3EC] border border-[#B7DCC5]' : ''
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-bold text-[#17231F] leading-tight">
                        {stage.title}
                      </div>
                      {stage.isCurrent && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-[4px] bg-[#063B2A] text-[#FFFFFF] flex-shrink-0">
                          {t('processing')}
                        </span>
                      )}
                      {stage.isDone && (
                        <span className="text-[11px] font-semibold text-[#16803C] flex-shrink-0">
                          {t('completed')} ✓
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-[#66736D] mt-1">
                      {stage.time}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: 13. Booking Details Table (5 cols) */}
        <div className="lg:col-span-6 bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="border-b border-[#CBD8D1] pb-3 mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#17231F]">
                  {t('bookingDetails')}
                </h2>
                <p className="text-xs text-[#66736D]">
                  {t('officialCertificateData', 'Official allocation certificate data')}
                </p>
              </div>
              <span className="font-mono text-xs text-[#075E43] font-bold">
                {activeBooking.id}
              </span>
            </div>

            {/* Official Table Style */}
            <div className="border border-[#CBD8D1] rounded-[6px] overflow-hidden">
              <table className="gov-table">
                <tbody>
                  <tr>
                    <td className="w-2/5 bg-[#EDF3EF] font-semibold text-[#17231F] text-xs">
                      {t('token')}
                    </td>
                    <td className="font-mono font-bold text-[#17231F] text-xs">
                      {activeBooking.id}
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-[#EDF3EF] font-semibold text-[#17231F] text-xs">
                      {t('cropAndQuantity')}
                    </td>
                    <td className="font-medium text-[#17231F] text-xs">
                      {translateCrop(activeBooking.cropName)}
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-[#EDF3EF] font-semibold text-[#17231F] text-xs">
                      {t('quantityInQuintals')}
                    </td>
                    <td className="font-bold text-[#075E43] text-xs">
                      {activeBooking.quantityQuintals} {translateUnit('Quintals')} ({translateUnit('Qtl')})
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-[#EDF3EF] font-semibold text-[#17231F] text-xs">
                      {t('mandiCentre')}
                    </td>
                    <td className="text-xs text-[#17231F]">
                      <div className="font-bold">{activeBooking.centreName}</div>
                      <div className="text-[11px] text-[#66736D]">{activeBooking.centreLocation}</div>
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-[#EDF3EF] font-semibold text-[#17231F] text-xs">
                      {t('date')}
                    </td>
                    <td className="text-xs text-[#17231F]">
                      {formatLocalizedDate(activeBooking.expectedDate)} ({activeBooking.slot.split('(')[0].trim()})
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-[#EDF3EF] font-semibold text-[#17231F] text-xs">
                      {t('fullName')}
                    </td>
                    <td className="font-bold text-[#17231F] text-xs">
                      {activeBooking.farmerName}
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-[#EDF3EF] font-semibold text-[#17231F] text-xs">
                      {t('village')}
                    </td>
                    <td className="text-xs text-[#17231F]">
                      {farmer?.location?.village || '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-[#EDF3EF] font-semibold text-[#17231F] text-xs">
                      {t('district')}
                    </td>
                    <td className="text-xs text-[#17231F]">
                      {[farmer?.location?.district, farmer?.location?.state].filter(Boolean).join(', ') || '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Verification Badge */}
          <div className="mt-4 pt-3 border-t border-[#EDF3EF] flex items-center justify-between text-xs text-[#66736D]">
            <span className="flex items-center gap-1 text-[#16803C] font-semibold">
              <Check className="w-3.5 h-3.5" />
              {t('verifiedFarmer')}
            </span>
            <span>Ref: PFMS-AGRI-2026</span>
          </div>
        </div>
      </div>

      {/* 14. Important Instructions Panel */}
      <div className="bg-[#FFF9ED] border border-[#F0D7A7] rounded-[8px] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-[4px] bg-[#FFF3DC] border border-[#F0D7A7] text-[#D97706] flex items-center justify-center flex-shrink-0 font-bold">
            <AlertTriangle className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#17231F]">
                {t('importantInstructions', 'Important Instructions')}
              </h3>
            </div>
            
            <ol className="mt-3 space-y-2.5 text-xs sm:text-sm text-[#34443D] list-decimal pl-5 leading-relaxed">
              <li>
                <div className="font-semibold text-[#17231F]">Keep your original documents ready (Aadhaar & Bank Passbook).</div>
              </li>
              <li>
                <div className="font-semibold text-[#17231F]">Be present at the centre when your token is called.</div>
              </li>
              <li>
                <div className="font-semibold text-[#17231F]">Ensure your produce meets prescribed quality standards.</div>
              </li>
              <li>
                <div className="font-semibold text-[#17231F]">Follow the instructions of centre officials and weighbridge operators.</div>
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      <RescheduleModal
        booking={activeBooking}
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
      />

      {/* Section 37: Confirmation Dialog for Cancellation */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-[#063B2A]/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] max-w-md w-full p-6 shadow-gov-dropdown">
            <div className="flex items-center gap-3 text-[#B42318] mb-3">
              <XCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-[#17231F]">
                {t('cancelBookingDialogTitle')}
              </h3>
            </div>

            <p className="text-sm text-[#34443D] leading-relaxed mb-6">
              {t('cancelBookingDialogMsg')} ({translateCrop(activeBooking.cropName)} — {activeBooking.quantityQuintals} {translateUnit('Qtl')})
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EDF3EF]">
              <button
                onClick={() => setShowCancelDialog(false)}
                className="h-10 px-4 rounded-[6px] bg-[#FFFFFF] border border-[#CBD8D1] hover:bg-[#F3F9F5] text-[#17231F] font-semibold text-xs"
              >
                {t('goBack')}
              </button>
              <button
                onClick={handleConfirmCancel}
                className="h-10 px-4 rounded-[6px] bg-[#B42318] hover:bg-[#911b12] text-[#FFFFFF] font-semibold text-xs transition-colors"
              >
                {t('confirmCancellation')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
