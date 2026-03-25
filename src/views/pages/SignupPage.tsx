import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  PawPrint, Eye, EyeOff, ArrowLeft, Loader2, Check, Mail, ShieldCheck, UserRound,
} from 'lucide-react';
import { useAuth } from '../../context/AppContext';
import { authApi } from '../../services/api';
import {
  formatPhilippinePhoneNumber,
  getPhilippinePhoneValidationMessage,
  isValidPhilippinePhoneNumber,
  PHILIPPINES_DIAL_CODE,
  PHILIPPINES_LOCAL_PHONE_LENGTH,
  PHILIPPINES_PHONE_PLACEHOLDER,
  sanitizePhilippinePhoneNumber,
} from '../../utils/philippinePhone';

type SignupStep = 1 | 2 | 3;

const STEP_ITEMS: Array<{ step: SignupStep; title: string; subtitle: string }> = [
  { step: 1, title: 'Enter email', subtitle: 'Send verification code' },
  { step: 2, title: 'Verify code', subtitle: 'Enter 6 digits' },
  { step: 3, title: 'Create account', subtitle: 'Finish signup' },
];


function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password) && /\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { label: 'Weak', color: 'bg-red-400', width: 'w-1/4' };
  if (score === 2) return { label: 'Fair', color: 'bg-amber-400', width: 'w-2/4' };
  if (score === 3) return { label: 'Good', color: 'bg-primary-500', width: 'w-3/4' };
  return { label: 'Strong', color: 'bg-emerald-500', width: 'w-full' };
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, isLoading, error, clearError } = useAuth();

  const [step, setStep] = useState<SignupStep>(1);
  const [fullName, setFullName] = useState('');
  const [phoneLocalNumber, setPhoneLocalNumber] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [localError, setLocalError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [otpExpiresInSeconds, setOtpExpiresInSeconds] = useState(0);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const otp = otpDigits.join('');
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const displayError = localError || error;
  const formattedPhonePreview = useMemo(
    () => formatPhilippinePhoneNumber(phoneLocalNumber),
    [phoneLocalNumber]
  );

  const perks = [
    'Browse all adoptable pets',
    'Submit adoption applications',
    'Use Pet Finder to report missing pets',
    'Track your adoption history',
  ];

  const resetMessages = () => {
    setLocalError('');
    setInfoMessage('');
    clearError();
  };

  const validateGmail = (value: string) => /^[^\s@]+@gmail\.com$/i.test(value.trim());

  useEffect(() => {
    if (otpExpiresInSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setOtpExpiresInSeconds(seconds => Math.max(seconds - 1, 0));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [otpExpiresInSeconds]);

  const resetOtpInputs = () => {
    setOtpDigits(['', '', '', '', '', '']);
  };

  const focusFirstOtpInput = () => {
    window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
  };

  const handleSendCode = async () => {
    resetMessages();
    if (!validateGmail(email)) {
      setLocalError('Enter a valid Gmail address before requesting a verification code.');
      return;
    }

    setIsSendingCode(true);
    try {
      const res = await authApi.sendOtp(email.trim());
      setInfoMessage(res.message);
      resetOtpInputs();
      setOtpExpiresInSeconds(res.expiresInSeconds || 60);
      setStep(2);
      focusFirstOtpInput();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to send verification code.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    if (value && index < otpRefs.current.length - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...otpDigits];
    pasted.split('').forEach((digit, index) => {
      next[index] = digit;
    });
    setOtpDigits(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerifyCode = async () => {
    resetMessages();
    if (otp.length !== 6) {
      setLocalError('Enter the full verification code.');
      return;
    }

    setIsVerifyingCode(true);
    try {
      const res = await authApi.verifyOtp(email.trim(), otp);
      setInfoMessage(res.message);
      setOtpExpiresInSeconds(0);
      setStep(3);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (/failed to fetch|network|server error/i.test(message)) {
        setLocalError(message || 'Failed to verify code.');
      } else {
        resetOtpInputs();
        focusFirstOtpInput();
        setLocalError('Incorrect/Invalid Code. Please Try again.');
      }
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!fullName.trim()) {
      setLocalError('Full name is required.');
      return;
    }
    if (!/^[A-Za-z\s]+$/.test(fullName.trim())) {
      setLocalError('Full name must contain letters only.');
      return;
    }
    if (!phoneLocalNumber.trim()) {
      setLocalError('Phone number is required.');
      return;
    }
    if (!isValidPhilippinePhoneNumber(phoneLocalNumber)) {
      setLocalError(getPhilippinePhoneValidationMessage());
      return;
    }
    if (!address.trim()) {
      setLocalError('Address is required.');
      return;
    }
    if (password !== confirm) {
      setLocalError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    const ok = await signup(
      fullName.trim(),
      email.trim(),
      password,
      formatPhilippinePhoneNumber(phoneLocalNumber),
      address.trim()
    );
    if (ok) navigate('/dashboard');
  };

  const goToPreviousStep = () => {
    resetMessages();
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  return (
    <div className="min-h-screen bg-primary-50 flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-800 via-primary-700 to-primary-500 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-16 right-16 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-12 w-48 h-48 bg-primary-900/30 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </button>
        </div>
        <div className="relative z-10">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
            <PawPrint className="w-7 h-7 text-white" />
          </div>
          <h2 className="font-display text-4xl font-bold text-white mb-4 leading-tight">
            Join the<br />AnimalBase family
          </h2>
          <p className="text-primary-200 mb-8 text-lg">Give a pet a second chance at happiness.</p>
          <div className="space-y-3">
            {perks.map(perk => (
              <div key={perk} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-white/90 text-sm">{perk}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex -space-x-3">
          {[
            'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=100&q=80',
            'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=100&q=80',
            'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=100&q=80',
            'https://images.unsplash.com/photo-1503256207526-0d5d80fa2f47?w=100&q=80',
          ].map((url, i) => (
            <img key={i} src={url} alt="pet" className="w-12 h-12 rounded-full border-2 border-white/40 object-cover" />
          ))}
          <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-xs font-bold">+99</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <button onClick={() => navigate('/')} className="text-primary-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center">
                <PawPrint className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-primary-800 text-lg">AnimalBase</span>
            </div>
          </div>

          <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">Create account</h1>
          <p className="text-gray-500 mb-8">Verify your Gmail first, then finish creating your account.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
            {STEP_ITEMS.map(item => {
              const isActive = step === item.step;
              const isDone = step > item.step;
              return (
                <div
                  key={item.step}
                  className={`rounded-2xl border p-3 transition-all ${
                    isActive ? 'border-primary-300 bg-primary-50' : isDone ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {isDone ? <Check className="w-3.5 h-3.5" /> : item.step}
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                  </div>
                  <p className="text-xs text-gray-400">{item.subtitle}</p>
                </div>
              );
            })}
          </div>

          {displayError && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex justify-between">
              {displayError}
              <button onClick={() => { setLocalError(''); clearError(); }} className="text-red-400 hover:text-red-600 ml-4">x</button>
            </div>
          )}

          {infoMessage && (
            <div className="mb-5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
              {infoMessage}
            </div>
          )}

          <div className="bg-white rounded-3xl border border-primary-100 shadow-sm p-6 lg:p-8">
            {(step === 2 || step === 3) && (
              <button onClick={goToPreviousStep} className="flex items-center gap-2 text-primary-600 font-semibold text-sm mb-6 hover:text-primary-800">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
                    <Mail className="w-5 h-5 text-primary-600" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">Step 1 - Enter email</h2>
                  <p className="text-gray-500 text-sm">Enter Gmail, then click Send Verification Code.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Gmail Address</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="yourname@gmail.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    maxLength={255}
                  />
                </div>

                <button type="button" onClick={handleSendCode} disabled={isSendingCode} className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2 disabled:opacity-60">
                  {isSendingCode ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending code...</> : 'Send Verification Code'}
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
                    <ShieldCheck className="w-5 h-5 text-primary-600" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">Step 2 - Verify code</h2>
                  <p className="text-gray-500 text-sm">Enter the 6-digit code from your email. The code expires in 1 minute.</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">Verification Code</p>
                  <div className="grid grid-cols-6 gap-2">
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={el => { otpRefs.current[index] = el; }}
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(index, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(index, e)}
                        onPaste={handleOtpPaste}
                        className="h-14 rounded-2xl border border-primary-200 text-center text-xl font-bold text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                      />
                    ))}
                  </div>
                </div>

                <p className="text-center text-sm text-gray-500">
                  {otpExpiresInSeconds > 0
                    ? `Code expires in ${otpExpiresInSeconds}s`
                    : 'Code expired. Request a new code to continue.'}
                </p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={isSendingCode || otpExpiresInSeconds > 0}
                    className="btn-secondary flex-1 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {otpExpiresInSeconds > 0 ? `Resend in ${otpExpiresInSeconds}s` : 'Resend Code'}
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={isVerifyingCode}
                    className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isVerifyingCode ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : 'Verify Email'}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <form onSubmit={handleCreateAccount} className="space-y-5">
                <div>
                  <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
                    <UserRound className="w-5 h-5 text-primary-600" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">Step 3 - Create account</h2>
                  <p className="text-gray-500 text-sm">Your email is verified. Finish the rest of your account details below.</p>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Email verified</p>
                    <p className="text-xs text-emerald-700">{email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                  <input type="text" className="input-field" placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} required maxLength={150} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                  <div className="flex items-center overflow-hidden rounded-xl border border-primary-200 bg-white transition-all focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200">
                    <span className="flex h-full items-center border-r border-primary-100 bg-primary-50 px-4 py-3 text-sm font-semibold text-gray-500">
                      {PHILIPPINES_DIAL_CODE}
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-sm font-sans text-gray-800 outline-none placeholder:text-primary-300"
                      placeholder={PHILIPPINES_PHONE_PLACEHOLDER}
                      value={phoneLocalNumber}
                      onChange={e => setPhoneLocalNumber(sanitizePhilippinePhoneNumber(e.target.value))}
                      required
                      maxLength={PHILIPPINES_LOCAL_PHONE_LENGTH}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Enter your 11-digit Philippine mobile number starting with 09.
                  </p>
                  {formattedPhonePreview && (
                    <p className="mt-1 text-xs text-primary-600">Saved as {formattedPhonePreview}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Street, City, Province"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    required
                    maxLength={255}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} className="input-field pr-11" placeholder="Create a secure password" value={password} onChange={e => setPassword(e.target.value)} required maxLength={255} />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-500 transition-colors">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="mt-3">
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-full ${passwordStrength.width} ${passwordStrength.color} transition-all`} />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Strength: <span className="font-semibold text-gray-700">{passwordStrength.label}</span></p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                  <div className="relative">
                    <input type={showConfirm ? 'text' : 'password'} className="input-field pr-11" placeholder="Re-enter password" value={confirm} onChange={e => setConfirm(e.target.value)} required maxLength={255} />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-500 transition-colors">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2">
                  {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : 'Create Account'}
                </button>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-gray-500 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-800 transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
