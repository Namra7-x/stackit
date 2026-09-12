import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { SiteLayout } from '../components/Layout';
import QuestionCard from '../components/QuestionCard';
import Pagination from '../components/Pagination';
import TagBadge from '../components/TagBadge';
import { SkeletonList, EmptyState, ConfirmDialog } from '../components/States';

const FILTERS = [
  { key: 'newest', label: 'Newest' },
  { key: 'popular', label: 'Popular' },
  { key: 'unanswered', label: 'Unanswered' }
];

export default function Home() {
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [tags, setTags] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const search = params.get('search') || '';
  const sort = params.get('sort') || 'newest';
  const tag = params.get('tag') || '';
  const page = Number(params.get('page') || 1);

  const set = (obj) => {
    const next = new URLSearchParams(params);
    if (obj.search !== undefined) { obj.search ? next.set('search', obj.search) : next.delete('search'); }
    if (obj.sort !== undefined) { obj.sort && obj.sort !== 'newest' ? next.set('sort', obj.sort) : next.delete('sort'); }
    if (obj.tag !== undefined) { obj.tag ? next.set('tag', obj.tag) : next.delete('tag'); }
    if (obj.page !== undefined) { next.set('page', String(obj.page)); }
    else if (obj.search !== undefined || obj.sort !== undefined || obj.tag !== undefined) next.delete('page');
    setParams(next);
  };

  const load = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      const { data } = await api.get('/questions', { params: { search, sort, tag, page, limit: 8 } });
      setItems(data.data.data);
      setTotal(data.data.total);
      setTotalPages(data.data.totalPages);
      setState('idle');
    } catch (e) {
      setState('error');
      setError(apiError(e, 'Could not load questions').message);
    }
  }, [search, sort, tag, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/tags').then(({ data }) => setTags(data.data.tags || [])).catch(() => {});
  }, []);

  // debounce search input handled by Navbar direct set (simple)
  const [box, setBox] = useState(search);
  useEffect(() => setBox(search), [search]);
  useEffect(() => {
    const t = setTimeout(() => { if (box !== search) set({ search: box }); }, 400);
    return () => clearTimeout(t);
  }, [box]);

  const removeQuestion = (q) => setConfirm({
    title: 'Remove this question?',
    body: `"${q.title.slice(0, 80)}" and all its answers will be permanently removed.`,
    action: async () => {
      await api.delete(`/admin/questions/${q.id}`);
      setItems((arr) => arr.filter((x) => x.id !== q.id));
      setTotal((t) => Math.max(0, t - 1));
    }
  });

  return (
    <SiteLayout onSearch={setBox} searchValue={box}>
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_260px] gap-6">
          <section className="min-w-0">
            <p className="eyebrow">Community</p>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
              <h1 className="font-display text-4xl sm:text-5xl tracking-wide">
                {tag ? <>TAG: <span className="text-secondary">{tag}</span></> : 'ALL QUESTIONS'}
                <span className="font-sans text-sm font-normal text-inktertiary ml-2">({total})</span>
              </h1>
              {!isAdmin && <Link to="/ask" className="bg-primary hover:bg-primaryhover text-white text-sm font-medium px-4 h-10 inline-flex items-center rounded-md shrink-0">Ask Question</Link>}
            </div>

            {/* pill rail scrolls horizontally on mobile, wraps on desktop */}
            <div className="pill-rail mt-4" role="group" aria-label="Sort questions">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => set({ sort: f.key })}
                  className={`shrink-0 text-sm font-medium px-4 h-10 rounded-full border ${sort === f.key ? 'bg-surface2 text-ink border-hairline' : 'bg-transparent border-hairline text-inkmuted hover:text-ink hover:border-hairline-strong'}`}
                  aria-pressed={sort === f.key}
                >
                  {f.label}
                </button>
              ))}
              {tag && (
                <button onClick={() => set({ tag: '' })} className="shrink-0 text-sm text-inklink hover:underline ml-1 py-2">Clear tag ×</button>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {state === 'loading' && <SkeletonList />}
              {state === 'error' && (
                <div className="bg-surface1 border border-red-500/30 rounded-xl p-6 text-center">
                  <p className="font-semibold text-red-500">Failed to load</p>
                  <p className="text-sm text-inkmuted mt-1">{error}</p>
                  <button onClick={load} className="mt-3 text-sm font-medium px-4 h-10 rounded-md bg-primary text-white">Retry</button>
                </div>
              )}
              {state === 'idle' && items.length === 0 && (
                <EmptyState
                  title={search || tag ? 'NO MATCHES' : 'NO QUESTIONS YET'}
                  hint={search || tag ? 'Try a different keyword or clear the tag filter.' : 'Be the first to ask something.'}
                  action={!isAdmin && <Link to="/ask" className="inline-flex items-center h-10 text-sm font-medium px-4 rounded-md bg-primary text-white">Ask the first question</Link>}
                />
              )}
              {state === 'idle' && items.map((q) => (
                <QuestionCard key={q.id} q={q} onTag={(t) => set({ tag: t })} onRemove={isAdmin ? () => removeQuestion(q) : undefined} />
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} onChange={(p) => set({ page: p })} />
          </section>

          <aside className="space-y-4 min-w-0">
            <div className="bg-surface1 border border-hairline rounded-xl p-4 sm:p-6">
              <h2 className="font-display text-2xl tracking-wide">POPULAR TAGS</h2>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {tags.slice(0, 18).map((t) => <TagBadge key={t.id} name={t.name} />)}
                {tags.length === 0 && <p className="text-xs text-inktertiary">No tags yet.</p>}
              </div>
            </div>
            <div className="bg-surface1 border border-hairline rounded-xl p-4 sm:p-6">
              <p className="eyebrow">New here?</p>
              <h2 className="font-display text-2xl tracking-wide mt-1">HOW IT WORKS</h2>
              <p className="text-sm text-inkmuted mt-2 leading-6">Ask clear questions with tags, vote useful answers, and accept the one that solved it.</p>
              <div className="mt-3 text-sm text-inkmuted space-y-1.5">
                <p>• Use code blocks for errors</p>
                <p>• Mention with @username</p>
                <p>• One vote per answer</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <ConfirmDialog open={!!confirm} title={confirm?.title} body={confirm?.body} busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => { setBusy(true); try { await confirm.action(); setConfirm(null); } catch (e) { alert(apiError(e).message); } finally { setBusy(false); } }} />
    </SiteLayout>
  );
}
