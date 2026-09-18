import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ProcurementCentre } from '../../types';
import { LeafletMap } from '../common/LeafletMap';
import { calculateDistanceKm, formatDistance } from '../../utils/geo';
import { 
  Building2, 
  MapPin, 
  Clock, 
  Search, 
  CalendarPlus, 
  CheckCircle2, 
  Users
} from 'lucide-react';

export const CentresView: React.FC = () => {
  const { 
    centres, 
    crops, 
    farmer, 
    selectedCentre, 
    setSelectedCentre, 
    setActiveView,
    t,
    translateCrop
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [cropFilter, setCropFilter] = useState('ALL');

  const farmerLat = farmer?.location?.coordinates?.latitude ?? farmer?.location?.coordinates?.lat;
  const farmerLng = farmer?.location?.coordinates?.longitude ?? farmer?.location?.coordinates?.lng;

  const centresWithDistance = useMemo(() => {
    return centres.map((centre) => {
      const cLat = centre.location.coordinates?.latitude ?? centre.location.coordinates?.lat;
      const cLng = centre.location.coordinates?.longitude ?? centre.location.coordinates?.lng;
      let dist = centre.distanceKm;
      if (
        (dist === undefined || dist === null) &&
        farmerLat !== undefined &&
        farmerLng !== undefined &&
        cLat !== undefined &&
        cLng !== undefined
      ) {
        dist = calculateDistanceKm(farmerLat, farmerLng, cLat, cLng);
      }
      return { ...centre, distanceKm: dist };
    });
  }, [centres, farmerLat, farmerLng]);

  const filteredCentres = useMemo(() => {
    return centresWithDistance.filter((centre) => {
      const matchesSearch = 
        centre.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (centre.location.village || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (centre.location.district || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCrop = 
        cropFilter === 'ALL' ||
        centre.acceptedCropIds.some(
          (cropName) =>
            cropName.toLowerCase() === cropFilter.toLowerCase() ||
            cropName.toLowerCase().includes(cropFilter.toLowerCase())
        );

      return matchesSearch && matchesCrop;
    });
  }, [centresWithDistance, searchQuery, cropFilter]);

  const handleBookAtCentre = (centre: ProcurementCentre) => {
    setSelectedCentre(centre);
    setActiveView('booking');
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header & Search / Filters Strip */}
      <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#17231F]">
              {t('centresHeader')}
            </h1>
            <p className="text-xs sm:text-sm text-[#66736D] mt-0.5">
              {t('centresSubtitle')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:min-w-[220px]">
              <Search className="w-4 h-4 text-[#66736D] absolute left-3 top-3" />
              <input
                type="text"
                placeholder={t('searchCentresPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-9 pr-3 rounded-[6px] border border-[#CBD8D1] bg-[#FFFFFF] text-xs text-[#17231F] w-full focus:outline-none focus:border-[#16845F]"
              />
            </div>

            {/* Crop Filter */}
            <select
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
              className="h-10 px-3 rounded-[6px] border border-[#CBD8D1] bg-[#FFFFFF] text-xs text-[#17231F] focus:outline-none focus:border-[#16845F] w-full sm:w-auto"
            >
              <option value="ALL">{t('allCropsFilter')}</option>
              {crops.map((c) => (
                <option key={c.id} value={c.name}>
                  {translateCrop(c.name)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Side-by-Side Map + List Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Centre List (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-[#17231F] uppercase tracking-wider">
              Centre List ({filteredCentres.length} Operational Mandis)
            </span>
            <span className="text-xs text-[#075E43] font-semibold">
              {farmer?.location?.district ? `${farmer.location.district} Region` : 'Active Mandi Network'}
            </span>
          </div>

          {filteredCentres.length === 0 ? (
            <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-8 text-center">
              <p className="text-sm text-[#66736D]">No procurement centres matched your search or filter criteria.</p>
            </div>
          ) : (
            filteredCentres.map((centre) => {
              const isSelected = selectedCentre?.id === centre.id;
              const loadBadge = centre.currentQueue.loadLevel === 'High'
                ? 'bg-[#FFF5F5] text-[#B42318] border-[#F0C2C2]'
                : centre.currentQueue.loadLevel === 'Moderate'
                ? 'bg-[#FFF9ED] text-[#B45309] border-[#F0D7A7]'
                : 'bg-[#E7F3EC] text-[#16803C] border-[#B7DCC5]';

              return (
                <div
                  key={centre.id}
                  onClick={() => setSelectedCentre(centre)}
                  className={`bg-[#FFFFFF] border rounded-[8px] p-4 sm:p-5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#075E43] ring-1 ring-[#075E43] bg-[#F4FAF6]'
                      : 'border-[#CBD8D1] hover:border-[#075E43]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3 border-b border-[#EDF3EF]">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-[#17231F] leading-tight">
                          {centre.name}
                        </h2>
                      </div>
                      <div className="text-xs text-[#66736D] mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#075E43] flex-shrink-0" />
                        <span>{centre.location.address || `${centre.location.village ? centre.location.village + ', ' : ''}${centre.location.district}`}</span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 flex-shrink-0">
                      <span className="text-xs font-bold text-[#063B2A] bg-[#E7F3EC] px-2 py-0.5 rounded-[4px] border border-[#CBD8D1]">
                        {formatDistance(centre.distanceKm)}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] border ${loadBadge}`}>
                        ● Open ({centre.currentQueue.loadLevel} Load)
                      </span>
                    </div>
                  </div>

                  {/* Centre details row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-xs text-[#34443D]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#66736D] flex-shrink-0" />
                      <span>{centre.operatingHours.opens} – {centre.operatingHours.closes}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#66736D] flex-shrink-0" />
                      <span>
                        {centre.currentQueue.estimatedWaitMins > 0
                          ? `Wait: ~${centre.currentQueue.estimatedWaitMins}m`
                          : 'Wait: Queue Open'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#16803C] font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>
                        {centre.availableSlots ? `${centre.availableSlots} capacity` : 'Daily Allotment Open'}
                      </span>
                    </div>
                  </div>

                  {/* Crops Accepted & Action */}
                  <div className="mt-3 pt-3 border-t border-[#EDF3EF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-[#66736D] font-semibold">{t('cropAndQuantity')}:</span>
                      {centre.acceptedCropIds.map((cropName) => (
                        <span key={cropName} className="text-[10px] bg-[#EDF3EF] text-[#17231F] px-2 py-0.5 rounded border border-[#CBD8D1]">
                          {translateCrop(cropName)}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookAtCentre(centre);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-[6px] bg-[#0B6B4F] hover:bg-[#075E43] text-[#FFFFFF] text-xs font-semibold transition-colors flex-shrink-0"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      <span>{t('bookSlotAtMandi')}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Interactive Map (5 cols) */}
        <div className="lg:col-span-5 sticky top-28 bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#CBD8D1] px-2">
            <span className="text-xs uppercase font-bold tracking-wider text-[#17231F]">
              Geographic Grid Map
            </span>
            <span className="text-[11px] text-[#075E43] font-semibold">
              Live Mandi Network
            </span>
          </div>

          <div className="h-[280px] sm:h-[380px] lg:h-[480px] w-full rounded-[6px] overflow-hidden border border-[#CBD8D1]">
            <LeafletMap
              farmerCoordinates={farmer?.location.coordinates}
              centres={filteredCentres}
              selectedCentreId={selectedCentre?.id}
              onSelectCentre={(c) => setSelectedCentre(c)}
            />
          </div>

          <div className="p-2 text-[11px] text-[#66736D] flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#063B2A] inline-block" /> Your Location
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16803C] inline-block" /> Mandi Terminal
            </span>
            <span className="text-[#075E43] font-bold">
              {farmer?.location?.state ? `${farmer.location.state} Division` : 'Mandi Network'}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
