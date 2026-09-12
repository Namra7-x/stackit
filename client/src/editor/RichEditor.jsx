import { useMemo, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import api from '../api/client';

const EMOJIS = ['😀', '😅', '👍', '👎', '🎉', '❤️', '🔥', '💡', '✅', '🤔', '👏', '🚀'];

export default function RichEditor({ value, onChange, placeholder = 'Write details… Include code, steps, what you tried.' }) {
  const quillRef = useRef(null);

  const uploadImage = async (file) => {
    const form = new FormData();
    form.append('image', file);
    const { data } = await api.post('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data.data.url;
  };

  const imageHandler = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return; }
      const quill = quillRef.current?.getEditor();
      const range = quill?.getSelection(true);
      try {
        quill?.insertText(range?.index ?? 0, 'Uploading image…', 'italic', true);
        const url = await uploadImage(file);
        const idx = quill?.getSelection()?.index ?? quill?.getLength() ?? 0;
        quill?.deleteText(Math.max(0, idx - 17), 17);
        quill?.insertEmbed(range?.index ?? 0, 'image', url);
        quill?.setSelection((range?.index ?? 0) + 1);
      } catch {
        alert('Image upload failed. Try a smaller file.');
        try { quill?.deleteText(0, 17); } catch {}
      }
    };
    input.click();
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [false, 3] }],
        ['bold', 'italic', 'strike'],
        [{ align: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image', 'blockquote', 'code-block'],
        ['clean']
      ],
      handlers: { image: imageHandler }
    }
  }), []);

  const insertEmoji = (e) => {
    const quill = quillRef.current?.getEditor();
    const range = quill?.getSelection(true);
    quill?.insertText(range?.index ?? quill?.getLength() ?? 0, e);
    quill?.focus();
  };

  return (
    <div>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder}
      />
      <div className="flex flex-wrap items-center gap-1.5 mt-2" aria-label="Insert emoji">
        <span className="text-xs text-inktertiary mr-1">Emoji:</span>
        {EMOJIS.map((e) => (
          <button key={e} type="button" onClick={() => insertEmoji(e)} className="text-lg leading-none p-1.5 rounded hover:bg-ink/10" aria-label={`Insert ${e}`}>{e}</button>
        ))}
      </div>
    </div>
  );
}
