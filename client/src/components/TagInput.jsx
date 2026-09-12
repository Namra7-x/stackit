import { useState } from 'react';
import { X } from 'lucide-react';

export default function TagInput({ value = [], onChange, suggestions = [], error }) {
  const [input, setInput] = useState('');
  const add = (raw) => {
    const name = String(raw || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9._+#-]/g, '').slice(0, 30);
    if (!name) return;
    if (value.includes(name)) { setInput(''); return; }
    if (value.length >= 5) return;
    onChange([...value, name]);
    setInput('');
  };
  const filtered = input ? suggestions.filter((s) => s.name.includes(input.toLowerCase()) && !value.includes(s.name)).slice(0, 6) : [];

  return (
    <div>
      <div className={`flex flex-wrap gap-1.5 p-2 border rounded-md bg-surface1 min-h-[44px] ${error ? 'border-red-500' : 'border-hairline focus-within:border-secondary/70'}`}>
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 bg-surface2 text-ink border border-hairline rounded px-2 py-1 text-xs font-medium">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="p-0.5"><X size={13} /></button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') { e.preventDefault(); add(input); } if (e.key === 'Backspace' && !input && value.length) onChange(value.slice(0, -1)); }}
          placeholder={value.length ? '' : 'e.g. react, jwt, sql — press Enter'}
          className="flex-1 min-w-[140px] bg-transparent outline-none text-base sm:text-sm px-1 py-1 text-ink placeholder:text-inktertiary"
          aria-label="Add tags"
        />
      </div>
      {filtered.length > 0 && (
        <div className="mt-1 border border-hairline rounded-md bg-surface1 overflow-hidden">
          {filtered.map((s) => (
            <button key={s.id} type="button" onClick={() => add(s.name)} className="w-full text-left px-3 py-2.5 text-sm text-ink hover:bg-ink/5 flex justify-between gap-2">
              <span className="truncate">{s.name}</span><span className="text-inktertiary text-xs shrink-0">{s.question_count} questions</span>
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <p className="text-xs text-inktertiary mt-1">{value.length}/5 tags · lowercase, hyphenated</p>
    </div>
  );
}
