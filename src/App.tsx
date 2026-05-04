import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import AuthGuard from './components/AuthGuard';
import TopBar from './components/TopBar';
import LandingPage from './pages/LandingPage';
import Overview from './pages/Overview';
import Twin from './pages/Twin';
import Universe3D from './pages/Universe3D';
import Strategy from './pages/Strategy';
import DataIngestion from './pages/DataIngestion';
import Benchmarks from './pages/Benchmarks';
import RBAC from './pages/RBAC';
import Analytics from './pages/Analytics';
import SettingsPage from './pages/SettingsPage';
import VCConnect from './pages/VCConnect';
import StartupNetwork from './pages/StartupNetwork';
import AuthPage from './pages/AuthPage';
import Onboarding from './pages/Onboarding';
import JoinWorkspace from './pages/JoinWorkspace';
import PendingApproval from './pages/PendingApproval';
import VCFindStartups from './pages/VCFindStartups';
import VCPortfolio from './pages/VCPortfolio';
import VCManage from './pages/VCManage';

function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#161618' }}>
      <div className="w-8 h-8 rounded-full animate-spin"
        style={{ border: '2px solid #C1AEFF', borderTopColor: 'transparent' }} />
    </div>
  );
}

function VCGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user || localStorage.getItem('active_role') !== 'vc') {
    return <Navigate to="/overview" replace />;
  }
  return <>{children}</>;
}

function AuthPageRoute() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/overview';

  if (loading) return <FullPageLoader />;
  if (user && profile?.onboarding_completed && profile?.company_id) return <Navigate to={from} replace />;
  if (user && profile?.onboarding_completed && !profile?.company_id) return <Navigate to="/pending" replace />;
  if (user && !profile?.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return <AuthPage />;
}

function RootRoute() {
  const { user, profile, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  // Fully onboarded users with a company go straight to the dashboard
  if (user && profile?.onboarding_completed && profile?.company_id) return <Navigate to="/overview" replace />;
  // Join-request users waiting for approval
  if (user && profile?.onboarding_completed && !profile?.company_id) return <Navigate to="/pending" replace />;
  // Everyone else (unauthenticated OR authenticated but not yet onboarded) sees the landing page.
  // The landing page's CTA buttons guide them to /auth → /onboarding.
  return <LandingPage />;
}

function AppRoutes() {
  const location = useLocation();
  const { user, profile } = useAuth();

  // Auth + onboarding pages are full-screen without TopBar
  if (location.pathname === '/auth') {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPageRoute />} />
      </Routes>
    );
  }

  if (location.pathname === '/onboarding') {
    return (
      <Routes>
        <Route
          path="/onboarding"
          element={
            <AuthGuard>
              <Onboarding />
            </AuthGuard>
          }
        />
      </Routes>
    );
  }

  // /join — invite link landing page (no TopBar, no layout)
  if (location.pathname === '/join') {
    return (
      <Routes>
        <Route path="/join" element={<JoinWorkspace />} />
      </Routes>
    );
  }

  // /pending — waiting for workspace approval (no TopBar)
  if (location.pathname === '/pending') {
    return (
      <Routes>
        <Route path="/pending" element={<PendingApproval />} />
      </Routes>
    );
  }

  const isTwinGraph = location.pathname === '/twin';
  const is3DUniverse = location.pathname === '/3d';
  // Bypass users (VC / Incubator) are authed but have no company — still let them see /3d
  const isBypassUser = !!user && localStorage.getItem('active_role') === 'vc';
  // Universe3D stays mounted for fully-authed users so camera/galaxy state persists across navigation
  const isFullyAuthed = (!!user && !!profile?.onboarding_completed && !!profile?.company_id) || isBypassUser;

  return (
    <>
      {/* Persistent 3D universe — always mounted for authed users, shown/hidden via CSS.
          Uses visibility instead of display so the canvas has correct viewport dimensions
          from the start (display:none causes 0×0 init, breaking ResizeObserver). */}
      {isFullyAuthed && (
        <div
          className="fixed inset-0 z-40"
          style={{
            visibility: is3DUniverse ? 'visible' : 'hidden',
            pointerEvents: is3DUniverse ? 'auto' : 'none',
          }}
        >
          <TopBar />
          <Universe3D />
        </div>
      )}

      {/* Normal app shell — removed from layout entirely when on /3d */}
      <div style={{ display: (isFullyAuthed && is3DUniverse) ? 'none' : 'block' }}>
        <div className="min-h-screen cosmos-bg">
          <TopBar />
          {isTwinGraph ? (
            <Routes>
              <Route
                path="/twin"
                element={
                  <AuthGuard>
                    <Twin />
                  </AuthGuard>
                }
              />
            </Routes>
          ) : (
            <main className="pt-14 px-8 pb-8 overflow-y-auto">
              <Routes>
                {/* Root: redirect authenticated+onboarded users to dashboard */}
                <Route path="/" element={<RootRoute />} />

                {/* Authenticated app routes */}
                <Route path="/overview" element={
                  <AuthGuard requireOnboarding>
                    <Overview />
                  </AuthGuard>
                } />
                <Route path="/twin/strategy" element={
                  <AuthGuard requireOnboarding requiredModule="strategy">
                    <Strategy />
                  </AuthGuard>
                } />
                <Route path="/twin/data" element={
                  <AuthGuard requireOnboarding requiredModule="data">
                    <DataIngestion />
                  </AuthGuard>
                } />
                <Route path="/twin/benchmarks" element={
                  <AuthGuard requireOnboarding requiredModule="benchmarks">
                    <Benchmarks />
                  </AuthGuard>
                } />
                <Route path="/twin/team" element={
                  <AuthGuard requireOnboarding requiredModule="team">
                    <RBAC />
                  </AuthGuard>
                } />
                <Route path="/twin/analytics" element={
                  <AuthGuard requireOnboarding requiredModule="analytics">
                    <Analytics />
                  </AuthGuard>
                } />

                {/* Ecosystem (accessed through Twin) */}
                <Route path="/ecosystem/vc-connect" element={
                  <AuthGuard requireOnboarding requiredModule="ecosystem">
                    <VCConnect />
                  </AuthGuard>
                } />
                <Route path="/ecosystem/network" element={
                  <AuthGuard requireOnboarding requiredModule="ecosystem">
                    <StartupNetwork />
                  </AuthGuard>
                } />

                {/* Settings */}
                <Route path="/settings" element={
                  <AuthGuard requiredModule="settings">
                    <SettingsPage />
                  </AuthGuard>
                } />

                {/* VC pages */}
                <Route path="/vc/find" element={
                  <VCGuard>
                    <VCFindStartups />
                  </VCGuard>
                } />
                <Route path="/vc/portfolio" element={
                  <VCGuard>
                    <VCPortfolio />
                  </VCGuard>
                } />
                <Route path="/vc/manage" element={
                  <VCGuard>
                    <VCManage />
                  </VCGuard>
                } />

                {/* /3d — redirect unauthenticated users to /auth via AuthGuard */}
                <Route path="/3d" element={<AuthGuard><></></AuthGuard>} />
              </Routes>
            </main>
          )}
        </div>
      </div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
