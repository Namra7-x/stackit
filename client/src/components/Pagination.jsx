export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const go = (p) => { if (p >= 1 && p <= totalPages && p !== page) onChange(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const nums = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  const btn = 'px-3 py-2 text-sm border border-hairline rounded-md bg-surface1 disabled:opacity-40 hover:border-hairline-strong text-ink';
  return (
    <nav className="flex items-center justify-center gap-1.5 mt-6" aria-label="Pagination">
      <button onClick={() => go(page - 1)} disabled={page === 1} className={btn} aria-label="Previous page">&lt;</button>
      {/* page numbers hidden on mobile: prev/next + counter only */}
      <span className="hidden sm:contents">
        {nums.map((n, i) => n === '…' ? <span key={i} className="px-2 text-inktertiary">…</span> : (
          <button key={i} onClick={() => go(n)} aria-current={n === page ? 'page' : undefined}
            className={`min-w-[36px] px-2 py-2 text-sm rounded-md border ${n === page ? 'bg-primary text-white border-primary font-semibold' : 'bg-surface1 border-hairline hover:border-hairline-strong text-ink'}`}>{n}</button>
        ))}
      </span>
      <span className="sm:hidden text-xs text-inkmuted px-1 tabular-nums">{page} / {totalPages}</span>
      <button onClick={() => go(page + 1)} disabled={page === totalPages} className={btn} aria-label="Next page">&gt;</button>
    </nav>
  );
}
