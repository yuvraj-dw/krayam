import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { ProcurementRecord, PaymentRecord } from '../../types';
import { 
  Check, 
  ArrowRight, 
  Circle, 
  IndianRupee, 
  Building2, 
  FileText,
  Printer
} from 'lucide-react';

export const ProcurementPaymentView: React.FC = () => {
  const { 
    procurements, 
    payments, 
    farmer, 
    setActiveView,
    t,
    translateCrop,
    translateStatus,
    translateUnit,
    formatLocalizedDate
  } = useApp();
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const selectedRecord = (selectedRecordId 
    ? procurements.find(p => p.id === selectedRecordId) 
    : procurements[0]) || null;

  // Lifecycle stages
  const getLifecycleStages = (record: ProcurementRecord) => {
    const isCompleted = record.procurementStatus === 'Accepted' || record.procurementStatus === 'completed';
    const isPaid = record.paymentStatus === 'Credited' || record.paymentStatus === 'confirmed';
    return [
      { name: t('vehicleEntry'), status: 'done' },
      { name: t('documentCheck'), status: 'done' },
      { name: t('weighing'), status: 'done' },
      { name: t('qualityGrade', 'Quality Grade'), status: isCompleted ? 'done' : 'current' },
      { name: t('procurementSlip'), status: isCompleted ? 'done' : 'upcoming' },
      { name: t('dbtPayment'), status: isPaid ? 'done' : 'upcoming' },
    ];
  };

  if (!selectedRecord || procurements.length === 0) {
    return (
      <div className="space-y-6 w-full">
        <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-5 sm:p-6 shadow-sm">
          <h1 className="text-xl sm:text-2xl font-bold text-[#17231F]">
            {t('procurementDbtTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-[#66736D] mt-0.5">
            {t('procurementDbtSubtitle')}
          </p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-12 h-12 rounded-[6px] bg-[#E7F3EC] text-[#075E43] border border-[#CBD8D1] flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#17231F]">
            {t('noProcurementFound')}
          </h2>
          <p className="text-xs text-[#66736D] mt-2 mb-6">
            {t('noProcurementDesc')}
          </p>
          <button
            onClick={() => setActiveView('booking')}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-[6px] bg-[#075E43] hover:bg-[#063B2A] text-[#FFFFFF] font-semibold text-xs transition-colors"
          >
            <span>{t('bookSlotAction')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#17231F]">
              {t('procurementDbtTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-[#66736D] mt-0.5">
              {t('procurementDbtSubtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-[4px] bg-[#E7F3EC] text-[#075E43] border border-[#CBD8D1]">
              PFMS Integrated
            </span>
          </div>
        </div>
      </div>

      {/* Main Container: Selected Transaction Details */}
      <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-5 sm:p-6 shadow-sm space-y-6">
        {/* Record Selection Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#CBD8D1]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#17231F]">
              {t('selectConsignment', 'Select Consignment')}:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {procurements.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedRecordId(p.id)}
                  className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold border transition-colors ${
                    selectedRecord.id === p.id
                      ? 'bg-[#063B2A] text-[#FFFFFF] border-[#063B2A]'
                      : 'bg-[#FFFFFF] text-[#17231F] border-[#CBD8D1] hover:bg-[#F3F9F5]'
                  }`}
                >
                  {p.cropName.split(' ')[0]} ({p.date})
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs font-mono text-[#66736D]">
            Receipt Ref: <span className="font-bold text-[#17231F]">{selectedRecord.id}</span>
          </div>
        </div>

        {/* Section 18: Transaction Lifecycle Tracker */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#17231F]">
              {t('status')}
            </h2>
            <span className="text-xs text-[#075E43] font-semibold">
              Live Mandi Weighbridge Pipeline
            </span>
          </div>

          {/* Horizontal Lifecycle Strip */}
          <div className="bg-[#F5F8F6] border border-[#CBD8D1] rounded-[6px] p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {getLifecycleStages(selectedRecord).map((stage, idx) => {
                return (
                  <div key={idx} className="flex flex-col items-center text-center p-2 rounded bg-[#FFFFFF] border border-[#CBD8D1]">
                    <div className="mb-1.5">
                      {stage.status === 'done' ? (
                        <div className="w-6 h-6 rounded-full bg-[#16803C] text-[#FFFFFF] flex items-center justify-center text-xs font-bold mx-auto">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : stage.status === 'current' ? (
                        <div className="w-6 h-6 rounded-full bg-[#063B2A] text-[#FFFFFF] flex items-center justify-center text-xs font-bold mx-auto ring-2 ring-[#B7DCC5]">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#EDF3EF] text-[#66736D] flex items-center justify-center text-xs font-bold mx-auto">
                          <Circle className="w-3 h-3 text-[#CBD8D1]" />
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-bold text-[#17231F] leading-tight">
                      {stage.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 18: Financial & Intake Information Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Financial Breakdown Table (8 cols) */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#17231F]">
                {t('weighing')} & {t('dbtPayment')}
              </h2>
              <span className="text-xs text-[#66736D]">
                Slip #{selectedRecord.id}
              </span>
            </div>

            <div className="border border-[#CBD8D1] rounded-[6px] overflow-hidden overflow-x-auto">
              <table className="gov-table min-w-[480px]">
                <tbody>
                  <tr>
                    <td className="w-1/2 bg-[#EDF3EF] font-semibold text-xs text-[#17231F]">
                      {t('grossWeight')}
                    </td>
                    <td className="font-mono font-bold text-xs text-[#17231F]">
                      {selectedRecord.grossWeight || 78.4} {translateUnit('Qtl')}
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-[#EDF3EF] font-semibold text-xs text-[#17231F]">
                      {t('tareWeight')}
                    </td>
                    <td className="font-mono font-bold text-xs text-[#66736D]">
                      {selectedRecord.tareWeight || 13.4} {translateUnit('Qtl')}
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-[#EDF3EF] font-semibold text-xs text-[#17231F]">
                      {t('netWeight')}
                    </td>
                    <td className="font-mono font-bold text-xs text-[#063B2A]">
                      {selectedRecord.acceptedQuantity} {translateUnit('Quintals')} ({translateUnit('Qtl')})
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-[#EDF3EF] font-semibold text-xs text-[#17231F]">
                      MSP
                    </td>
                    <td className="font-bold text-xs text-[#17231F]">
                      ₹{selectedRecord.mspRate || 2275} / {translateUnit('Qtl')}
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-[#EDF3EF] font-semibold text-xs text-[#17231F]">
                      {t('estGrossPayout')}
                    </td>
                    <td className="font-mono font-bold text-xs text-[#17231F]">
                      ₹{(selectedRecord.grossAmount || (selectedRecord.acceptedQuantity * (selectedRecord.mspRate || 2275))).toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-[#EDF3EF] font-semibold text-xs text-[#17231F]">
                      {t('qualityDeductions')}
                    </td>
                    <td className="font-mono text-xs text-[#B45309]">
                      - ₹{(selectedRecord.deductions || 0).toLocaleString('en-IN')} ({selectedRecord.deductionReason})
                    </td>
                  </tr>
                  <tr className="bg-[#F4FAF6]">
                    <td className="bg-[#E7F3EC] font-bold text-sm text-[#063B2A]">
                      {t('payableAmount')}
                    </td>
                    <td className="font-mono font-black text-base text-[#063B2A]">
                      ₹{selectedRecord.paymentAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-[#EDF3EF] font-semibold text-xs text-[#17231F]">
                      {t('status')}
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-xs font-bold border ${
                        selectedRecord.paymentStatus === 'Credited' || selectedRecord.paymentStatus === 'confirmed'
                          ? 'bg-[#E7F3EC] text-[#16803C] border-[#B7DCC5]'
                          : 'bg-[#FFF9ED] text-[#B45309] border-[#F0D7A7]'
                      }`}>
                        {translateStatus(selectedRecord.paymentStatus)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Card: Bank Account & Actions (4 cols) */}
          <div className="lg:col-span-4 bg-[#F5F8F6] border border-[#CBD8D1] rounded-[6px] p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-[#17231F] pb-2 border-b border-[#CBD8D1]">
                {t('disbursementAccount')}
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div>
                  <span className="text-[#66736D] block">{t('fullName')}:</span>
                  <span className="font-bold text-[#17231F]">{farmer?.fullName}</span>
                </div>
                <div>
                  <span className="text-[#66736D] block">{t('farmerId')}:</span>
                  <span className="font-mono font-bold text-[#17231F]">{farmer?.farmerId}</span>
                </div>
                <div>
                  <span className="text-[#66736D] block">{t('disbursementAccount')}:</span>
                  <span className="font-mono font-bold text-[#063B2A]">{farmer?.bankAccountMasked}</span>
                </div>
                <div>
                  <span className="text-[#66736D] block">{t('mandiCentre')}:</span>
                  <span className="text-[#17231F] font-medium">{selectedRecord.centreName}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#CBD8D1] space-y-2">
              <a
                href={api.procurements.getReceiptUrl(selectedRecord.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-10 rounded-[6px] bg-[#075E43] hover:bg-[#063B2A] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{t('viewJFormBtn')}</span>
              </a>
              <button
                onClick={() => window.print()}
                className="w-full h-10 rounded-[6px] bg-[#FFFFFF] border border-[#CBD8D1] hover:bg-[#EDF3EF] text-[#17231F] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-[#075E43]" />
                <span>{t('printReceipt')}</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Past DBT Payments History Strip */}
      <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-5 sm:p-6 shadow-sm">
        <h2 className="text-base font-bold text-[#17231F] mb-3">
          {t('dbtDisbursementStage')}
        </h2>

        <div className="border border-[#CBD8D1] rounded-[6px] overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th>{t('date')}</th>
                <th>UTR</th>
                <th>{t('cropAndQuantity')}</th>
                <th>{t('amount', 'Amount')}</th>
                <th>{t('disbursementAccount')}</th>
                <th>{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((pay) => (
                <tr key={pay.id}>
                  <td className="text-xs">{formatLocalizedDate(pay.date)}</td>
                  <td className="font-mono text-xs font-bold text-[#17231F]">{pay.utrNumber || pay.transactionId}</td>
                  <td className="text-xs">{translateCrop(pay.cropName)}</td>
                  <td className="font-mono font-bold text-xs text-[#063B2A]">₹{pay.amount.toLocaleString('en-IN')}</td>
                  <td className="text-xs text-[#66736D]">{pay.bankAccountMasked}</td>
                  <td>
                    <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-[#E7F3EC] text-[#16803C] border border-[#B7DCC5]">
                      {translateStatus(pay.paymentStatus)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
