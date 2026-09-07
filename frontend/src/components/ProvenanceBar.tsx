/**
 * The honesty bar, principle P2.
 *
 * Nothing here is hardcoded. It reads /api/v1/health's `data_provenance` block and sorts whatever
 * it finds into what is real and what is a simulated stand-in, so if the backend ever swaps a
 * synthetic field for a live feed this bar changes without a code edit.
 *
 * LAYOUT NOTE, because this went wrong once. The expanded detail used to render inline, inside
 * the bar's own place in the column layout. Opening it therefore grew the bar and pushed the
 * entire application below the fold - the chart and every panel disappeared behind a wall of
 * dataset descriptions. The detail is now an absolutely-positioned overlay with a bounded height
 * and its own scroll, so the bar occupies exactly one line whether it is open or shut.
 */
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, CircleCheck, FlaskConical, ShieldOff, WifiOff, X } from 'lucide-react';
import { useHealth } from '../api/queries';
import type { Provenance } from '../api/types';

function prettyKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ProvenanceBar(): JSX.Element {
  const { data, isLoading, isError } = useHealth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on Escape or on a click outside, the way any popover should behave.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onClick = (e: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  if (isError) {
    return (
      <div className="flex shrink-0 items-center gap-2 border-b border-danger/40 bg-danger/10 px-3 py-1.5 text-2xs text-danger">
        <ShieldOff size={12} className="shrink-0" />
        <span className="truncate">
          Backend unreachable. Start it with{' '}
          <code className="num rounded bg-ground/50 px-1">uvicorn src.api.main:app --port 8000</code>
        </span>
      </div>
    );
  }

  const entries: [string, Provenance][] = data ? Object.entries(data.data_provenance) : [];
  const synthetic = entries.filter(([, p]) => p.status === 'synthetic');
  const real = entries.filter(([, p]) => p.status !== 'synthetic');

  return (
    <div ref={rootRef} className="relative z-40 shrink-0 border-b border-hair bg-caution/[0.06]">
      {/* Exactly one line tall, always. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-7 w-full items-center gap-2 px-3 text-left text-2xs text-caution/90 transition-colors hover:bg-caution/[0.09]"
      >
        <FlaskConical size={12} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {isLoading ? (
            'Reading data provenance…'
          ) : (
            <>
              <span className="font-semibold uppercase tracking-wider">Weather and ice are simulated</span>
              <span className="text-caution/70">
                {' '}
                &mdash; the physics, safety tables and coastline are real
              </span>
            </>
          )}
        </span>
        {data && (
          <span className="hidden shrink-0 items-center gap-1 text-ok/80 lg:flex">
            <WifiOff size={11} />
            offline capable
          </span>
        )}
        <span className="shrink-0 text-caution/70">{open ? 'hide' : 'details'}</span>
        <ChevronDown size={12} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && data && (
        <div className="absolute inset-x-0 top-full max-h-[min(60vh,520px)] overflow-y-auto border-b border-hair bg-ground/97 shadow-2xl backdrop-blur-sm">
          <div className="flex items-start gap-3 px-3 py-2.5">
            <p className="flex-1 text-2xs leading-relaxed text-ink-2">
              This system models the world rather than observing it. The environmental fields below
              are stand-ins for live satellite products; everything else is the real thing. Any
              skill figure you see is therefore measured inside a simulated environment, and moving
              to live data is a data-loading change rather than a redesign.
            </p>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="shrink-0 text-ink-3 hover:text-ink"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid gap-3 px-3 pb-3 lg:grid-cols-2">
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-2xs uppercase tracking-[0.14em] text-caution/80">
                <FlaskConical size={11} /> Simulated ({synthetic.length})
              </div>
              <ul className="space-y-1.5">
                {synthetic.map(([key, p]) => (
                  <li key={key} className="rounded border border-caution/25 bg-caution/[0.05] p-2">
                    <div className="text-xs2 text-caution">{prettyKey(key)}</div>
                    <div className="mt-0.5 text-2xs leading-relaxed text-ink-3">
                      Stands in for{' '}
                      <span className="text-ink-2">{p.source.replace(/^stands in for /, '')}</span>.
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-2xs uppercase tracking-[0.14em] text-ok/80">
                <CircleCheck size={11} /> Real ({real.length})
              </div>
              <ul className="space-y-1.5">
                {real.map(([key, p]) => (
                  <li key={key} className="rounded border border-ok/20 bg-ok/[0.04] p-2">
                    <div className="text-xs2 text-ok/90">{prettyKey(key)}</div>
                    <div className="mt-0.5 text-2xs leading-relaxed text-ink-3">
                      <span className="text-ink-2">{p.source}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** A compact inline version for panels that render a specific synthetic product. */
export function SyntheticChip({
  isSynthetic,
  source,
  className,
}: {
  isSynthetic: boolean | undefined;
  source: string | undefined;
  className?: string;
}): JSX.Element | null {
  if (isSynthetic === undefined) return null;
  if (!isSynthetic) {
    return (
      <span className={`chip border-ok/30 bg-ok/10 text-ok ${className ?? ''}`} title={source}>
        <CircleCheck size={9} /> real
      </span>
    );
  }
  return (
    <span
      className={`chip border-caution/40 bg-caution/10 text-caution ${className ?? ''}`}
      title={source ? `Simulated. ${source}` : 'Simulated field'}
    >
      <FlaskConical size={9} /> simulated
    </span>
  );
}
