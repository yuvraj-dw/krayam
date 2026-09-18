import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Booking, SlotTimeWindow } from '../../types';
import { getOperatorText } from '../../i18n/operatorTranslations';
import { 
  Search, 
  Filter, 
  Calendar, 
  Eye, 
  XCircle, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  FileText
} from 'lucide-react';

export const OperatorBookingsTab: React.FC = () => {
  const { 
    bookings, 
    crops, 
    operatorCancelBooking, 
    operatorRescheduleBooking,
    language,
    translateCrop,
    translateStatus,
    translateUnit
  } = useApp();

  const ot = getOperatorText(language);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCrop, setFilterCrop] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSlot, setFilterSlot] = useState('');

  // Modals state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('Farmer requested due to transport delay');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [rescheduleModalBooking, setRescheduleModalBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('2026-09-15');
  const [rescheduleSlot, setRescheduleSlot] = useState<SlotTimeWindow>('Morning (08:00 AM - 11:30 AM)');

  // Filter Bookings logic
  const filtered = bookings.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q || 
      b.farmerName.toLowerCase().includes(q) ||
      b.farmerMobile.includes(q) ||
      b.farmerId.toLowerCase().includes(q) ||
      b.id.toLowerCase().includes(q);

    const matchesCrop = !filterCrop || b.cropName.toLowerCase().includes(filterCrop.toLowerCase());
    const matchesStatus = !filterStatus || b.status === filterStatus;
    const matchesSlot = !filterSlot || b.slot.toLowerCase().includes(filterSlot.toLowerCase());

    return matchesSearch && matchesCrop && matchesStatus && matchesSlot;
  });

  const handleConfirmCancel = async () => {
    if (!cancelModalBooking) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      await operatorCancelBooking(cancelModalBooking.uuid || cancelModalBooking.id, cancelReason);
      setCancelModalBooking(null);
      setCancelReason('Farmer requested due to transport delay');
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel booking on backend.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmReschedule = () => {
    if (!rescheduleModalBooking) return;
    operatorRescheduleBooking(rescheduleModalBooking.uuid || rescheduleModalBooking.id, rescheduleDate, rescheduleSlot);
    setRescheduleModalBooking(null);
  };

  return (
    <div className="space-y-6">
      {/* Title and Summary Header */}
      <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#17231F] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#075E43]" />
            <span>{ot.bookingsTitle}</span>
          </h2>
          <p className="text-xs text-[#66736D]">
            {ot.bookingsSubtitle}
          </p>
        </div>
        <div className="text-xs font-mono font-bold text-[#063B2A] bg-[#EDF3EF] px-3 py-1.5 rounded-[6px] border border-[#CBD8D1]">
          {filtered.length} / {bookings.length}
        </div>
      </div>

      {/* Multi-parameter Search and Filter Controls */}
      <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-4 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#66736D] absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={ot.searchBookingPlaceholder}
            className="w-full bg-[#FFFFFF] border border-[#CBD8D1] rounded-[6px] pl-10 pr-4 py-2 text-xs focus:border-[#075E43] focus:outline-none"
          />
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          {/* Crop Filter */}
          <div>
            <label className="block text-[10px] font-bold text-[#66736D] uppercase mb-1">
              {ot.filterCrop}
            </label>
            <select
              value={filterCrop}
              onChange={(e) => setFilterCrop(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#CBD8D1] rounded-[6px] px-2.5 py-1.5 focus:border-[#075E43] focus:outline-none"
            >
              <option value="">{ot.allCrops}</option>
              {crops.map(c => (
                <option key={c.id} value={c.name}>{translateCrop(c.name)}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-[#66736D] uppercase mb-1">
              {ot.filterStatus}
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#CBD8D1] rounded-[6px] px-2.5 py-1.5 focus:border-[#075E43] focus:outline-none"
            >
              <option value="">{ot.allStatuses}</option>
              <option value="CONFIRMED">{translateStatus('CONFIRMED')}</option>
              <option value="CHECKED_IN">{translateStatus('CHECKED_IN')}</option>
              <option value="IN_QUEUE">{translateStatus('IN_QUEUE')}</option>
              <option value="TURN_APPROACHING">{translateStatus('TURN_APPROACHING')}</option>
              <option value="PROCESSING">{translateStatus('PROCESSING')}</option>
              <option value="COMPLETED">{translateStatus('COMPLETED')}</option>
              <option value="NO_SHOW">{translateStatus('NO_SHOW')}</option>
              <option value="CANCELLED">{translateStatus('CANCELLED')}</option>
            </select>
          </div>

          {/* Slot Filter */}
          <div>
            <label className="block text-[10px] font-bold text-[#66736D] uppercase mb-1">
              {ot.filterSlot}
            </label>
            <select
              value={filterSlot}
              onChange={(e) => setFilterSlot(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#CBD8D1] rounded-[6px] px-2.5 py-1.5 focus:border-[#075E43] focus:outline-none"
            >
              <option value="">{ot.allSlots}</option>
              <option value="Morning">Morning (08:00 AM - 11:30 AM)</option>
              <option value="Midday">Midday (11:30 AM - 02:30 PM)</option>
              <option value="Afternoon">Afternoon (02:30 PM - 05:30 PM)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[650px]">
            <thead className="bg-[#EDF3EF] text-[#34443D] uppercase text-[10px] font-bold border-b border-[#CBD8D1]">
              <tr>
                <th className="px-4 py-3">{ot.bookingIdHeader}</th>
                <th className="px-4 py-3">{ot.farmerNameHeader}</th>
                <th className="px-4 py-3">{ot.cropHeader}</th>
                <th className="px-4 py-3">{ot.slotTimeHeader}</th>
                <th className="px-4 py-3">{ot.statusHeader}</th>
                <th className="px-4 py-3 text-right">{ot.actionsHeader}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CBD8D1]">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-[#F5F8F6] transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#063B2A]">
                    {b.id}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-[#17231F]">{b.farmerName}</div>
                    <div className="text-[11px] text-[#66736D] font-mono">
                      ID: {b.farmerId} • {b.farmerMobile}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[#17231F]">{translateCrop(b.cropName)}</div>
                    <div className="text-[11px] text-[#075E43] font-bold font-mono">
                      {b.quantityQuintals} {translateUnit('Quintals')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono font-bold text-[#17231F]">{b.expectedDate}</div>
                    <div className="text-[11px] text-[#66736D]">{b.slot}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      b.status === 'COMPLETED' ? 'bg-[#16803C]/10 text-[#16803C]' :
                      b.status === 'PROCESSING' ? 'bg-[#175CD3]/10 text-[#175CD3]' :
                      b.status === 'CANCELLED' ? 'bg-[#B42318]/10 text-[#B42318]' :
                      b.status === 'NO_SHOW' ? 'bg-[#B42318]/10 text-[#B42318]' :
                      b.status === 'TURN_APPROACHING' ? 'bg-[#EA8A0A]/10 text-[#B45309]' :
                      'bg-[#063B2A]/10 text-[#063B2A]'
                    }`}>
                      {translateStatus(b.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelectedBooking(b)}
                      className="bg-[#EDF3EF] hover:bg-[#CBD8D1] text-[#063B2A] font-bold text-[11px] px-2.5 py-1 rounded border border-[#CBD8D1] transition-colors inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>{ot.viewDetailsBtn}</span>
                    </button>

                    {b.status !== 'COMPLETED' && b.status !== 'CANCELLED' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setRescheduleModalBooking(b)}
                          className="bg-[#EDF3EF] hover:bg-[#CBD8D1] text-[#075E43] font-bold text-[11px] px-2.5 py-1 rounded border border-[#CBD8D1] transition-colors inline-flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3" />
                          <span>{ot.rescheduleBtn}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCancelModalBooking(b)}
                          className="bg-[#FFF5F5] hover:bg-[#FEE4E2] text-[#B42318] font-bold text-[11px] px-2.5 py-1 rounded border border-[#F0C2C2] transition-colors inline-flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>{ot.cancelBookingBtn}</span>
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-8 text-center text-xs text-[#66736D]">
            No bookings found matching your search and filter criteria.
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-[10px] border border-[#CBD8D1] max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#CBD8D1] pb-3">
              <h3 className="font-bold text-sm text-[#17231F] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#075E43]" />
                <span>{ot.bookingDetailsTitle}: {selectedBooking.id}</span>
              </h3>
              <button onClick={() => setSelectedBooking(null)} className="text-gray-400 hover:text-black">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-[#F5F8F6] p-3 rounded-[6px] border border-[#CBD8D1]">
                <div>
                  <div className="text-[#66736D]">Farmer Name:</div>
                  <div className="font-bold text-[#17231F]">{selectedBooking.farmerName}</div>
                </div>
                <div>
                  <div className="text-[#66736D]">Farmer ID:</div>
                  <div className="font-mono font-bold text-[#063B2A]">{selectedBooking.farmerId}</div>
                </div>
                <div>
                  <div className="text-[#66736D]">Mobile Number:</div>
                  <div className="font-mono font-bold text-[#17231F]">{selectedBooking.farmerMobile}</div>
                </div>
                <div>
                  <div className="text-[#66736D]">Status:</div>
                  <div className="font-bold text-[#075E43]">{selectedBooking.status}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-[#F5F8F6] p-3 rounded-[6px] border border-[#CBD8D1]">
                <div>
                  <div className="text-[#66736D]">Crop:</div>
                  <div className="font-bold text-[#17231F]">{selectedBooking.cropName}</div>
                </div>
                <div>
                  <div className="text-[#66736D]">Booked Quantity:</div>
                  <div className="font-mono font-bold text-[#17231F]">{selectedBooking.quantityQuintals} Quintals</div>
                </div>
                <div>
                  <div className="text-[#66736D]">Procurement Date:</div>
                  <div className="font-mono font-bold text-[#17231F]">{selectedBooking.expectedDate}</div>
                </div>
                <div>
                  <div className="text-[#66736D]">Slot Window:</div>
                  <div className="font-bold text-[#17231F]">{selectedBooking.slot}</div>
                </div>
              </div>

              <div className="text-[11px] text-[#66736D]">
                Centre: <strong>{selectedBooking.centreName}</strong> ({selectedBooking.centreLocation})
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#CBD8D1]">
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="bg-[#063B2A] text-white text-xs font-bold px-4 py-2 rounded-[6px]"
              >
                Close Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[10px] border border-[#F0C2C2] max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-[#B42318] flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              <span>{ot.cancelBookingBtn}: {cancelModalBooking.id}</span>
            </h3>
            <p className="text-xs text-[#66736D]">
              Are you sure you want to cancel appointment for <strong>{cancelModalBooking.farmerName}</strong> ({cancelModalBooking.cropName})?
            </p>
            {cancelError && (
              <div className="bg-[#FFF5F5] text-[#B42318] border border-[#F0C2C2] px-3 py-2 rounded-[6px] text-xs font-semibold">
                ⚠️ {cancelError}
              </div>
            )}
            <div className="text-xs">
              <label className="block font-bold text-[#17231F] mb-1">{ot.cancelReasonPrompt}</label>
              <textarea
                rows={2}
                disabled={isCancelling}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-white border border-[#CBD8D1] rounded-[6px] p-2 text-xs focus:outline-none disabled:opacity-50"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#CBD8D1]">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => {
                  setCancelModalBooking(null);
                  setCancelError(null);
                }}
                className="px-3 py-1.5 rounded-[6px] border border-[#CBD8D1] text-xs font-bold disabled:opacity-50"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancel}
                className="bg-[#B42318] hover:bg-[#911b11] text-white px-4 py-1.5 rounded-[6px] text-xs font-bold disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : ot.confirmCancelBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Booking Modal */}
      {rescheduleModalBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-[10px] border border-[#CBD8D1] max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-[#075E43] flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{ot.rescheduleBtn}: {rescheduleModalBooking.id}</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#17231F] mb-1">{ot.newDateLabel}</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full bg-white border border-[#CBD8D1] rounded-[6px] p-2 text-xs focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-[#17231F] mb-1">{ot.newSlotLabel}</label>
                <select
                  value={rescheduleSlot}
                  onChange={(e) => setRescheduleSlot(e.target.value as SlotTimeWindow)}
                  className="w-full bg-white border border-[#CBD8D1] rounded-[6px] p-2 text-xs focus:outline-none"
                >
                  <option value="Morning (08:00 AM - 11:30 AM)">Morning (08:00 AM - 11:30 AM)</option>
                  <option value="Midday (11:30 AM - 02:30 PM)">Midday (11:30 AM - 02:30 PM)</option>
                  <option value="Afternoon (02:30 PM - 05:30 PM)">Afternoon (02:30 PM - 05:30 PM)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#CBD8D1]">
              <button
                type="button"
                onClick={() => setRescheduleModalBooking(null)}
                className="px-3 py-1.5 rounded-[6px] border border-[#CBD8D1] text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReschedule}
                className="bg-[#063B2A] text-white px-4 py-1.5 rounded-[6px] text-xs font-bold"
              >
                {ot.confirmRescheduleBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
