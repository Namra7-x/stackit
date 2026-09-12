import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import api, { apiError } from '../api/client';
import { SiteLayout } from '../components/Layout';
import { EmptyState } from '../components/States';

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const { data } = await api.get('/notifications', { params: { page, limit: 15 } });
      setItems(page === 1 ? data.data.data : (prev) => [...prev, ...data.data.data]);
      setTotalPages(data.data.totalPages);
      setState('idle');
    } catch (e) { setError(apiError(e).message); setState('error'); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const markOne = async (n) => {
    try { await api.patch(`/notifications/${n.id}/read`); setItems((a) => a.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))); } catch {}
  };
  const markAll = async () => {
    try { await api.patch('/notifications/read-all'); setItems((a) => a.map((x) => ({ ...x, is_read: true }))); } catch {}
  };

  return (
    <SiteLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="eyebrow">Inbox</p>
            <h1 className="font-display text-4xl sm:text-5xl tracking-wide mt-0.5 flex items-center gap-2">NOTIFICATIONS</h1>
          </div>
          <button onClick={markAll} className="text-xs font-medium text-inklink hover:underline inline-flex items-center gap-1 py-2"><CheckCheck size={14} /> Mark all read</button>
        </div>
        <div className="mt-4 space-y-2">
          {state === 'loading' && page === 1 && <p className="text-sm text-inkmuted">Loading…</p>}
          {state === 'error' && <div className="bg-surface1 border border-red-500/30 rounded-xl p-6 text-center"><p className="text-sm text-red-500">{error}</p><button onClick={() => setPage(1)} className="mt-2 text-sm font-medium text-inklink">Retry</button></div>}
          {state === 'idle' && items.length === 0 && <EmptyState title="ALL CAUGHT UP" hint="New answers, comments and @mentions will appear here." />}
          {items.map((n) => (
            <Link key={n.id} to={n.related_question_id ? `/questions/${n.related_question_id}` : '#'} onClick={() => markOne(n)}
              className={`block bg-surface1 border rounded-xl px-4 py-3.5 hover:border-hairline-strong min-w-0 ${n.is_read ? 'border-hairline' : 'border-secondary/40 bg-secondary/[0.06]'}`}>
              <p className="text-sm text-ink leading-6">{n.message}</p>
              <p className="text-xs text-inktertiary mt-1">{new Date(n.created_at).toLocaleString()} · {String(n.type).replace(/_/g, ' ')} {n.is_read ? '' : '· unread'}</p>
            </Link>
          ))}
        </div>
        {page < totalPages && <button onClick={() => setPage((p) => p + 1)} className="mt-4 w-full h-11 text-sm font-medium rounded-md border border-hairline text-ink hover:bg-ink/5">Load more</button>}
      </div>
    </SiteLayout>
  );
}
