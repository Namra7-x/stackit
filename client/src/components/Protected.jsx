import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Protected({ children, admin = false, userOnly = false }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="min-h-dvh bg-canvas max-w-6xl mx-auto px-4 py-16 text-center text-inkmuted">Loading…</div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  // Admin console: only admins. Participation pages: everyone except admins.
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  if (userOnly && user.role === 'admin') return <Navigate to="/admin" replace />;
  return children;
}

export function AuthModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Login required">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-surface1 border border-hairline rounded-xl max-w-sm w-full p-6 max-h-[90dvh] overflow-y-auto">
        <h2 className="font-bold text-lg text-ink">Log in to continue</h2>
        <p className="text-sm text-inkmuted mt-1">Voting, answering and asking require an account. It takes 30 seconds.</p>
        <div className="flex gap-2 mt-5">
          <a href="/login" className="flex-1 text-center text-sm font-medium px-4 h-11 inline-flex items-center justify-center rounded-md bg-primary text-white">Log in</a>
          <a href="/register" className="flex-1 text-center text-sm font-medium px-4 h-11 inline-flex items-center justify-center rounded-md border border-hairline text-ink">Sign up</a>
        </div>
        <button onClick={onClose} className="mt-3 w-full text-xs text-inktertiary hover:underline py-1">Continue browsing</button>
      </div>
    </div>
  );
}
