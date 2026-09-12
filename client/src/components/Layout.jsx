import { Link, useNavigate } from 'react-router-dom';
import { LogOut, ShieldCheck, ArrowLeft, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import ThemeToggle from './ThemeToggle';

/* Public / member chrome: Navbar + sticky footer.
   Root is flex column on dynamic viewport height, main is flex-1,
   so the footer always sits at the bottom even on short pages.
   Admins never see this bar — SiteLayout swaps in ModerationBar. */
export function SiteLayout({ children, onSearch, searchValue }) {
  const { isAdmin } = useAuth();
  return (
    <div className="min-h-dvh flex flex-col">
      {isAdmin
        ? <ModerationBar onSearch={onSearch} searchValue={searchValue} />
        : <Navbar onSearch={onSearch} searchValue={searchValue} />}
      <main className="flex-1 w-full min-w-0">{children}</main>
      {!isAdmin && <Footer />}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-hairline bg-canvas mt-auto [padding-bottom:max(0px,env(safe-area-inset-bottom))]">
      <div className="max-w-6xl mx-auto px-4 py-5 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2 text-xs sm:text-sm text-inkmuted text-center">
        <p className="min-w-0"><b className="text-ink font-display tracking-wider text-sm sm:text-base">STACKIT</b> <span className="text-inktertiary">— minimal Q&A for collaborative learning.</span></p>
        <p className="text-inktertiary shrink-0">Guests browse · Members ask & vote</p>
      </div>
    </footer>
  );
}

/* Moderation browsing bar for admins on user routes.
   Purpose-built: no Ask links, no notification bell, no user menu.
   Search stays because it is a read-only finding aid. */
export function ModerationBar({ onSearch, searchValue }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur border-b border-hairline">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-16 flex items-center gap-1.5 sm:gap-2 min-w-0">
        <button onClick={() => navigate('/admin')} className="flex items-center gap-2 shrink-0" aria-label="Back to moderation console">
          <span className="w-8 h-8 rounded-md bg-primary text-white font-display text-xl flex items-center justify-center pt-0.5">S</span>
          <span className="font-display text-2xl tracking-wider hidden min-[400px]:inline">STACKIT</span>
        </button>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-secondary border border-secondary/40 bg-secondary/10 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
          <ShieldCheck size={12} className="size-3.5 sm:size-3 shrink-0" />
          <span className="hidden min-[420px]:inline">Moderation mode</span>
          <span className="min-[420px]:hidden">Mod</span>
        </span>
        <div className="flex-1 min-w-0" />
        {onSearch && (
          <div className="hidden sm:flex items-center relative w-52 lg:w-64 shrink-0">
            <Search size={16} className="absolute left-3 text-inktertiary shrink-0" />
            <input
              value={searchValue}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search to inspect…"
              aria-label="Search questions"
              className="w-full min-w-0 pl-9 pr-3 h-10 text-base sm:text-sm rounded-md bg-surface1 border border-hairline placeholder:text-inktertiary focus:border-secondary/70 focus:outline-none"
            />
          </div>
        )}
        <button onClick={() => navigate('/admin')} className="text-sm text-inkmuted hover:text-ink px-2 py-2 whitespace-nowrap shrink-0">
          Console
        </button>
        <ThemeToggle className="p-2 shrink-0" />
        <span className="hidden md:block text-sm text-inktertiary truncate max-w-[120px]">{user?.username}</span>
        <button
          onClick={async () => { await logout(); navigate('/'); }}
          className="inline-flex items-center gap-1.5 text-sm text-inkmuted hover:text-ink border border-hairline rounded-md px-2.5 py-2 shrink-0"
          aria-label="Log out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

/* Admin-only chrome per spec §18 (moderation only):
   no Ask Question button, no notification bell, no search, no footer.
   Just brand, console label, back-to-site, identity + logout. */
export function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="bg-canvas border-b border-hairline">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 min-h-16 py-2 flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-2 min-w-0">
          <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="Back to site">
            <span className="w-7 h-7 rounded-md bg-primary text-white font-display text-lg flex items-center justify-center pt-0.5">S</span>
            <span className="font-display text-xl tracking-wider hidden min-[380px]:inline">STACKIT</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-secondary border border-secondary/40 bg-secondary/10 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0">
            <ShieldCheck size={13} className="shrink-0" />
            <span className="hidden min-[420px]:inline">Admin · Moderation</span>
            <span className="min-[420px]:hidden">Admin</span>
          </span>
          <div className="flex-1" />
          <Link to="/" className="hidden sm:inline-flex items-center gap-1 text-sm text-inkmuted hover:text-ink py-2">
            <ArrowLeft size={15} /> Back to site
          </Link>
          <span className="hidden sm:block text-sm text-inktertiary truncate max-w-[120px]">{user?.username}</span>
          <ThemeToggle className="p-2 shrink-0" />
          <button
            onClick={async () => { await logout(); navigate('/'); }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-inkmuted hover:text-ink border border-hairline rounded-md px-3 py-2"
          >
            <LogOut size={15} /> Log out
          </button>
        </div>
      </header>
      <main className="flex-1 w-full min-w-0">{children}</main>
    </div>
  );
}
