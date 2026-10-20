/**
 * The public site's full-width message card — "could not load", "nothing
 * matches", "nothing saved yet". One component so every public list says it
 * the same way; the failure and the empty case stay separate call sites.
 */
export function StateCard({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center px-6 py-16 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
        {icon}
      </span>
      <h2 className="text-xl font-bold text-ink dark:text-white">{title}</h2>
      <p className="mt-2 max-w-md text-ink-muted dark:text-slate-400">{body}</p>
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
