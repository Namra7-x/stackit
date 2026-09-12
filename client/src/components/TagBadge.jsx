import { Link } from 'react-router-dom';

export default function TagBadge({ name, onClick, size = 'md' }) {
  const cls = size === 'sm'
    ? 'text-[11px] px-2 py-0.5'
    : 'text-xs px-2.5 py-1';
  const inner = (
    <span className={`inline-flex items-center rounded-md bg-surface2 text-ink border border-hairline font-medium hover:border-secondary/50 transition ${cls}`}>
      {name}
    </span>
  );
  if (onClick) return <button type="button" onClick={() => onClick(name)} aria-label={`Filter by ${name}`}>{inner}</button>;
  return <Link to={`/?tag=${encodeURIComponent(name)}`} aria-label={`Tag ${name}`}>{inner}</Link>;
}
