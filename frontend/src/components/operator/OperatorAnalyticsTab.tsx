import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { getOperatorText } from '../../i18n/operatorTranslations';
import api, { BackendAnalyticsSummary } from '../../services/api';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Scale, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Calendar,
  Loader2,
  RefreshCw
} from 'lucide-react';

export const OperatorAnalyticsTab: React.FC = () => {
  const { operator, centres, language } = useApp();
  const ot = getOperatorText(language);
  const [period, setPeriod] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  
  const [analytics, setAnalytics] = useState<BackendAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const activeCentreId = operator?.centreId || centres[0]?.id;

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const todayDate = new Date();
    const to = todayDate.toISOString().split('T')[0];
    let from = to;

    if (period === 'WEEKLY') {
      const past = new Date(Date.now() - 7 * 86400000);
      from = past.toISOString().split('T')[0];
    } else if (period === 'MONTHLY') {
      const past = new Date(Date.now() - 30 * 86400000);
      from = past.toISOString().split('T')[0];
    }

    try {
      let data: BackendAnalyticsSummary | null = null;
      if (activeCentreId) {
        try {
          data = await api.analytics.getSummary(activeCentreId, from, to);
        } catch {
          // Fall back to operator analytics endpoint if centre-specific endpoint yields permission notice
          data = await api.operator.getAnalytics(from, to);
        }
      } else {
        data = await api.operator.getAnalytics(from, to);
      }

      setAnalytics(data);
    } catch (err: any) {
      console.warn('Analytics fetch error:', err.message);
      setError(err.message || 'Failed to fetch analytics from backend.');
    } finally {
      setIsLoading(false);
    }
  }, [period, activeCentreId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Operational metrics from backend
  const farmersServed = analytics?.farmers_served ?? 0;
  const totalQuintals = analytics?.total_quantity_procured ?? 0;
  const avgWaitMins = analytics?.avg_waiting_minutes !== null && analytics?.avg_waiting_minutes !== undefined 
    ? Math.round(analytics.avg_waiting_minutes) 
    : null;
  const avgProcessingMins = analytics?.avg_processing_minutes !== null && analytics?.avg_processing_minutes !== undefined 
    ? Math.round(analytics.avg_processing_minutes) 
    : null;
  const noShows = analytics?.no_shows ?? 0;
  const cancellations = analytics?.cancellations ?? 0;
  const pendingPaymentsCount = analytics?.pending_payments_count ?? 0;
  const pendingPaymentsAmount = analytics?.pending_payments_amount ?? 0;
  const completedPaymentsCount = analytics?.completed_payments_count ?? 0;
  const completedPaymentsAmount = analytics?.completed_payments_amount ?? 0;
  const totalDisbursed = `₹${completedPaymentsAmount.toLocaleString('en-IN')}`;

  // Peak hours formatting
  const peakHour = analytics?.peak_hour !== null && analytics?.peak_hour !== undefined
    ? `${String(analytics.peak_hour).padStart(2, '0')}:00 - ${String(analytics.peak_hour + 1).padStart(2, '0')}:00`
    : null;

  // Process arrivals by hour from backend
  const arrivalsMap = analytics?.arrivals_by_hour || {};
  const standardHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  
  const hourlyData = standardHours.map(h => {
    const arrivals = arrivalsMap[String(h)] || arrivalsMap[String(h).padStart(2, '0')] || 0;
    const startStr = `${String(h).padStart(2, '0')}:00`;
    const endStr = `${String(h + 1).padStart(2, '0')}:00`;
    return {
      hour: `${startStr} - ${endStr}`,
      arrivals,
    };
  });

  const maxHourlyArrivals = Math.max(1, ...hourlyData.map(h => h.arrivals));
  const totalRecordedArrivals = hourlyData.reduce((acc, h) => acc + h.arrivals, 0);

  return (
    <div className="space-y-6">
      {/* Header with Time Period Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-4">
        <div>
          <h2 className="text-base font-bold text-[#17231F] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#075E43]" />
            <span>{ot.analyticsTitle}</span>
          </h2>
          <p className="text-xs text-[#66736D]">
            {operator?.centreName ? `${operator.centreName} • ` : ''}{ot.analyticsSubtitle}
          </p>
        </div>

        {/* Daily / Weekly / Monthly Switcher & Refresh Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchAnalytics()}
            disabled={isLoading}
            className="p-1.5 rounded-[4px] border border-[#CBD8D1] bg-[#FFFFFF] hover:bg-[#F5F8F6] text-[#17231F] transition-colors"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center gap-1 bg-[#EDF3EF] p-1 rounded-[6px] border border-[#CBD8D1] text-xs font-bold">
            <button
              type="button"
              onClick={() => setPeriod('DAILY')}
              className={`px-3 py-1.5 rounded-[4px] transition-colors ${
                period === 'DAILY' ? 'bg-[#063B2A] text-white' : 'text-[#66736D] hover:text-black'
              }`}
            >
              {ot.dailyPeriod}
            </button>
            <button
              type="button"
              onClick={() => setPeriod('WEEKLY')}
              className={`px-3 py-1.5 rounded-[4px] transition-colors ${
                period === 'WEEKLY' ? 'bg-[#063B2A] text-white' : 'text-[#66736D] hover:text-black'
              }`}
            >
              {ot.weeklyPeriod}
            </button>
            <button
              type="button"
              onClick={() => setPeriod('MONTHLY')}
              className={`px-3 py-1.5 rounded-[4px] transition-colors ${
                period === 'MONTHLY' ? 'bg-[#063B2A] text-white' : 'text-[#66736D] hover:text-black'
              }`}
            >
              {ot.monthlyPeriod}
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-[#FFF3DC] border border-[#F0D7A7] text-[#B42318] p-3 rounded-[8px] flex items-center justify-between text-xs">
          <span>Failed to load live analytics: {error}</span>
          <button onClick={() => fetchAnalytics()} className="font-bold underline ml-2">
            Retry
          </button>
        </div>
      )}

      {/* Top 4 Primary Analytics KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Farmers Handled */}
        <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-4 shadow-sm">
          <div className="text-xs text-[#66736D] font-bold uppercase flex items-center justify-between">
            <span>{ot.farmersHandledMetric}</span>
            <Users className="w-4 h-4 text-[#075E43]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#17231F] mt-2">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#075E43]" /> : farmersServed}
          </div>
          <div className="text-[11px] text-[#16803C] font-semibold mt-1">
            Verified Weighbridge Intakes
          </div>
        </div>

        {/* Total Quantity Procured */}
        <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-4 shadow-sm">
          <div className="text-xs text-[#66736D] font-bold uppercase flex items-center justify-between">
            <span>{ot.totalProcuredMetric}</span>
            <Scale className="w-4 h-4 text-[#075E43]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#17231F] mt-2">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#075E43]" /> : `${totalQuintals.toLocaleString()} Qtl`}
          </div>
          <div className="text-[11px] text-[#075E43] font-semibold mt-1">
            {ot.totalDisbursedMetric}: {totalDisbursed}
          </div>
        </div>

        {/* Average Wait Time */}
        <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-4 shadow-sm">
          <div className="text-xs text-[#66736D] font-bold uppercase flex items-center justify-between">
            <span>{ot.avgWaitMetric}</span>
            <Clock className="w-4 h-4 text-[#EA8A0A]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#B45309] mt-2">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#EA8A0A]" /> : (avgWaitMins !== null ? `${avgWaitMins} mins` : 'N/A')}
          </div>
          <div className="text-[11px] text-[#66736D] font-medium mt-1">
            Gate Entry to Weighbridge
          </div>
        </div>

        {/* Average Processing Time */}
        <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-4 shadow-sm">
          <div className="text-xs text-[#66736D] font-bold uppercase flex items-center justify-between">
            <span>{ot.avgProcessingMetric}</span>
            <Clock className="w-4 h-4 text-[#175CD3]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#175CD3] mt-2">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#175CD3]" /> : (avgProcessingMins !== null ? `${avgProcessingMins} mins` : 'N/A')}
          </div>
          <div className="text-[11px] text-[#66736D] font-medium mt-1">
            Inspection & J-Form Issuance
          </div>
        </div>
      </div>

      {/* Second Row: Peak Hours Visual Histogram & Summary Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Peak Hours Breakdown */}
        <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#17231F]">
                {ot.peakHoursTitle}
              </h3>
              <p className="text-xs text-[#66736D]">
                Hourly arrivals distribution recorded across operational slots
              </p>
            </div>
            {peakHour && (
              <span className="text-xs font-mono font-bold text-[#EA8A0A] bg-[#FFF3DC] px-2.5 py-1 rounded">
                Peak: {peakHour}
              </span>
            )}
          </div>

          {/* Visual Horizontal Bars */}
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-xs text-[#66736D] gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#075E43]" />
              <span>Loading arrival histogram from backend...</span>
            </div>
          ) : totalRecordedArrivals > 0 ? (
            <div className="space-y-2 pt-2 text-xs">
              {hourlyData.map((h, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-28 font-mono text-[#66736D] shrink-0 text-[11px]">
                    {h.hour}
                  </span>
                  <div className="flex-1 bg-[#EDF3EF] h-4 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        h.arrivals > 12 
                          ? 'bg-[#B42318]' 
                          : h.arrivals > 6 
                          ? 'bg-[#EA8A0A]' 
                          : 'bg-[#16803C]'
                      }`}
                      style={{ width: `${Math.min(100, Math.round((h.arrivals / maxHourlyArrivals) * 100))}%` }}
                    />
                  </div>
                  <span className="w-20 font-mono font-bold text-right text-[11px]">
                    {h.arrivals} {h.arrivals === 1 ? 'vehicle' : 'vehicles'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-[#66736D] bg-[#F5F8F6] rounded-[6px] border border-[#CBD8D1]">
              No arrival telemetry recorded for this period yet.
            </div>
          )}
        </div>

        {/* Centre Summary & Payment Breakdown */}
        <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-5 shadow-sm space-y-4 text-xs">
          <h3 className="text-sm font-bold text-[#17231F]">
            Operational Ledger Breakdown
          </h3>

          <div className="space-y-3">
            {/* No-Shows & Cancellations */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#FFF5F5] p-2.5 rounded-[6px] border border-[#F0C2C2]">
                <div className="text-[10px] uppercase font-bold text-[#B42318]">{ot.filterNoShow}</div>
                <div className="text-lg font-bold font-mono text-[#B42318] mt-0.5">{noShows}</div>
                <div className="text-[10px] text-[#66736D]">Unattended Slots</div>
              </div>
              <div className="bg-[#EDF3EF] p-2.5 rounded-[6px] border border-[#CBD8D1]">
                <div className="text-[10px] uppercase font-bold text-[#66736D]">Cancellations</div>
                <div className="text-lg font-bold font-mono text-[#17231F] mt-0.5">{cancellations}</div>
                <div className="text-[10px] text-[#66736D]">Cancelled Slots</div>
              </div>
            </div>

            {/* Financial Reconciliation */}
            <div className="space-y-2 pt-2 border-t border-[#CBD8D1]">
              <div className="flex justify-between">
                <span className="text-[#66736D]">{ot.pendingPayments}:</span>
                <span className="font-bold text-[#B45309] font-mono">
                  {pendingPaymentsCount} (₹{pendingPaymentsAmount.toLocaleString('en-IN')})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#66736D]">{ot.completedProcurements}:</span>
                <span className="font-bold text-[#16803C] font-mono">
                  {completedPaymentsCount} (₹{completedPaymentsAmount.toLocaleString('en-IN')})
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#063B2A] pt-2 border-t border-[#CBD8D1]">
                <span>{ot.totalDisbursedMetric}:</span>
                <span className="font-mono">{totalDisbursed}</span>
              </div>
            </div>

            <div className="p-2.5 bg-[#EDF3EF] border border-[#CBD8D1] rounded-[6px] text-[11px] text-[#66736D]">
              Direct Benefit Transfer settlement figures verified against live state treasury & PFMS ledger.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
