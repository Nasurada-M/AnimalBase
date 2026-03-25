import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, Mail, PawPrint, ShieldCheck } from 'lucide-react';
import { authApi } from '../../services/api';
import { clearPasswordResetSession, setPasswordResetSession } from '../../services/passwordResetSession';

const STEP_ITEMS = [
  { step: 1, title: 'Enter email', subtitle: 'Send reset OTP' },
  { step: 2, title: 'Verify OTP', subtitle: 'Confirm 6-digit code' },
  { step: 3, title: 'Reset password', subtitle: 'Continue on next page' },
];

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(value.trim());

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [localError, setLocalError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const otp = otpDigits.join('');

  useEffect(() => {
    clearPasswordResetSession();
  }, []);

  const clearNotices = () => {
    setLocalError('');
    setInfoMessage('');
  };

  const handleSendCode = async () => {
    clearNotices();
    clearPasswordResetSession();

    if (!isValidEmail(email)) {
      setLocalError('Enter the registered email address for your account first.');
      return;
    }

    setIsSendingCode(true);
    try {
      const response = await authApi.sendResetOtp(email.trim());
      setInfoMessage(response.message);
      setOtpDigits(['', '', '', '', '', '']);
      setStep(2);
      setTimeout(() => otpRefs.current[0]?.focus(), 0);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to send password reset code.');
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

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const next = ['', '', '', '', '', ''];
    pasted.split('').forEach((digit, index) => {
      next[index] = digit;
    });
    setOtpDigits(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerifyCode = async () => {
    clearNotices();

    if (otp.length !== 6) {
      setLocalError('Enter the full 6-digit OTP before continuing.');
      return;
    }

    setIsVerifyingCode(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await authApi.verifyResetOtp(normalizedEmail, otp);
      setPasswordResetSession(response.resetToken, normalizedEmail);
      navigate('/reset-password', { replace: true });
    } catch (err) {
      clearPasswordResetSession();
      setLocalError(err instanceof Error ? err.message : 'Failed to verify the OTP.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const goBack = () => {
    clearNotices();
    if (step === 2) {
      setStep(1);
    }
  };

  return (
    <div className="min-h-screen bg-primary-50 flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-800 via-primary-700 to-primary-500 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-16 right-16 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-12 w-48 h-48 bg-primary-900/30 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <button onClick={() => navigate('/login')} className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </button>
        </div>

        <div className="relative z-10">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
            <PawPrint className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-4xl font-bold text-white mb-4 leading-tight">
            Verify your email
          </h1>
          <p className="text-primary-200 text-lg mb-8">
            Use your registered email to receive an OTP, then continue to the password reset page.
          </p>
          <div className="space-y-3">
            {[
              'Enter the email tied to your account',
              'Check your inbox for the OTP',
              'Continue to the reset password page',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-white/90 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-3">
          {[
            'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=200&q=80',
            'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&q=80',
            'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=200&q=80',
          ].map((url, index) => (
            <img key={index} src={url} alt="pet" className="rounded-xl h-24 w-full object-cover opacity-80" />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <button onClick={() => navigate('/login')} className="text-primary-600 hover:text-primary-800 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center">
                <PawPrint className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-primary-800 text-lg">AnimalBase</span>
            </div>
          </div>

          <h2 className="font-display text-3xl font-bold text-gray-900 mb-2">Forgot password</h2>
          <p className="text-gray-500 mb-8">Enter your registered email, verify the OTP, then continue to reset your password.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            {STEP_ITEMS.map((item) => {
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

          {localError && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex justify-between">
              {localError}
              <button onClick={() => setLocalError('')} className="text-red-400 hover:text-red-600 ml-4">x</button>
            </div>
          )}

          {infoMessage && (
            <div className="mb-5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
              {infoMessage}
            </div>
          )}

          <div className="bg-white rounded-3xl border border-primary-100 shadow-sm p-6 lg:p-8">
            {step === 2 && (
              <button onClick={goBack} className="flex items-center gap-2 text-primary-600 font-semibold text-sm mb-6 hover:text-primary-800">
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
                    <Mail className="w-5 h-5 text-primary-600" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">Email verification</h3>
                  <p className="text-gray-500 text-sm">Enter the registered email address you want to use for password recovery.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Registered Email Address</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    maxLength={255}
                  />
                </div>

                <button type="button" onClick={handleSendCode} disabled={isSendingCode} className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2 disabled:opacity-60">
                  {isSendingCode ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending OTP...</> : 'Send OTP'}
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
                    <ShieldCheck className="w-5 h-5 text-primary-600" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">Verify your OTP</h3>
                  <p className="text-gray-500 text-sm">Enter the 6-digit OTP sent to {email || 'your email'} to continue to the reset page.</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">One-Time Password</p>
                  <div className="grid grid-cols-6 gap-2">
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(element) => { otpRefs.current[index] = element; }}
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(event) => handleOtpChange(index, event.target.value)}
                        onKeyDown={(event) => handleOtpKeyDown(index, event)}
                        onPaste={handleOtpPaste}
                        className="h-14 rounded-2xl border border-primary-200 text-center text-xl font-bold text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={handleSendCode} disabled={isSendingCode} className="btn-secondary flex-1 py-3">
                    Resend OTP
                  </button>
                  <button type="button" onClick={handleVerifyCode} disabled={isVerifyingCode} className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-60">
                    {isVerifyingCode ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : 'Verify OTP'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-gray-500 text-sm">
            Remembered your password?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-800 transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
