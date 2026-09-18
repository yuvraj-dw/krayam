import React, { useState } from 'react';
import { 
  X, 
  MessageSquare, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  HelpCircle, 
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';

interface SmsLog {
  id: string;
  sender: string;
  message: string;
  timestamp: string;
  status: 'delivered' | 'failed';
  responseDetails?: string;
  isNlp?: boolean;
}

const QUICK_COMMANDS = [
  { label: 'HELP', command: 'HELP', desc: 'List supported SMS services' },
  { label: 'STATUS', command: 'STATUS', desc: 'Current booking status & gate pass' },
  { label: 'QUEUE', command: 'QUEUE', desc: 'Live mandi queue position & wait time' },
  { label: 'CENTRE', command: 'CENTRE', desc: 'Recommended mandi yard & capacity' },
  { label: 'PAYMENT', command: 'PAYMENT', desc: 'Direct Benefit Transfer (DBT) status' },
  { label: 'HISTORY', command: 'HISTORY', desc: 'Procurement transaction history' },
  { label: 'CANCEL', command: 'CANCEL', desc: 'Cancel active mandi reservation' },
  { label: 'RESCHEDULE', command: 'RESCHEDULE', desc: 'Request slot date change' },
  { label: 'BOOK', command: 'BOOK WHEAT 30 2026-09-20', desc: 'Reserve slot for crop & volume' },
];

const SAMPLE_NLP_MESSAGES = [
  'Mujhe 30 quintal gehun bechna hai 15 September ko',
  'Mera token number kya hai aur kitna time lagega?',
  'Mandi me payment kab aayegi?',
  'Kisan registration status check karna hai',
];

export const SmsInterfaceModal: React.FC = () => {
  const { 
    isSmsModalOpen, 
    setIsSmsModalOpen, 
    farmer, 
    refreshFarmerData, 
    refreshOperatorData, 
    userRole 
  } = useApp();

  const [message, setMessage] = useState('');
  const [senderPhone, setSenderPhone] = useState(() => farmer?.mobileNumber || '+919876543210');
  const [isSending, setIsSending] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [logs, setLogs] = useState<SmsLog[]>([
    {
      id: 'init-1',
      sender: '+919876543210',
      message: 'HELP',
      timestamp: 'Today at 08:00 AM',
      status: 'delivered',
      responseDetails: 'KRAYAM GOVT SMS SERVICE: Reply with BOOK, STATUS, QUEUE, CENTRE, PAYMENT, or CANCEL.',
    },
  ]);

  if (!isSmsModalOpen) return null;

  const handleSend = async (msgToSend?: string) => {
    const text = (msgToSend || message).trim();
    if (!text) return;

    setIsSending(true);
    setDeliveryStatus(null);

    const isNlp = !QUICK_COMMANDS.some(c => text.toUpperCase().startsWith(c.command));

    try {
      const res = await api.sms.sendIncoming(text, senderPhone);

      const newLog: SmsLog = {
        id: `SMS-${Date.now()}`,
        sender: senderPhone,
        message: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered',
        responseDetails: res.status === 'ok' ? 'Acknowledged by Mandi SMS Gateway (200 OK)' : JSON.stringify(res),
        isNlp,
      };

      setLogs(prev => [newLog, ...prev]);
      setMessage('');
      setDeliveryStatus({
        type: 'success',
        text: `SMS dispatched to FastAPI gateway: "${text}". Received status 200 OK.`,
      });

      // Synchronize state across channels
      if (userRole === 'operator') {
        refreshOperatorData().catch(() => {});
      } else {
        refreshFarmerData().catch(() => {});
      }
    } catch (err: any) {
      const newLog: SmsLog = {
        id: `SMS-${Date.now()}`,
        sender: senderPhone,
        message: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'failed',
        responseDetails: err.message || 'SMS delivery failed',
        isNlp,
      };

      setLogs(prev => [newLog, ...prev]);
      setDeliveryStatus({
        type: 'error',
        text: `SMS gateway error: ${err.message || 'Transmission failed'}`,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div 
        className="bg-[#FFFFFF] border border-[#CBD8D1] rounded-[12px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sms-modal-title"
      >
        {/* Header */}
        <div className="bg-[#063B2A] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#075E43]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#075E43] flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-[#85E1A9]" />
            </div>
            <div>
              <h2 id="sms-modal-title" className="text-sm font-bold tracking-wide flex items-center gap-2">
                <span>Krayam SMS & Natural-Language Mandi Gateway</span>
                <span className="bg-[#85E1A9] text-[#063B2A] text-[9px] uppercase px-1.5 py-0.5 rounded font-bold">
                  Live Webhook
                </span>
              </h2>
              <p className="text-[11px] text-[#CBD8D1]">
                Non-smartphone SMS Interface (`/sms/incoming` endpoint)
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSmsModalOpen(false)}
            className="text-[#CBD8D1] hover:text-white p-1 rounded transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Sender Phone Control */}
          <div className="bg-[#F5F8F6] p-3 rounded-[8px] border border-[#CBD8D1] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#075E43]" />
              <span className="font-bold text-[#17231F]">Farmer Mobile SIM / Sender:</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                placeholder="+919876543210"
                className="bg-white border border-[#CBD8D1] px-2.5 py-1 rounded text-xs font-mono font-bold text-[#063B2A] w-full sm:w-44 focus:outline-none focus:border-[#075E43]"
              />
              <button
                type="button"
                onClick={() => setSenderPhone(farmer?.mobileNumber || '+919876543210')}
                title="Reset to registered number"
                className="p-1 hover:bg-[#CBD8D1]/40 rounded text-[#66736D]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Command Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[#17231F] flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#075E43]" />
                <span>Official Mandi SMS Commands:</span>
              </span>
              <span className="text-[10px] text-[#66736D]">Click chip to test</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_COMMANDS.map((cmd) => (
                <button
                  key={cmd.command}
                  type="button"
                  onClick={() => {
                    setMessage(cmd.command);
                  }}
                  className="bg-[#EDF3EF] hover:bg-[#CBD8D1] border border-[#CBD8D1] text-[#063B2A] font-mono px-2.5 py-1 rounded-[5px] text-[11px] font-bold transition-colors flex items-center gap-1"
                  title={cmd.desc}
                >
                  <span>{cmd.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Natural Language / AI SMS Parser Suggestions */}
          <div className="bg-[#FFFDF5] border border-[#EA8A0A]/40 rounded-[8px] p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[#B45309] font-bold text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-[#EA8A0A]" />
              <span>Natural-Language / Regional Voice-to-SMS Examples:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {SAMPLE_NLP_MESSAGES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMessage(sample)}
                  className="text-left bg-white p-2 rounded border border-[#EA8A0A]/30 hover:border-[#EA8A0A] text-[#34443D] text-[11px] hover:bg-[#FFFDF5] transition-colors line-clamp-1"
                >
                  "{sample}"
                </button>
              ))}
            </div>
          </div>

          {/* Message Input Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <label htmlFor="sms-text-input" className="font-bold text-[#17231F]">
                SMS Payload / किसान संदेश:
              </label>
              <span className="text-[#66736D]">{message.length} chars</span>
            </div>
            <div className="flex gap-2">
              <input
                id="sms-text-input"
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
                placeholder="Type command (e.g. STATUS, QUEUE) or natural language..."
                className="flex-1 border border-[#CBD8D1] rounded-[6px] px-3 py-2 text-xs text-[#17231F] focus:outline-none focus:border-[#075E43] font-mono"
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={isSending || !message.trim()}
                className="bg-[#075E43] hover:bg-[#063B2A] disabled:opacity-50 text-white font-bold px-4 py-2 rounded-[6px] transition-colors flex items-center gap-1.5 flex-shrink-0 shadow-sm"
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Send SMS</span>
              </button>
            </div>
          </div>

          {/* Delivery Banner */}
          {deliveryStatus && (
            <div className={`p-2.5 rounded-[6px] border flex items-center gap-2 text-xs ${
              deliveryStatus.type === 'success'
                ? 'bg-[#E7F3EC] border-[#16803C] text-[#063B2A]'
                : 'bg-[#FEE2E2] border-[#DC2626] text-[#991B1B]'
            }`}>
              {deliveryStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#16803C] flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#DC2626] flex-shrink-0" />
              )}
              <span>{deliveryStatus.text}</span>
            </div>
          )}

          {/* Realtime SMS Transmission Log */}
          <div className="space-y-2 pt-2 border-t border-[#CBD8D1]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#17231F]">Transmission Log & Gateway Responses:</span>
              <span className="text-[10px] text-[#66736D]">{logs.length} messages</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className="bg-[#F5F8F6] p-2.5 rounded-[6px] border border-[#CBD8D1] space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono font-bold text-[#063B2A]">{log.sender}</span>
                    <span className="text-[#66736D]">{log.timestamp}</span>
                  </div>
                  <div className="font-mono font-bold text-[#17231F] text-xs">
                    "{log.message}"
                  </div>
                  {log.responseDetails && (
                    <div className="text-[10px] text-[#075E43] flex items-center gap-1 font-mono">
                      <ArrowRight className="w-3 h-3 text-[#16803C] flex-shrink-0" />
                      <span>{log.responseDetails}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#F5F8F6] px-5 py-3 border-t border-[#CBD8D1] flex items-center justify-between text-[11px] text-[#66736D]">
          <span>FastAPI Backend Webhook (`/sms/incoming`) Connected</span>
          <button
            type="button"
            onClick={() => setIsSmsModalOpen(false)}
            className="bg-white border border-[#CBD8D1] hover:bg-[#CBD8D1]/30 font-bold px-3 py-1 rounded-[5px] text-[#17231F]"
          >
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
};
