import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ChevronRight, MessageSquareText, Pencil, Trash2, Send } from 'lucide-react';
import api, { apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { SiteLayout } from '../components/Layout';
import TagBadge from '../components/TagBadge';
import VoteControls from '../components/VoteControls';
import RichEditor from '../editor/RichEditor';
import { AuthModal } from '../components/Protected';
import { ConfirmDialog } from '../components/States';
import { safeHtml } from '../utils/html';

export default function QuestionDetail() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [answerHtml, setAnswerHtml] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [authModal, setAuthModal] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const { data } = await api.get(`/questions/${id}`);
      setQ(data.data.question);
      setAnswers(data.data.answers || []);
      setState('idle');
    } catch (e) {
      const info = apiError(e);
      setError(info.message);
      setState(info.status === 404 ? 'notfound' : 'error');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const needAuth = () => { if (!user) { setAuthModal(true); return true; } return false; };

  const vote = async (answerId, value) => {
    if (isAdmin) return; // admins are moderation-only, never vote
    if (needAuth()) return;
    const prev = answers.map((a) => ({ ...a }));
    setAnswers((arr) => arr.map((a) => {
      if (a.id !== answerId) return a;
      const next = a.my_vote === value ? 0 : value;
      return { ...a, my_vote: next, score: a.score - (a.my_vote || 0) + next };
    }));
    try {
      const { data } = await api.post(`/answers/${answerId}/vote`, { value });
      setAnswers((arr) => arr.map((a) => (a.id === answerId ? { ...a, score: data.data.score, my_vote: data.data.my_vote } : a)));
    } catch {
      setAnswers(prev);
    }
  };

  const accept = async (answerId) => {
    try {
      const { data } = await api.post(`/answers/${answerId}/accept`);
      setQ(data.data.question);
      setAnswers(data.data.answers);
    } catch (e) {
      alert(apiError(e).message);
    }
  };

  const postAnswer = async () => {
    if (needAuth()) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = answerHtml;
    if (!tmp.textContent.trim()) { setPostError('Answer cannot be empty'); return; }
    setPosting(true); setPostError('');
    try {
      const { data } = await api.post(`/questions/${id}/answers`, { content: answerHtml });
      setAnswers((a) => [...a, data.data.answer].sort((x, y) => Number(y.is_accepted) - Number(x.is_accepted) || y.score - x.score));
      setAnswerHtml('');
      setQ((qq) => (qq ? { ...qq, answer_count: qq.answer_count + 1 } : qq));
    } catch (e) {
      setPostError(apiError(e, 'Could not post answer').message);
    } finally { setPosting(false); }
  };

  const delQuestion = async () => {
    setConfirm({
      title: 'Delete this question?',
      body: 'The question, its answers, votes and comments will be permanently removed.',
      action: async () => {
        await api.delete(`/questions/${id}`);
        navigate(isAdmin ? '/admin' : '/');
      }
    });
  };
  const delAnswer = (a) => setConfirm({
    title: 'Delete this answer?',
    body: 'This cannot be undone.',
    action: async () => {
      await api.delete(`/answers/${a.id}`);
      setAnswers((arr) => arr.filter((x) => x.id !== a.id));
      setQ((qq) => (qq ? { ...qq, answer_count: Math.max(0, qq.answer_count - 1) } : qq));
    }
  });

  if (state === 'loading') return <SiteLayout><div className="max-w-4xl mx-auto px-4 py-10 animate-pulse space-y-3"><div className="h-6 bg-surface2 rounded w-3/4" /><div className="h-32 bg-surface1 border border-hairline rounded-xl" /><div className="h-24 bg-surface1 border border-hairline rounded-xl" /></div></SiteLayout>;
  if (state === 'notfound') return <SiteLayout><div className="max-w-xl mx-auto px-4 py-20 text-center"><p className="font-display text-6xl tracking-wide">404</p><p className="font-semibold mt-2 text-ink">Question not found</p><p className="text-sm text-inkmuted mt-1">It may have been removed by its author or a moderator.</p><Link to="/" className="inline-flex items-center h-10 mt-4 text-sm font-medium px-4 rounded-md bg-primary text-white">Back home</Link></div></SiteLayout>;
  if (state === 'error') return <SiteLayout><div className="max-w-xl mx-auto px-4 py-20 text-center"><p className="font-semibold text-ink">Could not load question</p><p className="text-sm text-inkmuted">{error}</p><button onClick={load} className="mt-4 text-sm font-medium px-4 h-10 rounded-md bg-primary text-white">Retry</button></div></SiteLayout>;

  const isOwner = user && q && String(user.id) === String(q.user_id);

  return (
    <SiteLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <nav className="text-xs text-inktertiary flex items-center gap-1 mb-3 min-w-0" aria-label="Breadcrumb">
          <Link to="/" className="hover:underline shrink-0">Questions</Link>
          <ChevronRight size={12} className="shrink-0" />
          <span className="truncate">{q.title.slice(0, 60)}</span>
        </nav>

        <article className="bg-surface1 border border-hairline rounded-xl p-4 sm:p-6">
          <p className="eyebrow">Thread</p>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-8 text-ink mt-1">{q.title}</h1>
          <p className="text-xs text-inktertiary mt-2">Asked by <b className="text-inkmuted">{q.author?.username}</b> · {new Date(q.created_at).toLocaleString()} · {q.answer_count} answer{q.answer_count === 1 ? '' : 's'}</p>
          <div className="rich-body mt-4" dangerouslySetInnerHTML={{ __html: safeHtml(q.description) }} />
          <div className="flex flex-wrap gap-1.5 mt-4">{q.tags.map((t) => <TagBadge key={t.id} name={t.name} />)}</div>
          {isOwner && (
            <div className="flex flex-wrap gap-2 mt-4 text-xs">
              <Link to={`/ask?edit=${q.id}`} className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-hairline text-ink hover:bg-ink/5"><Pencil size={13} /> Edit</Link>
              <button onClick={delQuestion} className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-red-500/30 text-red-500 hover:bg-red-500/10"><Trash2 size={13} /> Delete</button>
            </div>
          )}
          {isAdmin && (
            <div className="mt-4 text-xs bg-secondary/[0.07] border border-secondary/30 rounded-md px-3 py-2.5 flex flex-wrap items-center gap-2">
              <span className="font-medium text-inkmuted">Moderation mode — inspect and remove, not participate.</span>
              <button onClick={delQuestion} className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-red-600 text-white font-medium hover:bg-red-500"><Trash2 size={13} /> Remove question</button>
            </div>
          )}
        </article>

        <div className="flex items-center gap-2 mt-8 mb-3">
          <h2 className="font-display text-3xl tracking-wide">{answers.length} ANSWER{answers.length === 1 ? '' : 'S'}</h2>
          {q.accepted_answer_id && <span className="text-xs font-semibold text-secondary bg-secondary/10 border border-secondary/30 px-2 py-0.5 rounded-full whitespace-nowrap">Solved ✓</span>}
        </div>

        <div className="space-y-3">
          {answers.map((a) => (
            <AnswerCard key={a.id} a={a} q={q} user={user} isAdmin={isAdmin} onVote={vote} onAccept={accept} onDelete={() => delAnswer(a)} needAuth={needAuth} />
          ))}
          {answers.length === 0 && (
            <div className="bg-surface1 border border-dashed border-hairline rounded-xl p-8 text-center text-sm text-inkmuted">
              {isAdmin ? 'No answers yet.' : <>No answers yet. {user ? 'Be the first to help!' : 'Log in to be the first to answer.'}</>}
            </div>
          )}
        </div>

        {isAdmin ? (
          <section className="mt-8 bg-secondary/[0.07] border border-secondary/30 rounded-xl p-4 sm:p-5 text-sm text-inkmuted">
            Moderation mode — admin accounts can't post answers. Remove inappropriate answers with the <b className="text-ink">Delete</b> button on each answer.
          </section>
        ) : (
        <section className="mt-8 bg-surface1 border border-hairline rounded-xl p-4 sm:p-6">
          <p className="eyebrow">Contribute</p>
          <h3 className="font-display text-3xl tracking-wide mt-0.5">YOUR ANSWER</h3>
          {user ? (
            <>
              <div className="mt-3 min-w-0"><RichEditor value={answerHtml} onChange={setAnswerHtml} placeholder="Write your answer… code, explanation, links. Use @username to mention." /></div>
              {postError && <p className="text-xs text-red-500 mt-2">{postError}</p>}
              <button onClick={postAnswer} disabled={posting} className="mt-3 inline-flex items-center gap-2 bg-primary hover:bg-primaryhover disabled:opacity-50 text-white text-sm font-medium px-5 h-11 rounded-md">
                <Send size={15} /> {posting ? 'Posting…' : 'Post Your Answer'}
              </button>
            </>
          ) : (
            <div className="mt-3 text-sm text-inkmuted bg-surface2/60 border border-hairline rounded-md p-4">
              <Link to="/login" className="text-inklink font-medium hover:underline">Log in</Link> or <Link to="/register" className="text-inklink font-medium hover:underline">sign up</Link> to post an answer.
            </div>
          )}
        </section>
        )}
      </div>
      <AuthModal open={authModal} onClose={() => setAuthModal(false)} />
      <ConfirmWrap confirm={confirm} setConfirm={setConfirm} />
    </SiteLayout>
  );
}

