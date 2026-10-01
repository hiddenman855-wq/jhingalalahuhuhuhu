import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  Globe, 
  ShieldAlert,
  Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useToast } from '../../context/ToastContext';

export const AdminLogin: React.FC = () => {
  const { user, loginWithEmail, lockoutSeconds } = useAuth();
  const { navigate } = useNavigation();
  const { showSuccess, showError } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // If already logged in, redirect to /admin
  React.useEffect(() => {
    if (user) {
      navigate('/admin');
    }
  }, [user]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) {
      setErrorMsg(`Access locked due to excessive failed attempts. Please wait ${lockoutSeconds} seconds.`);
      return;
    }

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await loginWithEmail(email.trim(), password);
      showSuccess('Logged in successfully.');
      navigate('/admin');
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/30 mb-3 text-white font-bold text-xl">
            IH
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">IndexHub Admin CMS</h1>
          <p className="text-xs text-slate-400 mt-1">
            Restricted Access • Authenticated Administrative Personnel Only
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-5">
          {/* Security Lockout Banner */}
          {lockoutSeconds > 0 ? (
            <div className="p-3.5 bg-rose-950/60 border border-rose-700/60 rounded-xl text-rose-200 text-xs flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <p className="font-semibold text-rose-100">Brute-Force Shield Active</p>
                <p className="text-[11px] text-rose-300/80 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Locked out for {lockoutSeconds} seconds.
                </p>
              </div>
            </div>
          ) : errorMsg ? (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          ) : null}

          {/* Email / Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  disabled={lockoutSeconds > 0}
                  placeholder="name@domain.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  disabled={lockoutSeconds > 0}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || lockoutSeconds > 0}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-900/30 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : lockoutSeconds > 0 ? `Locked (${lockoutSeconds}s)` : 'Sign in to Admin'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Back to Public Site */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Return to Public Directory</span>
          </button>
        </div>
      </div>
    </div>
  );
};
