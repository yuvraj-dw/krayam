import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { CropInfo, ProcurementCentre, SlotTimeWindow, Booking, TimeSlot, RecommendedCentreItem } from '../../types';
import { api } from '../../services/api';
import { calculateDistanceKm, formatDistance } from '../../utils/geo';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  IndianRupee,
  Building2,
  CalendarCheck,
  RotateCcw,
  Navigation,
  Loader2,
  AlertCircle,
  Award,
  SlidersHorizontal,
  RefreshCw
} from 'lucide-react';
import { RescheduleModal } from './RescheduleModal';
import { CentreComparisonModal } from './CentreComparisonModal';

export const CreateBookingFlow: React.FC = () => {
  const { 
    crops, 
    centres, 
    farmer, 
    createBooking, 
    updateFarmerLocation,
    activeBooking, 
    setActiveView,
    isLoadingData,
    t,
    translateCrop,
    translateStatus,
    translateUnit,
    formatLocalizedDate
  } = useApp();

  const [step, setStep] = useState<number>(1);
  const [selectedCropId, setSelectedCropId] = useState<string>('');
  const [quantityQuintals, setQuantityQuintals] = useState<number>(50);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const [expectedDate, setExpectedDate] = useState<string>(tomorrowStr);

  const [selectedCentreId, setSelectedCentreId] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [selectedSlotWindow, setSelectedSlotWindow] = useState<SlotTimeWindow>('');

  // Geolocation state
  const [locationStatus, setLocationStatus] = useState<'idle' | 'detecting' | 'success' | 'error'>('idle');
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locationErrorMsg, setLocationErrorMsg] = useState<string | null>(null);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<RecommendedCentreItem[]>([]);
  const [isRecommending, setIsRecommending] = useState<boolean>(false);
  const [recommendError, setRecommendError] = useState<string | null>(null);

  // Slots state
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Modals & submission state
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState<boolean>(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string>('');

  // Initialize selected crop
  useEffect(() => {
    if (crops.length > 0 && !selectedCropId) {
      setSelectedCropId(crops[0].id);
    }
  }, [crops, selectedCropId]);

  // Selected crop object
  const selectedCrop = useMemo(() => {
    return (
      crops.find((c) => c.id === selectedCropId) ||
      crops.find((c) => c.name.toLowerCase() === selectedCropId.toLowerCase()) ||
      crops[0] || {
        id: '',
        name: 'Crop',
        mspPerQuintal: 0,
        unit: 'quintal',
      }
    );
  }, [crops, selectedCropId]);

  // Effective farmer coordinates (from state or profile)
  const farmerLat = farmer?.location?.coordinates?.latitude ?? farmer?.location?.coordinates?.lat;
  const farmerLng = farmer?.location?.coordinates?.longitude ?? farmer?.location?.coordinates?.lng;

  // Initialize centre selection
  useEffect(() => {
    if (centres.length > 0 && !selectedCentreId) {
      setSelectedCentreId(centres[0].id);
    }
  }, [centres, selectedCentreId]);

  // Browser Geolocation Handler
  const handleDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationErrorMsg('Browser geolocation is not supported on this device.');
      return;
    }

    setLocationStatus('detecting');
    setLocationErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLocationStatus('success');
        setLocationAccuracy(Math.round(accuracy));
        updateFarmerLocation({
          village: farmer?.location?.village,
          tehsil: farmer?.location?.tehsil,
          district: farmer?.location?.district,
          state: farmer?.location?.state,
          pincode: farmer?.location?.pincode,
          coordinates: {
            latitude,
            longitude,
            accuracy,
            lat: latitude,
            lng: longitude,
          },
        });
      },
      (err) => {
        setLocationStatus('error');
        if (err.code === 1) {
          setLocationErrorMsg('Location permission denied. Please allow location access to find nearest mandis.');
        } else if (err.code === 2) {
          setLocationErrorMsg('Location position unavailable. Please check your GPS signal.');
        } else {
          setLocationErrorMsg('Location request timed out. Click retry to attempt again.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [farmer, updateFarmerLocation]);

  // Fetch Centre Recommendations from FastAPI
  const fetchRecommendations = useCallback(async () => {
    if (!selectedCrop?.name || !expectedDate) return;

    setIsRecommending(true);
    setRecommendError(null);
    try {
      const recs = await api.bookings.recommend(selectedCrop.name, expectedDate);
      setRecommendations(recs);
      if (recs.length > 0 && recs[0]?.centre?.id) {
        setSelectedCentreId(recs[0].centre.id);
      }
    } catch (err: any) {
      console.warn('Backend recommend notice:', err.message);
      setRecommendError(err.message || 'Unable to retrieve algorithmic recommendations.');
    } finally {
      setIsRecommending(false);
    }
  }, [selectedCrop?.name, expectedDate]);

  // Trigger recommendation when entering Step 3
  useEffect(() => {
    if (step === 3) {
      fetchRecommendations();
    }
  }, [step, fetchRecommendations]);

  // Calculate distances & sort eligible centres
  const eligibleCentres = useMemo(() => {
    const cropName = selectedCrop?.name?.toLowerCase() || '';

    // Filter centres that accept this crop
    const filtered = centres.filter((c) => {
      if (c.acceptedCropIds.length === 0) return true;
      return c.acceptedCropIds.some(
        (id) =>
          id.toLowerCase() === cropName ||
          id.toLowerCase().includes(cropName) ||
          cropName.includes(id.toLowerCase())
      );
    });

    // Compute distances & attach recommendations
    return filtered.map((c) => {
      const recItem = recommendations.find((r) => r.centre.id === c.id);
      const cLat = c.location.coordinates?.latitude ?? c.location.coordinates?.lat;
      const cLng = c.location.coordinates?.longitude ?? c.location.coordinates?.lng;

      let dist = recItem?.distanceKm ?? c.distanceKm;
      if (
        (dist === null || dist === undefined) &&
        farmerLat !== undefined &&
        farmerLng !== undefined &&
        cLat !== undefined &&
        cLng !== undefined
      ) {
        dist = calculateDistanceKm(farmerLat, farmerLng, cLat, cLng);
      }

      return {
        ...c,
        computedDistance: dist,
        recommendation: recItem,
      };
    }).sort((a, b) => {
      // Prioritize backend recommendation score if available
      if (a.recommendation && b.recommendation) {
        return b.recommendation.score - a.recommendation.score;
      }
      if (a.recommendation) return -1;
      if (b.recommendation) return 1;

      // Fallback: sort by distance
      if (a.computedDistance !== undefined && b.computedDistance !== undefined) {
        return a.computedDistance - b.computedDistance;
      }
      return 0;
    });
  }, [centres, selectedCrop, recommendations, farmerLat, farmerLng]);

  // Fetch Slots when entering Step 4 or when date/centre changes
  useEffect(() => {
    if (step !== 4 || !selectedCentreId) return;

    let isMounted = true;
    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      setSlotsError(null);
      try {
        const liveSlots = await api.slots.getByCentreAndDate(selectedCentreId, expectedDate);
        if (isMounted) {
          setSlots(liveSlots);
          const available = liveSlots.filter((s) => s.isAvailable);
          if (available.length > 0) {
            setSelectedSlotId(available[0].id);
            setSelectedSlotWindow(available[0].formattedTimeWindow || available[0].timeWindow || '');
          } else {
            setSelectedSlotId('');
            setSelectedSlotWindow('');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setSlotsError(err.message || 'Unable to retrieve available slots for this date.');
          setSlots([]);
          setSelectedSlotId('');
          setSelectedSlotWindow('');
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
  }, [step, selectedCentreId, expectedDate]);

  // Selected centre object
  const selectedCentre = useMemo(() => {
    return (
      centres.find((c) => c.id === selectedCentreId) ||
      centres[0] || {
        id: '',
        name: 'Procurement Centre',
        acceptedCropIds: [],
        location: { address: '' },
      }
    );
  }, [centres, selectedCentreId]);

  // Estimated payout
  const estimatedTotalPayout = quantityQuintals * (selectedCrop?.mspPerQuintal || 0);

  // Submit Booking to Backend
  const handleConfirm = async () => {
    if (!selectedSlotId) {
      setBookingError('Please select a valid time slot before confirming.');
      return;
    }

    setIsSubmitting(true);
    setBookingError('');
    try {
      const booking = await createBooking({
        cropId: selectedCrop.id,
        quantityQuintals,
        expectedDate,
        centreId: selectedCentreId,
        slotId: selectedSlotId,
        slot: selectedSlotWindow || 'Designated Mandi Operating Window',
      });
      setConfirmedBooking(booking);
      setStep(5);
    } catch (err: any) {
      setBookingError(err.message || 'Failed to create booking on backend. Please check details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, titleEn: 'Select Crop', titleKey: 'selectCrop' as const },
    { num: 2, titleEn: 'Enter Quantity', titleKey: 'enterQuantity' as const },
    { num: 3, titleEn: 'Select Centre', titleKey: 'selectCentre' as const },
    { num: 4, titleEn: 'Date & Time', titleKey: 'selectSlot' as const },
    { num: 5, titleEn: 'Confirm Booking', titleKey: 'confirmBooking' as const },
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Existing Active Booking Banner */}
      {activeBooking && (
        <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[6px] bg-[#E7F3EC] border border-[#CBD8D1] text-[#075E43] flex items-center justify-center flex-shrink-0">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#17231F]">
                  {t('existingActiveBooking', 'Existing Active Booking')}: <span className="font-mono text-[#075E43]">{activeBooking.id}</span>
                </span>
                <span className="px-1.5 py-0.2 rounded-[4px] text-[10px] font-bold bg-[#E7F3EC] text-[#16803C] border border-[#CBD8D1]">
                  {translateStatus(activeBooking.status)}
                </span>
              </div>
              <div className="text-xs text-[#66736D] mt-0.5">
                {activeBooking.quantityQuintals} {t('qtl', 'Qtl')} {translateCrop(activeBooking.cropName)} at {activeBooking.centreName} ({formatLocalizedDate(activeBooking.expectedDate)})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('tracking')}
              className="h-9 px-4 rounded-[6px] bg-[#0B6B4F] hover:bg-[#075E43] text-[#FFFFFF] text-xs font-semibold"
            >
              {t('trackQueueAction')}
            </button>
            <button
              onClick={() => setIsRescheduleOpen(true)}
              className="h-9 px-3 rounded-[6px] bg-[#FFFFFF] border border-[#CBD8D1] hover:bg-[#F3F9F5] text-[#17231F] text-xs font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#075E43]" />
              <span>{t('reschedule', 'Reschedule')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-5 sm:p-6 shadow-sm">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#17231F]">
              {t('procurementBooking')}
            </h1>
            <p className="text-xs sm:text-sm text-[#66736D] mt-1">
              {t('ministryName')} — {t('appSubtitle')}
            </p>
          </div>
          <span className="text-xs font-mono text-[#075E43] font-semibold hidden sm:inline">
            {t('step')} {step} {t('of')} 5
          </span>
        </div>

        {/* Stepper */}
        <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-[#EDF3EF]">
          <div className="sm:hidden space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#063B2A] flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#063B2A] text-white flex items-center justify-center text-[10px] font-bold">
                  {step}
                </span>
                <span>{t(stepsList[step - 1].titleKey)}</span>
              </span>
              <span className="text-[11px] font-mono font-semibold text-[#075E43] bg-[#E7F3EC] px-2 py-0.5 rounded">
                {t('step')} {step} {t('of')} 5
              </span>
            </div>
            <div className="w-full bg-[#CBD8D1] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#0B6B4F] h-full transition-all duration-300 rounded-full"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>

          <div className="hidden sm:grid grid-cols-5 gap-2 text-center">
            {stepsList.map((s) => {
              const isPast = step > s.num;
              const isCurrent = step === s.num;
              return (
                <div key={s.num} className="space-y-1">
                  <div
                    className={`h-1.5 rounded-full transition-colors ${
                      isPast || isCurrent ? 'bg-[#0B6B4F]' : 'bg-[#CBD8D1]'
                    }`}
                  />
                  <span
                    className={`text-xs block font-bold ${
                      isCurrent
                        ? 'text-[#063B2A]'
                        : isPast
                        ? 'text-[#075E43]'
                        : 'text-[#66736D]'
                    }`}
                  >
                    {s.num}. {t(s.titleKey)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Global Booking Error Banner */}
      {bookingError && (
        <div className="bg-[#FFF5F5] border border-[#F0C2C2] rounded-[8px] p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#B42318] flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-[#B42318]">
            <span className="font-bold block">Backend Submission Error:</span>
            {bookingError}
          </div>
        </div>
      )}

      {/* Wizard Form Container */}
      <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-5 sm:p-6 shadow-sm">
        
        {/* STEP 1: Select Crop */}
        {step === 1 && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-bold text-[#17231F]">{t('step')} 1: {t('step1Title')}</h2>
              <p className="text-xs text-[#66736D] mt-0.5">
                {t('step1Desc')}
              </p>
            </div>

            {isLoadingData && crops.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center justify-center gap-2 text-xs text-[#66736D]">
                <Loader2 className="w-6 h-6 animate-spin text-[#075E43]" />
                <span>{t('loading')}...</span>
              </div>
            ) : crops.length === 0 ? (
              <div className="p-4 bg-[#FFF9ED] border border-[#F0D7A7] rounded-[6px] text-xs text-[#B45309]">
                No operational crops found in active mandi registers.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {crops.map((crop) => {
                  const isSelected = selectedCropId === crop.id;
                  return (
                    <button
                      key={crop.id}
                      type="button"
                      onClick={() => setSelectedCropId(crop.id)}
                      className={`p-4 rounded-[6px] border text-left transition-all ${
                        isSelected
                          ? 'border-[#075E43] bg-[#E7F3EC] ring-1 ring-[#075E43]'
                          : 'border-[#CBD8D1] bg-[#FFFFFF] hover:border-[#075E43] hover:bg-[#F3F9F5]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[#17231F]">{translateCrop(crop.name)}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#075E43]" />}
                      </div>
                      <div className="mt-2 flex items-baseline justify-between text-xs">
                        <span className="text-[#66736D]">MSP:</span>
                        <span className="font-bold text-[#063B2A] text-sm">
                          ₹{crop.mspPerQuintal.toLocaleString('en-IN')}/{translateUnit(crop.unit || 'Qtl')}
                        </span>
                      </div>
                      {crop.minPrice && crop.maxPrice && (
                        <div className="text-[10px] text-[#66736D] mt-1">
                          ₹{crop.minPrice} – ₹{crop.maxPrice}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!selectedCropId}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-[6px] bg-[#0B6B4F] hover:bg-[#075E43] text-[#FFFFFF] font-semibold text-sm transition-colors disabled:opacity-50"
              >
                <span>{t('continueToStep2')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Enter Quantity */}
        {step === 2 && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-bold text-[#17231F]">{t('step')} 2: {t('step2Title')}</h2>
              <p className="text-xs text-[#66736D] mt-0.5">
                {t('step2Desc')}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="quantityInput" className="block text-xs font-bold text-[#17231F] uppercase tracking-wide">
                {t('quantityInQuintals')} ({translateUnit(selectedCrop.unit || 'Quintals')})
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="quantityInput"
                  type="number"
                  min="1"
                  max="10000"
                  step="0.1"
                  value={quantityQuintals}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setQuantityQuintals(isNaN(val) ? 0 : val);
                  }}
                  className="flex-1 h-11 px-3 rounded-[6px] border border-[#CBD8D1] bg-[#FFFFFF] text-base font-bold text-[#17231F] focus:outline-none focus:border-[#16845F]"
                />
                <span className="h-11 px-4 rounded-[6px] bg-[#EDF3EF] border border-[#CBD8D1] text-xs font-bold text-[#17231F] flex items-center justify-center uppercase">
                  {translateUnit(selectedCrop.unit || 'Quintals')}
                </span>
              </div>
            </div>

            {/* Financial Estimate Strip */}
            <div className="bg-[#EDF3EF] border border-[#CBD8D1] rounded-[6px] p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-[#66736D] font-bold uppercase">{t('estGrossPayout')}</div>
                <div className="text-2xl font-bold text-[#063B2A] mt-0.5">
                  ₹{estimatedTotalPayout.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-[#66736D] mt-0.5">
                  {quantityQuintals} {translateUnit(selectedCrop.unit || 'Qtl')} × ₹{selectedCrop.mspPerQuintal}/{translateUnit(selectedCrop.unit || 'Qtl')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-[#17231F]">{t('disbursementAccount')}</div>
                <div className="text-xs font-mono text-[#075E43] font-bold mt-0.5">
                  {farmer?.bankAccountMasked || 'PFMS / Aadhaar DBT Linked'}
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-[6px] border border-[#CBD8D1] hover:bg-[#F3F9F5] text-[#17231F] text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('back')}</span>
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={quantityQuintals <= 0}
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-[6px] bg-[#0B6B4F] hover:bg-[#075E43] text-[#FFFFFF] font-semibold text-sm transition-colors disabled:opacity-50"
              >
                <span>{t('continueToStep3')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Location & Centre Selection */}
        {step === 3 && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h2 className="text-lg font-bold text-[#17231F]">{t('step')} 3: {t('step3Title')}</h2>
              <p className="text-xs text-[#66736D] mt-0.5">
                {t('step3Desc')}
              </p>
            </div>

            {/* Geolocation Strip */}
            <div className="bg-[#F4FAF6] border border-[#B7DCC5] rounded-[6px] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Navigation className="w-4 h-4 text-[#075E43] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-[#17231F]">
                    {locationStatus === 'detecting'
                      ? t('detectingLocation')
                      : locationStatus === 'success' || (farmerLat !== undefined && farmerLng !== undefined)
                      ? t('locationDetected')
                      : locationStatus === 'error'
                      ? t('locationError')
                      : t('useCurrentLocation')}
                  </div>
                  <div className="text-[11px] text-[#66736D] mt-0.5">
                    {farmerLat !== undefined && farmerLng !== undefined ? (
                      <span>
                        Lat: {farmerLat.toFixed(4)}, Lng: {farmerLng.toFixed(4)}
                        {locationAccuracy ? ` (±${locationAccuracy}m)` : ''}
                      </span>
                    ) : (
                      t('gpsNotice')
                    )}
                  </div>
                  {locationErrorMsg && (
                    <div className="text-[11px] text-[#B42318] mt-1 font-medium">
                      {locationErrorMsg}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={locationStatus === 'detecting'}
                  className="h-9 px-3.5 rounded-[6px] bg-[#FFFFFF] border border-[#CBD8D1] hover:bg-[#EDF3EF] text-xs font-semibold text-[#075E43] flex items-center gap-1.5 flex-shrink-0"
                >
                  {locationStatus === 'detecting' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('loading')}...</span>
                    </>
                  ) : locationStatus === 'error' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{t('retryGps')}</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{farmerLat !== undefined ? t('locationDetected') : t('useCurrentLocation')}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsComparisonOpen(true)}
                  className="h-9 px-3 rounded-[6px] bg-[#EDF3EF] border border-[#CBD8D1] hover:bg-[#CBD8D1]/40 text-xs font-semibold text-[#17231F] flex items-center gap-1 flex-shrink-0"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#075E43]" />
                  <span>{t('compareCentres')}</span>
                </button>
              </div>
            </div>

            {/* Recommendations Banner */}
            {isRecommending ? (
              <div className="p-4 bg-[#EDF3EF] rounded-[6px] border border-[#CBD8D1] text-xs text-[#66736D] flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-[#075E43]" />
                <span>{t('loading')}...</span>
              </div>
            ) : recommendError ? (
              <div className="p-3 bg-[#FFF9ED] border border-[#F0D7A7] rounded-[6px] text-xs text-[#B45309]">
                {recommendError}
              </div>
            ) : null}

            {/* Centres List */}
            {eligibleCentres.length === 0 ? (
              <div className="p-6 bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] text-center space-y-2">
                <p className="text-sm font-bold text-[#17231F]">No Authorized Mandis Found</p>
                <p className="text-xs text-[#66736D]">
                  None of the registered government mandis are currently configured to procure {translateCrop(selectedCrop.name)}.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {eligibleCentres.map((centre) => {
                  const isSelected = selectedCentreId === centre.id;
                  const rec = centre.recommendation;
                  const isRecommended = rec && rec.score > 0;

                  return (
                    <label
                      key={centre.id}
                      className={`block p-4 rounded-[6px] border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-[#075E43] bg-[#E7F3EC]'
                          : 'border-[#CBD8D1] bg-[#FFFFFF] hover:bg-[#F3F9F5]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="centreRadio"
                          checked={isSelected}
                          onChange={() => setSelectedCentreId(centre.id)}
                          className="mt-1 text-[#075E43] focus:ring-[#075E43]"
                        />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[#17231F]">{centre.name}</span>
                              {isRecommended && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#16803C] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#B7DCC5]">
                                  <Award className="w-3 h-3" />
                                  {t('recommended')}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-bold text-[#075E43] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#CBD8D1]">
                              {formatDistance(centre.computedDistance)}
                            </span>
                          </div>

                          {rec && rec.reasons && rec.reasons.length > 0 && (
                            <div className="text-[11px] text-[#075E43] font-semibold mt-1">
                              {rec.reasons.join(' • ')}
                            </div>
                          )}

                          <div className="text-xs text-[#66736D] mt-0.5">
                            {centre.location.address || `${centre.location.village ? centre.location.village + ', ' : ''}${centre.location.district}`}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 text-[11px] text-[#34443D]">
                            <span>{t('operationalHours')}: {centre.operatingHours.opens} – {centre.operatingHours.closes}</span>
                            <span>•</span>
                            <span>
                              {rec?.loadPercent !== undefined && rec.loadPercent > 0
                                ? `Load: ${rec.loadPercent}%`
                                : `${centre.currentQueue.loadLevel} Load`}
                            </span>
                            <span>•</span>
                            <span className="text-[#16803C] font-semibold">
                              {rec?.estWaitUnits !== undefined && rec.estWaitUnits > 0
                                ? `~${rec.estWaitUnits}m wait`
                                : 'Live wait info on check-in'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-[6px] border border-[#CBD8D1] hover:bg-[#F3F9F5] text-[#17231F] text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('back')}</span>
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!selectedCentreId || eligibleCentres.length === 0}
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-[6px] bg-[#0B6B4F] hover:bg-[#075E43] text-[#FFFFFF] font-semibold text-sm transition-colors disabled:opacity-50"
              >
                <span>{t('continueToStep4')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Select Date & Time Slots */}
        {step === 4 && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-bold text-[#17231F]">{t('step')} 4: {t('step4Title')}</h2>
              <p className="text-xs text-[#66736D] mt-0.5">
                {t('step4Desc')} (<strong>{selectedCentre.name}</strong>)
              </p>
            </div>

            {/* Date Input */}
            <div className="space-y-2">
              <label htmlFor="preferredDate" className="block text-xs font-bold text-[#17231F] uppercase tracking-wide">
                {t('selectDate')}
              </label>
              <input
                id="preferredDate"
                type="date"
                min={tomorrowStr}
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full h-11 px-3 rounded-[6px] border border-[#CBD8D1] bg-[#FFFFFF] text-sm text-[#17231F] focus:outline-none focus:border-[#16845F]"
              />
            </div>

            {/* Available Backend Slots */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#17231F] uppercase tracking-wide">
                  {t('availableSlots')} ({formatLocalizedDate(expectedDate)})
                </label>
                {isLoadingSlots && (
                  <span className="text-xs text-[#66736D] flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#075E43]" />
                    <span>{t('loading')}...</span>
                  </span>
                )}
              </div>

              {slotsError && (
                <div className="p-3 bg-[#FFF5F5] border border-[#F0C2C2] rounded-[6px] text-xs text-[#B42318]">
                  {slotsError}
                </div>
              )}

              {isLoadingSlots ? (
                <div className="py-6 text-center text-xs text-[#66736D]">
                  {t('loading')}...
                </div>
              ) : slots.length === 0 ? (
                <div className="p-4 bg-[#FFF9ED] border border-[#F0D7A7] rounded-[6px] text-xs text-[#B45309] text-center">
                  {t('noSlotsAvailable')}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {slots.map((s) => {
                    const isSelected = selectedSlotId === s.id;
                    const isFull = !s.isAvailable || s.currentBookings >= s.maxBookings;
                    const remaining = Math.max(0, s.maxBookings - s.currentBookings);
                    const labelText = s.formattedTimeWindow || s.timeWindow || `${s.startTime} - ${s.endTime}`;

                    return (
                      <label
                        key={s.id}
                        className={`block p-3.5 rounded-[6px] border cursor-pointer transition-colors ${
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
                            name="slotRadio"
                            disabled={isFull}
                            checked={isSelected}
                            onChange={() => {
                              setSelectedSlotId(s.id);
                              setSelectedSlotWindow(labelText);
                            }}
                            className="text-[#075E43] focus:ring-[#075E43]"
                          />
                          <div className="flex-1 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-sm text-[#17231F]">{labelText}</span>
                              <div className="text-[11px] text-[#66736D] mt-0.5">
                                {isFull ? 'Capacity Reached' : `${remaining} slots remaining (Cap: ${s.maxBookings})`}
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                isFull
                                  ? 'bg-[#FEE2E2] text-[#B91C1C]'
                                  : 'bg-[#DCFCE7] text-[#15803D]'
                              }`}
                            >
                              {isFull ? 'Closed' : 'Available'}
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <button
                onClick={() => setStep(3)}
                className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-[6px] border border-[#CBD8D1] hover:bg-[#F3F9F5] text-[#17231F] text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('back')}</span>
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSubmitting || !selectedSlotId}
                className={`inline-flex items-center justify-center gap-2 h-11 px-6 rounded-[6px] ${
                  isSubmitting ? 'bg-[#66736D] cursor-not-allowed' : 'bg-[#0B6B4F] hover:bg-[#075E43]'
                } text-[#FFFFFF] font-semibold text-sm transition-colors disabled:opacity-50`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('loading')}...</span>
                  </>
                ) : (
                  <>
                    <span>{t('generateGatePass')}</span>
                    <CheckCircle className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Confirm Booking */}
        {step === 5 && (
          <div className="space-y-6 max-w-2xl text-center mx-auto py-4">
            <div className="w-12 h-12 rounded-full bg-[#E7F3EC] border border-[#16803C] text-[#16803C] flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>

            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-[#16803C] bg-[#E7F3EC] px-2.5 py-1 rounded-[4px] border border-[#CBD8D1]">
                {t('bookingConfirmedTitle')}
              </span>
              <h2 className="text-2xl font-bold text-[#17231F] mt-2">
                {t('token')}: <span className="font-mono text-[#063B2A]">{confirmedBooking?.id}</span>
              </h2>
              {farmer?.mobileNumber && (
                <p className="text-xs text-[#66736D] mt-1">
                  {t('bookingConfirmedNotice')} {farmer.mobileNumber}
                </p>
              )}
            </div>

            {/* Booking Summary Table */}
            <div className="border border-[#CBD8D1] rounded-[6px] overflow-hidden text-left">
              <table className="gov-table">
                <tbody>
                  <tr>
                    <td className="w-2/5 bg-[#EDF3EF] font-semibold text-xs text-[#17231F]">{t('cropAndQuantity')}</td>
                    <td className="font-bold text-xs text-[#17231F]">
                      {translateCrop(selectedCrop.name)} — {quantityQuintals} {translateUnit(selectedCrop.unit || 'Qtl')}
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-[#EDF3EF] font-semibold text-xs text-[#17231F]">{t('mandiCentre')}</td>
                    <td className="text-xs text-[#17231F] font-bold">{selectedCentre.name}</td>
                  </tr>
                  <tr>
                    <td className="bg-[#EDF3EF] font-semibold text-xs text-[#17231F]">{t('allottedSlot', 'Allotted Date & Slot')}</td>
                    <td className="text-xs text-[#17231F]">{formatLocalizedDate(expectedDate)} ({selectedSlotWindow})</td>
                  </tr>
                  <tr>
                    <td className="bg-[#EDF3EF] font-semibold text-xs text-[#17231F]">{t('estGrossPayout')}</td>
                    <td className="text-xs font-bold text-[#063B2A]">
                      ₹{estimatedTotalPayout.toLocaleString('en-IN')} (MSP ₹{selectedCrop.mspPerQuintal}/{translateUnit(selectedCrop.unit || 'Qtl')})
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setActiveView('tracking')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-[6px] bg-[#0B6B4F] hover:bg-[#075E43] text-[#FFFFFF] font-semibold text-sm transition-colors"
              >
                <span>{t('viewInQueue')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setConfirmedBooking(null);
                  setStep(1);
                }}
                className="w-full sm:w-auto h-11 px-5 rounded-[6px] bg-[#FFFFFF] border border-[#CBD8D1] hover:bg-[#F3F9F5] text-[#17231F] font-semibold text-xs"
              >
                {t('createBooking')}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Comparison Modal */}
      <CentreComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        centres={centres}
        recommendations={recommendations}
        selectedCrop={selectedCrop}
        selectedCentreId={selectedCentreId}
        onSelectCentre={(id) => setSelectedCentreId(id)}
        farmerCoordinates={farmer?.location?.coordinates}
      />

      {/* Reschedule Modal */}
      {activeBooking && (
        <RescheduleModal
          booking={activeBooking}
          isOpen={isRescheduleOpen}
          onClose={() => setIsRescheduleOpen(false)}
        />
      )}
    </div>
  );
};
