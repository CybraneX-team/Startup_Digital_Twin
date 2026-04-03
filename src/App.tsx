import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
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

function AppRoutes() {
  const location = useLocation();
  const isTwinGraph = location.pathname === '/twin';

  return (
    <div className="min-h-screen cosmos-bg">
      <TopBar />
      {isTwinGraph ? (
        <Routes>
          <Route path="/twin" element={<Twin />} />
        </Routes>
      ) : (
        <main className="pt-14 px-8 pb-8 overflow-y-auto">
          <Routes>
            {/* Home / Landing */}
            <Route path="/" element={<LandingPage />} />

            {/* Dashboard (old Overview) */}
            <Route path="/overview" element={<Overview />} />

            {/* Twin sub-pages */}
            <Route path="/twin/strategy" element={<Strategy />} />
            <Route path="/twin/data" element={<DataIngestion />} />
            <Route path="/twin/benchmarks" element={<Benchmarks />} />
            <Route path="/twin/team" element={<RBAC />} />
            <Route path="/twin/analytics" element={<Analytics />} />

            {/* Ecosystem (accessed through Twin, not top nav) */}
            <Route path="/ecosystem/vc-connect" element={<VCConnect />} />
            <Route path="/ecosystem/network" element={<StartupNetwork />} />

            {/* Settings */}
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
