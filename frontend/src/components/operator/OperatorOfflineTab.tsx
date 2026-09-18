import React from 'react';
import { useApp } from '../../context/AppContext';
import { getOperatorText } from '../../i18n/operatorTranslations';
import { 
  HardDrive, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Database,
  ArrowRight
} from 'lucide-react';

export const OperatorOfflineTab: React.FC = () => {
  const { 
    isOffline, 
    toggleOfflineMode, 
    syncQueue, 
    lastSyncTime, 
    isSyncing,
    syncOfflineQueue, 
    language,
  } = useApp();

  const ot = getOperatorText(language);
  const pendingCount = syncQueue.filter(s => s.status === 'PENDING').length;
  const syncedCount = syncQueue.filter(s => s.status === 'SYNCED').length;
  const failedCount = syncQueue.filter(s => s.status === 'FAILED').length;

  return (
    <div className="space-y-6">
      {/* Important Offline Finalization Notice banner specified in features.md */}
      <div className="bg-[#FFFDF5] border border-[#EA8A0A] rounded-[8px] p-4 text-xs space-y-1.5 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-[#B45309]">
          <AlertCircle className="w-4 h-4 text-[#EA8A0A]" />
          <span>OFFLINE OPERATION POLICY</span>
        </div>
        <p className="text-[#34443D] leading-relaxed">
          {ot.offlinePolicyNotice}
        </p>
      </div>

      {/* Connectivity Switch and Sync Control */}
      <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[#17231F] flex items-center gap-2">
              <Database className="w-5 h-5 text-[#075E43]" />
              <span>{ot.offlineManagementTitle}</span>
            </h3>
            <p className="text-xs text-[#66736D] mt-0.5">
              {ot.offlineNotice}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={toggleOfflineMode}
              className={`px-4 py-2 rounded-[6px] text-xs font-bold transition-colors flex items-center justify-center gap-2 border ${
                isOffline 
                  ? 'bg-[#EA8A0A] hover:bg-[#D97706] text-white border-[#EA8A0A]' 
                  : 'bg-[#EDF3EF] hover:bg-[#CBD8D1] text-[#063B2A] border-[#CBD8D1]'
              }`}
            >
              {isOffline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4 text-[#16803C]" />}
              <span>{isOffline ? ot.offlineBadge : ot.onlineBadge}</span>
            </button>

            <button
              type="button"
              onClick={() => syncOfflineQueue()}
              disabled={isSyncing}
              className="bg-[#063B2A] hover:bg-[#075E43] disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-[6px] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : ot.retrySyncBtn}</span>
            </button>
          </div>
        </div>

        {/* Sync Status Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-[#CBD8D1] text-xs">
          <div className="bg-[#F5F8F6] p-3 rounded-[6px] border border-[#CBD8D1]">
            <div className="text-[#66736D] text-[11px] font-bold uppercase">{ot.pendingSyncQueue}</div>
            <div className="text-xl font-bold font-mono text-[#B45309] mt-1">
              {pendingCount} Actions
            </div>
            <div className="text-[10px] text-[#66736D]">Local buffer in IndexedDB</div>
          </div>

          <div className="bg-[#F5F8F6] p-3 rounded-[6px] border border-[#CBD8D1]">
            <div className="text-[#66736D] text-[11px] font-bold uppercase">{ot.syncStatus}</div>
            <div className="text-xl font-bold font-mono text-[#16803C] mt-1">
              {syncedCount} Transferred
            </div>
            <div className="text-[10px] text-[#66736D]">Confirmed by State Agri Grid</div>
          </div>

          <div className="bg-[#F5F8F6] p-3 rounded-[6px] border border-[#CBD8D1]">
            <div className="text-[#66736D] text-[11px] font-bold uppercase">Sync Conflicts / Failed</div>
            <div className="text-xl font-bold font-mono text-[#DC2626] mt-1">
              {failedCount} Operations
            </div>
            <div className="text-[10px] text-[#66736D]">Preserved for resolution</div>
          </div>

          <div className="bg-[#F5F8F6] p-3 rounded-[6px] border border-[#CBD8D1]">
            <div className="text-[#66736D] text-[11px] font-bold uppercase">{ot.lastSyncTimestamp}</div>
            <div className="text-sm font-bold font-mono text-[#17231F] mt-1 truncate">
              {lastSyncTime}
            </div>
            <div className="text-[10px] text-[#16803C] font-semibold">SSL 256-Bit Authenticated</div>
          </div>
        </div>
      </div>

      {/* Pending / Historical Synchronization Operations Log */}
      <div className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#17231F]">
              {ot.pendingSyncQueue}
            </h3>
            <p className="text-xs text-[#66736D]">
              {ot.offlinePolicyNotice}
            </p>
          </div>
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={() => syncOfflineQueue()}
              disabled={isSyncing}
              className="text-xs font-bold text-[#075E43] hover:underline flex items-center gap-1 disabled:opacity-50"
            >
              <span>{isSyncing ? 'Syncing...' : ot.syncAllNowBtn}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto border border-[#CBD8D1] rounded-[6px]">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#EDF3EF] text-[#34443D] uppercase text-[10px] font-bold border-b border-[#CBD8D1]">
              <tr>
                <th className="px-4 py-3">Operation ID</th>
                <th className="px-4 py-3">Action Type</th>
                <th className="px-4 py-3">Booking Token</th>
                <th className="px-4 py-3">Operation Details</th>
                <th className="px-4 py-3">Recorded At</th>
                <th className="px-4 py-3 text-right">Sync State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CBD8D1]">
              {syncQueue.map((op) => (
                <tr key={op.id} className="hover:bg-[#F5F8F6]">
                  <td className="px-4 py-3 font-mono font-bold text-[#063B2A] max-w-[130px] truncate" title={op.id}>
                    {op.id}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-[#17231F] bg-[#EDF3EF] px-2 py-0.5 rounded text-[10px]">
                      {op.actionType}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-[#075E43]">
                    {op.bookingId}
                  </td>
                  <td className="px-4 py-3 text-[#34443D]">
                    <div>{op.details}</div>
                    {op.lastError && (
                      <div className="text-[10px] text-[#DC2626] mt-0.5 font-medium">
                        Error: {op.lastError}
                      </div>
                    )}
                    {op.retryCount !== undefined && op.retryCount > 0 && (
                      <div className="text-[10px] text-[#66736D]">
                        Retries: {op.retryCount}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[#66736D]">
                    {op.timestamp}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      op.status === 'PENDING'
                        ? 'bg-[#FFF3DC] text-[#B45309]'
                        : op.status === 'FAILED'
                        ? 'bg-[#FEE2E2] text-[#DC2626]'
                        : 'bg-[#E7F3EC] text-[#16803C]'
                    }`}>
                      {op.status === 'PENDING' ? (
                        <>
                          <Clock className="w-3 h-3" />
                          <span>Local Pending</span>
                        </>
                      ) : op.status === 'FAILED' ? (
                        <>
                          <AlertCircle className="w-3 h-3" />
                          <span>Sync Failed</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Synced</span>
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))}

              {syncQueue.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[#66736D]">
                    No pending offline operations. All local actions are fully synchronized with the state server.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
