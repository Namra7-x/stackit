import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Pencil, Trash2, Search, MessageSquareText, CheckCircle2 } from 'lucide-react';
import api, { apiError } from '../api/client';
import { SiteLayout } from '../components/Layout';
import TagBadge from '../components/TagBadge';
import Pagination from '../components/Pagination';
import { EmptyState, ConfirmDialog } from '../components/States';

export default function MyQuestions() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [box, setBox] = useState('');
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      const { data } = await api.get('/questions', { params: { mine: 'true', search, page, limit: 8 } });
      setItems(data.data.data || []);
      setTotal(data.data.total || 0);
      setTotalPages(data.data.totalPages || 1);
      setState('idle');
    } catch (e) {
      setError(apiError(e, 'Could not load your questions').message);
      setState('error');
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setSearch(box); }, 400);
    return () => clearTimeout(t);
  }, [box]);

  const remove = (q) => setConfirm({
    title: 'Delete this question?',
    body: `"${q.title.slice(0, 80)}" and all its answers will be permanently removed.`,
    action: async () => {
      await api.delete(`/questions/${q.id}`);
      setItems((arr) => arr.filter((x) => x.id !== q.id));
      setTotal((t) => Math.max(0, t - 1));
    }
  });

  return (
    <SiteLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Your space</p>
            <h1 className="font-display text-4xl sm:text-5xl tracking-wide mt-0.5 flex items-center gap-2">
              MY QUESTIONS
              <span className="font-sans text-sm font-normal text-inktertiary">({total})</span>
            </h1>
          </div>
          <Link to="/ask" className="bg-primary hover:bg-primaryhover text-white text-sm font-medium px-4 h-10 inline-flex items-center rounded-md shrink-0">Ask Question</Link>
        </div>

        <div className="relative mt-4 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-inktertiary shrink-0" />
          <input value={box} onChange={(e) => setBox(e.target.value)} placeholder="Search your questions…" aria-label="Search your questions"
            className="w-full h-11 text-base sm:text-sm border border-hairline rounded-md pl-9 pr-3 bg-surface1 placeholder:text-inktertiary text-ink focus:border-secondary/70 focus:outline-none" />
        </div>

        <div className="mt-4 space-y-3">
          {state === 'loading' && (
            <div className="space-y-3" aria-label="Loading">
              {[1, 2].map((i) => <div key={i} className="bg-surface1 border border-hairline rounded-xl p-5 animate-pulse"><div className="h-4 bg-surface2 rounded w-3/4" /></div>)}
            </div>
          )}
          {state === 'error' && (
            <div className="bg-surface1 border border-red-500/30 rounded-xl p-6 text-center">
              <p className="font-semibold text-red-500">Failed to load</p>
              <p className="text-sm text-inkmuted mt-1">{error}</p>
              <button onClick={load} className="mt-3 text-sm font-medium px-4 h-10 rounded-md bg-primary text-white">Retry</button>
            </div>
          )}
          {state === 'idle' && items.length === 0 && (
            <EmptyState
              title={search ? 'NO MATCHES' : 'NOTHING HERE YET'}
              hint={search ? 'Try a different keyword.' : 'Your questions will appear here once you ask.'}
              action={<Link to="/ask" className="inline-flex items-center h-10 text-sm font-medium px-4 rounded-md bg-primary text-white">Ask a question</Link>}
            />
          )}
          {state === 'idle' && items.map((q) => (
            <article key={q.id} className="bg-surface1 border border-hairline rounded-xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/questions/${q.id}`} className="font-semibold text-base leading-6 text-ink hover:text-inklink line-clamp-2 min-w-0">
                  {q.title}
                </Link>
                {q.has_accepted && <span className="shrink-0 text-secondary" title="Has accepted answer"><CheckCircle2 size={18} /></span>}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(q.tags || []).map((t) => <TagBadge key={t.id} name={t.name} size="sm" />)}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-xs text-inktertiary">
                <span className="flex items-center gap-1 tabular-nums"><MessageSquareText size={12} /> {q.answer_count} answer{q.answer_count === 1 ? '' : 's'} · {new Date(q.created_at).toLocaleDateString()}</span>
                <span className="flex gap-2">
                  <Link to={`/ask?edit=${q.id}`} className="inline-flex items-center gap-1 px-2.5 py-2 rounded-md border border-hairline text-inkmuted hover:text-ink font-medium"><Pencil size={12} /> Edit</Link>
                  <button onClick={() => remove(q)} className="inline-flex items-center gap-1 px-2.5 py-2 rounded-md border border-red-500/30 text-red-500 hover:bg-red-500/10 font-medium"><Trash2 size={12} /> Delete</button>
                </span>
              </div>
            </article>
          ))}
        </div>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
      <ConfirmDialog open={!!confirm} title={confirm?.title} body={confirm?.body} busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => { setBusy(true); try { await confirm.action(); setConfirm(null); } catch (e) { alert(apiError(e).message); } finally { setBusy(false); } }} />
    </SiteLayout>
  );
}