function AnswerCard({ a, q, user, isAdmin, onVote, onAccept, onDelete, needAuth }) {
  const [comments, setComments] = useState(a.comments || []);
  const [box, setBox] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editHtml, setEditHtml] = useState(a.content);
  const isOwner = user && String(user.id) === String(q.user_id);
  const mine = user && String(user.id) === String(a.user_id);

  useEffect(() => setComments(a.comments || []), [a.comments]);

  const postComment = async () => {
    if (needAuth()) return;
    if (!text.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/comments/answers/${a.id}/comments`, { content: text.trim() });
      const c = data.data.comment;
      setComments((cs) => [...cs, { ...c, author: { id: user.id, username: user.username } }]);
      setText(''); setBox(false);
    } catch (e) { alert(apiError(e).message); }
    finally { setBusy(false); }
  };

  const saveEdit = async () => {
    try {
      const { data } = await api.put(`/answers/${a.id}`, { content: editHtml });
      a.content = data.data.answer.content;
      setEditing(false);
    } catch (e) { alert(apiError(e).message); }
  };

  const delComment = async (cid) => {
    if (!window.confirm('Remove this comment? This moderation action is permanent.')) return;
    try {
      await api.delete(`/comments/${cid}`);
      setComments((cs) => cs.filter((x) => String(x.id) !== String(cid)));
    } catch (e) { alert(apiError(e).message); }
  };

  return (
    <article className={`bg-surface1 border rounded-xl p-4 sm:p-5 ${a.is_accepted ? 'border-secondary/50' : 'border-hairline'}`}>
      {a.is_accepted && (
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary bg-secondary/10 border border-secondary/30 px-2.5 py-1 rounded-full mb-3">
          <CheckCircle2 size={14} /> Accepted Answer
        </p>
      )}
      <div className="flex gap-3 sm:gap-4">
        {isAdmin ? (
          <div className="flex flex-col items-center gap-0.5 pt-1 shrink-0" title="Vote score (admins can't vote)">
            <span className="font-bold text-lg tabular-nums text-ink">{a.score}</span>
            <span className="text-[10px] uppercase tracking-wide text-inktertiary">votes</span>
          </div>
        ) : (
          <VoteControls score={a.score} myVote={a.my_vote} onVote={(v) => onVote(a.id, v)} disabled={false} />
        )}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="min-w-0">
              <RichEditor value={editHtml} onChange={setEditHtml} />
              <div className="flex gap-2 mt-2">
                <button onClick={saveEdit} className="text-xs font-medium px-3 py-2 rounded-md bg-primary text-white">Save</button>
                <button onClick={() => setEditing(false)} className="text-xs font-medium px-3 py-2 rounded-md border border-hairline text-ink">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="rich-body" dangerouslySetInnerHTML={{ __html: safeHtml(a.content) }} />
          )}
          <p className="text-xs text-inktertiary mt-3">Answered by <b className="text-inkmuted">{a.author?.username}</b> · {new Date(a.created_at).toLocaleString()}</p>
          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            {isOwner && !a.is_accepted && <button onClick={() => onAccept(a.id)} className="inline-flex items-center gap-1 font-medium text-secondary border border-secondary/30 bg-secondary/10 px-2.5 py-1.5 rounded-md hover:bg-secondary/20"><CheckCircle2 size={13} /> Accept</button>}
            {isOwner && a.is_accepted && <button onClick={() => onAccept(a.id)} className="font-medium text-inktertiary hover:underline py-1.5">Unaccept</button>}
            {mine && <button onClick={() => setEditing((e) => !e)} className="inline-flex items-center gap-1 text-inkmuted hover:text-ink py-1.5"><Pencil size={13} /> Edit</button>}
            {(mine || user?.role === 'admin') && <button onClick={onDelete} className="inline-flex items-center gap-1 text-red-500 hover:underline py-1.5"><Trash2 size={13} /> Delete</button>}
          </div>

          <div className="mt-4 border-t border-hairline pt-3">
            <p className="text-xs font-semibold text-inktertiary flex items-center gap-1"><MessageSquareText size={13} /> Comments ({comments.length})</p>
            <div className="mt-2 space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="text-sm bg-surface2/60 border border-hairline rounded-md px-3 py-2 flex items-start justify-between gap-2">
                  <span className="min-w-0"><span className="text-ink">{c.content}</span>
                  <span className="text-inktertiary"> — <b>{c.author?.username}</b></span></span>
                  {isAdmin && (
                    <button onClick={() => delComment(c.id)} className="shrink-0 text-xs font-medium text-red-500 hover:underline py-0.5" aria-label="Remove comment">
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            {!isAdmin && (!box ? (
              <button onClick={() => { if (needAuth()) return; setBox(true); }} className="text-xs text-inklink font-medium hover:underline mt-2 py-1">Add a comment… (supports @username)</button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Write a comment… try @username" className="flex-1 min-w-0 h-11 text-base sm:text-sm border border-hairline rounded-md px-3 bg-surface1 placeholder:text-inktertiary text-ink focus:border-secondary/70 focus:outline-none" aria-label="Comment" />
                <div className="flex gap-2 shrink-0">
                  <button onClick={postComment} disabled={busy || !text.trim()} className="h-11 text-sm font-medium px-4 rounded-md bg-primary text-white disabled:opacity-50">Post</button>
                  <button onClick={() => setBox(false)} className="h-11 text-sm px-3 text-inktertiary">Cancel</button>
                </div>
              </div>
              )
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function ConfirmWrap({ confirm, setConfirm }) {
  const [busy, setBusy] = useState(false);
  return (
    <ConfirmDialog
      open={!!confirm}
      title={confirm?.title}
      body={confirm?.body}
      busy={busy}
      onCancel={() => setConfirm(null)}
      onConfirm={async () => { setBusy(true); try { await confirm.action(); setConfirm(null); } catch (e) { alert(apiError(e).message); } finally { setBusy(false); } }}
    />
  );
}
