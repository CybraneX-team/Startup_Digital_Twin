import { useLocation, useNavigate } from 'react-router-dom';
import { Hexagon, Settings, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();

  const isTwin = location.pathname.startsWith('/twin');
  const isTwinGraph = location.pathname === '/twin';
  const isOverview = location.pathname.startsWith('/overview');

  const isAuthed = !!user;
  const hasCompany = !!profile?.company_id;

  const initials = profile?.first_name
    ? `${profile.first_name[0]}${profile.last_name?.[0] ?? ''}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-6 gap-4"
      style={{
        background: isTwinGraph
          ? 'linear-gradient(180deg, rgba(22,22,24,0.9) 0%, rgba(22,22,24,0) 100%)'
          : '#161618',
        borderBottom: isTwinGraph ? 'none' : '1px solid #222224',
      }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-2.5 shrink-0 cursor-pointer"
        onClick={() => navigate(isAuthed && hasCompany ? '/overview' : '/')}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #F9C6FF, #C1AEFF)' }}
        >
          <Hexagon className="w-4 h-4" style={{ color: '#161618' }} strokeWidth={2.5} />
        </div>
        <span className="text-sm font-semibold text-white tracking-wide">FounderOS</span>
        <span className="text-[9px]" style={{ color: '#5E5E5E' }}>beta</span>
      </div>

      {/* Center nav — only show app tabs when authenticated */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {isAuthed && !loading && (
          <div
            className="flex rounded-full p-0.5 shrink-0"
            style={{ background: '#1B1B1D' }}
          >
            {([
              { path: '/overview', label: 'Home',      active: isOverview },
              { path: '/twin',     label: 'Twin',      active: isTwin },
              { path: '/settings', label: 'Settings',  active: location.pathname === '/settings' },
            ] as const).map(({ path, label, active }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex items-center gap-1.5 px-5 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                style={{
                  background: active ? 'linear-gradient(135deg, #F9C6FF, #C1AEFF)' : 'transparent',
                  color: active ? '#161618' : '#5E5E5E',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Back to graph button (Twin sub-pages) */}
        {isTwin && location.pathname !== '/twin' && (
          <button
            onClick={() => navigate('/twin')}
            className="text-[10px] px-2 py-1 rounded transition-all"
            style={{ color: '#C1AEFF', background: 'rgba(193,174,255,0.08)' }}
          >
            ← Graph
          </button>
        )}

        {isAuthed && !loading ? (
          <>
            {/* Company badge */}
            {hasCompany && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                style={{ background: 'rgba(193,174,255,0.08)', color: '#C1AEFF' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {profile?.first_name
                  ? `${profile.first_name}'s workspace`
                  : 'My workspace'}
              </div>
            )}

            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold cursor-pointer shrink-0"
              style={{ background: 'linear-gradient(135deg, #F9C6FF, #C1AEFF)', color: '#161618' }}
              title={user?.email}
            >
              {initials}
            </div>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ color: '#5E5E5E' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={e => (e.currentTarget.style.color = '#5E5E5E')}
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          !loading && (
            <button
              onClick={() => navigate('/auth')}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{ background: 'linear-gradient(135deg, #F9C6FF, #C1AEFF)', color: '#161618' }}
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
          )
        )}
      </div>
    </header>
  );
}
