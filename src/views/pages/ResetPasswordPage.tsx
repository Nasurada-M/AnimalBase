import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Eye, EyeOff, Loader2, Lock, PawPrint } from 'lucide-react';
import { authApi } from '../../services/api';
import { clearPasswordResetSession, getPasswordResetSession } from '../../services/passwordResetSession';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [sessionData] = useState(getPasswordResetSession);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  if (!sessionData.resetToken || !sessionData.email) {
    return <Navigate to="/forgot-password" replace />;
  }

  const resetToken = sessionData.resetToken;
  const email = sessionData.email;

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError('');
    setInfoMessage('');

    if (newPassword.length < 6) {
      setLocalError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    setIsResettingPassword(true);
    try {
      const response = await authApi.resetPassword(resetToken, newPassword, confirmPassword);
      clearPasswordResetSession();
      setInfoMessage(response.message);
      setIsComplete(true);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setIsResettingPassword(false);
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
          <button onClick={() => navigate('/forgot-password')} className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to verification
          </button>
        </div>

        <div className="relative z-10">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
            <PawPrint className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-4xl font-bold text-white mb-4 leading-tight">
            Create a new password
          </h1>
          <p className="text-primary-200 text-lg mb-8">
            Your OTP has been verified. Set the new password you want to use for {email}.
          </p>
          <div className="space-y-3">
            {[
              'Choose a password with at least 6 characters',
              'Confirm the same password in both fields',
              'Use the new password on your next sign in',
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
            <button onClick={() => navigate('/forgot-password')} className="text-primary-600 hover:text-primary-800 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center">
                <PawPrint className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-primary-800 text-lg">AnimalBase</span>
            </div>
          </div>

          <h2 className="font-display text-3xl font-bold text-gray-900 mb-2">Reset password</h2>
          <p className="text-gray-500 mb-8">Update the password for {email}.</p>

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
            {!isComplete && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
                    <Lock className="w-5 h-5 text-primary-600" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">Choose your new password</h3>
                  <p className="text-gray-500 text-sm">Enter the same new password in both fields to update your account securely.</p>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">OTP verified</p>
                    <p className="text-xs text-emerald-700">{email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">New Password:</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="input-field pr-11"
                      placeholder="Enter your new password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      required
                      maxLength={255}
                    />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-500 transition-colors">
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password:</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="input-field pr-11"
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                      maxLength={255}
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-500 transition-colors">
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={isResettingPassword} className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2 disabled:opacity-60">
                  {isResettingPassword ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting password...</> : 'Reset Password'}
                </button>
              </form>
            )}

            {isComplete && (
              <div className="space-y-6">
                <div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                    <Check className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">Password updated</h3>
                  <p className="text-gray-500 text-sm">Your password has been updated successfully. You can sign in now with the new one.</p>
                </div>

                <button type="button" onClick={() => navigate('/login')} className="btn-primary w-full py-3.5 text-base">
                  Back to Sign In
                </button>
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
