import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Language } from '../../types';
import { LanguageDropdown } from '../common/LanguageDropdown';
import { getAuthText } from '../../i18n/authTranslations';
import { 
  User, 
  Users,
  LogIn,
  UserPlus,
  Lock, 
  Eye,
  EyeOff,
  Phone,
  Building2,
  Briefcase,
  Key,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { INDIAN_STATES } from '../../data/states';
import { getDistrictsForState } from '../../data/districts';

interface AuthPageProps {
  onSuccess?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const { 
    sendOtp,
    verifyOtp,
    operatorLogin, 
    operatorRegister,
    register, 
    language, 
    setActiveView,
    centres,
    setIsTcModalOpen
  } = useApp();

  const at = getAuthText(language);

  // Role & Action selectors: preserved so component remounts or state updates don't revert to Farmer
  const [selectedRole, setSelectedRole] = useState<'farmer' | 'operator'>(() => {
    try {
      const saved = sessionStorage.getItem('krayam_auth_selected_role');
      if (saved === 'farmer' || saved === 'operator') return saved;
      const role = localStorage.getItem('kisan_role');
      if (role === 'operator') return 'operator';
    } catch {}
    return 'farmer';
  });

  const [selectedAction, setSelectedAction] = useState<'login' | 'register'>(() => {
    try {
      const saved = sessionStorage.getItem('krayam_auth_selected_action');
      if (saved === 'login' || saved === 'register') return saved;
    } catch {}
    return 'login';
  });

  const handleSelectRole = (role: 'farmer' | 'operator') => {
    setSelectedRole(role);
    setAuthError('');
    setAuthSuccess(null);
    try {
      sessionStorage.setItem('krayam_auth_selected_role', role);
    } catch {}
  };

  const handleSelectAction = (action: 'login' | 'register') => {
    setSelectedAction(action);
    setAuthError('');
    setAuthSuccess(null);
    try {
      sessionStorage.setItem('krayam_auth_selected_action', action);
    } catch {}
  };
  
  // Mandatory Terms & Conditions Agreement
  const [agreedToTc, setAgreedToTc] = useState(false);

  // Password visibility toggle (for Operator Login/Register)
  const [showPassword, setShowPassword] = useState(false);

  // General feedback messages
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Operator Login credentials
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');

  // Farmer OTP credentials (strictly OTP-based, no password)
  const [farmerMobile, setFarmerMobile] = useState('');
  const [farmerOtpCode, setFarmerOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Form submission loading indicator
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Operator Registration fields (Strictly matching POST /api/v1/operator/register)
  const [opRegName, setOpRegName] = useState('');
  const [opRegMobile, setOpRegMobile] = useState('');
  const [opRegPassword, setOpRegPassword] = useState('');
  const [opRegCentreId, setOpRegCentreId] = useState(centres[0]?.id || '');
  const [opRegServiceKey, setOpRegServiceKey] = useState('');

  const [farmerRegName, setFarmerRegName] = useState('');
  const [farmerRegMobile, setFarmerRegMobile] = useState('');
  const [farmerRegVillage, setFarmerRegVillage] = useState('');
  const [farmerRegDistrict, setFarmerRegDistrict] = useState('');
  const [farmerRegState, setFarmerRegState] = useState('');
  const [farmerRegPincode, setFarmerRegPincode] = useState('');
  const [farmerRegLand, setFarmerRegLand] = useState(5);
  const [farmerRegOtpSent, setFarmerRegOtpSent] = useState(false);
  const [farmerRegOtpCode, setFarmerRegOtpCode] = useState('');
  const [farmerRegCooldown, setFarmerRegCooldown] = useState(0);
  const [farmerSuccessId, setFarmerSuccessId] = useState<string | null>(null);

  // Available districts dependent on selected state
  const availableDistricts = farmerRegState ? getDistrictsForState(farmerRegState) : [];

  // Reset district automatically whenever state changes
  const handleFarmerStateChange = (selectedState: string) => {
    setFarmerRegState(selectedState);
    setFarmerRegDistrict('');
    setAuthError('');
  };

  // Sync default centre when centres catalog loads
  useEffect(() => {
    if (!opRegCentreId && centres.length > 0) {
      setOpRegCentreId(centres[0].id);
    }
  }, [centres, opRegCentreId]);

  // Timers for OTP cooldowns
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  useEffect(() => {
    if (farmerRegCooldown <= 0) return;
    const interval = setInterval(() => setFarmerRegCooldown((c) => c - 1), 1000);
    return () => clearInterval(interval);
  }, [farmerRegCooldown]);

  const termsText = {
    en: 'I agree to the Terms & Conditions',
    hi: 'मैं नियम एवं शर्तों (Terms & Conditions) से सहमत हूँ',
    pa: 'ਮੈਂ ਨਿਯਮਾਂ ਅਤੇ ਸ਼ਰਤਾਂ (Terms & Conditions) ਨਾਲ ਸਹਿਮਤ ਹਾਂ',
    bn: 'আমি শর্তাবলী (Terms & Conditions) সাথে একমত',
    mr: 'मी अटी आणि शर्तींशी (Terms & Conditions) सहमत आहे',
    te: 'నేను నిబంధనలు మరియు షరతులకు (Terms & Conditions) అంగীకరిస్తున్నాను',
    ta: 'விதிமுறைகள் மற்றும் நிபந்தனைகளை (Terms & Conditions) நான் ஒப்புக்கொள்கிறேன்',
    gu: 'હું નિયમો અને શરતો (Terms & Conditions) સાથે સંમત છું',
    ur: 'میں شرائط و ضوابط (Terms & Conditions) سے متفق ہوں',
    kn: 'ನಾನು ನಿಯಮಗಳು ಮತ್ತು ಷರತ್ತುಗಳನ್ನು (Terms & Conditions) ಒಪ್ಪುತ್ತೇನೆ',
    or: 'ମୁଁ ନିୟମ ଏବଂ ସର୍ତ୍ତାବଳୀ (Terms & Conditions) ସହିତ ସହମତ'
  }[language] || 'I agree to the Terms & Conditions';

  const termsErrorMsg = {
    en: 'Please agree to the Terms & Conditions before proceeding.',
    hi: 'कृपया आगे बढ़ने से पहले नियम एवं शर्तों को स्वीकार करें।',
    pa: 'ਕਿਰਪਾ ਕਰਕੇ ਅੱਗੇ ਵਧਣ ਤੋਂ ਪਹਿਲਾਂ ਨਿਯਮਾਂ ਅਤੇ ਸ਼ਰਤਾਂ ਨੂੰ ਸਵੀਕਾਰ ਕਰੋ।',
    bn: 'অনুগ্রহ করে এগিয়ে যাওয়ার আগে শর্তাবলীতে সম্মত হন।',
    mr: 'कृपया पुढे जाण्यापूर्वी अटी व शर्ती मान्य करा.',
    te: 'దయచేసి కొనసాగడానికి ముందు నిబంధనలు మరియు షరతులను అంగీకరించండి.',
    ta: 'தொடர்வதற்கு முன் விதிமுறைகள் மற்றும் நிபந்தனைகளை ஏற்கவும்.',
    gu: 'કૃપા કરીને આગળ વધતા પહેલા નિયમો અને શરતો સાથે સંમત થાઓ.',
    ur: 'براہ کرم آگے بڑھنے سے پہلے شرائط و ضوابط سے اتفاق کریں۔',
    kn: 'ದಯವಿಟ್ಟು ಮುಂದುವರಿಯುವ ಮೊದಲು ನಿಯಮಗಳು ಮತ್ತು ಷರತ್ತುಗಳನ್ನು ಒಪ್ಪಿಕೊಳ್ಳಿ.',
    or: 'ଦୟାକରି ଆଗକୁ ବଢ଼ିବା ପୂର୍ବରୁ ନିୟମ ଏବଂ ସର୍ତ୍ତାବଳୀ ସହିତ ସହମତ ହୁଅନ୍ତୁ |'
  }[language] || 'Please agree to the Terms & Conditions before proceeding.';

  // Handle Send OTP for Farmer Login (Real Backend API)
  const handleSendFarmerOtp = async () => {
    setAuthError('');
    const cleanDigits = farmerMobile.replace(/[^\d]/g, '');
    if (cleanDigits.length < 10) {
      setAuthError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendOtp(cleanDigits);
      setOtpSent(true);
      setResendCooldown(60);
      setIsSubmitting(false);
      setAuthSuccess(res?.message ? `${res.message} to +91 ${cleanDigits}. Please enter the OTP below.` : `OTP sent to +91 ${cleanDigits}. Please enter the OTP below.`);
    } catch (err: any) {
      setIsSubmitting(false);
      setAuthError(err.message || 'Failed to send OTP. Please try again.');
    }
  };

  // Handle Resend OTP for Farmer Registration
  const handleResendFarmerRegOtp = async () => {
    if (farmerRegCooldown > 0 || isSubmitting) return;
    setAuthError('');
    setAuthSuccess(null);

    const cleanDigits = farmerRegMobile.replace(/[^\d]/g, '');
    if (cleanDigits.length !== 10 || !/^[6-9]\d{9}$/.test(cleanDigits)) {
      setAuthError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendOtp(cleanDigits);
      setFarmerRegCooldown(60);
      setAuthSuccess(res?.message ? `${res.message} to +91 ${cleanDigits}. Please check your phone.` : `OTP re-sent successfully to +91 ${cleanDigits}. Please check your phone.`);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to resend OTP. Please wait before retrying.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Submit: Operator Login (POST /api/v1/operator/login)
  const handleSubmitOperatorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess(null);

    // Prevent duplicate login requests
    if (isSubmitting) return;

    if (!agreedToTc) {
      setAuthError(termsErrorMsg);
      return;
    }

    const cleanDigits = mobileNumber.replace(/[^\d]/g, '');
    if (cleanDigits.length < 10) {
      setAuthError('Please enter your 10-digit registered mobile number.');
      return;
    }

    if (!password) {
      setAuthError('Please enter your operator account password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await operatorLogin(cleanDigits, password);
      if (success) {
        if (onSuccess) onSuccess();
        setActiveView('dashboard');
      } else {
        setAuthError('Invalid phone or password');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Invalid phone or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Submit: Farmer Login (OTP-only, NO password)
  const handleSubmitFarmerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess(null);

    if (!agreedToTc) {
      setAuthError(termsErrorMsg);
      return;
    }

    const cleanDigits = farmerMobile.replace(/[^\d]/g, '');
    if (cleanDigits.length < 10) {
      setAuthError('Please enter a valid 10-digit mobile number.');
      return;
    }

    // If OTP not yet requested, trigger OTP send
    if (!otpSent) {
      await handleSendFarmerOtp();
      return;
    }

    // Verify OTP
    if (!farmerOtpCode.trim() || farmerOtpCode.trim().length !== 6) {
      setAuthError('Please enter the 6-digit OTP received on your mobile.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await verifyOtp(cleanDigits, farmerOtpCode.trim());
      setIsSubmitting(false);

      if (res.token) {
        if (res.isRegistered) {
          if (onSuccess) onSuccess();
          setActiveView('dashboard');
        } else {
          setFarmerRegMobile(cleanDigits);
          setSelectedAction('register');
          setAuthError('Mobile verified. Please complete your farmer registration profile below.');
        }
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setAuthError(err.message || 'Verification failed. Please check OTP and retry.');
    }
  };

  // 3. Submit: Operator Registration (POST /api/v1/operator/register)
  const handleSubmitOperatorRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess(null);

    if (!agreedToTc) {
      setAuthError(termsErrorMsg);
      return;
    }

    if (!opRegName.trim()) {
      setAuthError('Please enter operator full name.');
      return;
    }

    const cleanDigits = opRegMobile.replace(/[^\d]/g, '');
    if (cleanDigits.length < 10) {
      setAuthError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (opRegPassword.length < 8) {
      setAuthError('Password must be at least 8 characters long.');
      return;
    }

    const centreId = opRegCentreId || centres[0]?.id;
    if (!centreId) {
      setAuthError('Please select a Mandi Procurement Centre.');
      return;
    }

    setIsSubmitting(true);
    try {
      const createdOp = await operatorRegister({
        name: opRegName.trim(),
        phone: cleanDigits,
        password: opRegPassword,
        centre_id: centreId,
        serviceKey: opRegServiceKey.trim() || undefined,
      });

      setIsSubmitting(false);
      setAuthSuccess(`Operator account registered for ${createdOp.name}! Please login below.`);
      setMobileNumber(cleanDigits);
      setPassword(opRegPassword);
      setSelectedAction('login');
    } catch (err: any) {
      setIsSubmitting(false);
      if (err.message?.includes('Invalid service key') || err.message?.includes('FORBIDDEN')) {
        setAuthError('Government Service Key Required: The server requires an authorized Mandi Board Service Key to register new operators. Please enter the Service Key or login with existing credentials.');
      } else {
        setAuthError(err.message || 'Registration failed. Please check your details.');
      }
    }
  };

  // 4. Submit: Farmer Registration
  const handleSubmitFarmerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess(null);

    if (!agreedToTc) {
      setAuthError(termsErrorMsg);
      return;
    }

    if (!farmerRegName.trim() || !farmerRegMobile.trim() || !farmerRegState.trim() || !farmerRegDistrict.trim() || !farmerRegPincode.trim() || !farmerRegVillage.trim()) {
      setAuthError('Please fill all required fields (Name, Mobile, State, District, Pincode, Village).');
      return;
    }

    const cleanDigits = farmerRegMobile.replace(/[^\d]/g, '');
    if (cleanDigits.length !== 10 || !/^[6-9]\d{9}$/.test(cleanDigits)) {
      setAuthError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    // Validate that district belongs to selected state
    const validDistricts = getDistrictsForState(farmerRegState);
    if (validDistricts.length > 0 && !validDistricts.includes(farmerRegDistrict)) {
      setAuthError(`Selected district "${farmerRegDistrict}" does not belong to ${farmerRegState}. Please select a valid district.`);
      return;
    }

    const cleanPincode = farmerRegPincode.replace(/[^\d]/g, '');
    if (cleanPincode.length !== 6 || !/^\d{6}$/.test(cleanPincode)) {
      setAuthError('Please enter a valid 6-digit Indian PIN code.');
      return;
    }

    // Step 1: Send OTP if not sent yet
    if (!farmerRegOtpSent) {
      setIsSubmitting(true);
      try {
        const res = await sendOtp(cleanDigits);
        setFarmerRegOtpSent(true);
        setFarmerRegCooldown(60);
        setAuthSuccess(res?.message ? `${res.message} to +91 ${cleanDigits}. Please enter the 6-digit code below.` : `OTP sent successfully to +91 ${cleanDigits}. Please enter the 6-digit code below.`);
      } catch (err: any) {
        setFarmerRegOtpSent(false);
        setAuthError(err.message || 'Failed to send OTP for registration. Please verify number and retry.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Step 2: Verify OTP and Register
    const cleanOtp = farmerRegOtpCode.trim();
    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setAuthError('Please enter the 6-digit numeric OTP received on your mobile.');
      return;
    }

    setIsSubmitting(true);
    try {
      const verifyRes = await verifyOtp(cleanDigits, cleanOtp);
      if (!verifyRes.token) {
        throw new Error('OTP verification failed: no auth token returned.');
      }

      const newFarmer = await register({
        fullName: farmerRegName.trim(),
        mobileNumber: cleanDigits,
        village: farmerRegVillage.trim(),
        tehsil: '',
        district: farmerRegDistrict.trim(),
        state: farmerRegState.trim(),
        pincode: cleanPincode,
        landHoldingAcres: Number(farmerRegLand) || 5,
      });

      setFarmerSuccessId(newFarmer.farmerId);
      setAuthSuccess(`Farmer registered successfully! Your Official Farmer ID is: ${newFarmer.farmerId}`);
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed. Please check the OTP and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="min-h-screen text-[#17231F] flex flex-col justify-between relative bg-cover bg-center bg-no-repeat sm:bg-fixed font-['Inter']"
      style={{
        backgroundImage: "url('/login-bg.png')",
        backgroundColor: '#F5F8F6'
      }}
    >
      {/* Top Header Strip with Language Selector */}
      <header className="bg-[#063B2A] text-[#FFFFFF] text-xs py-2 px-3 sm:px-8 border-b border-[#075E43] relative z-50 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <span className="font-bold tracking-wider text-[11px] sm:text-xs uppercase text-[#A3E5B9]">
            Ministry of Agriculture & Farmers Welfare
          </span>
          <div className="flex items-center justify-end shrink-0 gap-2">
            <LanguageDropdown variant="header" align="right" />
          </div>
        </div>
      </header>

      {/* Main Container: Compact, Centered Authentication Card (Matching Target Design) */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-5 my-auto relative z-10">
        <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-[#CBD8D1] w-full max-w-[420px] shadow-[0_16px_48px_rgba(6,59,42,0.14)] overflow-hidden transition-all duration-200">
          
          {/* Top Branding Section (Subtle Soft Greenish Background #F4F7F5) */}
          <div className="bg-[#F4F7F5] pt-6 pb-4 px-5 sm:px-6 text-center">
            {/* Sprout Squircle Icon */}
            <div className="flex justify-center mb-2.5">
              <img 
                src="/logo.png" 
                alt="KRAYAM Logo" 
                className="w-14 h-14 object-contain drop-shadow-sm select-none" 
              />
            </div>

            {/* Portal Titles */}
            <div className="text-[10px] sm:text-[11px] uppercase tracking-widest font-bold text-[#075E43]">
              {at.portalBadge}
            </div>
            <h1 className="text-xl sm:text-[22px] font-extrabold text-[#17231F] leading-tight mt-0.5">
              {at.portalTitle}
            </h1>
            <p className="text-[10px] sm:text-[11px] text-[#66736D] leading-snug mt-1 max-w-[320px] mx-auto">
              {at.portalSubtitle}
            </p>

            {/* Row 1: Role Selector (Farmer vs Operator) */}
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <button
                type="button"
                id="btn-select-farmer"
                onClick={() => handleSelectRole('farmer')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-[10px] font-bold text-xs sm:text-sm transition-all duration-150 ${
                  selectedRole === 'farmer'
                    ? 'bg-[#064e3b] text-[#FFFFFF] shadow-sm'
                    : 'bg-[#FFFFFF] text-[#17231F] border border-[#CBD8D1] hover:bg-[#F5F8F6]'
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span>Farmer</span>
              </button>

              <button
                type="button"
                id="btn-select-operator"
                onClick={() => handleSelectRole('operator')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-[10px] font-bold text-xs sm:text-sm transition-all duration-150 ${
                  selectedRole === 'operator'
                    ? 'bg-[#064e3b] text-[#FFFFFF] shadow-sm'
                    : 'bg-[#FFFFFF] text-[#17231F] border border-[#CBD8D1] hover:bg-[#F5F8F6]'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Operator</span>
              </button>
            </div>

            {/* Row 2: Action Selector (Login vs Registration) */}
            <div className="grid grid-cols-2 gap-2.5 mt-2.5">
              <button
                type="button"
                id="btn-select-login"
                onClick={() => handleSelectAction('login')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-[10px] font-bold text-xs sm:text-sm transition-all duration-150 ${
                  selectedAction === 'login'
                    ? 'bg-[#064e3b] text-[#FFFFFF] shadow-sm'
                    : 'bg-[#FFFFFF] text-[#17231F] border border-[#CBD8D1] hover:bg-[#F5F8F6]'
                }`}
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span>Login</span>
              </button>

              <button
                type="button"
                id="btn-select-register"
                onClick={() => handleSelectAction('register')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-[10px] font-bold text-xs sm:text-sm transition-all duration-150 ${
                  selectedAction === 'register'
                    ? 'bg-[#064e3b] text-[#FFFFFF] shadow-sm'
                    : 'bg-[#FFFFFF] text-[#17231F] border border-[#CBD8D1] hover:bg-[#F5F8F6]'
                }`}
              >
                <UserPlus className="w-4 h-4 shrink-0" />
                <span>Registration</span>
              </button>
            </div>
          </div>

          {/* Form Body Section (Pure White, Integrated Inside Same Card) */}
          <div className="bg-[#FFFFFF] border-t border-[#CBD8D1] p-5 sm:p-6 space-y-3.5">
            
            {/* Operator Notice (Shown when Operator is selected, matching target design) */}
            {selectedRole === 'operator' && (
              <div className="bg-[#FFF4E5] border border-[#FFD8A8] text-[#B45309] text-[11px] p-2.5 rounded-[8px] flex items-start gap-2 leading-tight">
                <Briefcase className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Authorized Mandi Personnel Only:</strong> Access live queue floor, digital weighbridges, and PFMS DBT authorization.
                </span>
              </div>
            )}

            {/* Error Message Area (Pink banner with clean padding) */}
            {authError && (
              <div className="bg-[#FFF0F0] border border-[#FFC9C9] text-[#E03131] text-xs p-2.5 rounded-[8px] leading-tight">
                {authError}
              </div>
            )}

            {/* Success Message Area */}
            {authSuccess && (
              <div className="bg-[#E7F3EC] border border-[#85E1A9] text-[#063B2A] text-xs p-2.5 rounded-[8px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16803C] shrink-0" />
                <span>{authSuccess}</span>
              </div>
            )}

            {/* ========================================================= */}
            {/* CASE 1: FARMER LOGIN (Strictly OTP-based, NO PASSWORD)    */}
            {/* ========================================================= */}
            {selectedRole === 'farmer' && selectedAction === 'login' && (
              <form onSubmit={handleSubmitFarmerLogin} className="space-y-3.5">
                {/* Mobile Number Field with fixed icon spacing and protected button area */}
                <div>
                  <label className="block text-[11px] font-bold text-[#17231F] uppercase tracking-wider mb-1">
                    MOBILE NUMBER
                  </label>
                  <div className="relative flex items-center w-full">
                    <span className="absolute left-3.5 flex items-center justify-center pointer-events-none text-[#66736D] z-10">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="tel"
                      required
                      value={farmerMobile}
                      onChange={(e) => setFarmerMobile(e.target.value)}
                      placeholder="Enter registered mobile number"
                      className="w-full bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] pl-10 pr-[92px] py-2 text-xs sm:text-sm text-[#17231F] placeholder:text-[#94A3B8] focus:border-[#075E43] focus:ring-1 focus:ring-[#075E43] focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      disabled={isSubmitting || !farmerMobile.trim() || resendCooldown > 0}
                      onClick={handleSendFarmerOtp}
                      className="absolute right-1.5 px-3 py-1 bg-[#EDF3EF] hover:bg-[#CBD8D1] disabled:opacity-50 text-[#063B2A] font-bold text-[11px] rounded-[6px] border border-[#CBD8D1] transition-colors whitespace-nowrap shadow-2xs z-10"
                    >
                      {resendCooldown > 0 ? `${resendCooldown}s` : otpSent ? 'Resend' : 'Send OTP'}
                    </button>
                  </div>
                </div>

                {/* OTP Field (Only OTP, strictly NO password) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-[#17231F] uppercase tracking-wider">
                      OTP
                    </label>
                    {otpSent && resendCooldown === 0 && (
                      <button
                        type="button"
                        onClick={handleSendFarmerOtp}
                        className="text-[10px] font-bold text-[#075E43] hover:underline"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                  <div className="relative flex items-center w-full">
                    <span className="absolute left-3.5 flex items-center justify-center pointer-events-none text-[#66736D] z-10">
                      <KeyRound className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={farmerOtpCode}
                      onChange={(e) => setFarmerOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter OTP"
                      className="w-full bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] pl-10 pr-4 py-2 text-xs sm:text-sm font-mono tracking-wider text-[#17231F] placeholder:text-[#94A3B8] placeholder:font-sans placeholder:tracking-normal focus:border-[#075E43] focus:ring-1 focus:ring-[#075E43] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Terms & Conditions Checkbox */}
                <div className="pt-0.5">
                  <label className="flex items-center gap-2 text-[11px] text-[#17231F] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreedToTc}
                      onChange={(e) => {
                        setAgreedToTc(e.target.checked);
                        if (e.target.checked) setAuthError('');
                      }}
                      className="w-4 h-4 accent-[#075E43] rounded border-[#CBD8D1] cursor-pointer"
                    />
                    <span>
                      {language === 'en' ? 'I agree to the ' : ''}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsTcModalOpen(true);
                        }}
                        className="font-bold text-[#075E43] underline hover:text-[#04261B]"
                      >
                        {language === 'en' ? 'Terms & Conditions' : termsText}
                      </button>
                      {language === 'en' && <span className="text-[#66736D]"> (नियम एवं शर्तें)</span>}
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#064e3b] hover:bg-[#063B2A] disabled:opacity-50 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-[8px] shadow-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isSubmitting ? 'Logging in...' : otpSent ? 'Login as Farmer' : 'Send OTP & Login as Farmer'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* ========================================================= */}
            {/* CASE 2: OPERATOR LOGIN (Phone + Password as per Swagger)  */}
            {/* ========================================================= */}
            {selectedRole === 'operator' && selectedAction === 'login' && (
              <form onSubmit={handleSubmitOperatorLogin} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#17231F] uppercase tracking-wider mb-1">
                    MOBILE NUMBER
                  </label>
                  <div className="relative flex items-center w-full">
                    <span className="absolute left-3.5 flex items-center justify-center pointer-events-none text-[#66736D] z-10">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="tel"
                      required
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="Enter registered mobile number"
                      className="w-full bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] pl-10 pr-4 py-2 text-xs sm:text-sm text-[#17231F] placeholder:text-[#94A3B8] focus:border-[#075E43] focus:ring-1 focus:ring-[#075E43] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#17231F] uppercase tracking-wider mb-1">
                    PASSWORD
                  </label>
                  <div className="relative flex items-center w-full">
                    <span className="absolute left-3.5 flex items-center justify-center pointer-events-none text-[#66736D] z-10">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] pl-10 pr-10 py-2 text-xs sm:text-sm text-[#17231F] placeholder:text-[#94A3B8] focus:border-[#075E43] focus:ring-1 focus:ring-[#075E43] focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1 text-[#66736D] hover:text-[#17231F] transition-colors z-10"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Terms Checkbox */}
                <div className="pt-0.5">
                  <label className="flex items-center gap-2 text-[11px] text-[#17231F] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreedToTc}
                      onChange={(e) => {
                        setAgreedToTc(e.target.checked);
                        if (e.target.checked) setAuthError('');
                      }}
                      className="w-4 h-4 accent-[#075E43] rounded border-[#CBD8D1] cursor-pointer"
                    />
                    <span>
                      {language === 'en' ? 'I agree to the ' : ''}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsTcModalOpen(true);
                        }}
                        className="font-bold text-[#075E43] underline hover:text-[#04261B]"
                      >
                        {language === 'en' ? 'Terms & Conditions' : termsText}
                      </button>
                      {language === 'en' && <span className="text-[#66736D]"> (नियम एवं शर्तें)</span>}
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#064e3b] hover:bg-[#063B2A] disabled:opacity-50 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-[8px] shadow-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isSubmitting ? 'Logging in...' : 'Login as Operator'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* ========================================================= */}
            {/* CASE 3: OPERATOR REGISTRATION (POST /api/v1/operator/reg) */}
            {/* ========================================================= */}
            {selectedRole === 'operator' && selectedAction === 'register' && (
              <form onSubmit={handleSubmitOperatorRegister} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#17231F] uppercase tracking-wider mb-1">
                    OPERATOR FULL NAME *
                  </label>
                  <div className="relative flex items-center w-full">
                    <span className="absolute left-3.5 flex items-center justify-center pointer-events-none text-[#66736D] z-10">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={opRegName}
                      onChange={(e) => setOpRegName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] pl-10 pr-4 py-2 text-xs text-[#17231F] placeholder:text-[#94A3B8] focus:border-[#075E43] focus:ring-1 focus:ring-[#075E43] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#17231F] uppercase tracking-wider mb-1">
                    OFFICIAL MOBILE NUMBER *
                  </label>
                  <div className="relative flex items-center w-full">
                    <span className="absolute left-3.5 flex items-center justify-center pointer-events-none text-[#66736D] z-10">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="tel"
                      required
                      value={opRegMobile}
                      onChange={(e) => setOpRegMobile(e.target.value)}
                      placeholder="10-digit registered mobile"
                      className="w-full bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] pl-10 pr-4 py-2 text-xs text-[#17231F] placeholder:text-[#94A3B8] focus:border-[#075E43] focus:ring-1 focus:ring-[#075E43] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#17231F] uppercase tracking-wider mb-1">
                    ACCOUNT PASSWORD (MIN 8 CHARS) *
                  </label>
                  <div className="relative flex items-center w-full">
                    <span className="absolute left-3.5 flex items-center justify-center pointer-events-none text-[#66736D] z-10">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      maxLength={128}
                      value={opRegPassword}
                      onChange={(e) => setOpRegPassword(e.target.value)}
                      placeholder="Set strong password (min 8 chars)"
                      className="w-full bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] pl-10 pr-10 py-2 text-xs text-[#17231F] placeholder:text-[#94A3B8] focus:border-[#075E43] focus:ring-1 focus:ring-[#075E43] focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1 text-[#66736D] hover:text-[#17231F] transition-colors z-10"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#17231F] uppercase tracking-wider mb-1">
                    MANDI PROCUREMENT CENTRE *
                  </label>
                  <div className="relative flex items-center w-full">
                    <span className="absolute left-3.5 flex items-center justify-center pointer-events-none text-[#66736D] z-10">
                      <Building2 className="w-4 h-4" />
                    </span>
                    <select
                      required
                      value={opRegCentreId}
                      onChange={(e) => setOpRegCentreId(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] pl-10 pr-4 py-2 text-xs font-medium text-[#17231F] focus:border-[#075E43] focus:ring-1 focus:ring-[#075E43] focus:outline-none transition-colors"
                    >
                      {centres.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.location.district})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#17231F] uppercase tracking-wider mb-1">
                    GOVERNMENT SERVICE KEY (OPTIONAL)
                  </label>
                  <div className="relative flex items-center w-full">
                    <span className="absolute left-3.5 flex items-center justify-center pointer-events-none text-[#66736D] z-10">
                      <Key className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      value={opRegServiceKey}
                      onChange={(e) => setOpRegServiceKey(e.target.value)}
                      placeholder="Required by administrative backend"
                      className="w-full bg-[#FFFFFF] border border-[#CBD8D1] rounded-[8px] pl-10 pr-4 py-2 text-xs text-[#17231F] placeholder:text-[#94A3B8] focus:border-[#075E43] focus:ring-1 focus:ring-[#075E43] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Terms Checkbox */}
                <div className="pt-0.5">
                  <label className="flex items-center gap-2 text-[11px] text-[#17231F] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreedToTc}
                      onChange={(e) => {
                        setAgreedToTc(e.target.checked);
                        if (e.target.checked) setAuthError('');
                      }}
                      className="w-4 h-4 accent-[#075E43] rounded border-[#CBD8D1] cursor-pointer"
                    />
                    <span>I agree to the Terms & Conditions</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#064e3b] hover:bg-[#063B2A] disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-[8px] shadow-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Creating account...' : 'Register Operator Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* ========================================================= */}
            {/* CASE 4: FARMER REGISTRATION (Integrated in Same Card)      */}
            {/* ========================================================= */}
            {selectedRole === 'farmer' && selectedAction === 'register' && (
              <form onSubmit={handleSubmitFarmerRegister} className="space-y-3">
                {farmerSuccessId ? (
                  <div className="text-center p-4 bg-[#E7F3EC] rounded-[8px] space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-[#16803C] mx-auto" />
                    <div className="font-bold text-xs text-[#063B2A]">Registration Successful!</div>
                    <div className="text-[11px] font-mono text-[#075E43] font-bold">ID: {farmerSuccessId}</div>
                    <button
                      type="button"
                      onClick={() => {
                        if (onSuccess) onSuccess();
                        setActiveView('dashboard');
                      }}
                      className="mt-2 w-full bg-[#064e3b] text-white py-2 rounded-[6px] text-xs font-bold shadow-sm"
                    >
                      Enter Farmer Dashboard →
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Row 1: Full Name * & Mobile Number * */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-[#17231F] uppercase mb-0.5">
                          FULL NAME *
                        </label>
                        <input
                          type="text"
                          required
                          value={farmerRegName}
                          onChange={(e) => setFarmerRegName(e.target.value)}
                          placeholder="Kisan Name"
                          className="w-full bg-white border border-[#CBD8D1] rounded-[6px] px-3 py-1.5 text-xs text-[#17231F] focus:border-[#075E43] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#17231F] uppercase mb-0.5">
                          MOBILE NUMBER *
                        </label>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          value={farmerRegMobile}
                          onChange={(e) => setFarmerRegMobile(e.target.value.replace(/\D/g, ''))}
                          placeholder="10-digit mobile"
                          className="w-full bg-white border border-[#CBD8D1] rounded-[6px] px-3 py-1.5 text-xs text-[#17231F] focus:border-[#075E43] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Row 2: State * & District * (Dependent Dropdown) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-[#17231F] uppercase mb-0.5">
                          STATE *
                        </label>
                        <select
                          required
                          value={farmerRegState}
                          onChange={(e) => handleFarmerStateChange(e.target.value)}
                          className="w-full bg-white border border-[#CBD8D1] rounded-[6px] px-3 py-1.5 text-xs text-[#17231F] focus:border-[#075E43] focus:outline-none"
                        >
                          <option value="">Select State</option>
                          {INDIAN_STATES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#17231F] uppercase mb-0.5">
                          DISTRICT *
                        </label>
                        <select
                          required
                          disabled={!farmerRegState}
                          value={farmerRegDistrict}
                          onChange={(e) => setFarmerRegDistrict(e.target.value)}
                          className="w-full bg-white border border-[#CBD8D1] rounded-[6px] px-3 py-1.5 text-xs text-[#17231F] focus:border-[#075E43] focus:outline-none disabled:bg-[#F4F7F5] disabled:text-[#94A3B8] disabled:cursor-not-allowed"
                        >
                          <option value="">
                            {farmerRegState ? 'Select District' : 'Select State First'}
                          </option>
                          {availableDistricts.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Row 3: Pincode * & Village * */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-[#17231F] uppercase mb-0.5">
                          PINCODE *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={farmerRegPincode}
                          onChange={(e) => setFarmerRegPincode(e.target.value.replace(/\D/g, ''))}
                          placeholder="6-digit pincode"
                          className="w-full bg-white border border-[#CBD8D1] rounded-[6px] px-3 py-1.5 text-xs text-[#17231F] focus:border-[#075E43] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#17231F] uppercase mb-0.5">
                          VILLAGE *
                        </label>
                        <input
                          type="text"
                          required
                          value={farmerRegVillage}
                          onChange={(e) => setFarmerRegVillage(e.target.value)}
                          placeholder="Village name"
                          className="w-full bg-white border border-[#CBD8D1] rounded-[6px] px-3 py-1.5 text-xs text-[#17231F] focus:border-[#075E43] focus:outline-none"
                        />
                      </div>
                    </div>

                    {farmerRegOtpSent && (
                      <div className="p-3 bg-[#E7F3EC] border border-[#85E1A9] rounded-[8px] space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-bold text-[#063B2A]">
                            ENTER 6-DIGIT OTP SENT TO +91 {farmerRegMobile}
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setFarmerRegOtpSent(false);
                              setFarmerRegOtpCode('');
                              setAuthError('');
                            }}
                            className="text-[10px] text-[#075E43] font-semibold underline hover:text-[#063B2A]"
                          >
                            Change Number
                          </button>
                        </div>
                        <input
                          type="text"
                          maxLength={6}
                          autoFocus
                          value={farmerRegOtpCode}
                          onChange={(e) => setFarmerRegOtpCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="••••••"
                          className="w-full bg-white border border-[#CBD8D1] rounded-[6px] px-3 py-2 text-center font-mono text-sm tracking-[0.3em] font-bold text-[#063B2A] focus:border-[#075E43] focus:outline-none"
                        />
                        <div className="flex items-center justify-between text-[11px] pt-0.5">
                          <span className="text-[#556960]">Didn't receive code?</span>
                          {farmerRegCooldown > 0 ? (
                            <span className="text-[#889890] font-medium">
                              Resend in {farmerRegCooldown}s
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleResendFarmerRegOtp}
                              disabled={isSubmitting}
                              className="text-[#075E43] font-bold underline hover:text-[#063B2A] disabled:opacity-50"
                            >
                              Resend OTP
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Terms Checkbox */}
                    <div className="pt-0.5">
                      <label className="flex items-center gap-2 text-[11px] text-[#17231F] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={agreedToTc}
                          onChange={(e) => {
                            setAgreedToTc(e.target.checked);
                            if (e.target.checked) setAuthError('');
                          }}
                          className="w-4 h-4 accent-[#075E43] rounded border-[#CBD8D1] cursor-pointer"
                        />
                        <span>I agree to the Terms & Conditions</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#064e3b] hover:bg-[#063B2A] disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-[8px] shadow-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>
                        {isSubmitting
                          ? farmerRegOtpSent
                            ? 'Verifying & Registering...'
                            : 'Sending OTP...'
                          : farmerRegOtpSent
                          ? 'Verify OTP & Complete Registration'
                          : 'Send OTP to Register'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </form>
            )}

          </div>

          {/* Bottom Card Strip (Matching Target Design) */}
          <div className="bg-[#F4F7F5] border-t border-[#CBD8D1] py-2.5 px-4 text-center text-[10px] sm:text-[11px] text-[#66736D] font-medium">
            Need Help? Call Kisan Call Centre Toll-Free: 1800-180-1551
          </div>
        </div>
      </main>

      {/* Official Government Footer */}
      <footer className="bg-[#FFFFFF]/90 backdrop-blur-md border-t border-[#CBD8D1] py-2.5 px-4 text-center text-[11px] text-[#66736D] relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <div>
            KRAYAM National Farmer Procurement Grid • Designed for Mandi Centers Across India
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsTcModalOpen(true)}
              className="hover:text-[#075E43] transition-colors underline"
            >
              Terms & Conditions
            </button>
            <span className="text-[#CBD8D1]">•</span>
            <button
              type="button"
              onClick={() => setIsTcModalOpen(true)}
              className="hover:text-[#075E43] transition-colors underline"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
