import { Link } from 'react-router-dom';
import { MessageSquareText, CheckCircle2, Trash2 } from 'lucide-react';
import TagBadge from './TagBadge';

function plain(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  return (d.textContent || '').slice(0, 160);
}

// onRemove is admin-only (inline moderation). Never rendered for normal users.
export default function QuestionCard({ q, onTag, onRemove }) {
  return (
    <article className="bg-surface1 border border-hairline rounded-xl p-4 sm:p-5 hover:border-hairline-strong transition">
      <div className="flex gap-3 sm:gap-4">
        <div className="hidden sm:flex flex-col items-center gap-1 w-14 shrink-0 pt-1">
          <span className="text-lg font-bold tabular-nums text-ink">{q.answer_count}</span>
          <span className="text-[11px] text-inktertiary flex items-center gap-1"><MessageSquareText size={12} className="shrink-0" /> ans</span>
          {q.has_accepted && <span className="mt-1 text-secondary" title="Has accepted answer"><CheckCircle2 size={18} /></span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link to={`/questions/${q.id}`} className="font-semibold text-base leading-6 text-ink hover:text-inklink line-clamp-2 min-w-0">
              {q.title}
            </Link>
            {onRemove && (
              <button onClick={onRemove} title="Remove question (moderation)" aria-label={`Remove ${q.title}`}
                className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-red-400 border border-red-500/30 px-2 py-1.5 rounded-md hover:bg-red-500/10">
                <Trash2 size={12} /> <span className="hidden min-[400px]:inline">Remove</span>
              </button>
            )}
          </div>
          <p className="text-base text-inkmuted mt-1 line-clamp-2">{plain(q.description)}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(q.tags || []).map((t) => <TagBadge key={t.id} name={t.name} onClick={onTag} size="sm" />)}
          </div>
          <div className="flex items-center justify-between gap-2 mt-3 text-xs text-inktertiary">
            <span className="truncate">by <b className="text-inkmuted">{q.author?.username || 'unknown'}</b> · {new Date(q.created_at).toLocaleDateString()}</span>
            <span className="sm:hidden font-semibold shrink-0 tabular-nums">{q.answer_count} ans{q.has_accepted ? ' · ✓' : ''}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
