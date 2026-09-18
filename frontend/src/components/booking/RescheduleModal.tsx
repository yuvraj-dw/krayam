import React, { useState, useEffect } from 'react';
import { Booking, TimeSlot } from '../../types';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Clock, AlertTriangle, X, Check, Loader2 } from 'lucide-react';

interface RescheduleModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({ booking, isOpen, onClose }) => {
  const { rescheduleBooking, t, translateCrop } = useApp();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().split('T')[0];

  const [newDate, setNewDate] = useState(minDateStr);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch available slots from backend whenever date or centre changes
  useEffect(() => {
    if (!isOpen || !booking || !booking.centreId) return;

    let isMounted = true;
    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      setSlotsError(null);
      try {
        const availableSlots = await api.slots.getByCentreAndDate(booking.centreId, newDate);
        if (isMounted) {
          setSlots(availableSlots);
          const firstAvailable = availableSlots.find((s) => s.isAvailable);
          setSelectedSlotId(firstAvailable?.id || '');
        }
      } catch (err: any) {
        if (isMounted) {
          setSlotsError(err.message || 'Unable to load slots for this date.');
          setSlots([]);
          setSelectedSlotId('');
        }
      } finally {
        if (isMounted) {
          setIsLoadingSlots(false);
        }
      }
    };

    fetchSlots();
    return () => {
      isMounted = false;
    };
  }, [isOpen, booking, newDate]);

  if (!isOpen || !booking) return null;

  const selectedSlotObj = slots.find((s) => s.id === selectedSlotId);
  const formattedSlotWindow = selectedSlotObj?.formattedTimeWindow || selectedSlotObj?.timeWindow || 'Standard Mandi Slot';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId) {
      setSubmitError('Please select an available time slot.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await rescheduleBooking(booking.uuid || booking.id, newDate, formattedSlotWindow, selectedSlotId);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setSubmitError(err.message || 'Rescheduling failed on backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#063B2A]/60">
      <div className="bg-[#FFFFFF] rounded-[8px] border border-[#CBD8D1] w-full max-w-md overflow-hidden text-[#17231F] shadow-gov-dropdown">
        {/* Header */}
        <div className="bg-[#EDF3EF] px-5 py-3.5 border-b border-[#CBD8D1] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#075E43] font-bold block">
              Official Slot Re-allocation
            </span>
            <h3 className="font-bold text-base text-[#17231F]">{t('rescheduleBooking')}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-[#66736D] hover:text-[#17231F] hover:bg-[#CBD8D1]/40">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {success ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 bg-[#E7F3EC] text-[#16803C] border border-[#B7DCC5] rounded-full flex items-center justify-center mx-auto shadow-xs">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h4 className="text-base font-bold text-[#17231F]">{t('bookingRescheduled')}</h4>
              <p className="text-xs text-[#66736D]">
                Your booking has been updated to <strong>{newDate}</strong> ({formattedSlotWindow}).
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 bg-[#FFF9ED] border border-[#F0D7A7] rounded-[6px] text-xs text-[#B45309] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Rescheduling will retain your crop allocation for <strong>{translateCrop(booking.cropName)}</strong> at <strong>{booking.centreName}</strong> while generating a new queue slot.
                </span>
              </div>

              {submitError && (
                <div className="p-3 bg-[#FFF5F5] border border-[#F0C2C2] rounded-[6px] text-xs text-[#B42318]">
                  {submitError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#17231F] uppercase mb-1">
                  {t('selectDate')}
                </label>
                <input
                  type="date"
                  min={minDateStr}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full h-11 px-3 border border-[#CBD8D1] rounded-[6px] bg-[#FFFFFF] text-sm text-[#17231F] focus:outline-none focus:border-[#16845F]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17231F] uppercase mb-1">
                  {t('availableSlots')}
                </label>

                {isLoadingSlots ? (
                  <div className="py-4 text-center flex items-center justify-center gap-2 text-xs text-[#66736D]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#075E43]" />
                    <span>Loading live slots for {newDate}...</span>
                  </div>
                ) : slotsError ? (
                  <div className="p-3 bg-[#FFF5F5] border border-[#F0C2C2] rounded-[6px] text-xs text-[#B42318]">
                    {slotsError}
                  </div>
                ) : slots.length === 0 ? (
                  <div className="p-3 bg-[#F3F9F5] border border-[#CBD8D1] rounded-[6px] text-xs text-[#66736D] text-center">
                    {t('noSlotsAvailable')}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {slots.map((s) => {
                      const isFull = !s.isAvailable || s.currentBookings >= s.maxBookings;
                      const isSelected = selectedSlotId === s.id;
                      const remaining = Math.max(0, s.maxBookings - s.currentBookings);

                      return (
                        <label
                          key={s.id}
                          className={`block p-3 rounded-[6px] border cursor-pointer transition-colors ${
                            isFull
                              ? 'bg-[#F9FAFB] border-[#E5E7EB] opacity-60 cursor-not-allowed'
                              : isSelected
                              ? 'border-[#075E43] bg-[#E7F3EC]'
                              : 'border-[#CBD8D1] bg-[#FFFFFF] hover:bg-[#F3F9F5]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="rescheduleSlotRadio"
                              disabled={isFull}
                              checked={isSelected}
                              onChange={() => setSelectedSlotId(s.id)}
                              className="text-[#075E43] focus:ring-[#075E43]"
                            />
                            <div className="flex-1 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold text-[#17231F]">
                                  {s.formattedTimeWindow || s.timeWindow}
                                </span>
                                <div className="text-[11px] text-[#66736D]">
                                  {isFull ? 'Fully Booked' : `${remaining} slots remaining`}
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  isFull
                                    ? 'bg-[#FEE2E2] text-[#B91C1C]'
                                    : 'bg-[#DCFCE7] text-[#15803D]'
                                }`}
                              >
                                {isFull ? 'Full' : 'Open'}
                              </span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#EDF3EF] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="h-10 px-4 rounded-[6px] border border-[#CBD8D1] hover:bg-[#F3F9F5] text-xs font-semibold text-[#17231F]"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedSlotId || slots.length === 0}
                  className="h-10 px-5 rounded-[6px] bg-[#0B6B4F] hover:bg-[#075E43] disabled:opacity-50 text-[#FFFFFF] text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Rescheduling...</span>
                    </>
                  ) : (
                    <span>{t('confirm')}</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
