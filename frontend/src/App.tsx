/**
 * Application shell: the masthead, the screen tabs, and the provenance bar that states which
 * layers are simulated.
 *
 * All five screens stay mounted and are hidden rather than unmounted. The chart holds a canvas
 * and a viewport that the user has panned and zoomed; tearing that down on every tab change and
 * rebuilding it would lose their place, and a bridge instrument that forgets where you were
 * looking is an irritating instrument.
 */
import { Activity, BarChart3, Layers, Ship, Snowflake } from 'lucide-react';
import { ProvenanceBar } from './components/ProvenanceBar';
import { useHealth } from './api/queries';
import { Analytics } from './screens/Analytics';
import { BridgeConsole } from './screens/BridgeConsole';
import { IceForecast } from './screens/IceForecast';
import { IcebergTracker } from './screens/IcebergTracker';
import { VoyagePlanner } from './screens/VoyagePlanner';
import { useAppStore, type ScreenId } from './store/useAppStore';

const TABS: { id: ScreenId; label: string; icon: typeof Ship }[] = [
  { id: 'bridge', label: 'Bridge Console', icon: Ship },
  { id: 'planner', label: 'Voyage Planner', icon: Layers },
  { id: 'forecast', label: 'Ice Forecast', icon: Snowflake },
  { id: 'icebergs', label: 'Iceberg Tracker', icon: Activity },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export function App(): JSX.Element {
  const screen = useAppStore((s) => s.screen);
  const setScreen = useAppStore((s) => s.setScreen);
  const health = useHealth();

  const online = health.isSuccess;
  const version = health.data?.version ?? '—';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ground text-ink">
      <header className="flex shrink-0 items-center gap-4 border-b border-hair bg-panel px-4 py-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold tracking-[0.2em] text-accent">POLAR-NAV AI</span>
          <span className="text-2xs text-ink-3">v{version}</span>
        </div>
        <div className="hidden text-2xs text-ink-3 lg:block">
          Antarctic sea-ice, iceberg trajectory and navigation decision support
          <span className="mx-2 text-hair-2">|</span>
          MoES / NCPOR
          <span className="mx-2 text-hair-2">|</span>
          SIH 2026 PS-26059
        </div>

        <nav className="ml-auto flex items-center gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setScreen(id)}
              className={`flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-2xs uppercase tracking-[0.1em] transition-colors ${
                screen === id
                  ? 'border-accent/50 bg-accent/10 text-accent'
                  : 'border-transparent text-ink-3 hover:border-hair-2 hover:text-ink-2'
              }`}
            >
              <Icon size={13} />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 border-l border-hair pl-3">
          <span
            className={`block h-1.5 w-1.5 rounded-full ${online ? 'bg-ok' : 'bg-danger'}`}
            aria-hidden
          />
          <span className="text-2xs uppercase tracking-[0.1em] text-ink-3">
            {online ? 'Backend online' : 'Backend offline'}
          </span>
        </div>
      </header>

      <ProvenanceBar />

      <main className="relative min-h-0 flex-1">
        <Screen id="bridge" active={screen}>
          <BridgeConsole />
        </Screen>
        <Screen id="planner" active={screen}>
          <VoyagePlanner />
        </Screen>
        <Screen id="forecast" active={screen}>
          <IceForecast />
        </Screen>
        <Screen id="icebergs" active={screen}>
          <IcebergTracker />
        </Screen>
        <Screen id="analytics" active={screen}>
          <Analytics />
        </Screen>
      </main>
    </div>
  );
}

function Screen({
  id,
  active,
  children,
}: {
  id: ScreenId;
  active: ScreenId;
  children: React.ReactNode;
}): JSX.Element {
  const visible = id === active;
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ visibility: visible ? 'visible' : 'hidden', pointerEvents: visible ? 'auto' : 'none' }}
      aria-hidden={!visible}
    >
      {children}
    </div>
  );
}
