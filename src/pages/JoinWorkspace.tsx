import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Hexagon, CheckCircle, XCircle, Loader, ShieldCheck, Clock } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { lookupInviteToken, acceptInviteToken } from '../lib/db/team';
import type { UserRole } from '../lib/supabase';

const ROLE_LABELS: Record<string, string> = {
  co_founder: 'Co-Founder', admin: 'Admin', analyst: 'Analyst',
  engineer: 'Engineer', viewer: 'Viewer', investor: 'Investor',
  founder: 'Founder', super_admin: 'Super Admin',
};

type PageState = 'loading' | 'valid' | 'invalid' | 'accepting' | 'success' | 'error' | 'need_auth';

export default function JoinWorkspace() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshProfile } = useAuth();

  const token = params.get('token') ?? '';

  const [state, setState] = useState<PageState>('loading');
  const [inviteInfo, setInviteInfo] = useState<{
    companyName: string;
    role: UserRole;
    expiresAt: string;
    valid: boolean;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  /* ── Lookup invite on mount ── */
  useEffect(() => {
    if (!token) { setState('invalid'); return; }

    lookupInviteToken(token).then(info => {
      if (!info || !info.valid) {
        setState('invalid');
        return;
      }
      setInviteInfo(info);
      setState(authLoading ? 'loading' : user ? 'valid' : 'need_auth');
    });
  }, [token]);

  /* ── Once auth resolves, update state ── */
  useEffect(() => {
    if (authLoading) return;
    if (state === 'loading' && inviteInfo) {
      setState(user ? 'valid' : 'need_auth');
    }
    if (state === 'need_auth' && user && inviteInfo) {
      setState('valid');
    }
  }, [authLoading, user]);

  async function handleAccept() {
    if (!user || !inviteInfo) return;
    setState('accepting');

    const result = await acceptInviteToken(token, user.id);
    if (!result.success) {
      setErrorMsg(result.error ?? 'Something went wrong. Please try again.');
      setState('error');
      return;
    }

    await refreshProfile();
    setState('success');
    setTimeout(() => navigate('/overview', { replace: true }), 2000);
  }

  function handleSignIn() {
    navigate(`/auth?redirect=/join?token=${token}`);
  }

  /* ── Shared card wrapper ── */
  function Card({ children }: { children: React.ReactNode }) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#161618' }}>
        <div className="w-full max-w-md px-6">
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F9C6FF, #C1AEFF)' }}>
              <Hexagon size={24} color="#161618" fill="#161618" strokeWidth={1.5} />
            </div>
            <span className="text-white text-2xl font-semibold tracking-tight">FounderOS</span>
          </div>
          <div className="rounded-2xl p-8 text-center" style={{ background: '#1B1B1D' }}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <Card>
        <Loader className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Checking invite link...</p>
      </Card>
    );
  }

  if (state === 'invalid') {
    return (
      <Card>
        <XCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
        <h2 className="text-white text-lg font-semibold mb-2">Link Expired or Invalid</h2>
        <p className="text-gray-500 text-sm mb-6">
          This invite link is no longer valid. It may have expired or already been used.
          Ask the workspace admin to send you a new one.
        </p>
        <button
          onClick={() => navigate('/auth')}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #C1AEFF, #F9C6FF)' }}
        >
          Go to Sign In
        </button>
      </Card>
    );
  }

  if (state === 'need_auth') {
    return (
      <Card>
        <ShieldCheck className="w-10 h-10 text-violet-400 mx-auto mb-4" />
        <h2 className="text-white text-lg font-semibold mb-1">You're Invited</h2>
        {inviteInfo && (
          <div className="mb-5">
            <p className="text-gray-400 text-sm">to join</p>
            <p className="text-white text-xl font-bold mt-1">{inviteInfo.companyName}</p>
            <p className="text-sm mt-1" style={{ color: '#C1AEFF' }}>
              as {ROLE_LABELS[inviteInfo.role] ?? inviteInfo.role}
            </p>
          </div>
        )}
        <p className="text-gray-500 text-xs mb-6 flex items-center justify-center gap-1.5">
          <Clock className="w-3 h-3" />
          Sign in or create an account to accept this invite
        </p>
        <button
          onClick={handleSignIn}
          className="w-full py-3 rounded-xl text-sm font-semibold text-gray-900 transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #F9C6FF, #C1AEFF)' }}
        >
          Sign In to Accept
        </button>
        <p className="text-[11px] text-gray-600 mt-4">
          Don't have an account?{' '}
          <button onClick={handleSignIn} className="text-violet-400 hover:text-violet-300 underline">
            Create one
          </button>
          {' '}and come back to this link.
        </p>
      </Card>
    );
  }

  if (state === 'valid' && inviteInfo) {
    const expiresIn = Math.ceil((new Date(inviteInfo.expiresAt).getTime() - Date.now()) / 86400000);
    return (
      <Card>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-violet-500/15">
          <ShieldCheck className="w-7 h-7 text-violet-400" />
        </div>
        <h2 className="text-white text-xl font-semibold mb-1">You're Invited</h2>
        <p className="text-gray-500 text-sm mb-5">You've been invited to join a workspace on FounderOS</p>

        <div className="rounded-xl p-4 mb-5 text-left" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="mb-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Workspace</p>
            <p className="text-white font-bold text-lg">{inviteInfo.companyName}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Your Role</p>
            <span className="text-sm px-2.5 py-1 rounded-lg font-medium" style={{ background: 'rgba(193,174,255,0.15)', color: '#C1AEFF' }}>
              {ROLE_LABELS[inviteInfo.role] ?? inviteInfo.role}
            </span>
          </div>
          <p className="text-[10px] text-gray-600 mt-3 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Invite expires in {expiresIn} day{expiresIn !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          onClick={handleAccept}
          className="w-full py-3 rounded-xl text-sm font-semibold text-gray-900 transition-all hover:opacity-90 mb-3"
          style={{ background: 'linear-gradient(135deg, #F9C6FF, #C1AEFF)' }}
        >
          Accept & Join Workspace
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Decline
        </button>
      </Card>
    );
  }

  if (state === 'accepting') {
    return (
      <Card>
        <Loader className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-4" />
        <p className="text-white font-medium mb-1">Joining workspace...</p>
        <p className="text-gray-500 text-sm">Setting up your access</p>
      </Card>
    );
  }

  if (state === 'success') {
    return (
      <Card>
        <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
        <h2 className="text-white text-lg font-semibold mb-2">You're In!</h2>
        <p className="text-gray-400 text-sm">
          Welcome to {inviteInfo?.companyName}. Taking you to the dashboard...
        </p>
      </Card>
    );
  }

  if (state === 'error') {
    return (
      <Card>
        <XCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
        <h2 className="text-white text-lg font-semibold mb-2">Couldn't Join</h2>
        <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
        <button
          onClick={() => navigate('/overview')}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 transition-all"
        >
          Go to Dashboard
        </button>
      </Card>
    );
  }

  return null;
}
