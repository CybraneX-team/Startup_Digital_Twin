import { useState } from 'react';
import { Eye, EyeOff, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import SpaceAuthLayout from '../components/SpaceAuthLayout';

const BYPASS_EMAIL    = 'developer.cybranex@gmail.com';
const BYPASS_PASSWORD = '12345678';

export default function IncubatorAuthPage() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();

  const [email, setEmail]       = useState(BYPASS_EMAIL);
  const [password, setPassword] = useState(BYPASS_PASSWORD);
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) { setError(err); return; }
    // Incubator uses same role='vc' for now to get the bypass nav
    localStorage.setItem('active_role', 'vc');
    navigate('/3d');
  }

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
    <SpaceAuthLayout planetCore="#4c1d95" atmosphereGlow="#a78bfa">

      {/* Brand mark */}
      <div className="flex flex-col items-center gap-3 mb-10">
        <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Building2 size={22} color="#a78bfa" />
        </div>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>FounderOS</span>
      </div>

      {/* Card */}
      <div style={{
        background: 'rgba(10,6,22,0.78)',
        border: '1px solid rgba(167,139,250,0.12)',
        borderRadius: 20,
        padding: '36px 32px 32px',
        backdropFilter: 'blur(32px)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 60px rgba(167,139,250,0.05)',
      }}>
        {/* Label pill */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 99, padding: '4px 12px', marginBottom: 20 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#a78bfa', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#a78bfa', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Incubator Access</span>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 6, letterSpacing: '-0.02em' }}>Sign In</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 28 }}>Access the Work OS Universe as an incubator</p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Email */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Email</label>
            <input type="email" placeholder="Email address" value={email} onChange={e => { setEmail(e.target.value); setError(null); }} required style={inputStyle} />
          </div>

          {/* Password */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Password</label>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', cursor: 'pointer' }}>Forgot Password</span>
            </div>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => { setPassword(e.target.value); setError(null); }} required style={{ ...inputStyle, paddingRight: 54 }} />
              <button type="button" onClick={() => setShowPw(p => !p)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, marginTop: 6,
              background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              color: '#fff', fontSize: 14, fontWeight: 700,
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s',
            }}>
            {loading ? 'Signing in…' : 'Enter as Incubator'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0 18px' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>FounderOS · Incubator</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
          Not an incubator?{' '}
          <span onClick={() => navigate('/auth')} style={{ color: '#a78bfa', cursor: 'pointer', fontWeight: 600 }}>
            Founder Sign In
          </span>
        </p>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.15)', marginTop: 20 }}>
        By continuing you agree to the FounderOS Terms of Service
      </p>
    </SpaceAuthLayout>
  );
}
