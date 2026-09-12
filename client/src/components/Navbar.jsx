import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, X, Search, PlusCircle, LogOut, ShieldCheck, CircleUserRound, LayoutList, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import api from '../api/client';

function timeAgo(iso) {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [state, setState] = useState('idle'); // idle|loading|error
  const ref = useRef(null);

  const load = async () => {
    if (!user) return;
    setState('loading');
    try {
      const [{ data: list }, { data: c }] = await Promise.all([
        api.get('/notifications', { params: { limit: 8 } }),
        api.get('/notifications/unread-count')
      ]);
      setItems(list.data.data || []);
      setCount(c.data.count ?? 0);
      setState('idle');
    } catch {
      setState('error');
    }
  };

  useEffect(() => { load(); }, [user]);
  useEffect(() => {
    if (!open) return;
    load();
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open ]);

  // poll unread count every 30s
  useEffect(() => {
    if (!user) return;
    const t = setInterval(async () => {
      try { const { data } = await api.get('/notifications/unread-count'); setCount(data.data.count); } catch {}
    }, 30000);
    return () => clearInterval(t);
  }, [user]);

  if (!user) return null;

  const markOne = async (n) => {
    try {
      if (!n.is_read) {
        await api.patch(`/notifications/${n.id}/read`);
        setCount((c) => Math.max(0, c - 1));
        setItems((arr) => arr.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      }
      setOpen(false);
    } catch {}
  };
  const markAll = async () => {
    try { await api.patch('/notifications/read-all'); setCount(0); setItems((a) => a.map((x) => ({ ...x, is_read: true }))); } catch {}
  };

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2.5 rounded-md hover:bg-ink/5 text-inkmuted hover:text-ink"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={22} className="sm:size-5" />
        {count > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-secondary text-canvas text-[11px] font-bold flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(92vw,360px)] bg-surface1 border border-hairline rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
            <p className="font-semibold text-sm text-ink">Notifications {count > 0 && <span className="text-inkmuted font-normal">({count} unread)</span>}</p>
            <div className="flex gap-3">
              <Link to="/notifications" onClick={() => setOpen(false)} className="text-xs text-inklink hover:underline py-1">View all</Link>
              {count > 0 && <button onClick={markAll} className="text-xs text-inklink hover:underline py-1">Mark all read</button>}
            </div>
          </div>
          <div className="max-h-[50dvh] sm:max-h-[340px] overflow-y-auto nice-scroll">
            {state === 'loading' && <p className="p-4 text-sm text-inkmuted">Loading…</p>}
            {state === 'error' && (
              <div className="p-4 text-sm">
                <p className="text-inkmuted">Could not load notifications.</p>
                <button onClick={load} className="mt-2 text-inklink text-xs font-semibold hover:underline">Retry</button>
              </div>
            )}
            {state === 'idle' && items.length === 0 && (
              <div className="p-6 text-center">
                <Bell size={28} className="mx-auto text-inktertiary" />
                <p className="mt-2 text-sm font-medium text-ink">No notifications yet</p>
                <p className="text-xs text-inkmuted mt-1">Answers, comments and mentions will show up here.</p>
              </div>
            )}
            {items.map((n) => (
              <Link
                key={n.id}
                to={n.related_question_id ? `/questions/${n.related_question_id}` : '/notifications'}
                onClick={() => markOne(n)}
                className={`block px-4 py-3 border-b border-hairline hover:bg-ink/5 ${n.is_read ? '' : 'bg-secondary/[0.07]'}`}
              >
                <p className="text-sm leading-5 text-ink">{n.message}</p>
                <p className="text-[11px] text-inktertiary mt-1">{timeAgo(n.created_at)} · {n.type.replace(/_/g, ' ')}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar({ onSearch, searchValue }) {
  const { user, logout, isAdmin } = useAuth();
  const [mobile, setMobile] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur border-b border-hairline">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-1.5 sm:gap-2 h-16">
          <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="StackIt home">
            <span className="w-8 h-8 rounded-md bg-primary text-white font-display text-xl flex items-center justify-center pt-0.5 shrink-0">S</span>
            <span className="font-display text-2xl tracking-wider hidden min-[400px]:inline">STACK<span className="text-secondary">IT</span></span>
          </Link>

          {/* desktop nav below lg is hidden — mobile menu takes over */}
          <nav className="hidden lg:flex items-center gap-1 ml-4 text-sm font-medium shrink-0" aria-label="Primary">
            <Link to="/" className="px-3 py-2 rounded-md hover:bg-ink/5 text-ink flex items-center gap-1.5"><LayoutList size={16} className="shrink-0" /> Home</Link>
            <Link to="/ask" className="px-3 py-2 rounded-md hover:bg-ink/5 text-ink flex items-center gap-1.5"><PlusCircle size={16} className="shrink-0" /> Ask Question</Link>
            {user && <Link to="/my-questions" className="px-3 py-2 rounded-md hover:bg-ink/5 text-ink flex items-center gap-1.5"><FileText size={16} className="shrink-0" /> My Questions</Link>}
            {isAdmin && <Link to="/admin" className="px-3 py-2 rounded-md hover:bg-ink/5 text-secondary flex items-center gap-1.5"><ShieldCheck size={16} className="shrink-0" /> Admin</Link>}
          </nav>

          <div className="flex-1" />

          {onSearch && (
            <div className="hidden sm:flex items-center relative w-48 md:w-56 lg:w-72 shrink-0 min-w-0">
              <Search size={16} className="absolute left-3 text-inktertiary shrink-0" />
              <input
                value={searchValue}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search questions…"
                className="w-full min-w-0 pl-9 pr-3 h-10 text-base lg:text-sm border border-hairline rounded-md bg-surface1 placeholder:text-inktertiary text-ink focus:border-secondary/70 focus:outline-none"
                aria-label="Search questions"
              />
            </div>
          )}

          <ThemeToggle className="p-2.5 shrink-0" />

          <NotificationBell />

          {user ? (
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <Link to="/notifications" className="hidden xl:flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-md hover:bg-ink/5 text-ink min-w-0">
                <CircleUserRound size={18} className="text-inkmuted shrink-0" />
                <span className="truncate max-w-[100px]">{user.username}</span>
                {user.role === 'admin' && <span className="text-[10px] font-bold bg-secondary/15 text-secondary px-1.5 py-0.5 rounded shrink-0">ADMIN</span>}
              </Link>
              <button onClick={async () => { await logout(); navigate('/'); }} className="p-2.5 rounded-md hover:bg-ink/5 text-inkmuted hover:text-ink" aria-label="Log out" title="Log out">
                <LogOut size={19} />
              </button>
              <Link to="/ask" className="bg-primary hover:bg-primaryhover text-white text-sm font-medium px-4 h-10 hidden md:inline-flex items-center rounded-md">Ask Question</Link>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <Link to="/login" className="text-sm font-medium px-4 h-10 inline-flex items-center rounded-md border border-hairline text-ink hover:bg-ink/5">Log in</Link>
              <Link to="/register" className="text-sm font-medium px-4 h-10 inline-flex items-center rounded-md bg-primary hover:bg-primaryhover text-white">Sign up</Link>
            </div>
          )}

          <button className="lg:hidden p-2.5 -mr-2 rounded-md hover:bg-ink/5 text-ink shrink-0" onClick={() => setMobile((m) => !m)} aria-label="Menu" aria-expanded={mobile}>
            {mobile ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobile && (
        <div className="lg:hidden border-t border-hairline bg-canvas px-4 py-3 space-y-1 max-h-[70dvh] overflow-y-auto nice-scroll">
          {onSearch && (
            <div className="flex items-center relative sm:hidden pb-2">
              <Search size={16} className="absolute left-3 text-inktertiary shrink-0" />
              <input value={searchValue} onChange={(e) => onSearch(e.target.value)} placeholder="Search questions…" className="w-full min-w-0 pl-9 pr-3 h-11 text-base border border-hairline rounded-md bg-surface1 placeholder:text-inktertiary text-ink" aria-label="Search questions" />
            </div>
          )}
          <Link to="/" onClick={() => setMobile(false)} className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-ink/5 font-medium text-ink"><LayoutList size={20} className="text-inkmuted shrink-0" /> Home</Link>
          <Link to="/ask" onClick={() => setMobile(false)} className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-ink/5 font-medium text-ink"><PlusCircle size={20} className="text-inkmuted shrink-0" /> Ask Question</Link>
          {user && <Link to="/my-questions" onClick={() => setMobile(false)} className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-ink/5 font-medium text-ink"><FileText size={20} className="text-inkmuted shrink-0" /> My Questions</Link>}
          {isAdmin && <Link to="/admin" onClick={() => setMobile(false)} className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-ink/5 font-medium text-secondary"><ShieldCheck size={20} className="shrink-0" /> Admin dashboard</Link>}
          <div className="flex items-center justify-between px-3 py-2 rounded-md">
            <span className="text-sm text-inkmuted">Appearance</span>
            <ThemeToggle className="p-2.5" />
          </div>
          {user ? (
            <>
              <p className="px-3 py-2 text-sm text-inkmuted">Signed in as <b className="text-ink">{user.username}</b></p>
              <button onClick={async () => { await logout(); setMobile(false); navigate('/'); }} className="w-full flex items-center gap-3 text-left px-3 py-3 rounded-md hover:bg-ink/5 font-medium text-ink"><LogOut size={20} className="text-inkmuted shrink-0" /> Log out</button>
            </>
          ) : (
            <div className="flex gap-2 pt-1">
              <Link to="/login" onClick={() => setMobile(false)} className="flex-1 text-center text-sm font-medium px-4 h-11 inline-flex items-center justify-center rounded-md border border-hairline text-ink">Log in</Link>
              <Link to="/register" onClick={() => setMobile(false)} className="flex-1 text-center text-sm font-medium px-4 h-11 inline-flex items-center justify-center rounded-md bg-primary text-white">Sign up</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
