import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import AuthGuard from './components/AuthGuard';
import TopBar from './components/TopBar';
import LandingPage from './pages/LandingPage';
import Overview from './pages/Overview';
import Twin from './pages/Twin';
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

function AuthPageRoute() {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (user && profile?.onboarding_completed && profile?.company_id) return <Navigate to="/overview" replace />;
  if (user && profile?.onboarding_completed && !profile?.company_id) return <Navigate to="/pending" replace />;
  if (user && !profile?.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return <AuthPage />;
}

function RootRoute() {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
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

  return (
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
              <AuthGuard requireOnboarding>
                <Strategy />
              </AuthGuard>
            } />
            <Route path="/twin/data" element={
              <AuthGuard requireOnboarding>
                <DataIngestion />
              </AuthGuard>
            } />
            <Route path="/twin/benchmarks" element={
              <AuthGuard requireOnboarding>
                <Benchmarks />
              </AuthGuard>
            } />
            <Route path="/twin/team" element={
              <AuthGuard requireOnboarding>
                <RBAC />
              </AuthGuard>
            } />
            <Route path="/twin/analytics" element={
              <AuthGuard requireOnboarding>
                <Analytics />
              </AuthGuard>
            } />

            {/* Ecosystem (accessed through Twin) */}
            <Route path="/ecosystem/vc-connect" element={
              <AuthGuard requireOnboarding>
                <VCConnect />
              </AuthGuard>
            } />
            <Route path="/ecosystem/network" element={
              <AuthGuard requireOnboarding>
                <StartupNetwork />
              </AuthGuard>
            } />

            {/* Settings */}
            <Route path="/settings" element={
              <AuthGuard>
                <SettingsPage />
              </AuthGuard>
            } />
          </Routes>
        </main>
      )}
    </div>
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
