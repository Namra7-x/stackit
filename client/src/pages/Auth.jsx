import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import { apiError } from '../api/client';

function Shell({ eyebrow, title, sub, children }) {
  return (
    <div className="min-h-dvh flex flex-col bg-canvas">
      <header className="border-b border-hairline">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-md bg-primary text-white font-display text-xl flex items-center justify-center pt-0.5 shrink-0">S</span>
            <span className="font-display text-2xl tracking-wider">STACK<span className="text-secondary">IT</span></span>
          </Link>
          <div className="flex-1" />
          <ThemeToggle className="p-2.5" />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-10 min-w-0">
        <div className="w-full max-w-md bg-surface1 border border-hairline rounded-xl p-6 sm:p-8">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="font-display text-4xl tracking-wide mt-1">{title}</h1>
          <p className="text-sm text-inkmuted mt-1">{sub}</p>
          <div className="mt-5">{children}</div>
        </div>
      </main>
    </div>
  );
}

const field = 'mt-1 w-full h-11 text-base sm:text-sm border rounded-md px-3 bg-surface1 border-hairline placeholder:text-inktertiary text-ink focus:border-secondary/70 focus:outline-none';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const u = await login(identifier.trim(), password);
      navigate(u?.role === 'admin' ? '/admin' : (params.get('next') || '/'));
    } catch (err) { setError(apiError(err, 'Login failed').message); }
    finally { setBusy(false); }
  };

  return (
    <Shell eyebrow="Welcome back" title="LOG IN" sub="Log in to ask, answer and vote.">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="li-id">Email or username</label>
          <input id="li-id" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className={field} placeholder="you@example.com" autoComplete="username" />
        </div>
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="li-pw">Password</label>
          <input id="li-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} placeholder="••••••" autoComplete="current-password" />
        </div>
        {error && <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">{error}</p>}
        <button disabled={busy} className="w-full h-11 bg-primary hover:bg-primaryhover disabled:opacity-50 text-white text-sm font-medium rounded-md">{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <p className="text-sm text-inkmuted mt-4 text-center">No account? <Link to="/register" className="text-inklink font-medium hover:underline">Sign up</Link></p>
    </Shell>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.username.trim()) errs.username = 'Username is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (form.password.length < 6) errs.password = 'At least 6 characters';
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true); setServerError('');
    try {
      const u = await register({ username: form.username.trim(), email: form.email.trim(), password: form.password });
      navigate(u?.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      const info = apiError(err, 'Registration failed');
      if (info.details) setErrors(info.details);
      else setServerError(info.message);
    } finally { setBusy(false); }
  };

  const input = (k, props) => (
    <input value={form[k]} onChange={set(k)} className={`${field} ${errors[k] ? '!border-red-500' : ''}`} {...props} />
  );

  return (
    <Shell eyebrow="Join the community" title="SIGN UP" sub="Join StackIt to ask and answer questions.">
      <form onSubmit={submit} className="space-y-3">
        <div><label className="text-sm font-medium text-ink">Username</label>{input('username', { placeholder: 'e.g. ada_dev', autoComplete: 'username' })}{errors.username && <p className="text-xs text-red-500 mt-1">{errors.username}</p>}</div>
        <div><label className="text-sm font-medium text-ink">Email</label>{input('email', { placeholder: 'you@example.com', autoComplete: 'email' })}{errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="text-sm font-medium text-ink">Password</label>{input('password', { type: 'password', placeholder: '••••••', autoComplete: 'new-password' })}{errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}</div>
          <div><label className="text-sm font-medium text-ink">Confirm</label>{input('confirm', { type: 'password', placeholder: '••••••', autoComplete: 'new-password' })}{errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>}</div>
        </div>
        {serverError && <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">{serverError}</p>}
        <button disabled={busy} className="w-full h-11 bg-primary hover:bg-primaryhover disabled:opacity-50 text-white text-sm font-medium rounded-md">{busy ? 'Creating…' : 'Sign up'}</button>
      </form>
      <p className="text-sm text-inkmuted mt-4 text-center">Have an account? <Link to="/login" className="text-inklink font-medium hover:underline">Log in</Link></p>
    </Shell>
  );
}
