import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, User, CheckCircle2, ArrowRight, X, Phone, KeyRound } from 'lucide-react';
import { INDIAN_STATES } from '../../data/states';
import { getDistrictsForState } from '../../data/districts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, sendOtp, verifyOtp, register, t } = useApp();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  const [loginId, setLoginId] = useState('');
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginOtpCode, setLoginOtpCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [regData, setRegData] = useState({
    fullName: '',
    mobileNumber: '',
    village: '',
    tehsil: '',
    district: '',
    state: '',
    pincode: '',
    landHoldingAcres: 5
  });
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtpCode, setRegOtpCode] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccessId, setRegSuccessId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const cleanLogin = loginId.replace(/[^\d]/g, '');
    if (cleanLogin.length !== 10 || !/^[6-9]\d{9}$/.test(cleanLogin)) {
      setLoginError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    if (!loginOtpSent) {
      setIsSubmitting(true);
      try {
        await sendOtp(loginId);
        setLoginOtpSent(true);
      } catch (err: any) {
        setLoginError(err.message || 'Failed to send OTP.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!loginOtpCode.trim() || loginOtpCode.trim().length !== 6) {
      setLoginError('Enter the 6-digit OTP code');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await login(loginId, loginOtpCode.trim());
      if (success) {
        setLoginError('');
        onClose();
      } else {
        setLoginError('Mobile verified, but account is not yet registered.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regData.fullName.trim() || !regData.mobileNumber.trim() || !regData.state.trim() || !regData.district.trim() || !regData.pincode.trim() || !regData.village.trim()) {
      setRegError('Please fill all required fields (Name, Mobile, State, District, Pincode, Village)');
      return;
    }

    const validDistricts = getDistrictsForState(regData.state);
    if (validDistricts.length > 0 && !validDistricts.includes(regData.district)) {
      setRegError(`Selected district "${regData.district}" does not belong to ${regData.state}. Please select a valid district.`);
      return;
    }

    const cleanMobile = regData.mobileNumber.replace(/[^\d]/g, '');
    if (cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      setRegError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    const cleanPin = regData.pincode.replace(/[^\d]/g, '');
    if (cleanPin.length !== 6) {
      setRegError('Please enter a valid 6-digit Indian PIN code');
      return;
    }

    if (!regOtpSent) {
      setIsSubmitting(true);
      try {
        await sendOtp(regData.mobileNumber);
        setRegOtpSent(true);
      } catch (err: any) {
        setRegError(err.message || 'Failed to send OTP');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!regOtpCode.trim() || regOtpCode.trim().length !== 6) {
      setRegError('Enter the 6-digit OTP code');
      return;
    }

    setIsSubmitting(true);
    try {
      const verifyRes = await verifyOtp(regData.mobileNumber, regOtpCode.trim());
      if (!verifyRes.token) {
        throw new Error('OTP verification failed.');
      }
      const newFarmer = await register(regData);
      setRegSuccessId(newFarmer.farmerId);
    } catch (err: any) {
      setRegError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0c2417]/70 backdrop-blur-md animate-fade-in">
      <div className="bg-[#ffffff] rounded-[22px] sm:rounded-[24px] border border-[#cdeac6] w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden text-[#0d2618] shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-[#f4fbf5] border-b border-[#cdeac6] shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#eef8ee] border border-[#BBEAA6] flex items-center justify-center text-[#166534] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-[0.45px] text-[#166534] font-bold block">
                  AUTHENTICATION GATEWAY
                </span>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#0d2618]">
                  {tab === 'login' ? t('login') : t('register')}
                </h2>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-[#eef8ee] text-[#2e5a40] hover:text-[#0d2618] flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 56px Tab Switcher */}
          {!regSuccessId && (
            <div className="flex mt-4 bg-[#eef8ee] p-1 rounded-[56px] border border-[#cdeac6]">
              <button
                type="button"
                onClick={() => { setTab('login'); setLoginError(''); }}
                className={`flex-1 min-h-[40px] py-2 text-xs rounded-[56px] transition-all font-bold ${
                  tab === 'login' ? 'bg-[#166534] text-[#ffffff] shadow-sm' : 'text-[#2e5a40] hover:text-[#0d2618]'
                }`}
              >
                {t('login')}
              </button>
              <button
                type="button"
                onClick={() => { setTab('register'); setLoginError(''); }}
                className={`flex-1 min-h-[40px] py-2 text-xs rounded-[56px] transition-all font-bold ${
                  tab === 'register' ? 'bg-[#166534] text-[#ffffff] shadow-sm' : 'text-[#2e5a40] hover:text-[#0d2618]'
                }`}
              >
                {t('register')}
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {regSuccessId ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-[#eef8ee] text-[#166534] border border-[#BBEAA6] rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-[0.45px] text-[#166534] font-bold block">
                  REGISTRATION COMPLETED
                </span>
                <h3 className="text-xl font-bold text-[#0d2618] mt-1">Official Farmer ID Issued</h3>
              </div>
              <div className="p-4 bg-[#f4fbf5] border border-[#BBEAA6] rounded-[20px] font-mono text-2xl font-bold text-[#166534] tracking-wider">
                {regSuccessId}
              </div>
              <p className="text-xs text-[#2e5a40] max-w-xs mx-auto">
                Authentication key generated. Use this ID for all subsequent mandi bookings and queue tracking.
              </p>
              <button
                onClick={onClose}
                className="w-full py-3.5 bg-[#166534] hover:bg-[#14532d] text-[#ffffff] font-bold text-xs rounded-[56px] transition-all shadow-sm"
              >
                Enter Procurement Portal
              </button>
            </div>
          ) : tab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] uppercase tracking-[0.45px] text-[#2e5a40] font-bold mb-1.5">
                  {t('mobileNumber')}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#2e5a40] absolute left-4 top-3.5" />
                  <input
                    type="tel"
                    required
                    disabled={loginOtpSent}
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full pl-11 pr-4 py-3 bg-[#f4fbf5] border border-[#cdeac6] rounded-[56px] text-xs font-mono text-[#0d2618] focus:border-[#166534] outline-none font-semibold disabled:bg-[#eef8ee]"
                  />
                </div>
                {loginOtpSent && (
                  <div className="mt-3 space-y-1">
                    <label className="block text-[9px] uppercase tracking-[0.45px] text-[#2e5a40] font-bold mb-1">
                      Enter 6-Digit OTP
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-[#2e5a40] absolute left-4 top-3.5" />
                      <input
                        type="text"
                        maxLength={6}
                        autoFocus
                        value={loginOtpCode}
                        onChange={(e) => setLoginOtpCode(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        className="w-full pl-11 pr-4 py-3 bg-[#f4fbf5] border border-[#cdeac6] rounded-[56px] text-xs font-mono font-bold tracking-widest text-center text-[#0d2618] focus:border-[#166534] outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => { setLoginOtpSent(false); setLoginOtpCode(''); }}
                      className="text-[10px] text-[#166534] font-semibold hover:underline block text-right mt-1"
                    >
                      Change Mobile Number
                    </button>
                  </div>
                )}
                {loginError && (
                  <p className="text-xs text-[#dc2626] font-semibold mt-1.5">{loginError}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 border border-[#cdeac6] text-[#0d2618] rounded-[56px] text-xs font-semibold hover:bg-[#eef8ee]"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-[#166534] hover:bg-[#14532d] disabled:opacity-60 text-[#ffffff] rounded-[56px] text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>{isSubmitting ? '...' : loginOtpSent ? 'Verify & Login' : 'Send OTP'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {regError && (
                <div className="p-2.5 bg-[#FFF5F5] border border-[#F0C2C2] text-[#B42318] text-xs rounded-[8px]">
                  {regError}
                </div>
              )}
              <div>
                <label className="block text-[9px] uppercase tracking-[0.45px] text-[#2e5a40] font-bold mb-1">{t('fullName')} *</label>
                <input
                  type="text"
                  required
                  value={regData.fullName}
                  onChange={(e) => setRegData({ ...regData, fullName: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-4 py-2.5 bg-[#f4fbf5] border border-[#cdeac6] rounded-[56px] text-xs text-[#0d2618] focus:border-[#166534] outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-[0.45px] text-[#2e5a40] font-bold mb-1">{t('mobileNumber')} *</label>
                <input
                  type="tel"
                  required
                  disabled={regOtpSent}
                  value={regData.mobileNumber}
                  onChange={(e) => setRegData({ ...regData, mobileNumber: e.target.value })}
                  placeholder="e.g. 9814012345"
                  className="w-full px-4 py-2.5 bg-[#f4fbf5] border border-[#cdeac6] rounded-[56px] text-xs text-[#0d2618] focus:border-[#166534] outline-none font-semibold disabled:bg-[#eef8ee]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] uppercase tracking-[0.45px] text-[#2e5a40] font-bold mb-1">{t('state')} *</label>
                  <select
                    required
                    value={regData.state}
                    onChange={(e) => setRegData({ ...regData, state: e.target.value, district: '' })}
                    className="w-full px-3 py-2.5 bg-[#f4fbf5] border border-[#cdeac6] rounded-[56px] text-xs text-[#0d2618] focus:border-[#166534] outline-none font-semibold cursor-pointer"
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-[0.45px] text-[#2e5a40] font-bold mb-1">{t('district')} *</label>
                  <select
                    required
                    disabled={!regData.state}
                    value={regData.district}
                    onChange={(e) => setRegData({ ...regData, district: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#f4fbf5] border border-[#cdeac6] rounded-[56px] text-xs text-[#0d2618] focus:border-[#166534] outline-none font-semibold cursor-pointer disabled:bg-[#eef8ee] disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {regData.state ? 'Select District' : 'Select State First'}
                    </option>
                    {regData.state && getDistrictsForState(regData.state).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] uppercase tracking-[0.45px] text-[#2e5a40] font-bold mb-1">{t('pincode')} *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={regData.pincode}
                    onChange={(e) => setRegData({ ...regData, pincode: e.target.value.replace(/\D/g, '') })}
                    placeholder="6-digit pincode"
                    className="w-full px-4 py-2.5 bg-[#f4fbf5] border border-[#cdeac6] rounded-[56px] text-xs text-[#0d2618] focus:border-[#166534] outline-none font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-[0.45px] text-[#2e5a40] font-bold mb-1">{t('village')} *</label>
                  <input
                    type="text"
                    required
                    value={regData.village}
                    onChange={(e) => setRegData({ ...regData, village: e.target.value })}
                    placeholder="Village name"
                    className="w-full px-4 py-2.5 bg-[#f4fbf5] border border-[#cdeac6] rounded-[56px] text-xs text-[#0d2618] focus:border-[#166534] outline-none font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-[0.45px] text-[#2e5a40] font-bold mb-1">Total Agricultural Land (Acres)</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={regData.landHoldingAcres}
                  onChange={(e) => setRegData({ ...regData, landHoldingAcres: parseFloat(e.target.value) || 1 })}
                  className="w-full px-4 py-2.5 bg-[#f4fbf5] border border-[#cdeac6] rounded-[56px] text-xs text-[#0d2618] focus:border-[#166534] outline-none font-semibold"
                />
              </div>

              {regOtpSent && (
                <div className="p-3 bg-[#eef8ee] border border-[#cdeac6] rounded-[16px] space-y-1">
                  <label className="block text-[9px] uppercase tracking-[0.45px] text-[#166534] font-bold">
                    Enter 6-Digit OTP sent to {regData.mobileNumber}
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#166534] absolute left-3 top-3" />
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      value={regOtpCode}
                      onChange={(e) => setRegOtpCode(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="w-full pl-10 pr-3 py-2 bg-[#ffffff] border border-[#cdeac6] rounded-[56px] text-xs font-mono font-bold tracking-widest text-center text-[#0d2618] focus:border-[#166534] outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 border border-[#cdeac6] text-[#0d2618] rounded-[56px] text-xs font-semibold hover:bg-[#eef8ee]"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-[#166534] hover:bg-[#14532d] disabled:opacity-60 text-[#ffffff] rounded-[56px] text-xs font-bold shadow-sm"
                >
                  {isSubmitting ? '...' : regOtpSent ? 'Verify & Register' : 'Send OTP & Register'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
