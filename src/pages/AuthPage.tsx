import { useState } from 'react';
import { Hexagon } from 'lucide-react';
import { useAuth } from '../lib/auth';

type AuthMode = 'signin' | 'signup';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'signin') {
        const { error: err } = await signIn(form.email, form.password);
        if (err) { setError(err); return; }
        // Ensure normal sign-in doesn't inherit VC views
        localStorage.removeItem('active_role');
        // Don't navigate here — AuthPageRoute watches auth state and redirects
        // once onAuthStateChange has finished loading the profile. Navigating
        // early causes AuthGuard to see user=null and redirect back to /auth,
        // re-mounting the form and making sign-in appear to silently fail.
      } else {
        if (!form.first_name.trim()) { setError('First name is required'); return; }
        const { error: err, needsEmailConfirm } = await signUp(form.email, form.password, {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
        });
        if (err) { setError(err); return; }
        localStorage.removeItem('active_role');
        if (needsEmailConfirm) {
          // Email confirmation required — prompt user then switch to sign-in
          setSuccess('Account created! Check your email to confirm, then sign back in.');
          setMode('signin');
        }
        // If no needsEmailConfirm, the user is already signed in → onAuthStateChange
        // fires automatically and AuthPageRoute redirects to /onboarding
      }
    } catch (err) {
      console.error('[auth] submit failed', err);
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center cosmos-bg"
      style={{ background: '#161618' }}
    >
      <div className="w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #F9C6FF, #C1AEFF)' }}>
            <Hexagon size={24} color="#161618" fill="#161618" strokeWidth={1.5} />
          </div>
          <span className="text-white text-2xl font-semibold tracking-tight">FounderOS</span>
          <span style={{ color: '#5E5E5E' }} className="text-sm">
            {mode === 'signin' ? 'Sign in to your workspace' : 'Create your founder account'}
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ background: '#1B1B1D' }}>
          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden mb-8" style={{ background: '#161618' }}>
            {(['signin', 'signup'] as AuthMode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                className="flex-1 py-2.5 text-sm font-medium transition-all"
                style={{
                  background: mode === m ? 'linear-gradient(135deg, #F9C6FF, #C1AEFF)' : 'transparent',
                  color: mode === m ? '#161618' : '#5E5E5E',
                  borderRadius: '0.75rem',
                }}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'signup' && (
              <div className="flex gap-3">
                <input
                  type="text"
                  name="first_name"
                  placeholder="First name"
                  value={form.first_name}
                  onChange={handleChange}
                  required
                  className="flex-1 rounded-xl px-4 py-3 text-sm text-white outline-none"
                  style={{ background: '#161618', color: '#fff' }}
                />
                <input
                  type="text"
                  name="last_name"
                  placeholder="Last name"
                  value={form.last_name}
                  onChange={handleChange}
                  className="flex-1 rounded-xl px-4 py-3 text-sm text-white outline-none"
                  style={{ background: '#161618', color: '#fff' }}
                />
              </div>
            )}

            <input
              type="email"
              name="email"
              placeholder="Email address"
              value={form.email}
              onChange={handleChange}
              required
              className="rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: '#161618', color: '#fff' }}
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
              className="rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: '#161618', color: '#fff' }}
            />

            {error && (
              <p className="text-sm rounded-xl px-4 py-3"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>
                {error}
              </p>
            )}

            {success && (
              <p className="text-sm rounded-xl px-4 py-3"
                style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity"
              style={{
                background: 'linear-gradient(135deg, #F9C6FF, #C1AEFF)',
                color: '#161618',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#5E5E5E' }}>
          By continuing you agree to the FounderOS Terms of Service.
        </p>
      </div>
    </div>
  );
}
