/**
 * The honesty bar, principle P2.
 *
 * Nothing here is hardcoded. It reads /api/v1/health's `data_provenance` block and sorts
 * whatever it finds into what is real and what is a simulated stand-in, so if the backend
 * ever swaps a synthetic field for a live feed this bar changes without a code edit.
 */
import { useState } from 'react';
import { ChevronDown, CircleCheck, FlaskConical, ShieldOff, WifiOff } from 'lucide-react';
import { useHealth } from '../api/queries';
import type { Provenance } from '../api/types';

function prettyKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ProvenanceBar(): JSX.Element {
  const { data, isLoading, isError } = useHealth();
  const [open, setOpen] = useState(false);

  const entries: [string, Provenance][] = data ? Object.entries(data.data_provenance) : [];
  const synthetic = entries.filter(([, p]) => p.status === 'synthetic');
  const real = entries.filter(([, p]) => p.status !== 'synthetic');

  if (isError) {
    return (
      <div className="flex items-center gap-2 border-b border-danger/40 bg-danger/10 px-3 py-1.5 text-2xs text-danger">
        <ShieldOff size={12} />
        Backend unreachable. Start it with{' '}
        <code className="num rounded bg-ground/50 px-1">python -m uvicorn src.api.main:app --port 8000</code>
      </div>
    );
  }

  return (
    <div className="border-b border-hair bg-caution/[0.06]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-2xs text-caution/90 transition-colors hover:bg-caution/[0.09]"
      >
        <FlaskConical size={12} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {isLoading ? (
            'Reading data provenance from the service...'
          ) : (
            <>
              <span className="font-semibold uppercase tracking-wider">Simulated environmental fields</span>
              <span className="text-caution/70">
                {' '}
                &mdash; {synthetic.length} of {entries.length} datasets stand in for{' '}
                {synthetic.map(([, p]) => p.source.replace(/^stands in for /, '')).join('; ')}. The physics,
                POLARIS tables and coastline are real.
              </span>
            </>
          )}
        </span>
        {data && (
          <span className="hidden shrink-0 items-center gap-1 text-ok/80 md:flex">
            <WifiOff size={11} />
            no external calls
          </span>
        )}
        <ChevronDown size={12} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && data && (
        <div className="grid gap-3 border-t border-hair/70 bg-ground/60 px-3 py-3 lg:grid-cols-2">
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-2xs uppercase tracking-[0.14em] text-danger/80">
              <FlaskConical size={11} /> Simulated stand-ins
            </div>
            <ul className="space-y-1.5">
              {synthetic.map(([key, p]) => (
                <li key={key} className="rounded border border-caution/25 bg-caution/[0.05] p-2">
                  <div className="text-xs text-caution">{prettyKey(key)}</div>
                  <div className="mt-0.5 text-2xs leading-relaxed text-ink-3">
                    Stands in for <span className="text-ink-2">{p.source.replace(/^stands in for /, '')}</span>. {p.note}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-2xs uppercase tracking-[0.14em] text-ok/80">
              <CircleCheck size={11} /> Real data and real tables
            </div>
            <ul className="space-y-1.5">
              {real.map(([key, p]) => (
                <li key={key} className="rounded border border-ok/20 bg-ok/[0.04] p-2">
                  <div className="text-xs text-ok/90">
                    {prettyKey(key)} <span className="text-2xs text-ink-3">({p.status})</span>
                  </div>
                  <div className="mt-0.5 text-2xs leading-relaxed text-ink-3">
                    <span className="text-ink-2">{p.source}</span>. {p.note}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-2xs leading-relaxed text-ink-3 lg:col-span-2">
            Model versions:{' '}
            {Object.entries(data.model_versions).map(([k, v], i) => (
              <span key={k}>
                {i > 0 && ' · '}
                <span className="text-ink-2">{k}</span> {v}
              </span>
            ))}
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
