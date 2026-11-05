import { Navigate, Outlet, useLocation } from 'react-router';
import { useSession } from '@main/providers/SessionProvider';
import { LoadingScreen } from '@presentation/components/system/LoadingScreen';

/**
 * Route guard: while the session is being restored it shows a loading screen
 * (no flash-of-login), redirects anonymous visitors to the login screen
 * remembering the blocked location so they can return after sign-in, and
 * renders the guarded branch otherwise.
 */
export function RequireAuth() {
  const { status } = useSession();
  const location = useLocation();

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
