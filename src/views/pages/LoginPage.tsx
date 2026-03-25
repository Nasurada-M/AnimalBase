import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PawPrint, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AppContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const role = await login(email, password);
    if (role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    } else if (role === 'user') {
      navigate('/dashboard/home', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-primary-50 flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-32 right-16 w-64 h-64 bg-primary-900/30 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </button>
        </div>
        <div className="relative z-10">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
            <PawPrint className="w-7 h-7 text-white" />
          </div>
          <h2 className="font-display text-4xl font-bold text-white mb-4 leading-tight">
            Welcome back to
            <br />
            AnimalBase
          </h2>
          <p className="text-primary-200 text-lg">Your journey to giving a pet a loving home continues here.</p>
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-3">
          {[
            'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=200&q=80',
            'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=200&q=80',
            'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&q=80',
          ].map((url, i) => (
            <img key={i} src={url} alt="pet" className="rounded-xl h-24 w-full object-cover opacity-80" />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <button onClick={() => navigate('/')} className="text-primary-600 hover:text-primary-800 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center">
                <PawPrint className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-primary-800 text-lg">AnimalBase</span>
            </div>
          </div>

          <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">Sign in</h1>
          <p className="text-gray-500 mb-8">Enter your credentials to access your account.</p>

          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex justify-between">
              {error}
              <button onClick={clearError} className="text-red-400 hover:text-red-600 ml-4">x</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <input type="email" className="input-field" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required maxLength={255} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">Password</label>
                <Link to="/forgot-password" className="text-sm font-semibold text-primary-600 hover:text-primary-800 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className="input-field pr-11" placeholder="********" value={password} onChange={e => setPassword(e.target.value)} required maxLength={255} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-500 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-gray-500 text-sm">Don't have an account? </span>
            <Link to="/signup" className="text-primary-600 font-semibold text-sm hover:text-primary-800 transition-colors">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
