import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { apiError } from '../api/client';
import { SiteLayout } from '../components/Layout';
import RichEditor from '../editor/RichEditor';
import TagInput from '../components/TagInput';

export default function AskQuestion() {
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [tags, setTags] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    api.get('/tags').then(({ data }) => setSuggestions(data.data.tags || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editId) return;
    api.get(`/questions/${editId}`).then(({ data }) => {
      setTitle(data.data.question.title);
      setDesc(data.data.question.description);
      setTags(data.data.question.tags.map((t) => t.name));
    }).catch(() => {});
  }, [editId]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({}); setServerError('');
    try {
      const payload = { title: title.trim(), description: desc, tags };
      const { data } = editId
        ? await api.put(`/questions/${editId}`, payload)
        : await api.post('/questions', payload);
      navigate(`/questions/${data.data.question.id}`);
    } catch (err) {
      const info = apiError(err);
      if (info.details) setErrors(info.details);
      else setServerError(info.message);
    } finally { setBusy(false); }
  };

  return (
    <SiteLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        <p className="eyebrow">{editId ? 'Edit thread' : 'New thread'}</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-wide mt-1">{editId ? 'EDIT QUESTION' : 'ASK A QUESTION'}</h1>
        <p className="text-sm text-inkmuted mt-1">Be specific. Include what you tried, exact errors, and relevant tags.</p>

        <form onSubmit={submit} className="mt-5 space-y-4 sm:space-y-5">
          <div className="bg-surface1 border border-hairline rounded-xl p-4 sm:p-6">
            <label htmlFor="q-title" className="font-semibold text-sm text-ink">Title <span className="text-secondary">*</span></label>
            <p className="text-xs text-inktertiary mt-0.5">Short, descriptive summary of the problem.</p>
            <input
              id="q-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200}
              placeholder="e.g. How to join 2 columns in SQL to make a full name column?"
              className={`mt-2 w-full h-11 text-base sm:text-sm border rounded-md px-3 bg-surface1 placeholder:text-inktertiary text-ink focus:outline-none ${errors.title ? 'border-red-500' : 'border-hairline focus:border-secondary/70'}`}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          <div className="bg-surface1 border border-hairline rounded-xl p-4 sm:p-6 min-w-0">
            <label className="font-semibold text-sm text-ink">Description <span className="text-secondary">*</span></label>
            <p className="text-xs text-inktertiary mt-0.5 mb-2">Bold, italic, lists, links, emoji, images and alignment are supported.</p>
            <RichEditor value={desc} onChange={setDesc} />
            {errors.description && <p className="text-xs text-red-500 mt-2">{errors.description}</p>}
          </div>

          <div className="bg-surface1 border border-hairline rounded-xl p-4 sm:p-6">
            <label className="font-semibold text-sm text-ink">Tags <span className="text-secondary">*</span></label>
            <p className="text-xs text-inktertiary mt-0.5 mb-2">Add up to 5 tags so the right people find it.</p>
            <TagInput value={tags} onChange={setTags} suggestions={suggestions} error={errors.tags} />
          </div>

          {serverError && <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">{serverError}</p>}

          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button type="submit" disabled={busy} className="h-11 bg-primary hover:bg-primaryhover disabled:opacity-50 text-white text-sm font-medium px-6 rounded-md">
              {busy ? 'Submitting…' : editId ? 'Save changes' : 'Post Question'}
            </button>
            <Link to={editId ? `/questions/${editId}` : '/'} className="h-11 inline-flex items-center justify-center text-sm font-medium px-5 rounded-md border border-hairline text-ink hover:bg-ink/5">Cancel</Link>
          </div>
        </form>
      </div>
    </SiteLayout>
  );
}
