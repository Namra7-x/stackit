import { Link } from 'react-router-dom';
import { SiteLayout } from '../components/Layout';

export default function NotFound() {
  return (
    <SiteLayout>
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="font-display text-7xl tracking-wide">404</p>
        <p className="font-semibold mt-2 text-ink">Page not found</p>
        <p className="text-sm text-inkmuted mt-1">This thread drifted into the void.</p>
        <Link to="/" className="inline-flex items-center h-10 mt-4 text-sm font-medium px-4 rounded-md bg-primary text-white">Back home</Link>
      </div>
    </SiteLayout>
  );
}
