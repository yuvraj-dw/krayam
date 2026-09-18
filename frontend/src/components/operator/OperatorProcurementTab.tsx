import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { getOperatorText } from '../../i18n/operatorTranslations';
import { 
  Scale, 
  CheckCircle2, 
  FileText, 
  AlertTriangle, 
  Calculator, 
  ArrowRight, 
  History,
  Download,
  Loader2
} from 'lucide-react';

export const OperatorProcurementTab: React.FC = () => {
  const { 
    bookings, 
    procurements, 
    operatorCompleteProcurement, 
    crops,
    language 
  } = useApp();

  const ot = getOperatorText(language);

  // Subtab: Intake Station | Procurement History
  const [subTab, setSubTab] = useState<'INTAKE' | 'HISTORY'>('INTAKE');

  // Active intake selection (filter candidates ready for weighing)
  const readyCandidates = bookings.filter(b => 
    b.status === 'PROCESSING' || b.status === 'TURN_APPROACHING' || b.status === 'CHECKED_IN' || b.status === 'IN_QUEUE'
  );

  const [selectedBookingId, setSelectedBookingId] = useState<string>(
    readyCandidates[0]?.id || bookings[0]?.id || ''
  );

  const currentBooking = bookings.find(b => b.id === selectedBookingId || b.uuid === selectedBookingId) || readyCandidates[0] || bookings[0];

  // Weighbridge Form State
  const [grossWeightKg, setGrossWeightKg] = useState<number>(8250); // Vehicle + Grain in kg
  const [tareWeightKg, setTareWeightKg] = useState<number>(1750); // Empty vehicle in kg
  const [moisturePercent, setMoisturePercent] = useState<number>(11.5);
  const [foreignMatterPercent, setForeignMatterPercent] = useState<number>(0.8);
  const [qualityGrade, setQualityGrade] = useState<'Grade A' | 'Grade B' | 'Standard'>('Grade A');
  const [deductionsInr, setDeductionsInr] = useState<number>(0);
  const [completedRecordId, setCompletedRecordId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auto-calculations
  const netWeightKg = Math.max(0, grossWeightKg - tareWeightKg);
  const netWeightQuintals = Number((netWeightKg / 100).toFixed(2));
  
  // Dynamic MSP rate from official crops catalog
  const matchedCrop = crops.find(c => 
    c.id.toLowerCase() === currentBooking?.cropId?.toLowerCase() ||
    c.name.toLowerCase() === currentBooking?.cropName?.toLowerCase()
  );
  const mspRate = matchedCrop?.mspPerQuintal || 2275;
  const grossPayableAmount = Math.round(netWeightQuintals * mspRate);
  const netPayableAmount = Math.max(0, grossPayableAmount - deductionsInr);

  const handleCompleteIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBooking || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const record = await operatorCompleteProcurement({
        bookingId: currentBooking.uuid || currentBooking.id,
        grossWeight: Number((grossWeightKg / 100).toFixed(2)),
        tareWeight: Number((tareWeightKg / 100).toFixed(2)),
        netWeight: netWeightQuintals,
        moisturePercent,
        qualityGrade,
        deductions: deductionsInr,
        deductionReason: deductionsInr > 0 ? 'Moisture variance deduction' : 'Quality standards met'
      });

      setCompletedRecordId(record.id);
    } catch (err: any) {
      console.error('Procurement completion error:', err);
      setSubmitError(err.message || 'Failed to complete procurement intake on backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher: Electronic Weighbridge vs History */}
      <div className="flex items-center justify-between border-b border-[#CBD8D1] pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setSubTab('INTAKE'); setCompletedRecordId(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-[6px] transition-colors flex items-center gap-1.5 ${
              subTab === 'INTAKE' ? 'bg-[#063B2A] text-white' : 'bg-[#EDF3EF] text-[#34443D] hover:bg-[#CBD8D1]'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>{ot.procurementIntakeTitle}</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('HISTORY')}
            className={`px-4 py-2 text-xs font-bold rounded-[6px] transition-colors flex items-center gap-1.5 ${
              subTab === 'HISTORY' ? 'bg-[#063B2A] text-white' : 'bg-[#EDF3EF] text-[#34443D] hover:bg-[#CBD8D1]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{ot.completedProcurements} ({procurements.length})</span>
          </button>
        </div>
      </div>

      {subTab === 'INTAKE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Weighbridge & Quality Entry Form */}
          <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-5 shadow-sm space-y-5">
            {completedRecordId ? (
              <div className="bg-[#E7F3EC] border border-[#85E1A9] p-6 rounded-[8px] text-center space-y-4">
                <div className="w-12 h-12 bg-[#16803C] text-white rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#063B2A]">
                    {ot.issueJFormTitle}
                  </h3>
                  <p className="text-xs text-[#34443D] mt-1">
                    {ot.dbtInitiatedSuccess}
                  </p>
                </div>

                <div className="bg-white border border-[#CBD8D1] p-4 rounded-[6px] max-w-sm mx-auto text-left text-xs font-mono space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#66736D]">J-Form Ref:</span>
                    <span className="font-bold text-[#063B2A]">{completedRecordId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#66736D]">{ot.weighbridgeNet}:</span>
                    <span className="font-bold">{netWeightQuintals} Qtl</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#66736D]">{ot.totalCalculatedAmount}:</span>
                    <span className="font-bold text-[#16803C]">₹{netPayableAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#66736D]">{ot.statusHeader}:</span>
                    <span className="font-bold text-[#EA8A0A]">PFMS DBT Queued</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <a
                    href={api.procurements.getReceiptUrl(completedRecordId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#075E43] hover:bg-[#063B2A] text-white font-bold text-xs px-4 py-2 rounded-[6px] transition-colors inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View Official J-Form</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setCompletedRecordId(null);
                      setGrossWeightKg(8000);
                      setTareWeightKg(1600);
                    }}
                    className="bg-[#EDF3EF] hover:bg-[#CBD8D1] text-[#063B2A] font-bold text-xs px-4 py-2 rounded-[6px] border border-[#CBD8D1] transition-colors"
                  >
                    {ot.callNextFarmerBtn}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCompleteIntake} className="space-y-4 text-xs">
                {/* Farmer / Booking Selector */}
                <div>
                  <label className="block font-bold text-[#17231F] uppercase mb-1">
                    {ot.filterWaiting} *
                  </label>
                  <select
                    value={selectedBookingId}
                    onChange={(e) => setSelectedBookingId(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#CBD8D1] rounded-[6px] p-2.5 text-xs font-medium focus:border-[#075E43] focus:outline-none"
                  >
                    {readyCandidates.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.id} — {b.farmerName} ({b.cropName} - {b.quantityQuintals} Qtl) [{b.status}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Digital Scale Readouts */}
                <div className="bg-[#F5F8F6] border border-[#CBD8D1] rounded-[8px] p-4 space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold text-[#063B2A] border-b border-[#CBD8D1] pb-2">
                    <span className="flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-[#075E43]" />
                      <span>{ot.weighbridgeLiveTelemetry}</span>
                    </span>
                    <span className="text-[11px] font-mono text-[#16803C]">● Sensor Online</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-[#17231F] mb-1">
                        {ot.weighbridgeGross} *
                      </label>
                      <input
                        type="number"
                        required
                        min="1000"
                        step="10"
                        value={grossWeightKg}
                        onChange={(e) => setGrossWeightKg(Number(e.target.value))}
                        className="w-full bg-white border border-[#CBD8D1] rounded-[6px] p-2 font-mono font-bold text-sm focus:border-[#075E43] focus:outline-none"
                      />
                      <span className="text-[10px] text-[#66736D]">Vehicle + Produce</span>
                    </div>

                    <div>
                      <label className="block font-bold text-[#17231F] mb-1">
                        {ot.weighbridgeTare} *
                      </label>
                      <input
                        type="number"
                        required
                        min="500"
                        step="10"
                        value={tareWeightKg}
                        onChange={(e) => setTareWeightKg(Number(e.target.value))}
                        className="w-full bg-white border border-[#CBD8D1] rounded-[6px] p-2 font-mono font-bold text-sm focus:border-[#075E43] focus:outline-none"
                      />
                      <span className="text-[10px] text-[#66736D]">Empty Vehicle</span>
                    </div>

                    <div>
                      <label className="block font-bold text-[#075E43] mb-1">
                        {ot.weighbridgeNet}
                      </label>
                      <div className="w-full bg-[#E7F3EC] border border-[#85E1A9] rounded-[6px] p-2 font-mono font-bold text-sm text-[#063B2A]">
                        {netWeightQuintals} Qtl
                      </div>
                      <span className="text-[10px] text-[#66736D]">({netWeightKg.toLocaleString()} kg)</span>
                    </div>
                  </div>
                </div>

                {/* Quality Testing Parameters */}
                <div className="border border-[#CBD8D1] rounded-[8px] p-4 space-y-3">
                  <div className="font-bold text-xs text-[#17231F] uppercase border-b border-[#CBD8D1] pb-1.5">
                    {ot.qualityGrade} & Lab Analysis
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-[#17231F] mb-1">
                        {ot.moisturePercent} *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="5"
                        max="25"
                        value={moisturePercent}
                        onChange={(e) => setMoisturePercent(Number(e.target.value))}
                        className="w-full bg-white border border-[#CBD8D1] rounded-[6px] p-2 text-xs focus:outline-none"
                      />
                      <span className={`text-[10px] font-bold ${moisturePercent <= 12 ? 'text-[#16803C]' : 'text-[#B45309]'}`}>
                        {moisturePercent <= 12 ? '✓ FAQ (≤12%)' : '⚠️ > 12%'}
                      </span>
                    </div>

                    <div>
                      <label className="block font-bold text-[#17231F] mb-1">
                        {ot.foreignMatter}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={foreignMatterPercent}
                        onChange={(e) => setForeignMatterPercent(Number(e.target.value))}
                        className="w-full bg-white border border-[#CBD8D1] rounded-[6px] p-2 text-xs focus:outline-none"
                      />
                      <span className="text-[10px] text-[#66736D]">FAQ: &lt; 0.75%</span>
                    </div>

                    <div>
                      <label className="block font-bold text-[#17231F] mb-1">
                        {ot.qualityGrade}
                      </label>
                      <select
                        value={qualityGrade}
                        onChange={(e) => setQualityGrade(e.target.value as any)}
                        className="w-full bg-white border border-[#CBD8D1] rounded-[6px] p-2 text-xs focus:outline-none"
                      >
                        <option value="Grade A">Grade A (FAQ Standard)</option>
                        <option value="Standard">Standard Grade</option>
                        <option value="Grade B">Grade B</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Deductions & Payable Calculation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block font-bold text-[#17231F] mb-1">
                      Quality Deductions (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={deductionsInr}
                      onChange={(e) => setDeductionsInr(Number(e.target.value))}
                      className="w-full bg-white border border-[#CBD8D1] rounded-[6px] p-2 text-xs focus:outline-none font-mono"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#075E43] mb-1">
                      {ot.totalCalculatedAmount}
                    </label>
                    <div className="w-full bg-[#E7F3EC] border border-[#85E1A9] rounded-[6px] p-2 text-sm font-bold font-mono text-[#063B2A]">
                      ₹{netPayableAmount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {submitError && (
                  <div className="p-3 bg-[#FFF3DC] border border-[#F0D7A7] rounded-[6px] text-xs text-[#B42318] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#063B2A] hover:bg-[#075E43] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm py-3 rounded-[6px] transition-colors flex items-center justify-center gap-2 mt-4 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Procurement...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>{ot.completeProcurementBtn}</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Right 1 Col: Summary Card */}
          <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-5 shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-sm text-[#17231F] flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#075E43]" />
              <span>{ot.activeYardSummary}</span>
            </h3>

            {currentBooking && (
              <div className="space-y-2 bg-[#F5F8F6] p-3 rounded-[6px] border border-[#CBD8D1]">
                <div className="flex justify-between">
                  <span className="text-[#66736D]">{ot.farmerNameHeader}:</span>
                  <span className="font-bold text-[#17231F]">{currentBooking.farmerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#66736D]">ID:</span>
                  <span className="font-mono text-[#063B2A]">{currentBooking.farmerId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#66736D]">{ot.quantityHeader}:</span>
                  <span className="font-bold">{currentBooking.quantityQuintals} Quintals</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#66736D]">{ot.cropHeader}:</span>
                  <span className="font-bold text-[#17231F]">{currentBooking.cropName}</span>
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-[#CBD8D1]">
              <div className="flex justify-between">
                <span className="text-[#66736D]">{ot.mspPayableRate}:</span>
                <span className="font-bold font-mono">₹{mspRate} / Qtl</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#66736D]">{ot.weighbridgeNet}:</span>
                <span className="font-bold font-mono">{netWeightQuintals} Qtl</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#66736D]">Gross Amount:</span>
                <span className="font-bold font-mono">₹{grossPayableAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[#B42318]">
                <span>Deductions:</span>
                <span className="font-mono">-₹{deductionsInr.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#063B2A] pt-2 border-t border-[#CBD8D1]">
                <span>{ot.totalCalculatedAmount}:</span>
                <span className="font-mono">₹{netPayableAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="p-3 bg-[#EDF3EF] border border-[#CBD8D1] rounded-[6px] text-[11px] text-[#66736D]">
              {ot.standardFaqLimit}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Procurement History */}
      {subTab === 'HISTORY' && (
        <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[650px]">
              <thead className="bg-[#EDF3EF] text-[#34443D] uppercase text-[10px] font-bold border-b border-[#CBD8D1]">
                <tr>
                  <th className="px-4 py-3">{ot.bookingIdHeader}</th>
                  <th className="px-4 py-3">{ot.cropHeader}</th>
                  <th className="px-4 py-3">{ot.weighbridgeNet}</th>
                  <th className="px-4 py-3">{ot.qualityGrade}</th>
                  <th className="px-4 py-3">{ot.totalCalculatedAmount}</th>
                  <th className="px-4 py-3">{ot.statusHeader}</th>
                  <th className="px-4 py-3 text-right">{ot.actionsHeader}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CBD8D1]">
                {procurements.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F5F8F6]">
                    <td className="px-4 py-3 font-mono font-bold text-[#063B2A]">
                      {p.id}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#17231F]">
                      {p.cropName}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[#075E43]">
                      {p.acceptedQuantity} Qtl
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-[#EDF3EF] text-[#34443D] px-2 py-0.5 rounded text-[10px] font-bold">
                        {p.qualityGrade}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[#17231F]">
                      ₹{p.paymentAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.paymentStatus === 'Credited' ? 'bg-[#16803C]/10 text-[#16803C]' : 'bg-[#EA8A0A]/10 text-[#B45309]'
                      }`}>
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={api.procurements.getReceiptUrl(p.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#EDF3EF] hover:bg-[#CBD8D1] text-[#063B2A] font-bold text-[11px] px-2.5 py-1 rounded border border-[#CBD8D1] transition-colors inline-flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>J-Form</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
