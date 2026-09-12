import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Trash2, Search, Database, Table2, MessageSquareText, Users, CircleHelp } from 'lucide-react';
import api, { apiError } from '../api/client';
import { AdminLayout } from '../components/Layout';
import { ConfirmDialog } from '../components/States';

/* Admin console — spec §18 moderation only:
   review questions, review answers, remove inappropriate content
   (with confirmation), content metadata. No user-side actions here:
   no Ask, no answer forms, no voting, no notification bell. */

export default function Admin() {
  const [tab, setTab] = useState('questions');
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [box, setBox] = useState('');
  const [state, setState] = useState('loading');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState(null);

  const load = useCallback(async () => {
    if (tab === 'database') return;
    setState('loading');
    try {
      const endpoint = tab === 'questions' ? '/admin/questions' : tab === 'answers' ? '/admin/answers' : '/admin/comments';
      const { data } = await api.get(endpoint, { params: { search, limit: 20 } });
      setItems(data.data.data || []);
      setState('idle');
    } catch (e) { setState('error'); }
  }, [tab, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/admin/tables').then(({ data }) => {
      const m = {};
      (data.data.tables || []).forEach((t) => { m[t.name] = t.count; });
      setStats(m);
    }).catch(() => {});
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setSearch(box), 400);
    return () => clearTimeout(t);
  }, [box]);

  const remove = (item) => setConfirm({
    title: tab === 'questions' ? 'Remove this question?' : tab === 'answers' ? 'Remove this answer?' : 'Remove this comment?',
    body: 'This moderation action is permanent and removes the content for everyone.',
    action: async () => {
      const endpoint = tab === 'questions' ? `/admin/questions/${item.id}` : tab === 'answers' ? `/admin/answers/${item.id}` : `/admin/comments/${item.id}`;
      await api.delete(endpoint);
      setItems((a) => a.filter((x) => x.id !== item.id));
    }
  });

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <p className="eyebrow">Console</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-wide mt-0.5 flex items-center gap-2">MODERATION</h1>
        <p className="text-sm text-inkmuted mt-1">Review community questions and answers. Removing content is permanent and always asks for confirmation.</p>

        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <Stat icon={<CircleHelp size={18} />} label="Questions" value={stats.questions ?? '—'} />
            <Stat icon={<MessageSquareText size={18} />} label="Answers" value={stats.answers ?? '—'} />
            <Stat icon={<Users size={18} />} label="Users" value={stats.users ?? '—'} />
            <Stat icon={<Database size={18} />} label="Comments" value={stats.comments ?? '—'} />
          </div>
        )}

        <div className="flex items-center gap-2 mt-5 min-w-0">
          {/* pill rail scrolls on mobile, wraps on desktop */}
          <div className="pill-rail flex-1 min-w-0" role="group" aria-label="Moderation views">
            {['questions', 'answers', 'comments', 'database'].map((t) => (
              <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t}
                className={`shrink-0 text-sm font-medium px-4 h-10 rounded-full border capitalize ${tab === t ? 'bg-surface2 text-ink border-hairline' : 'bg-transparent border-hairline text-inkmuted hover:text-ink hover:border-hairline-strong'}`}>
                {t === 'database' ? 'Database' : t}
              </button>
            ))}
          </div>
          {tab !== 'database' && (
            <div className="relative hidden sm:block w-56 lg:w-64 shrink-0">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-inktertiary" />
              <input value={box} onChange={(e) => setBox(e.target.value)} placeholder={`Search ${tab}…`} aria-label={`Search ${tab}`}
                className="w-full h-10 text-base lg:text-sm border border-hairline rounded-md pl-9 pr-3 bg-surface1 placeholder:text-inktertiary text-ink focus:border-secondary/70 focus:outline-none" />
            </div>
          )}
        </div>
        {tab !== 'database' && (
          <div className="relative sm:hidden mt-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-inktertiary" />
            <input value={box} onChange={(e) => setBox(e.target.value)} placeholder={`Search ${tab}…`} aria-label={`Search ${tab}`}
              className="w-full h-11 text-base border border-hairline rounded-md pl-9 pr-3 bg-surface1 placeholder:text-inktertiary text-ink focus:border-secondary/70 focus:outline-none" />
          </div>
        )}

        {tab === 'database' ? <DatabaseViewer /> : (
          <div className="mt-4 bg-surface1 border border-hairline rounded-xl overflow-x-auto nice-scroll">
            <table className="w-full text-sm min-w-[620px]">
                  <thead className="text-xs uppercase text-inktertiary">
                    <tr className="border-b border-hairline">
                      <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">{tab === 'questions' ? 'Question' : tab === 'answers' ? 'Answer' : 'Comment'}</th>
                      <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Author</th>
                      <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">{tab === 'comments' ? 'On question' : 'Meta'}</th>
                      <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Posted</th>
                      <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">Moderate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state === 'loading' && <tr><td colSpan={5} className="px-4 py-8 text-center text-inkmuted">Loading…</td></tr>}
                    {state === 'error' && <tr><td colSpan={5} className="px-4 py-8 text-center"><p className="text-sm text-red-500">Could not load content.</p><button onClick={load} className="mt-2 text-sm font-medium text-inklink hover:underline">Retry</button></td></tr>}
                    {state === 'idle' && items.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-inkmuted">Nothing to review.</td></tr>}
                    {items.map((it) => (
                      <tr key={it.id} className="border-t border-hairline hover:bg-ink/[0.03]">
                        <td className="px-4 py-3 max-w-[380px]">
                          {tab === 'comments' ? (
                            <span className="text-ink line-clamp-2">{it.content}</span>
                          ) : (
                            <Link to={tab === 'questions' ? `/questions/${it.id}` : `/questions/${it.question_id}`} className="font-medium text-ink hover:text-inklink line-clamp-2">
                              {tab === 'questions' ? it.title : String(it.content || '').replace(/<[^>]+>/g, '').slice(0, 120)}
                            </Link>
                          )}
                          {tab === 'answers' && <p className="text-xs text-inktertiary mt-0.5">on: {it.question_title || `question #${it.question_id}`}</p>}
                        </td>
                        <td className="px-4 py-3 text-inkmuted whitespace-nowrap">{it.author?.username || it.author_name || '—'}</td>
                        <td className="px-4 py-3 text-xs text-inktertiary max-w-[220px]">
                          {tab === 'questions'
                            ? `${it.answer_count ?? 0} answers${it.has_accepted ? ' · solved' : ''}`
                            : tab === 'answers'
                              ? `answer #${it.id}`
                              : <Link to={`/questions/${it.question_id}`} className="hover:text-inklink line-clamp-2">{it.question_title || `question #${it.question_id}`}</Link>}
                        </td>
                        <td className="px-4 py-3 text-inktertiary whitespace-nowrap">{new Date(it.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button onClick={() => remove(it)} className="inline-flex items-center gap-1 text-xs font-medium text-red-500 border border-red-500/30 px-2.5 py-2 rounded-md hover:bg-red-500/10"><Trash2 size={13} /> Remove</button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
          </div>
        )}
      </div>
      <ConfirmDialog open={!!confirm} title={confirm?.title} body={confirm?.body} busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => { setBusy(true); try { await confirm.action(); setConfirm(null); } catch (e) { alert(apiError(e).message); } finally { setBusy(false); } }} />
    </AdminLayout>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="bg-surface1 border border-hairline rounded-xl px-4 py-3 flex items-center gap-3 min-w-0">
      <span className="text-secondary shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-none text-ink tabular-nums truncate">{value}</p>
        <p className="text-xs text-inktertiary mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

function DatabaseViewer() {
  const [tables, setTables] = useState([]);
  const [sel, setSel] = useState(null);
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/tables')
      .then(({ data }) => {
        setTables(data.data.tables || []);
        if (data.data.tables?.length && !sel) setSel(data.data.tables[0].name);
      })
      .catch((e) => setError(apiError(e).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!sel) return;
    setRowsLoading(true);
    api.get(`/admin/tables/${sel}`, { params: { page, limit: 15 } })
      .then(({ data }) => {
        setRows(data.data.data || []);
        setColumns(data.data.columns || []);
        setTotalPages(data.data.totalPages || 1);
        setTotal(data.data.total || 0);
      })
      .catch((e) => setError(apiError(e).message))
      .finally(() => setRowsLoading(false));
  }, [sel, page]);

  const pick = (name) => { setSel(name); setPage(1); };

  if (loading) return <p className="mt-4 text-sm text-inkmuted">Loading tables…</p>;
  if (error && tables.length === 0) return <p className="mt-4 text-sm text-red-500">{error}</p>;

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-inkmuted">Read-only view of every table in the connected database <b className="text-ink">(passwords hidden)</b>.</p>
      <div className="pill-rail" role="group" aria-label="Database tables">
        {tables.map((t) => (
          <button key={t.name} onClick={() => pick(t.name)} aria-pressed={sel === t.name}
            className={`shrink-0 inline-flex items-center gap-1.5 text-sm font-medium px-3.5 h-10 rounded-md border ${sel === t.name ? 'bg-primary text-white border-primary' : 'bg-surface1 border-hairline text-inkmuted hover:text-ink'}`}>
            <Table2 size={14} /> {t.name}
            <span className={`text-xs px-1.5 py-0.5 rounded-full tabular-nums ${sel === t.name ? 'bg-ink/10' : 'bg-surface2 text-inkmuted'}`}>{t.count}</span>
          </button>
        ))}
      </div>
      <div className="bg-surface1 border border-hairline rounded-xl overflow-x-auto nice-scroll">
        <div className="px-4 py-2.5 border-b border-hairline text-sm font-semibold text-ink flex justify-between gap-2">
          <span className="truncate min-w-0">{sel}</span><span className="text-inktertiary font-normal shrink-0 tabular-nums">{total} rows · {page}/{totalPages}</span>
        </div>
        {rowsLoading ? <p className="px-4 py-6 text-sm text-inkmuted">Loading rows…</p> : rows.length === 0 ? <p className="px-4 py-6 text-sm text-inkmuted">No rows yet.</p> : (
          <table className="w-full text-[13px] min-w-[680px]">
                <thead className="text-xs uppercase text-inktertiary">
                  <tr className="border-b border-hairline">{columns.map((c) => <th key={c} className="text-left px-3 py-2 font-semibold whitespace-nowrap">{c}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id ?? i} className="border-t border-hairline hover:bg-ink/[0.03] align-top">
                      {columns.map((c) => (
                        <td key={c} className="px-3 py-2 max-w-[320px] truncate text-inkmuted" title={String(r[c] ?? '')}>
                          {r[c] === null || r[c] === undefined ? <span className="text-inktertiary">NULL</span> : String(r[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
            </table>
            )}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-hairline">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="text-sm px-3 py-2 border border-hairline rounded-md disabled:opacity-40 bg-surface1 text-ink">&lt; Prev</button>
            <span className="text-xs text-inkmuted tabular-nums">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="text-sm px-3 py-2 border border-hairline rounded-md disabled:opacity-40 bg-surface1 text-ink">Next &gt;</button>
          </div>
        )}
      </div>
    </div>
  );
}
