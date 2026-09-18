import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getOperatorText } from '../../i18n/operatorTranslations';
import { 
  Users, 
  Clock, 
  PhoneCall, 
  CheckCircle2, 
  UserPlus, 
  UserX, 
  Play, 
  Check, 
  Scale, 
  AlertCircle,
  Truck
} from 'lucide-react';

export const OperatorQueueTab: React.FC = () => {
  const { 
    bookings, 
    operatorCheckIn, 
    operatorCallNext, 
    operatorStartProcessing, 
    operatorCompleteProcessing,
    operatorMarkNoShow, 
    setOperatorActiveTab, 
    queueSummary,
    realtimeStatus,
    lastQueueUpdate,
    language,
    translateCrop,
    translateStatus,
    translateUnit,
    t
  } = useApp();

  const ot = getOperatorText(language);

  // Filter tabs: All | Waiting | Processing | Completed | No Show
  const [filter, setFilter] = useState<'ALL' | 'WAITING' | 'PROCESSING' | 'COMPLETED' | 'NO_SHOW'>('ALL');
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [checkInBookingId, setCheckInBookingId] = useState('');
  const [announcementMsg, setAnnouncementMsg] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredBookings = bookings.filter(b => {
    if (filter === 'ALL') return b.status !== 'COMPLETED' && b.status !== 'CANCELLED' && b.status !== 'NO_SHOW';
    if (filter === 'WAITING') return b.status === 'IN_QUEUE' || b.status === 'CHECKED_IN' || b.status === 'TURN_APPROACHING' || b.status === 'CONFIRMED';
    if (filter === 'PROCESSING') return b.status === 'PROCESSING' || b.status === 'WEIGHING' || b.status === 'QUALITY_CHECK';
    if (filter === 'COMPLETED') return b.status === 'COMPLETED';
    if (filter === 'NO_SHOW') return b.status === 'NO_SHOW';
    return true;
  });

  const handleCallNext = async () => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const nextFarmer = await operatorCallNext();
      if (nextFarmer) {
        setAnnouncementMsg(`📢 ${ot.callingFarmerNotice}: ${nextFarmer.farmerName} (${nextFarmer.id})`);
        setTimeout(() => setAnnouncementMsg(null), 6000);
      } else {
        setAnnouncementMsg('No waiting farmers in queue.');
        setTimeout(() => setAnnouncementMsg(null), 3000);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to call next farmer from backend.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInBookingId.trim()) return;
    setIsActionLoading(true);
    setActionError(null);
    try {
      await operatorCheckIn(checkInBookingId.trim());
      const checkedToken = checkInBookingId.trim();
      setCheckInBookingId('');
      setCheckInModalOpen(false);
      setAnnouncementMsg(`✅ ${checkedToken} — ${ot.checkInFarmerBtn}`);
      setTimeout(() => setAnnouncementMsg(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Check-in failed. Please verify booking ID.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStartProcessing = async (id: string) => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      await operatorStartProcessing(id);
      setAnnouncementMsg(`⚙️ Started processing weighbridge for token #${id}`);
      setTimeout(() => setAnnouncementMsg(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to start processing.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompleteProcessing = async (id: string, cardId: string) => {
    setIsActionLoading(true);
    setCompletingId(cardId);
    setActionError(null);
    try {
      await operatorCompleteProcessing(id);
      setAnnouncementMsg(`✅ Completed queue processing for token #${cardId}`);
      setTimeout(() => setAnnouncementMsg(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to complete processing.');
    } finally {
      setIsActionLoading(false);
      setCompletingId(null);
    }
  };

  const handleMarkNoShow = async (id: string) => {
    if (!window.confirm('Mark this farmer as NO-SHOW on the mandi backend?')) return;
    setIsActionLoading(true);
    setActionError(null);
    try {
      await operatorMarkNoShow(id);
      setAnnouncementMsg(`⚠️ Marked token #${id} as NO-SHOW`);
      setTimeout(() => setAnnouncementMsg(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to mark no-show.');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Telemetry Strip: Realtime Status & Summary Metrics */}
      <div className="bg-[#EDF3EF] border border-[#CBD8D1] rounded-[8px] p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${realtimeStatus === 'connected' ? 'bg-[#16803C] animate-pulse' : realtimeStatus === 'reconnecting' ? 'bg-[#EA8A0A] animate-ping' : 'bg-[#66736D]'}`} />
            <span className="font-bold text-[#17231F]">
              {realtimeStatus === 'connected' ? 'Live Mandi SSE Active' : realtimeStatus === 'reconnecting' ? 'Reconnecting to Mandi Stream...' : 'Auto-polling Active'}
            </span>
          </div>
          <span className="text-[#66736D]">|</span>
          <div className="text-[#34443D]">
            Total Waiting: <span className="font-bold font-mono text-[#075E43]">{queueSummary?.total_waiting ?? 0}</span>
          </div>
          <span className="text-[#66736D]">|</span>
          <div className="text-[#34443D]">
            Est. Wait Time: <span className="font-bold text-[#075E43]">{queueSummary?.estimated_wait_minutes !== undefined && queueSummary.estimated_wait_minutes !== null ? `${queueSummary.estimated_wait_minutes} min` : '—'}</span>
          </div>
        </div>

        <div className="text-[11px] text-[#66736D]">
          Last updated: <span className="font-mono font-semibold text-[#17231F]">{lastQueueUpdate || 'Just now'}</span>
        </div>
      </div>

      {actionError && (
        <div className="bg-[#FFF5F5] text-[#B42318] border border-[#F0C2C2] px-4 py-3 rounded-[8px] flex items-center justify-between text-xs font-semibold">
          <span>⚠️ {actionError}</span>
          <button onClick={() => setActionError(null)} className="text-[#B42318] hover:underline font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Header with Call Next and Check-in Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-4">
        <div>
          <h2 className="text-base font-bold text-[#17231F] flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#075E43]" />
            <span>{ot.liveQueueTitle}</span>
          </h2>
          <p className="text-xs text-[#66736D] mt-0.5">
            {ot.liveQueueSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            disabled={isActionLoading}
            onClick={() => setCheckInModalOpen(true)}
            className="flex-1 sm:flex-initial bg-[#EDF3EF] hover:bg-[#CBD8D1] text-[#063B2A] text-xs font-bold px-3.5 py-2 rounded-[6px] border border-[#CBD8D1] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4 text-[#075E43]" />
            <span>{ot.checkInFarmerBtn}</span>
          </button>

          <button
            type="button"
            disabled={isActionLoading}
            onClick={handleCallNext}
            className="flex-1 sm:flex-initial bg-[#063B2A] hover:bg-[#075E43] text-[#FFFFFF] text-xs font-bold px-4 py-2 rounded-[6px] transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <PhoneCall className="w-4 h-4 text-[#85E1A9]" />
            <span>{isActionLoading ? 'Calling...' : ot.callNextFarmerBtn}</span>
          </button>
        </div>
      </div>

      {/* Audio Announcement Simulation */}
      {announcementMsg && (
        <div className="bg-[#063B2A] text-[#85E1A9] border border-[#16803C] px-4 py-3 rounded-[8px] flex items-center justify-between text-xs font-semibold shadow-md animate-fade-in">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-[#85E1A9] animate-bounce" />
            <span>{announcementMsg}</span>
          </div>
          <button onClick={() => setAnnouncementMsg(null)} className="text-white hover:text-[#85E1A9]">
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#CBD8D1] pb-2 overflow-x-auto text-xs font-bold text-[#66736D]">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 rounded-[4px] transition-colors ${filter === 'ALL' ? 'bg-[#063B2A] text-white' : 'hover:bg-[#EDF3EF]'}`}
        >
          {ot.filterAll} ({bookings.filter(b => b.status !== 'COMPLETED' && b.status !== 'CANCELLED' && b.status !== 'NO_SHOW').length})
        </button>
        <button
          onClick={() => setFilter('WAITING')}
          className={`px-3 py-1.5 rounded-[4px] transition-colors ${filter === 'WAITING' ? 'bg-[#063B2A] text-white' : 'hover:bg-[#EDF3EF]'}`}
        >
          {ot.filterWaiting} ({bookings.filter(b => b.status === 'IN_QUEUE' || b.status === 'CHECKED_IN' || b.status === 'TURN_APPROACHING').length})
        </button>
        <button
          onClick={() => setFilter('PROCESSING')}
          className={`px-3 py-1.5 rounded-[4px] transition-colors ${filter === 'PROCESSING' ? 'bg-[#063B2A] text-white' : 'hover:bg-[#EDF3EF]'}`}
        >
          {ot.filterProcessing} ({bookings.filter(b => b.status === 'PROCESSING').length})
        </button>
        <button
          onClick={() => setFilter('COMPLETED')}
          className={`px-3 py-1.5 rounded-[4px] transition-colors ${filter === 'COMPLETED' ? 'bg-[#063B2A] text-white' : 'hover:bg-[#EDF3EF]'}`}
        >
          {ot.filterCompleted} ({bookings.filter(b => b.status === 'COMPLETED').length})
        </button>
        <button
          onClick={() => setFilter('NO_SHOW')}
          className={`px-3 py-1.5 rounded-[4px] transition-colors ${filter === 'NO_SHOW' ? 'bg-[#063B2A] text-white' : 'hover:bg-[#EDF3EF]'}`}
        >
          {ot.filterNoShow} ({bookings.filter(b => b.status === 'NO_SHOW').length})
        </button>
      </div>

      {/* Live Queue Cards / Board */}
      <div className="space-y-3">
        {filteredBookings.map((b, idx) => (
          <div
            key={b.id}
            className={`bg-[#FFFFFF] border rounded-[8px] p-4 shadow-sm transition-all ${
              b.status === 'TURN_APPROACHING' 
                ? 'border-[#EA8A0A] bg-[#FFFDF5]' 
                : b.status === 'PROCESSING' 
                ? 'border-[#175CD3] bg-[#F5F8FF]' 
                : 'border-[#CBD8D1]'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left Column: Token + Farmer Details */}
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-[8px] flex flex-col items-center justify-center font-mono font-bold shrink-0 ${
                  b.status === 'TURN_APPROACHING'
                    ? 'bg-[#EA8A0A] text-white'
                    : b.status === 'PROCESSING'
                    ? 'bg-[#175CD3] text-white'
                    : b.status === 'COMPLETED'
                    ? 'bg-[#16803C] text-white'
                    : b.status === 'NO_SHOW'
                    ? 'bg-[#B42318] text-white'
                    : 'bg-[#EDF3EF] text-[#063B2A] border border-[#CBD8D1]'
                }`}>
                  <span className="text-[10px] uppercase font-normal">POS</span>
                  <span className="text-base leading-none">#{b.queuePosition || idx + 1}</span>
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[#17231F]">{b.farmerName}</span>
                    <span className="text-xs font-mono font-bold text-[#075E43] bg-[#E7F3EC] px-2 py-0.5 rounded">
                      {b.id}
                    </span>
                    <span className="text-xs text-[#66736D] font-mono">
                      (FID: {b.farmerId})
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[#66736D] mt-1.5 flex-wrap">
                    <span>📱 {b.farmerMobile}</span>
                    <span>🌾 {translateCrop(b.cropName)} ({b.quantityQuintals} {translateUnit('Qtl')})</span>
                    <span>⏰ Slot: {b.slot.split(' ')[0]}</span>
                    <span>📍 {b.centreLocation}</span>
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center gap-2 self-stretch sm:self-end lg:self-center flex-wrap justify-between sm:justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-[#EDF3EF]">
                <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                  b.status === 'PROCESSING'
                    ? 'bg-[#175CD3]/15 text-[#175CD3]'
                    : b.status === 'TURN_APPROACHING'
                    ? 'bg-[#EA8A0A]/15 text-[#B45309]'
                    : b.status === 'COMPLETED'
                    ? 'bg-[#16803C]/15 text-[#16803C]'
                    : b.status === 'NO_SHOW'
                    ? 'bg-[#B42318]/15 text-[#B42318]'
                    : 'bg-[#063B2A]/10 text-[#063B2A]'
                }`}>
                  {translateStatus(b.status)}
                </span>

                {/* State-dependent Operator Actions */}
                {b.status !== 'PROCESSING' && b.status !== 'COMPLETED' && b.status !== 'NO_SHOW' && (
                  <>
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleStartProcessing(b.queueEntryId || b.uuid || b.id)}
                      className="bg-[#075E43] hover:bg-[#063B2A] text-white text-xs font-bold px-3 py-1.5 rounded-[6px] transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{ot.startProcessingBtn}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleMarkNoShow(b.queueEntryId || b.uuid || b.id)}
                      className="bg-[#FFF5F5] hover:bg-[#FEE4E2] text-[#B42318] text-xs font-semibold px-2.5 py-1.5 rounded-[6px] border border-[#F0C2C2] transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>{ot.markNoShowBtn}</span>
                    </button>
                  </>
                )}

                {b.status === 'PROCESSING' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isActionLoading || completingId === b.id || completingId === b.uuid || (b.queueEntryId ? completingId === b.queueEntryId : false)}
                      onClick={() => handleCompleteProcessing(b.queueEntryId || b.uuid || b.id, b.id)}
                      className="bg-[#16803C] hover:bg-[#0F5A2A] text-white text-xs font-bold px-3 py-1.5 rounded-[6px] transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {completingId === b.id || completingId === b.uuid || (b.queueEntryId && completingId === b.queueEntryId)
                          ? 'Completing...'
                          : 'Complete Queue'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOperatorActiveTab('procurement')}
                      className="bg-[#175CD3] hover:bg-[#154fb8] text-white text-xs font-bold px-3 py-1.5 rounded-[6px] transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>{ot.tabProcurement}</span>
                    </button>
                  </div>
                )}

                {b.status === 'COMPLETED' && (
                  <span className="text-xs font-bold text-[#16803C] flex items-center gap-1 bg-[#E7F3EC] px-2.5 py-1 rounded-[6px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Done
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredBookings.length === 0 && (
          <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-8 text-center text-xs text-[#66736D]">
            No farmers found in this queue category.
          </div>
        )}
      </div>

      {/* Manual Check-in Modal */}
      {checkInModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[10px] border border-[#CBD8D1] max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#CBD8D1] pb-3">
              <h3 className="font-bold text-sm text-[#17231F] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#075E43]" />
                <span>{ot.gateCheckIn}</span>
              </h3>
              <button onClick={() => setCheckInModalOpen(false)} className="text-gray-400 hover:text-black">
                ✕
              </button>
            </div>

            <form onSubmit={handleManualCheckIn} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#17231F] mb-1">
                  Enter Booking Token ID or Farmer Mobile Number
                </label>
                <input
                  type="text"
                  required
                  value={checkInBookingId}
                  onChange={(e) => setCheckInBookingId(e.target.value)}
                  placeholder="e.g. BK-2026-9482 or 9876543210"
                  className="w-full bg-white border border-[#CBD8D1] rounded-[6px] p-2 text-xs font-mono focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#CBD8D1]">
                <button
                  type="button"
                  onClick={() => setCheckInModalOpen(false)}
                  className="px-3 py-1.5 rounded-[6px] border border-[#CBD8D1] text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#063B2A] text-white px-4 py-1.5 rounded-[6px] text-xs font-bold"
                >
                  {ot.checkInFarmerBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
