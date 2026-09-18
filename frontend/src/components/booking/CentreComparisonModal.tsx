import React from 'react';
import { ProcurementCentre, CropInfo, RecommendedCentreItem, LocationCoordinates } from '../../types';
import { calculateDistanceKm, formatDistance } from '../../utils/geo';
import { useApp } from '../../context/AppContext';
import { X, Check, Award } from 'lucide-react';

interface CentreComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  centres: ProcurementCentre[];
  recommendations?: RecommendedCentreItem[];
  selectedCrop: CropInfo | null;
  selectedCentreId: string;
  onSelectCentre: (centreId: string) => void;
  farmerCoordinates?: LocationCoordinates;
}

export const CentreComparisonModal: React.FC<CentreComparisonModalProps> = ({
  isOpen,
  onClose,
  centres,
  recommendations = [],
  selectedCrop,
  selectedCentreId,
  onSelectCentre,
  farmerCoordinates,
}) => {
  const { t, translateCrop } = useApp();

  if (!isOpen) return null;

  const fLat = farmerCoordinates?.latitude ?? farmerCoordinates?.lat;
  const fLng = farmerCoordinates?.longitude ?? farmerCoordinates?.lng;

  // Find top recommended centre id if available
  const topRec = recommendations.length > 0
    ? [...recommendations].sort((a, b) => b.score - a.score)[0]
    : null;
  const topRecCentreId = topRec ? topRec.centre.id : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-[#063B2A]/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FFFFFF] rounded-[12px] sm:rounded-[16px] border border-[#CBD8D1] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-[#17231F]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#CBD8D1] flex items-center justify-between shrink-0 bg-[#EDF3EF]">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#075E43] block mb-0.5">
              Backend Telemetry & Specifications Matrix
            </span>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#17231F]">
              {t('comparisonTitle')}
            </h2>
            <p className="text-xs text-[#66736D] mt-0.5">
              Direct comparison of authorized government mandis for {selectedCrop ? translateCrop(selectedCrop.name) : t('selectCrop')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#FFFFFF] text-[#66736D] hover:text-[#17231F] border border-[#CBD8D1] hover:bg-[#F3F9F5] transition-colors flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto p-3 sm:p-5 flex-1">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-[#CBD8D1]">
                <th className="p-3 text-[10px] uppercase tracking-wider text-[#66736D] w-40 font-bold">
                  Telemetry Metric
                </th>
                {centres.map((c) => {
                  const isSelected = c.id === selectedCentreId;
                  const isRecommended = c.id === topRecCentreId;
                  const recItem = recommendations.find((r) => r.centre.id === c.id);

                  return (
                    <th
                      key={c.id}
                      className={`p-4 text-left transition-all ${
                        isRecommended ? 'bg-[#F4FAF6] border-t-2 border-[#075E43]' : 'bg-[#FFFFFF]'
                      }`}
                    >
                      <div className="font-bold text-sm text-[#17231F]">{c.name}</div>
                      {isRecommended && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-[#E7F3EC] text-[#16803C] border border-[#B7DCC5] text-[10px] font-bold rounded">
                          <Award className="w-3 h-3" />
                          {t('recommendedCentre')}
                        </span>
                      )}
                      {recItem && recItem.reasons && recItem.reasons.length > 0 && (
                        <div className="text-[10px] text-[#075E43] font-medium mt-1">
                          {recItem.reasons.join(', ')}
                        </div>
                      )}
                      <div className="text-xs text-[#66736D] mt-0.5 font-normal line-clamp-1">
                        {c.location.village ? `${c.location.village}, ` : ''}{c.location.district}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CBD8D1] text-xs">
              {/* Distance */}
              <tr>
                <td className="p-3 text-[10px] uppercase tracking-wider text-[#66736D] font-bold">
                  {t('comparisonDistance')}
                </td>
                {centres.map((c) => {
                  const recItem = recommendations.find((r) => r.centre.id === c.id);
                  const cLat = c.location.coordinates?.latitude ?? c.location.coordinates?.lat;
                  const cLng = c.location.coordinates?.longitude ?? c.location.coordinates?.lng;

                  let dist: number | null | undefined = recItem?.distanceKm ?? c.distanceKm;
                  if ((dist === null || dist === undefined) && fLat !== undefined && fLng !== undefined && cLat !== undefined && cLng !== undefined) {
                    dist = calculateDistanceKm(fLat, fLng, cLat, cLng);
                  }

                  return (
                    <td key={c.id} className="p-3">
                      <span className="font-mono text-sm font-bold text-[#075E43]">
                        {formatDistance(dist)}
                      </span>
                      <span className="text-[#66736D] block text-[11px]">
                        {fLat !== undefined ? 'from your location' : 'reference distance'}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Live Load & Wait */}
              <tr>
                <td className="p-3 text-[10px] uppercase tracking-wider text-[#66736D] font-bold">
                  {t('comparisonQueue')}
                </td>
                {centres.map((c) => {
                  const recItem = recommendations.find((r) => r.centre.id === c.id);
                  const waitUnits = recItem?.estWaitUnits;
                  const loadPercent = recItem?.loadPercent;

                  return (
                    <td key={c.id} className="p-3">
                      {loadPercent !== undefined && loadPercent > 0 ? (
                        <div className="font-bold text-[#17231F]">
                          {loadPercent}% Capacity Utilized
                        </div>
                      ) : (
                        <div className="font-bold text-[#17231F]">
                          {c.currentQueue.loadLevel} Load
                        </div>
                      )}

                      <div className="text-[#66736D] text-[11px] mt-0.5">
                        {waitUnits !== undefined && waitUnits > 0
                          ? `~${waitUnits} min estimated wait`
                          : 'Live waiting time unavailable'}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Operating Hours */}
              <tr>
                <td className="p-3 text-[10px] uppercase tracking-wider text-[#66736D] font-bold">
                  {t('comparisonHours')}
                </td>
                {centres.map((c) => (
                  <td key={c.id} className="p-3">
                    <div className="text-[#17231F] font-semibold">
                      {c.operatingHours.opens} – {c.operatingHours.closes}
                    </div>
                    <div className="text-[#66736D] text-[11px] mt-0.5">{c.operatingHours.days || 'Mon - Sat'}</div>
                  </td>
                ))}
              </tr>

              {/* Accepted Crops */}
              <tr>
                <td className="p-3 text-[10px] uppercase tracking-wider text-[#66736D] font-bold">
                  {t('comparisonCrops')}
                </td>
                {centres.map((c) => {
                  const acceptsSelected = selectedCrop
                    ? c.acceptedCropIds.some(
                        (name) =>
                          name.toLowerCase() === selectedCrop.name.toLowerCase() ||
                          name.toLowerCase().includes(selectedCrop.name.toLowerCase()) ||
                          selectedCrop.name.toLowerCase().includes(name.toLowerCase())
                      )
                    : true;

                  return (
                    <td key={c.id} className="p-3">
                      {acceptsSelected ? (
                        <span className="inline-flex items-center gap-1 text-[#16803C] font-bold text-[11px] bg-[#E7F3EC] px-2 py-0.5 rounded border border-[#B7DCC5]">
                          <Check className="w-3 h-3" /> Accepts {selectedCrop ? translateCrop(selectedCrop.name) : 'Crop'}
                        </span>
                      ) : (
                        <span className="text-[#B42318] font-bold text-[11px] bg-[#FFF5F5] px-2 py-0.5 rounded border border-[#F0C2C2]">
                          Does not accept {selectedCrop ? translateCrop(selectedCrop.name) : 'Crop'}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Action Selection Row */}
              <tr>
                <td className="p-3 text-[10px] uppercase tracking-wider text-[#66736D] font-bold">
                  {t('action')}
                </td>
                {centres.map((c) => {
                  const isSelected = c.id === selectedCentreId;
                  return (
                    <td key={c.id} className="p-3">
                      <button
                        onClick={() => {
                          onSelectCentre(c.id);
                          onClose();
                        }}
                        className={`w-full py-2 px-3 rounded-[6px] text-xs font-semibold transition-colors ${
                          isSelected
                            ? 'bg-[#0B6B4F] text-white'
                            : 'bg-[#FFFFFF] border border-[#CBD8D1] text-[#17231F] hover:bg-[#F3F9F5]'
                        }`}
                      >
                        {isSelected ? t('recommendedCentre') : t('selectCentre')}
                      </button>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-[#CBD8D1] bg-[#F3F9F5] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="h-10 px-5 rounded-[6px] bg-[#0B6B4F] hover:bg-[#075E43] text-[#FFFFFF] text-xs font-semibold transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};
