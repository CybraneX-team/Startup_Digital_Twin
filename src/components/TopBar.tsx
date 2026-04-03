import { useLocation, useNavigate } from 'react-router-dom';
import { Hexagon, Settings } from 'lucide-react';

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isTwin = location.pathname.startsWith('/twin');
  const isTwinGraph = location.pathname === '/twin';
  const isOverview = location.pathname.startsWith('/overview');

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
        onClick={() => navigate('/')}
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

      {/* Center nav */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div
          className="flex rounded-full p-0.5 shrink-0"
          style={{ background: '#1B1B1D' }}
        >
          {([
            { path: '/', label: 'Home', active: location.pathname === '/' },
            { path: '/twin', label: 'Twin', active: isTwin },
            { path: '/overview', label: 'Dashboard', active: isOverview },
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
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 shrink-0">
        {isTwin && location.pathname !== '/twin' && (
          <button
            onClick={() => navigate('/twin')}
            className="text-[10px] px-2 py-1 rounded transition-all"
            style={{ color: '#C1AEFF', background: 'rgba(193,174,255,0.08)' }}
          >
            ← Back to Graph
          </button>
        )}
        <button
          onClick={() => navigate('/settings')}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
          style={{ color: '#5E5E5E' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#5E5E5E')}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
