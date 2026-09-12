import { ArrowBigUp, ArrowBigDown } from 'lucide-react';

export default function VoteControls({ score, myVote, onVote, disabled, vertical = true }) {
  const btn = (active, dir) => (
    `p-2 sm:p-1.5 rounded-md border transition ${active
      ? dir === 1 ? 'bg-primary border-primary text-white' : 'bg-red-600 border-red-600 text-white'
      : 'bg-surface1 border-hairline text-inkmuted hover:border-hairline-strong hover:text-ink'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`
  );
  return (
    <div className={`flex ${vertical ? 'flex-col' : 'flex-row'} items-center gap-1 shrink-0`} role="group" aria-label="Vote">
      <button className={btn(myVote === 1, 1)} disabled={disabled} onClick={() => onVote(1)} aria-label="Upvote" title={disabled ? 'Log in to vote' : 'Upvote'}>
        <ArrowBigUp size={20} className="size-5 sm:size-5" fill={myVote === 1 ? 'currentColor' : 'none'} />
      </button>
      <span className="font-bold text-lg tabular-nums min-w-[28px] text-center text-ink" aria-live="polite">{score}</span>
      <button className={btn(myVote === -1, -1)} disabled={disabled} onClick={() => onVote(-1)} aria-label="Downvote" title={disabled ? 'Log in to vote' : 'Downvote'}>
        <ArrowBigDown size={20} className="size-5 sm:size-5" fill={myVote === -1 ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}
