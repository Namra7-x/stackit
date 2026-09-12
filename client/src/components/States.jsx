import { Inbox } from 'lucide-react';

export function EmptyState({ title, hint, action }) {
  return (
    <div className="bg-surface1 border border-dashed border-hairline rounded-xl p-8 sm:p-10 text-center">
      <Inbox size={32} className="mx-auto text-inktertiary" />
      <p className="mt-3 font-display text-2xl tracking-wide">{title}</p>
      {hint && <p className="text-sm text-inkmuted mt-1 max-w-md mx-auto">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="space-y-3" aria-label="Loading">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-surface1 border border-hairline rounded-xl p-5 animate-pulse">
          <div className="h-4 bg-surface2 rounded w-3/4" />
          <div className="h-3 bg-surface2 rounded w-full mt-3" />
          <div className="h-3 bg-surface2 rounded w-2/3 mt-2" />
        </div>
      ))}
    </div>
  );
}

export function ConfirmDialog({ open, title, body, confirmLabel = 'Delete', onConfirm, onCancel, busy }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div className="relative bg-surface1 border border-hairline rounded-xl max-w-sm w-full p-6 max-h-[90dvh] overflow-y-auto">
        <h2 className="font-bold text-ink">{title}</h2>
        <p className="text-sm text-inkmuted mt-1">{body}</p>
        <div className="flex gap-2 mt-5">
          <button onClick={onCancel} className="flex-1 text-sm font-medium px-4 py-2.5 rounded-md border border-hairline text-ink">Cancel</button>
          <button onClick={onConfirm} disabled={busy} className="flex-1 text-sm font-medium px-4 py-2.5 rounded-md bg-red-600 text-white disabled:opacity-50">{busy ? 'Working…' : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
