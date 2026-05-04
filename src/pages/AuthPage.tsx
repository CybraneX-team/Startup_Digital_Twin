import { useState } from 'react';
import { Hexagon, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import SpaceAuthLayout from '../components/SpaceAuthLayout';

type Mode = 'signin' | 'signup';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('signin');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '' });

  function set(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError(null);
  }

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setSuccess(null);
    setForm({ email: '', password: '', first_name: '', last_name: '' });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'signin') {
        const { error: err } = await signIn(form.email, form.password);
        if (err) { setError(err); return; }
        localStorage.removeItem('active_role');
      } else {
        if (!form.first_name.trim()) { setError('First name is required'); return; }
        const { error: err, needsEmailConfirm } = await signUp(form.email, form.password, {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
        });
        if (err) { setError(err); return; }
        localStorage.removeItem('active_role');
        if (needsEmailConfirm) {
          setSuccess('Account created! Check your email to confirm, then sign in.');
          switchMode('signin');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  /* ── Input style ── */
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 12,
    padding: '13px 16px',
    fontSize: 14,
    color: '#fff',
    outline: 'none',
  };

  return (
    <SpaceAuthLayout planetCore="#5b21b6" atmosphereGlow="#ec4899">

      {/* Brand */}
      <div className="flex flex-col items-center gap-3 mb-10">
        <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg, #F9C6FF, #C1AEFF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Hexagon size={22} color="#161618" fill="#161618" strokeWidth={1.5} />
        </div>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>FounderOS</span>
      </div>

      {/* Card */}
      <div style={{
        background: 'rgba(10,8,20,0.72)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: '36px 32px 32px',
        backdropFilter: 'blur(32px)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        {/* Heading */}
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 6, letterSpacing: '-0.02em' }}>
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 28 }}>
          {mode === 'signin' ? 'Welcome back to your workspace' : 'Start your founder journey today'}
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Name fields (sign-up only) */}
          {mode === 'signup' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <input name="first_name" type="text" placeholder="First name" value={form.first_name} onChange={set} required style={{ ...inputStyle, flex: 1 }} />
              <input name="last_name" type="text" placeholder="Last name" value={form.last_name} onChange={set} style={{ ...inputStyle, flex: 1 }} />
            </div>
          )}

          {/* Email */}
          <input name="email" type="email" placeholder="Email address" value={form.email} onChange={set} required style={inputStyle} />

          {/* Password */}
          <div style={{ position: 'relative' }}>
            <input
              name="password" type={showPw ? 'text' : 'password'}
              placeholder="Password" value={form.password} onChange={set}
              required minLength={6}
              style={{ ...inputStyle, paddingRight: 54 }}
            />
            <button type="button" onClick={() => setShowPw(p => !p)}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Forgot password */}
          {mode === 'signin' && (
            <div style={{ textAlign: 'right', marginTop: -4 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
                Forgot Password
              </span>
            </div>
          )}

          {/* Error / success */}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#34d399' }}>
              {success}
            </div>
          )}

          {/* CTA */}
          <button type="submit" disabled={loading}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, marginTop: 4,
              background: 'linear-gradient(135deg, #C1AEFF, #9b7fee)',
              color: '#0d0b1a', fontSize: 14, fontWeight: 700,
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s',
              letterSpacing: '0.01em',
            }}>
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
        </div>

        {/* Switch mode */}
        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
          {mode === 'signin' ? (
            <>New to FounderOS?{' '}
              <span onClick={() => switchMode('signup')} style={{ color: '#C1AEFF', cursor: 'pointer', fontWeight: 600 }}>Join Now</span>
            </>
          ) : (
            <>Already have an account?{' '}
              <span onClick={() => switchMode('signin')} style={{ color: '#C1AEFF', cursor: 'pointer', fontWeight: 600 }}>Sign In</span>
            </>
          )}
        </p>
      </div>

      {/* Other sign-in options */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 24 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}
          onClick={() => navigate('/auth/vc')}
          onMouseEnter={e => (e.currentTarget.style.color = '#22d3ee')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}>
          VC Sign In →
        </span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}
          onClick={() => navigate('/auth/incubator')}
          onMouseEnter={e => (e.currentTarget.style.color = '#a78bfa')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}>
          Incubator Sign In →
        </span>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.15)', marginTop: 20 }}>
        By continuing you agree to the FounderOS Terms of Service
      </p>
    </SpaceAuthLayout>
  );
}
