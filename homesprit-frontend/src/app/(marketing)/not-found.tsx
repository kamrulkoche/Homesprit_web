import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-3xl font-extrabold text-ink dark:text-white">This home is not on the market</h1>
      <p className="mt-3 max-w-md text-ink-muted dark:text-slate-400">
        It may have been sold, rented or taken down. Plenty of others are waiting.
      </p>
      <Link href="/properties" className="btn-primary mt-8">
        Browse homes
      </Link>
    </div>
  );
}
