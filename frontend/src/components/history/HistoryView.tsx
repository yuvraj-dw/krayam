import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Booking } from '../../types';
import { Search, Calendar, RotateCcw, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { RescheduleModal } from '../booking/RescheduleModal';

export const HistoryView: React.FC = () => {
  const { 
    procurements, 
    bookings, 
    crops, 
    cancelBooking,
    t,
    translateCrop,
    translateStatus,
    translateUnit,
    formatLocalizedDate
  } = useApp();

  const [activeTab, setActiveTab] = useState<'bookings' | 'procurements'>('bookings');
  const [selectedCrop, setSelectedCrop] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Reschedule and Cancel states
  const [rescheduleBookingTarget, setRescheduleBookingTarget] = useState<Booking | null>(null);
  const [cancelTargetBooking, setCancelTargetBooking] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleConfirmCancel = async () => {
    if (!cancelTargetBooking) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      await cancelBooking(cancelTargetBooking.uuid || cancelTargetBooking.id);
      setCancelTargetBooking(null);
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel booking.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Filter Bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesCrop = selectedCrop === 'ALL' || b.cropName.toLowerCase() === selectedCrop.toLowerCase();
    const matchesStatus = selectedStatus === 'ALL' || b.status.toLowerCase() === selectedStatus.toLowerCase();
    const matchesSearch =
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.cropName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.centreName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.expectedDate.includes(searchQuery);

    return matchesCrop && matchesStatus && matchesSearch;
  });

  // Map dynamic server procurements into table rows
  const procurementRows = procurements.map((p, idx) => {
    const isPaid = p.paymentStatus === 'Credited';
    const isFailed = p.paymentStatus === 'Failed' || p.procurementStatus === 'Rejected';
    return {
      id: p.id || `TXN-${idx + 1}`,
      date: p.date,
      crop: p.cropName,
      cropId: p.cropName.toLowerCase(),
      quantity: `${p.acceptedQuantity || p.bookedQuantity || 0} Qtl`,
      centre: p.centreName,
      amount: `₹${(p.paymentAmount || p.grossAmount || 0).toLocaleString('en-IN')}`,
      status: isPaid ? 'Paid' : isFailed ? 'Cancelled' : 'Processing',
      statusType: isPaid ? 'success' : isFailed ? 'error' : 'warning',
    };
  });

  const filteredProcurements = procurementRows.filter((r) => {
    const matchesCrop = selectedCrop === 'ALL' || r.cropId === selectedCrop.toLowerCase();
    const matchesStatus = selectedStatus === 'ALL' || r.status.toLowerCase() === selectedStatus.toLowerCase();
    const matchesSearch =
      r.crop.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.centre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.amount.includes(searchQuery);

    return matchesCrop && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#17231F]">
              {t('navHistory')}
            </h1>
            <p className="text-xs sm:text-sm text-[#66736D] mt-0.5">
              {t('descHistory')}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex rounded-[6px] border border-[#CBD8D1] bg-[#EDF3EF] p-1 shrink-0">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-3.5 py-1.5 rounded-[4px] text-xs font-semibold transition-all ${
                activeTab === 'bookings'
                  ? 'bg-[#FFFFFF] text-[#063B2A] shadow-xs'
                  : 'text-[#66736D] hover:text-[#17231F]'
              }`}
            >
              {t('allBookings')} ({bookings.length})
            </button>
            <button
              onClick={() => setActiveTab('procurements')}
              className={`px-3.5 py-1.5 rounded-[4px] text-xs font-semibold transition-all ${
                activeTab === 'procurements'
                  ? 'bg-[#FFFFFF] text-[#063B2A] shadow-xs'
                  : 'text-[#66736D] hover:text-[#17231F]'
              }`}
            >
              {t('allProcurements')} ({procurements.length})
            </button>
          </div>
        </div>
      </div>

      {/* Filters & Search Strip */}
      <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Crop Filter */}
          <div className="flex-1 min-w-[160px]">
            <label className="block text-[11px] font-bold text-[#66736D] uppercase mb-1">
              {t('selectCrop')}
            </label>
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="w-full h-10 px-3 rounded-[6px] border border-[#CBD8D1] bg-[#FFFFFF] text-xs text-[#17231F] focus:outline-none focus:border-[#16845F]"
            >
              <option value="ALL">{t('allCropsFilter')}</option>
              {crops.map((c) => (
                <option key={c.id} value={c.name}>
                  {translateCrop(c.name)}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[11px] font-bold text-[#66736D] uppercase mb-1">
              {t('status')}
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-10 px-3 rounded-[6px] border border-[#CBD8D1] bg-[#FFFFFF] text-xs text-[#17231F] focus:outline-none focus:border-[#16845F]"
            >
              <option value="ALL">{t('all', 'All')}</option>
              {activeTab === 'bookings' ? (
                <>
                  <option value="CONFIRMED">{translateStatus('CONFIRMED')}</option>
                  <option value="RESCHEDULED">{translateStatus('RESCHEDULED')}</option>
                  <option value="CHECKED_IN">{translateStatus('CHECKED_IN')}</option>
                  <option value="COMPLETED">{translateStatus('COMPLETED')}</option>
                  <option value="CANCELLED">{translateStatus('CANCELLED')}</option>
                </>
              ) : (
                <>
                  <option value="Paid">{translateStatus('PAID')}</option>
                  <option value="Processing">{translateStatus('PROCESSING')}</option>
                  <option value="Cancelled">{translateStatus('CANCELLED')}</option>
                </>
              )}
            </select>
          </div>

          {/* Search Input */}
          <div className="flex-[2] min-w-[220px]">
            <label className="block text-[11px] font-bold text-[#66736D] uppercase mb-1">
              {t('search')}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#66736D] absolute left-3 top-3" />
              <input
                type="text"
                placeholder={t('searchHistoryPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-[6px] border border-[#CBD8D1] bg-[#FFFFFF] text-xs text-[#17231F] focus:outline-none focus:border-[#16845F]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Error Alert */}
      {cancelError && (
        <div className="p-4 bg-[#FFF5F5] border border-[#F0C2C2] rounded-[8px] text-xs text-[#B42318] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{cancelError}</span>
        </div>
      )}

      {/* TAB 1: MANDI BOOKINGS LEDGER */}
      {activeTab === 'bookings' && (
        <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="gov-table min-w-[720px]">
              <thead>
                <tr>
                  <th className="w-1/6">{t('token')}</th>
                  <th className="w-1/6">{t('date')}</th>
                  <th className="w-1/6">{t('cropAndQuantity')}</th>
                  <th className="w-2/6">{t('mandiCentre')}</th>
                  <th className="w-1/6">{t('status')}</th>
                  <th className="w-1/6 text-right">{t('action')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-sm text-[#66736D]">
                      No mandi bookings found matching your search or filters.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b) => {
                    const isCancellable = b.status === 'CONFIRMED' || b.status === 'RESCHEDULED';
                    const isCancelled = b.status === 'CANCELLED';
                    const isCompleted = b.status === 'COMPLETED';

                    const statusBadge = isCompleted
                      ? 'bg-[#E7F3EC] text-[#16803C] border-[#B7DCC5]'
                      : isCancelled
                      ? 'bg-[#FFF5F5] text-[#B42318] border-[#F0C2C2]'
                      : 'bg-[#EDF3EF] text-[#075E43] border-[#CBD8D1]';

                    return (
                      <tr key={b.id}>
                        <td className="font-mono font-bold text-xs text-[#063B2A]">
                          {b.id}
                        </td>
                        <td className="text-xs text-[#17231F]">
                          <div className="font-semibold">{formatLocalizedDate(b.expectedDate)}</div>
                          <div className="text-[11px] text-[#66736D]">{b.slot}</div>
                        </td>
                        <td className="text-xs font-semibold text-[#17231F]">
                          <div>{translateCrop(b.cropName)}</div>
                          <div className="font-mono text-[11px] text-[#075E43]">
                            {b.quantityQuintals} {translateUnit(b.unit || 'Qtl')}
                          </div>
                        </td>
                        <td className="text-xs text-[#34443D]">
                          <div className="font-semibold text-[#17231F]">{b.centreName}</div>
                          <div className="text-[11px] text-[#66736D]">{b.centreLocation}</div>
                        </td>
                        <td>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-bold border uppercase tracking-wider ${statusBadge}`}>
                            ● {translateStatus(b.status)}
                          </span>
                        </td>
                        <td className="text-right">
                          {isCancellable ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setRescheduleBookingTarget(b)}
                                className="h-8 px-2.5 rounded-[4px] border border-[#CBD8D1] hover:bg-[#F3F9F5] text-xs font-semibold text-[#075E43] inline-flex items-center gap-1"
                                title="Reschedule Date/Slot"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>{t('reschedule', 'Reschedule')}</span>
                              </button>
                              <button
                                onClick={() => setCancelTargetBooking(b)}
                                className="h-8 px-2.5 rounded-[4px] border border-[#F0C2C2] bg-[#FFF5F5] hover:bg-[#FEE2E2] text-xs font-semibold text-[#B42318] inline-flex items-center gap-1"
                                title="Cancel Booking"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>{t('cancel')}</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#66736D] font-medium">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-[#EDF3EF] px-5 py-3 border-t border-[#CBD8D1] flex flex-col sm:flex-row items-center justify-between text-xs text-[#66736D] gap-2">
            <span>
              Showing {filteredBookings.length} of {bookings.length} registered mandi bookings
            </span>
            <span className="font-mono text-[11px]">
              Directly connected to FastAPI Backend
            </span>
          </div>
        </div>
      )}

      {/* TAB 2: CERTIFIED PROCUREMENTS LEDGER */}
      {activeTab === 'procurements' && (
        <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="gov-table min-w-[640px]">
              <thead>
                <tr>
                  <th className="w-1/6">{t('date')}</th>
                  <th className="w-1/6">{t('cropAndQuantity')}</th>
                  <th className="w-1/6">{t('quantityInQuintals')}</th>
                  <th className="w-2/6">{t('mandiCentre')}</th>
                  <th className="w-1/6">{t('payableAmount')}</th>
                  <th className="w-1/6">{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProcurements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-sm text-[#66736D]">
                      No certified procurement records found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredProcurements.map((row) => {
                    const badgeStyle = 
                      row.statusType === 'success' 
                        ? 'bg-[#E7F3EC] text-[#16803C] border-[#B7DCC5]' 
                        : row.statusType === 'warning'
                        ? 'bg-[#FFF9ED] text-[#B45309] border-[#F0D7A7]'
                        : 'bg-[#FFF5F5] text-[#B42318] border-[#F0C2C2]';

                    return (
                      <tr key={row.id}>
                        <td className="font-medium text-xs text-[#17231F]">
                          {formatLocalizedDate(row.date)}
                        </td>
                        <td className="text-xs font-semibold text-[#17231F]">
                          {translateCrop(row.crop)}
                        </td>
                        <td className="font-mono text-xs font-bold text-[#075E43]">
                          {row.quantity}
                        </td>
                        <td className="text-xs text-[#34443D]">
                          {row.centre}
                        </td>
                        <td className="font-mono font-bold text-xs text-[#063B2A]">
                          {row.amount}
                        </td>
                        <td>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-bold border uppercase tracking-wider ${badgeStyle}`}>
                            ● {translateStatus(row.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-[#EDF3EF] px-5 py-3 border-t border-[#CBD8D1] flex flex-col sm:flex-row items-center justify-between text-xs text-[#66736D] gap-2">
            <span>
              Showing {filteredProcurements.length} of {procurementRows.length} verified transactions
            </span>
            <span className="font-mono text-[11px]">
              Data synced with State Mandi Board & Treasury
            </span>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {cancelTargetBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#063B2A]/60">
          <div className="bg-[#FFFFFF] rounded-[8px] border border-[#CBD8D1] w-full max-w-sm overflow-hidden text-[#17231F] shadow-gov-dropdown p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FFF5F5] border border-[#F0C2C2] text-[#B42318] flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#17231F]">Cancel Booking?</h3>
                <p className="text-xs text-[#66736D]">Token: {cancelTargetBooking.id}</p>
              </div>
            </div>

            <p className="text-xs text-[#34443D]">
              Are you sure you want to cancel this booking? This will release your weighbridge arrival slot back to the mandi.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EDF3EF]">
              <button
                onClick={() => setCancelTargetBooking(null)}
                disabled={isCancelling}
                className="h-9 px-4 rounded-[6px] border border-[#CBD8D1] hover:bg-[#F3F9F5] text-xs font-semibold text-[#17231F]"
              >
                Keep Booking
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="h-9 px-4 rounded-[6px] bg-[#B42318] hover:bg-[#991B1B] text-white text-xs font-semibold"
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleBookingTarget && (
        <RescheduleModal
          booking={rescheduleBookingTarget}
          isOpen={Boolean(rescheduleBookingTarget)}
          onClose={() => setRescheduleBookingTarget(null)}
        />
      )}
    </div>
  );
};
