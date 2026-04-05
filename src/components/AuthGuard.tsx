import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  /** If true, redirect to onboarding when company is not set up */
  requireOnboarding?: boolean;
}

/**
 * Protects routes that require authentication.
 * - Not authenticated  → /auth (with `from` state to redirect back)
 * - Authenticated but no company + requireOnboarding=true → /onboarding
 * - Otherwise → renders children
 */
export default function AuthGuard({ children, requireOnboarding = false }: AuthGuardProps) {
  const { user, loading, hasCompany, onboardingCompleted } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#161618' }}>
        <div className="w-8 h-8 rounded-full animate-spin"
          style={{ border: '2px solid #C1AEFF', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (requireOnboarding && (!hasCompany || !onboardingCompleted)) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
