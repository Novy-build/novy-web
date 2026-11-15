import { Navigate, Outlet, useLocation } from 'react-router';
import { useSession } from '@main/providers/SessionProvider';

/**
 * Route guard: while the session is being restored it starts the protected
 * route's data load in parallel, redirects anonymous visitors to the login screen
 * remembering the blocked location so they can return after sign-in, and
 * renders the guarded branch otherwise.
 */
export function RequireAuth() {
  const { status } = useSession();
  const location = useLocation();

  if (status === 'loading') {
    // Protected API calls still enforce authentication on the server. Mounting
    // the route now avoids serializing its request behind /auth/session.
    return <Outlet />;
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
